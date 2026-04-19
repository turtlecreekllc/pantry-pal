/**
 * Stripe Webhook Handler
 * Supabase Edge Function to process Stripe webhook events
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@13.10.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

// Token allocation per plan
const TOKEN_ALLOCATION = {
  premium_monthly: 100,
  premium_annual: 100,
};

serve(async (req: Request) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('No signature', { status: 400 });
  }
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  // Log the event
  const { error: logError } = await supabase.from('subscription_events').insert({
    stripe_event_id: event.id,
    event_type: event.type,
    metadata: event.data,
    processed: false,
  });
  if (logError) {
    console.error('Error logging event:', logError);
  }
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(supabase, event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.created':
        await handleSubscriptionCreated(supabase, event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(supabase, event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(supabase, event.data.object as Stripe.Subscription);
        break;
      case 'invoice.paid':
        await handleInvoicePaid(supabase, event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(supabase, event.data.object as Stripe.Invoice);
        break;
      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(supabase, event.data.object as Stripe.Subscription);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    // Mark event as processed
    await supabase
      .from('subscription_events')
      .update({ processed: true })
      .eq('stripe_event_id', event.id);
    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error('Error processing webhook:', err);
    // Log error
    await supabase
      .from('subscription_events')
      .update({ error_message: err.message })
      .eq('stripe_event_id', event.id);
    return new Response(`Webhook Error: ${err.message}`, { status: 500 });
  }
});

async function handleCheckoutComplete(
  supabase: ReturnType<typeof createClient>,
  session: Stripe.Checkout.Session
) {
  const userId = session.metadata?.user_id;
  if (!userId) {
    throw new Error('No user_id in session metadata');
  }
  // Check if this is a token purchase
  if (session.metadata?.type === 'token_purchase') {
    await handleTokenPurchase(supabase, session);
    return;
  }
  // Handle subscription checkout
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;
  // Update subscription record
  const { error } = await supabase
    .from('subscriptions')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) {
    throw new Error(`Failed to update subscription: ${error.message}`);
  }
}

async function handleTokenPurchase(
  supabase: ReturnType<typeof createClient>,
  session: Stripe.Checkout.Session
) {
  const userId = session.metadata?.user_id;
  const bucketSize = parseInt(session.metadata?.bucket_size || '0', 10);
  if (!userId || !bucketSize) {
    throw new Error('Invalid token purchase metadata');
  }
  // Record the purchase
  const { error: purchaseError } = await supabase.from('token_purchases').insert({
    user_id: userId,
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: session.payment_intent as string,
    bucket_size: bucketSize,
    amount_cents: session.amount_total,
    tokens_granted: bucketSize,
    status: 'completed',
    completed_at: new Date().toISOString(),
  });
  if (purchaseError) {
    throw new Error(`Failed to record purchase: ${purchaseError.message}`);
  }
  // Add tokens to balance
  const { error: tokenError } = await supabase.rpc('add_purchased_tokens', {
    p_user_id: userId,
    p_amount: bucketSize,
  });
  if (tokenError) {
    throw new Error(`Failed to add tokens: ${tokenError.message}`);
  }
}

async function handleSubscriptionCreated(
  supabase: ReturnType<typeof createClient>,
  subscription: Stripe.Subscription
) {
  const userId = subscription.metadata?.user_id;
  if (!userId) {
    // Try to find user by customer ID
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', subscription.customer)
      .single();
    if (!existingSubscription) {
      throw new Error('Cannot find user for subscription');
    }
  }
  const targetUserId = userId || (await getUserByCustomerId(supabase, subscription.customer as string));
  if (!targetUserId) {
    throw new Error('No user found for subscription');
  }
  // Determine tier from price
  const priceId = subscription.items.data[0]?.price.id;
  const tier = getTierFromPriceId(priceId);
  // Update subscription record
  const { error } = await supabase
    .from('subscriptions')
    .update({
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      tier,
      status: subscription.status === 'trialing' ? 'trialing' : 'active',
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      trial_start: subscription.trial_start
        ? new Date(subscription.trial_start * 1000).toISOString()
        : null,
      trial_end: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', targetUserId);
  if (error) {
    throw new Error(`Failed to update subscription: ${error.message}`);
  }
  // Grant initial tokens
  const isAnnual = tier === 'premium_annual';
  await supabase.rpc('grant_subscription_tokens', {
    p_user_id: targetUserId,
    p_amount: TOKEN_ALLOCATION[tier as keyof typeof TOKEN_ALLOCATION] || 0,
    p_is_annual: isAnnual,
  });
}

async function handleSubscriptionUpdated(
  supabase: ReturnType<typeof createClient>,
  subscription: Stripe.Subscription
) {
  const targetUserId = await getUserByCustomerId(supabase, subscription.customer as string);
  if (!targetUserId) {
    console.log('No user found for subscription update');
    return;
  }
  const priceId = subscription.items.data[0]?.price.id;
  const tier = getTierFromPriceId(priceId);
  const previousTier = await getPreviousTier(supabase, targetUserId);
  // Update subscription record
  const { error } = await supabase
    .from('subscriptions')
    .update({
      stripe_price_id: priceId,
      tier,
      status: mapStripeStatus(subscription.status),
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', targetUserId);
  if (error) {
    throw new Error(`Failed to update subscription: ${error.message}`);
  }
  // Log tier change
  if (previousTier !== tier) {
    await supabase.from('subscription_events').update({
      user_id: targetUserId,
      previous_tier: previousTier,
      new_tier: tier,
    }).eq('stripe_event_id', subscription.id);
  }
}

async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof createClient>,
  subscription: Stripe.Subscription
) {
  const targetUserId = await getUserByCustomerId(supabase, subscription.customer as string);
  if (!targetUserId) {
    console.log('No user found for subscription deletion');
    return;
  }
  // Downgrade to free tier
  const { error } = await supabase
    .from('subscriptions')
    .update({
      tier: 'free',
      status: 'canceled',
      ended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', targetUserId);
  if (error) {
    throw new Error(`Failed to downgrade subscription: ${error.message}`);
  }
  // Reset subscription tokens (purchased tokens remain)
  await supabase
    .from('token_balances')
    .update({
      subscription_tokens: 0,
      rollover_tokens: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', targetUserId);
}

async function handleInvoicePaid(
  supabase: ReturnType<typeof createClient>,
  invoice: Stripe.Invoice
) {
  if (!invoice.subscription) {
    return; // Not a subscription invoice
  }
  const targetUserId = await getUserByCustomerId(supabase, invoice.customer as string);
  if (!targetUserId) {
    console.log('No user found for invoice');
    return;
  }
  // Get subscription tier
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('tier')
    .eq('user_id', targetUserId)
    .single();
  if (!subscription) {
    return;
  }
  // Reset monthly tokens on successful payment
  const isAnnual = subscription.tier === 'premium_annual';
  await supabase.rpc('grant_subscription_tokens', {
    p_user_id: targetUserId,
    p_amount: TOKEN_ALLOCATION[subscription.tier as keyof typeof TOKEN_ALLOCATION] || 0,
    p_is_annual: isAnnual,
  });
}

async function handlePaymentFailed(
  supabase: ReturnType<typeof createClient>,
  invoice: Stripe.Invoice
) {
  const targetUserId = await getUserByCustomerId(supabase, invoice.customer as string);
  if (!targetUserId) {
    return;
  }
  // Update subscription status to past_due
  await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', targetUserId);
  // TODO: Send notification to user about payment failure
}

async function handleTrialWillEnd(
  supabase: ReturnType<typeof createClient>,
  subscription: Stripe.Subscription
) {
  const targetUserId = await getUserByCustomerId(supabase, subscription.customer as string);
  if (!targetUserId) {
    return;
  }
  // TODO: Send email notification about trial ending
  console.log(`Trial ending soon for user ${targetUserId}`);
}

// Helper functions
async function getUserByCustomerId(
  supabase: ReturnType<typeof createClient>,
  customerId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();
  return data?.user_id || null;
}

async function getPreviousTier(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('subscriptions')
    .select('tier')
    .eq('user_id', userId)
    .single();
  return data?.tier || null;
}

function getTierFromPriceId(priceId: string): string {
  const priceMonthly = Deno.env.get('STRIPE_PRICE_MONTHLY');
  const priceAnnual = Deno.env.get('STRIPE_PRICE_ANNUAL');
  if (priceId === priceMonthly) {
    return 'premium_monthly';
  }
  if (priceId === priceAnnual) {
    return 'premium_annual';
  }
  // Default based on interval if env vars not set
  return 'premium_monthly';
}

function mapStripeStatus(status: Stripe.Subscription.Status): string {
  switch (status) {
    case 'active':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
      return 'canceled';
    case 'trialing':
      return 'trialing';
    case 'incomplete':
    case 'incomplete_expired':
      return 'incomplete';
    default:
      return 'active';
  }
}

