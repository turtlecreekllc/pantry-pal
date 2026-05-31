/**
 * Delete Account (COMP-001)
 *
 * App Store Guideline 5.1.1(v) and GDPR/CCPA require that a user-initiated
 * "delete account" actually removes the account and its data — not just signs
 * the user out.
 *
 * Order of operations:
 *   1. Verify JWT (SEC-001 — never trust a user id from the request body).
 *   2. Cancel any active Stripe subscription immediately (refunds are out of
 *      scope — Stripe's normal billing rules apply).
 *   3. Explicitly delete rows in every user-owned table. Most tables CASCADE
 *      from auth.users, but explicit deletes are defense-in-depth: they make
 *      the function self-documenting and survive future schema changes that
 *      drop the FK without anyone noticing.
 *   4. Audit/event tables (subscription_events, apple_server_notifications,
 *      household_activities) use ON DELETE SET NULL on purpose — they are
 *      retained for billing/compliance audit, with the user_id already
 *      anonymized by the FK action.
 *   5. Call auth.admin.deleteUser last — this is the irreversible step.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@13.10.0';
import { authenticateRequest, isAuthFailure } from '../_shared/auth.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tables scoped to a single user by `user_id`. Order is intentional: child
// rows that reference each other should be listed before their parents, but
// since all user data is keyed off user_id directly, table order within this
// list does not matter for FK reasons — it matters only for clarity.
const USER_OWNED_TABLES = [
  'user_recipe_feedback',
  'user_saved_recipes',
  'saved_recipes',
  'pantry_items',
  'household_member_profiles',
  'tonight_suggestions',
  'achievements',
  'user_achievements',
  'user_challenges',
  'user_impact_summaries',
  'impact_records',
  'cookbooks',
  'cookbook_recipes',
  'recipe_cooking_history',
  'recipe_user_photos',
  'imported_recipes',
  'recipe_reviews',
  'ai_feedback',
  'grocery_items',
  'grocery_lists',
  'meal_votes',
  'vote_responses',
  'instacart_orders',
  'pepper_contexts',
  'user_preferences',
  'item_claims',
  'meal_rsvps',
  'meal_assignments',
  'push_tokens',
  'notification_preferences',
  'household_members',
  'household_members_extended',
  'token_balances',
  'token_transactions',
  'token_purchases',
  'usage_limits',
  'savings_tracking',
  'subscriptions',
  'apple_receipt_validations',
  'user_storefronts',
];

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const auth = await authenticateRequest(req, corsHeaders);
    if (isAuthFailure(auth)) return auth.response;
    const userId = auth.userId;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Cancel active Stripe subscription (immediate, not at period end —
    //    the account is going away).
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (subscription?.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
      } catch (stripeErr) {
        // If Stripe says the subscription is already canceled or unknown,
        // proceed with account deletion rather than blocking the user.
        const code = (stripeErr as { code?: string })?.code;
        if (code !== 'resource_missing') {
          throw stripeErr;
        }
      }
    }

    // 2. Delete user-owned rows. Collect per-table errors but keep going so
    //    a missing/renamed table never blocks an account deletion the user
    //    has explicitly requested.
    const tableErrors: Array<{ table: string; message: string }> = [];
    for (const table of USER_OWNED_TABLES) {
      const { error } = await supabase.from(table).delete().eq('user_id', userId);
      if (error) {
        tableErrors.push({ table, message: error.message });
      }
    }

    // 3. Delete the auth user. This is the irreversible step — do it last.
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      return new Response(
        JSON.stringify({
          error: `Failed to delete auth user: ${authDeleteError.message}`,
          tableErrors,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, tableErrors }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('delete-account error:', (err as Error)?.name, (err as Error)?.stack);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
