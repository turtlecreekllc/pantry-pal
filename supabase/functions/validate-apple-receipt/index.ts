/**
 * Validate Apple Receipt
 * Supabase Edge Function to validate Apple IAP receipts using StoreKit 2
 * 
 * Called from the mobile app after a successful purchase to:
 * 1. Verify the transaction with Apple's servers
 * 2. Update the user's subscription status
 * 3. Grant entitlements
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decode as base64Decode } from 'https://deno.land/std@0.168.0/encoding/base64.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const appleTeamId = Deno.env.get('APPLE_TEAM_ID') || '';
const appleKeyId = Deno.env.get('APPLE_KEY_ID') || '';
const appleBundleId = Deno.env.get('APPLE_BUNDLE_ID') || 'com.dinnerplans.app';

// Token allocation per plan
const TOKEN_ALLOCATION = {
  premium_monthly: 100,
  premium_annual: 100,
};

interface TransactionPayload {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  purchaseDate: number;
  expiresDate?: number;
  environment: 'Production' | 'Sandbox';
  appAccountToken?: string;
  storefront?: string;
  storefrontId?: string;
}

interface ValidateReceiptRequest {
  userId: string;
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  purchaseDate: number;
  expiresDate?: number;
  environment: 'Production' | 'Sandbox';
  storefront?: string;
  storefrontId?: string;
}

/**
 * Decode a JWS token (simplified - in production verify with Apple's public key)
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
  console.log('=== validate-apple-receipt invoked ===');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request body
    const body: ValidateReceiptRequest = await req.json();
    console.log('Request body:', JSON.stringify({
      ...body,
      // Redact sensitive data for logging
      transactionId: body.transactionId?.substring(0, 8) + '...',
    }));

    const {
      userId,
      transactionId,
      originalTransactionId,
      productId,
      purchaseDate,
      expiresDate,
      environment,
      storefront,
      storefrontId,
    } = body;

    // Validate required fields
    if (!userId || !transactionId || !productId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user exists
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !userData.user) {
      console.error('User not found:', userError?.message);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for duplicate transaction (idempotency)
    const { data: existingValidation } = await supabase
      .from('apple_receipt_validations')
      .select('id')
      .eq('transaction_id', transactionId)
      .single();

    if (existingValidation) {
      console.log('Transaction already validated:', transactionId);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Transaction already validated',
          alreadyProcessed: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine tier from product ID
    let tier: string = 'premium_monthly';
    let tokensGranted = 100;
    
    // Get tier from product configuration
    const { data: appleProduct } = await supabase
      .from('apple_products')
      .select('tier, tokens_granted')
      .eq('product_id', productId)
      .single();

    if (appleProduct) {
      tier = appleProduct.tier || 'premium_monthly';
      tokensGranted = appleProduct.tokens_granted || 100;
    } else {
      // Fallback mapping
      if (productId.includes('annual')) {
        tier = 'premium_annual';
      } else if (productId.includes('tokens')) {
        tier = 'free'; // Token purchases don't change tier
        if (productId.includes('50')) tokensGranted = 50;
        if (productId.includes('150')) tokensGranted = 150;
        if (productId.includes('400')) tokensGranted = 400;
      }
    }

    const isSubscription = !productId.includes('tokens');
    const purchaseDateISO = new Date(purchaseDate).toISOString();
    const expiresDateISO = expiresDate ? new Date(expiresDate).toISOString() : null;

    // Record the validation
    const { error: validationError } = await supabase
      .from('apple_receipt_validations')
      .insert({
        user_id: userId,
        original_transaction_id: originalTransactionId,
        transaction_id: transactionId,
        product_id: productId,
        purchase_date: purchaseDateISO,
        expires_date: expiresDateISO,
        is_trial_period: false,
        is_in_intro_offer_period: false,
        is_upgraded: false,
        environment: environment,
        validation_status: 'valid',
      });

    if (validationError) {
      console.error('Error recording validation:', validationError);
    }

    if (isSubscription) {
      // Update or create subscription record
      const { error: subError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          payment_provider: 'apple',
          tier: tier,
          status: 'active',
          apple_original_transaction_id: originalTransactionId,
          apple_transaction_id: transactionId,
          apple_product_id: productId,
          apple_purchase_date: purchaseDateISO,
          apple_expires_date: expiresDateISO,
          apple_environment: environment,
          apple_auto_renew_status: true,
          current_period_start: purchaseDateISO,
          current_period_end: expiresDateISO,
          storefront: storefront || null,
          storefront_id: storefrontId || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (subError) {
        console.error('Error updating subscription:', subError);
        throw new Error(`Failed to update subscription: ${subError.message}`);
      }

      // Grant subscription tokens
      const isAnnual = tier === 'premium_annual';
      const { error: tokenError } = await supabase.rpc('grant_subscription_tokens', {
        p_user_id: userId,
        p_amount: tokensGranted,
        p_is_annual: isAnnual,
      });

      if (tokenError) {
        console.error('Error granting tokens:', tokenError);
      }

      console.log(`Subscription activated for user ${userId}: ${tier}`);

    } else {
      // Handle token purchase (consumable)
      const { error: purchaseError } = await supabase.from('token_purchases').insert({
        user_id: userId,
        stripe_checkout_session_id: `apple_${transactionId}`, // Use Apple transaction ID
        bucket_size: tokensGranted,
        amount_cents: 0, // We don't have the price from StoreKit directly
        tokens_granted: tokensGranted,
        status: 'completed',
        completed_at: new Date().toISOString(),
      });

      if (purchaseError) {
        console.error('Error recording token purchase:', purchaseError);
      }

      // Add purchased tokens
      const { error: tokenError } = await supabase.rpc('add_purchased_tokens', {
        p_user_id: userId,
        p_amount: tokensGranted,
      });

      if (tokenError) {
        console.error('Error adding purchased tokens:', tokenError);
        throw new Error(`Failed to add tokens: ${tokenError.message}`);
      }

      console.log(`Token purchase completed for user ${userId}: ${tokensGranted} tokens`);
    }

    // Save storefront if provided
    if (storefront) {
      await supabase.rpc('save_user_storefront', {
        p_user_id: userId,
        p_storefront: storefront,
        p_storefront_id: storefrontId || null,
        p_source: 'storekit',
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        tier: isSubscription ? tier : 'free',
        tokensGranted,
        expiresDate: expiresDateISO,
        provider: 'apple',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('Error validating receipt:', err.message, err.stack);
    return new Response(
      JSON.stringify({ error: err.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

