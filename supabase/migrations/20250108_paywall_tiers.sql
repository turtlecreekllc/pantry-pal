-- Paywall Integration Migration
-- Updates subscription system to three-tier model: Free, Individual, Family
-- DinnerPlans.ai

-- ============================================
-- UPDATE SUBSCRIPTION TIER ENUM
-- ============================================

-- Create new enum with all tiers (PostgreSQL doesn't support ALTER TYPE easily)
-- We'll create a new type and migrate

-- First, create the new enum type
CREATE TYPE subscription_tier_v2 AS ENUM (
  'free',
  'individual_monthly',
  'individual_annual',
  'family_monthly',
  'family_annual',
  'trial_individual',
  'trial_family'
);

-- Add a temporary column with the new type
ALTER TABLE subscriptions ADD COLUMN tier_new subscription_tier_v2;

-- Migrate existing data
UPDATE subscriptions SET tier_new = CASE
  WHEN tier::TEXT = 'free' THEN 'free'::subscription_tier_v2
  WHEN tier::TEXT = 'trial' THEN 'trial_individual'::subscription_tier_v2
  WHEN tier::TEXT = 'premium_monthly' THEN 'individual_monthly'::subscription_tier_v2
  WHEN tier::TEXT = 'premium_annual' THEN 'individual_annual'::subscription_tier_v2
  ELSE 'free'::subscription_tier_v2
END;

-- Drop the old column and rename
ALTER TABLE subscriptions DROP COLUMN tier;
ALTER TABLE subscriptions RENAME COLUMN tier_new TO tier;

-- Set NOT NULL and default
ALTER TABLE subscriptions ALTER COLUMN tier SET NOT NULL;
ALTER TABLE subscriptions ALTER COLUMN tier SET DEFAULT 'free'::subscription_tier_v2;

-- Drop old enum type (if nothing else uses it)
DROP TYPE IF EXISTS subscription_tier;

-- Rename new type to original name
ALTER TYPE subscription_tier_v2 RENAME TO subscription_tier;

-- ============================================
-- UPDATE TOKEN BALANCE CONSTRAINTS
-- ============================================

-- Update max rollover constraint for family tier (75 max for family annual)
ALTER TABLE token_balances DROP CONSTRAINT IF EXISTS max_rollover_tokens;
ALTER TABLE token_balances ADD CONSTRAINT max_rollover_tokens CHECK (rollover_tokens <= 75);

-- ============================================
-- HOUSEHOLD MEMBERS TABLE (for Family tier)
-- ============================================

-- Note: This may already exist from household sharing feature
-- Adding IF NOT EXISTS for safety
CREATE TABLE IF NOT EXISTS household_members_extended (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  display_name TEXT,
  dietary_preferences JSONB DEFAULT '{}',
  cooking_preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(household_id, user_id)
);

-- ============================================
-- UPDATE FEATURE ACCESS FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION check_feature_access(
  p_user_id UUID,
  p_feature TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_subscription subscriptions%ROWTYPE;
  v_usage usage_limits%ROWTYPE;
  v_tier subscription_tier;
  v_is_individual BOOLEAN;
  v_is_family BOOLEAN;
  v_is_trial BOOLEAN;
  v_household_member_count INTEGER;
BEGIN
  -- Get subscription
  SELECT * INTO v_subscription FROM subscriptions WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    v_tier := 'free';
  ELSE
    v_tier := v_subscription.tier;
  END IF;
  
  -- Determine tier type
  v_is_individual := v_tier IN ('individual_monthly', 'individual_annual', 'trial_individual');
  v_is_family := v_tier IN ('family_monthly', 'family_annual', 'trial_family');
  v_is_trial := v_tier IN ('trial_individual', 'trial_family');
  
  -- Check trial expiration
  IF v_is_trial AND v_subscription.trial_end IS NOT NULL AND v_subscription.trial_end < NOW() THEN
    v_tier := 'free';
    v_is_individual := FALSE;
    v_is_family := FALSE;
    v_is_trial := FALSE;
  END IF;
  
  -- Get usage limits for free tier
  IF NOT (v_is_individual OR v_is_family) THEN
    SELECT * INTO v_usage 
    FROM usage_limits 
    WHERE user_id = p_user_id AND period_start = date_trunc('month', CURRENT_DATE)::DATE;
  END IF;
  
  -- Check specific features
  CASE p_feature
    -- AI Features
    WHEN 'ai_features', 'ai_suggestions' THEN
      IF NOT (v_is_individual OR v_is_family) THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'AI features require Individual or Family subscription', 'requiredTier', 'individual');
      END IF;
      RETURN jsonb_build_object('allowed', true);
    
    -- Weekly AI Meal Planning (Family only)
    WHEN 'ai_meal_planning', 'weekly_meal_plan' THEN
      IF NOT v_is_family THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Weekly AI meal planning requires Family subscription', 'requiredTier', 'family');
      END IF;
      RETURN jsonb_build_object('allowed', true);
    
    -- Expiration Tracking (Individual+)
    WHEN 'expiration_tracking' THEN
      IF NOT (v_is_individual OR v_is_family) THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Expiration tracking requires Individual or Family subscription', 'requiredTier', 'individual');
      END IF;
      RETURN jsonb_build_object('allowed', true);
    
    -- Smart Grocery Lists (Individual+)
    WHEN 'smart_grocery_lists' THEN
      IF NOT (v_is_individual OR v_is_family) THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Smart grocery lists require Individual or Family subscription', 'requiredTier', 'individual');
      END IF;
      RETURN jsonb_build_object('allowed', true);
    
    -- Recipe Scaling (Family only)
    WHEN 'recipe_scaling' THEN
      IF NOT v_is_family THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Recipe scaling requires Family subscription', 'requiredTier', 'family');
      END IF;
      RETURN jsonb_build_object('allowed', true);
    
    -- Calendar Sync (Family only)
    WHEN 'calendar_sync' THEN
      IF NOT v_is_family THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Calendar sync requires Family subscription', 'requiredTier', 'family');
      END IF;
      RETURN jsonb_build_object('allowed', true);
    
    -- Per-Person Preferences (Family only)
    WHEN 'per_person_preferences' THEN
      IF NOT v_is_family THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Per-person preferences require Family subscription', 'requiredTier', 'family');
      END IF;
      RETURN jsonb_build_object('allowed', true);
    
    -- Shared Pantry (Family only)
    WHEN 'shared_pantry' THEN
      IF NOT v_is_family THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Shared pantry requires Family subscription', 'requiredTier', 'family');
      END IF;
      RETURN jsonb_build_object('allowed', true);
    
    -- Household Members (Family only, max 6)
    WHEN 'add_household_member' THEN
      IF NOT v_is_family THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Adding household members requires Family subscription', 'requiredTier', 'family');
      END IF;
      -- Check member count
      SELECT COUNT(*) INTO v_household_member_count
      FROM household_members hm
      JOIN households h ON hm.household_id = h.id
      WHERE h.owner_id = p_user_id OR hm.user_id = p_user_id;
      IF v_household_member_count >= 6 THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Maximum 6 household members reached', 'current', v_household_member_count, 'limit', 6);
      END IF;
      RETURN jsonb_build_object('allowed', true);
    
    -- Unlimited Pantry (Individual+)
    WHEN 'unlimited_pantry' THEN
      IF NOT (v_is_individual OR v_is_family) AND COALESCE(v_usage.pantry_items_count, 0) >= 50 THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Free tier limited to 50 pantry items', 'current', v_usage.pantry_items_count, 'limit', 50, 'requiredTier', 'individual');
      END IF;
      RETURN jsonb_build_object('allowed', true);
    
    -- Unlimited Recipes (Individual+)
    WHEN 'unlimited_recipes' THEN
      IF NOT (v_is_individual OR v_is_family) AND COALESCE(v_usage.saved_recipes_count, 0) >= 25 THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Free tier limited to 25 saved recipes', 'current', v_usage.saved_recipes_count, 'limit', 25, 'requiredTier', 'individual');
      END IF;
      RETURN jsonb_build_object('allowed', true);
    
    -- Barcode Scanning
    WHEN 'barcode_scan' THEN
      IF NOT (v_is_individual OR v_is_family) AND COALESCE(v_usage.barcode_scans_count, 0) >= 10 THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Free tier limited to 10 barcode scans per month', 'current', v_usage.barcode_scans_count, 'limit', 10, 'requiredTier', 'individual');
      END IF;
      RETURN jsonb_build_object('allowed', true);
    
    -- Multiple Grocery Lists (Individual+)
    WHEN 'multiple_grocery_lists' THEN
      IF NOT (v_is_individual OR v_is_family) AND COALESCE(v_usage.grocery_lists_count, 0) >= 1 THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Free tier limited to 1 grocery list', 'current', v_usage.grocery_lists_count, 'limit', 1, 'requiredTier', 'individual');
      END IF;
      RETURN jsonb_build_object('allowed', true);
    
    -- Household Sharing (kept for backwards compatibility)
    WHEN 'household_sharing' THEN
      IF NOT v_is_family THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Household sharing requires Family subscription', 'requiredTier', 'family');
      END IF;
      RETURN jsonb_build_object('allowed', true);
    
    -- Ads Free (Individual+)
    WHEN 'ads_free' THEN
      RETURN jsonb_build_object('allowed', v_is_individual OR v_is_family);
    
    ELSE
      RETURN jsonb_build_object('allowed', true);
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- UPDATE GRANT SUBSCRIPTION TOKENS FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION grant_subscription_tokens(
  p_user_id UUID,
  p_amount INTEGER,
  p_is_annual BOOLEAN DEFAULT FALSE,
  p_is_family BOOLEAN DEFAULT FALSE
)
RETURNS VOID AS $$
DECLARE
  v_balance token_balances%ROWTYPE;
  v_rollover INTEGER := 0;
  v_max_rollover INTEGER := 50; -- Default for Individual
  v_new_total INTEGER;
BEGIN
  -- Set max rollover based on tier
  IF p_is_family THEN
    v_max_rollover := 75;
  END IF;
  
  SELECT * INTO v_balance FROM token_balances WHERE user_id = p_user_id FOR UPDATE;
  
  IF NOT FOUND THEN
    -- Create new balance record
    INSERT INTO token_balances (user_id, subscription_tokens, last_reset_at)
    VALUES (p_user_id, p_amount, NOW());
    
    -- Log the grant
    INSERT INTO token_transactions (user_id, transaction_type, amount, token_source, balance_after, description)
    VALUES (p_user_id, 'subscription_grant', p_amount, 'subscription', p_amount, 'Initial subscription token grant');
    
    RETURN;
  END IF;
  
  -- Calculate rollover for annual plans (respecting tier limits)
  IF p_is_annual AND v_balance.subscription_tokens > 0 THEN
    v_rollover := LEAST(v_balance.subscription_tokens, v_max_rollover);
  END IF;
  
  -- Update balances
  UPDATE token_balances
  SET 
    subscription_tokens = p_amount,
    rollover_tokens = LEAST(rollover_tokens + v_rollover, v_max_rollover),
    tokens_used_this_period = 0,
    last_reset_at = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Get new total
  SELECT subscription_tokens + purchased_tokens + rollover_tokens INTO v_new_total
  FROM token_balances WHERE user_id = p_user_id;
  
  -- Log reset
  IF v_balance.tokens_used_this_period > 0 THEN
    INSERT INTO token_transactions (user_id, transaction_type, amount, token_source, balance_after, description)
    VALUES (p_user_id, 'reset', 0, 'subscription', v_new_total, 'Monthly token reset');
  END IF;
  
  -- Log rollover if any
  IF v_rollover > 0 THEN
    INSERT INTO token_transactions (user_id, transaction_type, amount, token_source, balance_after, description)
    VALUES (p_user_id, 'rollover', v_rollover, 'rollover', v_new_total, 'Annual plan token rollover');
  END IF;
  
  -- Log grant
  INSERT INTO token_transactions (user_id, transaction_type, amount, token_source, balance_after, description)
  VALUES (p_user_id, 'subscription_grant', p_amount, 'subscription', v_new_total, 'Monthly subscription token grant');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER FUNCTION: Get tier info
-- ============================================

CREATE OR REPLACE FUNCTION get_tier_info(p_tier subscription_tier)
RETURNS JSONB AS $$
BEGIN
  RETURN CASE p_tier
    WHEN 'free' THEN jsonb_build_object(
      'name', 'Free',
      'displayName', 'Free',
      'isIndividual', false,
      'isFamily', false,
      'isTrial', false,
      'tokensMonthly', 0,
      'maxRollover', 0,
      'householdMembers', 1,
      'priceMonthly', 0,
      'priceAnnual', 0
    )
    WHEN 'individual_monthly' THEN jsonb_build_object(
      'name', 'individual_monthly',
      'displayName', 'Individual Monthly',
      'isIndividual', true,
      'isFamily', false,
      'isTrial', false,
      'tokensMonthly', 100,
      'maxRollover', 0,
      'householdMembers', 1,
      'priceMonthly', 999,
      'priceAnnual', 0
    )
    WHEN 'individual_annual' THEN jsonb_build_object(
      'name', 'individual_annual',
      'displayName', 'Individual Annual',
      'isIndividual', true,
      'isFamily', false,
      'isTrial', false,
      'tokensMonthly', 100,
      'maxRollover', 50,
      'householdMembers', 1,
      'priceMonthly', 825,
      'priceAnnual', 9900
    )
    WHEN 'family_monthly' THEN jsonb_build_object(
      'name', 'family_monthly',
      'displayName', 'Family Monthly',
      'isIndividual', false,
      'isFamily', true,
      'isTrial', false,
      'tokensMonthly', 150,
      'maxRollover', 0,
      'householdMembers', 6,
      'priceMonthly', 1499,
      'priceAnnual', 0
    )
    WHEN 'family_annual' THEN jsonb_build_object(
      'name', 'family_annual',
      'displayName', 'Family Annual',
      'isIndividual', false,
      'isFamily', true,
      'isTrial', false,
      'tokensMonthly', 150,
      'maxRollover', 75,
      'householdMembers', 6,
      'priceMonthly', 1242,
      'priceAnnual', 14900
    )
    WHEN 'trial_individual' THEN jsonb_build_object(
      'name', 'trial_individual',
      'displayName', 'Individual Trial',
      'isIndividual', true,
      'isFamily', false,
      'isTrial', true,
      'tokensMonthly', 100,
      'maxRollover', 0,
      'householdMembers', 1,
      'priceMonthly', 0,
      'priceAnnual', 0
    )
    WHEN 'trial_family' THEN jsonb_build_object(
      'name', 'trial_family',
      'displayName', 'Family Trial',
      'isIndividual', false,
      'isFamily', true,
      'isTrial', true,
      'tokensMonthly', 150,
      'maxRollover', 0,
      'householdMembers', 6,
      'priceMonthly', 0,
      'priceAnnual', 0
    )
    ELSE jsonb_build_object(
      'name', 'free',
      'displayName', 'Free',
      'isIndividual', false,
      'isFamily', false,
      'isTrial', false,
      'tokensMonthly', 0,
      'maxRollover', 0,
      'householdMembers', 1,
      'priceMonthly', 0,
      'priceAnnual', 0
    )
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- RLS FOR EXTENDED HOUSEHOLD MEMBERS
-- ============================================

ALTER TABLE household_members_extended ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their household members"
  ON household_members_extended FOR SELECT
  USING (
    user_id = auth.uid() OR
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can manage household members"
  ON household_members_extended FOR ALL
  USING (
    household_id IN (
      SELECT id FROM households WHERE owner_id = auth.uid()
    )
  );

-- ============================================
-- UPDATE FEATURE FLAGS
-- ============================================

INSERT INTO feature_flags (name, enabled, description) VALUES
  ('three_tier_pricing', true, 'Enable Free/Individual/Family pricing structure'),
  ('family_features', true, 'Enable Family-specific features')
ON CONFLICT (name) DO UPDATE SET enabled = EXCLUDED.enabled;

-- ============================================
-- INDEX FOR TIER QUERIES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_subscriptions_tier_status 
  ON subscriptions(tier, status);


