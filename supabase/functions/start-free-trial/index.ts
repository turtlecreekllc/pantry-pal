/**
 * Start Free Trial
 * Supabase Edge Function to start a 14-day free trial
 * Supports tier-specific trials: trial_individual or trial_family
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TRIAL_DURATION_DAYS = 14;

/** Token allocation by trial tier */
const TRIAL_TOKENS = {
  trial_individual: 100,
  trial_family: 150,
} as const;

type TrialTier = keyof typeof TRIAL_TOKENS;

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const { userId, trialTier = 'trial_individual' } = await req.json();
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // Validate trial tier
    const validTiers: TrialTier[] = ['trial_individual', 'trial_family'];
    const normalizedTier: TrialTier = validTiers.includes(trialTier as TrialTier) 
      ? trialTier as TrialTier 
      : 'trial_individual';
    const tokensToGrant = TRIAL_TOKENS[normalizedTier];
    const isFamily = normalizedTier === 'trial_family';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // Check if user already had a trial
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('tier, trial_end')
      .eq('user_id', userId)
      .maybeSingle();
    // If no subscription exists, create one first
    if (!existingSub) {
      const { error: createError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          tier: 'free',
          status: 'active',
        });
      if (createError) {
        throw new Error(`Failed to create subscription: ${createError.message}`);
      }
      // Also create token balance if it doesn't exist
      await supabase
        .from('token_balances')
        .upsert(
          {
            user_id: userId,
            subscription_tokens: 0,
            purchased_tokens: 0,
            rollover_tokens: 0,
          },
          { onConflict: 'user_id', ignoreDuplicates: true }
        );
    }
    // Check if user already used a trial
    if (existingSub?.trial_end) {
      return new Response(
        JSON.stringify({ error: 'You have already used your free trial. Subscribe to access premium features.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // Check if user already has a paid subscription
    const paidTiers = ['individual_monthly', 'individual_annual', 'family_monthly', 'family_annual', 'premium_monthly', 'premium_annual'];
    if (existingSub && paidTiers.includes(existingSub.tier)) {
      return new Response(
        JSON.stringify({ error: 'You already have an active subscription' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // Calculate trial dates
    const trialStart = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DURATION_DAYS);
    // Update subscription to trial tier
    const { error: subError } = await supabase
      .from('subscriptions')
      .update({
        tier: normalizedTier,
        status: 'trialing',
        trial_start: trialStart.toISOString(),
        trial_end: trialEnd.toISOString(),
        current_period_start: trialStart.toISOString(),
        current_period_end: trialEnd.toISOString(),
        metadata: {
          trial_tier: normalizedTier,
          is_family: isFamily,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
    if (subError) {
      throw new Error(`Failed to update subscription: ${subError.message}`);
    }
    // Grant trial tokens using the function with family flag
    const { error: tokenError } = await supabase.rpc('grant_subscription_tokens', {
      p_user_id: userId,
      p_amount: tokensToGrant,
      p_is_annual: false,
      p_is_family: isFamily,
    });
    if (tokenError) {
      // Try without p_is_family for backwards compatibility
      const { error: tokenErrorFallback } = await supabase.rpc('grant_subscription_tokens', {
        p_user_id: userId,
        p_amount: tokensToGrant,
        p_is_annual: false,
      });
      if (tokenErrorFallback) {
        console.error('Failed to grant tokens:', tokenErrorFallback);
      }
    }
    // Log subscription event
    await supabase.from('subscription_events').insert({
      user_id: userId,
      stripe_event_id: `trial_start_${Date.now()}`,
      event_type: 'trial.started',
      previous_tier: existingSub?.tier || 'free',
      new_tier: normalizedTier,
      processed: true,
      metadata: {
        trial_tier: normalizedTier,
        tokens_granted: tokensToGrant,
        trial_end: trialEnd.toISOString(),
      },
    });
    return new Response(
      JSON.stringify({
        success: true,
        trialTier: normalizedTier,
        trialEnd: trialEnd.toISOString(),
        tokensGranted: tokensToGrant,
        isFamily,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Error starting trial:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
