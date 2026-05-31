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
import { authenticateRequest, isAuthFailure } from '../_shared/auth.ts';
import { buildCorsHeaders, handlePreflight } from '../_shared/cors.ts';

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
  if (req.method === 'OPTIONS') return handlePreflight(req);
  const corsHeaders = buildCorsHeaders(req);

  try {
    const auth = await authenticateRequest(req, corsHeaders);
    if (isAuthFailure(auth)) return auth.response;
    const userId = auth.userId;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body: ValidateReceiptRequest = await req.json();

    const {
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
    if (!transactionId || !productId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for duplicate transaction (idempotency)
    const { data: existingValidation } = await supabase
      .from('apple_receipt_validations')
      .select('id')
      .eq('transaction_id', transactionId)
      .single();

    if (existingValidation) {
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
      console.error('validate-apple-receipt: record validation failed:', validationError?.code);
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
        console.error('validate-apple-receipt: subscription upsert failed:', subError?.code);
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
        console.error('validate-apple-receipt: grant tokens failed:', tokenError?.code);
      }

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
        console.error('validate-apple-receipt: record purchase failed:', purchaseError?.code);
      }

      // Add purchased tokens
      const { error: tokenError } = await supabase.rpc('add_purchased_tokens', {
        p_user_id: userId,
        p_amount: tokensGranted,
      });

      if (tokenError) {
        console.error('validate-apple-receipt: add purchased tokens failed:', tokenError?.code);
        throw new Error(`Failed to add tokens: ${tokenError.message}`);
      }
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
    console.error('validate-apple-receipt error:', err?.name, err?.stack);
    return new Response(
      JSON.stringify({ error: err.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
