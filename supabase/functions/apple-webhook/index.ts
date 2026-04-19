/**
 * Apple App Store Server Notifications V2 Webhook Handler
 * Supabase Edge Function to process Apple webhook events
 * 
 * Handles subscription lifecycle events including:
 * - New subscriptions (SUBSCRIBED)
 * - Renewals (DID_RENEW)
 * - Expirations (EXPIRED)
 * - Grace periods (DID_FAIL_TO_RENEW with GRACE_PERIOD)
 * - Cancellations (DID_CHANGE_RENEWAL_STATUS)
 * - Refunds (REFUND)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decode as base64Decode } from 'https://deno.land/std@0.168.0/encoding/base64.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Token allocation per plan (matches Stripe webhook)
const TOKEN_ALLOCATION = {
  premium_monthly: 100,
  premium_annual: 100,
};

interface JWSTransactionDecodedPayload {
  transactionId: string;
  originalTransactionId: string;
  webOrderLineItemId?: string;
  bundleId: string;
  productId: string;
  subscriptionGroupIdentifier?: string;
  purchaseDate: number;
  originalPurchaseDate: number;
  expiresDate?: number;
  quantity: number;
  type: string;
  appAccountToken?: string;
  inAppOwnershipType: string;
  signedDate: number;
  environment: 'Production' | 'Sandbox';
  transactionReason?: string;
  storefront: string;
  storefrontId: string;
  price?: number;
  currency?: string;
}

interface JWSRenewalInfoDecodedPayload {
  autoRenewProductId: string;
  autoRenewStatus: number;
  environment: 'Production' | 'Sandbox';
  expirationIntent?: number;
  gracePeriodExpiresDate?: number;
  isInBillingRetryPeriod?: boolean;
  offerIdentifier?: string;
  offerType?: number;
  originalTransactionId: string;
  priceIncreaseStatus?: number;
  productId: string;
  recentSubscriptionStartDate?: number;
  renewalDate?: number;
  signedDate: number;
}

interface DecodedNotificationPayload {
  notificationType: string;
  subtype?: string;
  notificationUUID: string;
  data: {
    appAppleId: number;
    bundleId: string;
    bundleVersion: string;
    environment: 'Production' | 'Sandbox';
    signedTransactionInfo?: string;
    signedRenewalInfo?: string;
  };
  version: string;
  signedDate: number;
}

/**
 * Decode a JWS (JSON Web Signature) token without verification
 * Note: In production, you should verify the signature using Apple's public key
 */
function decodeJWS<T>(jws: string): T {
  const parts = jws.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWS format');
  }
  const payload = parts[1];
  const decoded = new TextDecoder().decode(base64Decode(payload));
  return JSON.parse(decoded) as T;
}

serve(async (req: Request) => {
  console.log('=== Apple webhook received ===');
  
  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    console.log('Raw body received:', JSON.stringify(body).substring(0, 500));
    
    // Apple sends the payload in signedPayload
    const signedPayload = body.signedPayload;
    if (!signedPayload) {
      console.error('No signedPayload in request body');
      return new Response('Missing signedPayload', { status: 400 });
    }

    // Decode the notification payload
    const notification = decodeJWS<DecodedNotificationPayload>(signedPayload);
    console.log('Notification type:', notification.notificationType);
    console.log('Notification subtype:', notification.subtype);
    console.log('Notification UUID:', notification.notificationUUID);

    // Log the notification to database
    const { error: logError } = await supabase.from('apple_server_notifications').insert({
      notification_type: notification.notificationType,
      subtype: notification.subtype || null,
      notification_uuid: notification.notificationUUID,
      signed_date: new Date(notification.signedDate).toISOString(),
      environment: notification.data.environment,
      bundle_id: notification.data.bundleId,
      app_apple_id: notification.data.appAppleId,
      raw_payload: body,
      processed: false,
    });

    if (logError) {
      console.error('Error logging notification:', logError);
    }

    // Decode transaction info if present
    let transactionInfo: JWSTransactionDecodedPayload | null = null;
    let renewalInfo: JWSRenewalInfoDecodedPayload | null = null;

    if (notification.data.signedTransactionInfo) {
      transactionInfo = decodeJWS<JWSTransactionDecodedPayload>(
        notification.data.signedTransactionInfo
      );
      console.log('Transaction ID:', transactionInfo.transactionId);
      console.log('Original Transaction ID:', transactionInfo.originalTransactionId);
      console.log('Product ID:', transactionInfo.productId);
    }

    if (notification.data.signedRenewalInfo) {
      renewalInfo = decodeJWS<JWSRenewalInfoDecodedPayload>(
        notification.data.signedRenewalInfo
      );
      console.log('Auto-renew status:', renewalInfo.autoRenewStatus);
    }

    // Update notification log with transaction info
    if (transactionInfo) {
      await supabase.from('apple_server_notifications')
        .update({
          original_transaction_id: transactionInfo.originalTransactionId,
          transaction_id: transactionInfo.transactionId,
          product_id: transactionInfo.productId,
        })
        .eq('notification_uuid', notification.notificationUUID);
    }

    // Handle the notification based on type
    switch (notification.notificationType) {
      case 'SUBSCRIBED':
        await handleSubscribed(supabase, notification, transactionInfo, renewalInfo);
        break;

      case 'DID_RENEW':
        await handleRenewal(supabase, notification, transactionInfo, renewalInfo);
        break;

      case 'DID_FAIL_TO_RENEW':
        await handleFailedRenewal(supabase, notification, transactionInfo, renewalInfo);
        break;

      case 'DID_CHANGE_RENEWAL_STATUS':
        await handleRenewalStatusChange(supabase, notification, transactionInfo, renewalInfo);
        break;

      case 'EXPIRED':
        await handleExpired(supabase, notification, transactionInfo);
        break;

      case 'GRACE_PERIOD_EXPIRED':
        await handleGracePeriodExpired(supabase, notification, transactionInfo);
        break;

      case 'REFUND':
        await handleRefund(supabase, notification, transactionInfo);
        break;

      case 'REVOKE':
        await handleRevoke(supabase, notification, transactionInfo);
        break;

      case 'OFFER_REDEEMED':
        await handleOfferRedeemed(supabase, notification, transactionInfo);
        break;

      case 'TEST':
        console.log('Test notification received');
        break;

      default:
        console.log(`Unhandled notification type: ${notification.notificationType}`);
    }

    // Mark as processed
    await supabase.from('apple_server_notifications')
      .update({ processed: true })
      .eq('notification_uuid', notification.notificationUUID);

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    console.error('Error processing Apple webhook:', err);
    return new Response(`Webhook Error: ${err.message}`, { status: 500 });
  }
});

/**
 * Handle new subscription (SUBSCRIBED)
 */
async function handleSubscribed(
  supabase: ReturnType<typeof createClient>,
  notification: DecodedNotificationPayload,
  transaction: JWSTransactionDecodedPayload | null,
  renewal: JWSRenewalInfoDecodedPayload | null
) {
  if (!transaction) {
    console.error('No transaction info for SUBSCRIBED event');
    return;
  }

  console.log('Processing new subscription:', transaction.originalTransactionId);

  // Find user by appAccountToken (we pass user_id in this field)
  const userId = transaction.appAccountToken;
  if (!userId) {
    console.error('No appAccountToken (user_id) in transaction');
    // Try to look up user by original transaction ID from previous purchases
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('apple_original_transaction_id', transaction.originalTransactionId)
      .single();
    
    if (!existingSub) {
      console.error('Cannot find user for subscription');
      return;
    }
  }

  const targetUserId = userId || await findUserByTransaction(supabase, transaction.originalTransactionId);
  if (!targetUserId) {
    console.error('No user found for subscription');
    return;
  }

  // Call the database function to update subscription
  const { error } = await supabase.rpc('update_subscription_from_apple', {
    p_user_id: targetUserId,
    p_original_transaction_id: transaction.originalTransactionId,
    p_transaction_id: transaction.transactionId,
    p_product_id: transaction.productId,
    p_purchase_date: new Date(transaction.purchaseDate).toISOString(),
    p_expires_date: transaction.expiresDate 
      ? new Date(transaction.expiresDate).toISOString() 
      : null,
    p_auto_renew_status: renewal?.autoRenewStatus === 1,
    p_environment: transaction.environment,
  });

  if (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }

  // Save storefront information
  if (transaction.storefront) {
    await supabase.rpc('save_user_storefront', {
      p_user_id: targetUserId,
      p_storefront: transaction.storefront,
      p_storefront_id: transaction.storefrontId,
      p_source: 'storekit',
    });
  }

  console.log(`Subscription created for user ${targetUserId}`);
}

/**
 * Handle subscription renewal (DID_RENEW)
 */
async function handleRenewal(
  supabase: ReturnType<typeof createClient>,
  notification: DecodedNotificationPayload,
  transaction: JWSTransactionDecodedPayload | null,
  renewal: JWSRenewalInfoDecodedPayload | null
) {
  if (!transaction) {
    console.error('No transaction info for DID_RENEW event');
    return;
  }

  console.log('Processing renewal:', transaction.originalTransactionId);

  const userId = await findUserByTransaction(supabase, transaction.originalTransactionId);
  if (!userId) {
    console.error('No user found for renewal');
    return;
  }

  // Update subscription with new expiration date
  const { error: subError } = await supabase
    .from('subscriptions')
    .update({
      apple_transaction_id: transaction.transactionId,
      apple_expires_date: transaction.expiresDate 
        ? new Date(transaction.expiresDate).toISOString() 
        : null,
      current_period_end: transaction.expiresDate 
        ? new Date(transaction.expiresDate).toISOString() 
        : null,
      apple_auto_renew_status: renewal?.autoRenewStatus === 1,
      apple_is_in_billing_retry: false,
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (subError) {
    console.error('Error updating subscription:', subError);
    throw subError;
  }

  // Get subscription tier for token grant
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('tier')
    .eq('user_id', userId)
    .single();

  if (subscription?.tier) {
    const isAnnual = subscription.tier === 'premium_annual';
    await supabase.rpc('grant_subscription_tokens', {
      p_user_id: userId,
      p_amount: TOKEN_ALLOCATION[subscription.tier as keyof typeof TOKEN_ALLOCATION] || 100,
      p_is_annual: isAnnual,
    });
  }

  console.log(`Renewal processed for user ${userId}`);
}

/**
 * Handle failed renewal (DID_FAIL_TO_RENEW)
 */
async function handleFailedRenewal(
  supabase: ReturnType<typeof createClient>,
  notification: DecodedNotificationPayload,
  transaction: JWSTransactionDecodedPayload | null,
  renewal: JWSRenewalInfoDecodedPayload | null
) {
  if (!transaction) {
    console.error('No transaction info for DID_FAIL_TO_RENEW event');
    return;
  }

  console.log('Processing failed renewal:', transaction.originalTransactionId);

  const userId = await findUserByTransaction(supabase, transaction.originalTransactionId);
  if (!userId) {
    console.error('No user found for failed renewal');
    return;
  }

  // Check if in grace period
  if (notification.subtype === 'GRACE_PERIOD' && renewal?.gracePeriodExpiresDate) {
    await supabase.rpc('set_apple_grace_period', {
      p_user_id: userId,
      p_original_transaction_id: transaction.originalTransactionId,
      p_grace_period_expires: new Date(renewal.gracePeriodExpiresDate).toISOString(),
    });
    console.log(`Grace period set for user ${userId}`);
  } else {
    // Mark as billing retry
    await supabase
      .from('subscriptions')
      .update({
        apple_is_in_billing_retry: renewal?.isInBillingRetryPeriod ?? true,
        status: 'past_due',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
    console.log(`Billing retry set for user ${userId}`);
  }
}

/**
 * Handle renewal status change (DID_CHANGE_RENEWAL_STATUS)
 */
async function handleRenewalStatusChange(
  supabase: ReturnType<typeof createClient>,
  notification: DecodedNotificationPayload,
  transaction: JWSTransactionDecodedPayload | null,
  renewal: JWSRenewalInfoDecodedPayload | null
) {
  if (!transaction || !renewal) {
    console.error('Missing transaction or renewal info for renewal status change');
    return;
  }

  console.log('Processing renewal status change:', transaction.originalTransactionId);

  const userId = await findUserByTransaction(supabase, transaction.originalTransactionId);
  if (!userId) {
    console.error('No user found for renewal status change');
    return;
  }

  const autoRenewEnabled = renewal.autoRenewStatus === 1;

  await supabase
    .from('subscriptions')
    .update({
      apple_auto_renew_status: autoRenewEnabled,
      cancel_at_period_end: !autoRenewEnabled,
      canceled_at: autoRenewEnabled ? null : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  console.log(`Auto-renew ${autoRenewEnabled ? 'enabled' : 'disabled'} for user ${userId}`);
}

/**
 * Handle subscription expiration (EXPIRED)
 */
async function handleExpired(
  supabase: ReturnType<typeof createClient>,
  notification: DecodedNotificationPayload,
  transaction: JWSTransactionDecodedPayload | null
) {
  if (!transaction) {
    console.error('No transaction info for EXPIRED event');
    return;
  }

  console.log('Processing expiration:', transaction.originalTransactionId);

  const userId = await findUserByTransaction(supabase, transaction.originalTransactionId);
  if (!userId) {
    console.error('No user found for expiration');
    return;
  }

  await supabase.rpc('expire_apple_subscription', {
    p_user_id: userId,
    p_original_transaction_id: transaction.originalTransactionId,
  });

  console.log(`Subscription expired for user ${userId}`);
}

/**
 * Handle grace period expiration
 */
async function handleGracePeriodExpired(
  supabase: ReturnType<typeof createClient>,
  notification: DecodedNotificationPayload,
  transaction: JWSTransactionDecodedPayload | null
) {
  if (!transaction) {
    console.error('No transaction info for GRACE_PERIOD_EXPIRED event');
    return;
  }

  console.log('Processing grace period expiration:', transaction.originalTransactionId);

  const userId = await findUserByTransaction(supabase, transaction.originalTransactionId);
  if (!userId) {
    console.error('No user found for grace period expiration');
    return;
  }

  await supabase.rpc('expire_apple_subscription', {
    p_user_id: userId,
    p_original_transaction_id: transaction.originalTransactionId,
  });

  console.log(`Grace period expired, subscription ended for user ${userId}`);
}

/**
 * Handle refund (REFUND)
 */
async function handleRefund(
  supabase: ReturnType<typeof createClient>,
  notification: DecodedNotificationPayload,
  transaction: JWSTransactionDecodedPayload | null
) {
  if (!transaction) {
    console.error('No transaction info for REFUND event');
    return;
  }

  console.log('Processing refund:', transaction.originalTransactionId);

  const userId = await findUserByTransaction(supabase, transaction.originalTransactionId);
  if (!userId) {
    console.error('No user found for refund');
    return;
  }

  // Downgrade to free tier and revoke access
  await supabase.rpc('expire_apple_subscription', {
    p_user_id: userId,
    p_original_transaction_id: transaction.originalTransactionId,
  });

  // Log refund event
  await supabase.from('subscription_events').insert({
    user_id: userId,
    stripe_event_id: `apple_refund_${transaction.transactionId}`,
    event_type: 'apple.refund',
    metadata: {
      transaction_id: transaction.transactionId,
      original_transaction_id: transaction.originalTransactionId,
      product_id: transaction.productId,
    },
  });

  console.log(`Refund processed, subscription revoked for user ${userId}`);
}

/**
 * Handle revocation (REVOKE)
 */
async function handleRevoke(
  supabase: ReturnType<typeof createClient>,
  notification: DecodedNotificationPayload,
  transaction: JWSTransactionDecodedPayload | null
) {
  if (!transaction) {
    console.error('No transaction info for REVOKE event');
    return;
  }

  console.log('Processing revocation:', transaction.originalTransactionId);

  const userId = await findUserByTransaction(supabase, transaction.originalTransactionId);
  if (!userId) {
    console.error('No user found for revocation');
    return;
  }

  await supabase.rpc('expire_apple_subscription', {
    p_user_id: userId,
    p_original_transaction_id: transaction.originalTransactionId,
  });

  console.log(`Access revoked for user ${userId}`);
}

/**
 * Handle offer redeemed (OFFER_REDEEMED)
 */
async function handleOfferRedeemed(
  supabase: ReturnType<typeof createClient>,
  notification: DecodedNotificationPayload,
  transaction: JWSTransactionDecodedPayload | null
) {
  if (!transaction) {
    console.error('No transaction info for OFFER_REDEEMED event');
    return;
  }

  console.log('Processing offer redemption:', transaction.originalTransactionId);

  // Treat like a new subscription or renewal depending on subtype
  if (notification.subtype === 'INITIAL_BUY' || notification.subtype === 'RESUBSCRIBE') {
    await handleSubscribed(supabase, notification, transaction, null);
  }
}

/**
 * Find user by original transaction ID
 */
async function findUserByTransaction(
  supabase: ReturnType<typeof createClient>,
  originalTransactionId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('apple_original_transaction_id', originalTransactionId)
    .single();
  
  return data?.user_id || null;
}

