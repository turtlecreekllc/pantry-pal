-- Subscription System Migration
-- DinnerPlans.ai Premium Subscription & Token System

-- ============================================
-- ENUMS
-- ============================================

-- Subscription tier enum
CREATE TYPE subscription_tier AS ENUM ('free', 'premium_monthly', 'premium_annual', 'trial');

-- Subscription status enum  
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing', 'incomplete');

-- Token transaction type enum
CREATE TYPE token_transaction_type AS ENUM ('usage', 'subscription_grant', 'purchase', 'rollover', 'reset', 'refund');

-- Token source enum
CREATE TYPE token_source AS ENUM ('subscription', 'purchased', 'rollover', 'bonus');

-- AI Feature type enum for tracking
CREATE TYPE ai_feature_type AS ENUM (
  'quick_recipe_suggestion',
  'detailed_recipe_generation',
  'weekly_meal_plan',
  'ingredient_substitution',
  'nutritional_analysis',
  'smart_grocery_list',
  'recipe_modification',
  'use_it_up_plan',
  'chat_query'
);

-- ============================================
-- TABLES
-- ============================================

-- Main subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  tier subscription_tier NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Token balances table
CREATE TABLE IF NOT EXISTS token_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_tokens INTEGER NOT NULL DEFAULT 0,
  purchased_tokens INTEGER NOT NULL DEFAULT 0,
  rollover_tokens INTEGER NOT NULL DEFAULT 0,
  tokens_used_this_period INTEGER NOT NULL DEFAULT 0,
  last_reset_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id),
  CONSTRAINT positive_subscription_tokens CHECK (subscription_tokens >= 0),
  CONSTRAINT positive_purchased_tokens CHECK (purchased_tokens >= 0),
  CONSTRAINT positive_rollover_tokens CHECK (rollover_tokens >= 0),
  CONSTRAINT positive_tokens_used CHECK (tokens_used_this_period >= 0),
  CONSTRAINT max_rollover_tokens CHECK (rollover_tokens <= 50)
);

-- Token transactions table (audit log)
CREATE TABLE IF NOT EXISTS token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type token_transaction_type NOT NULL,
  amount INTEGER NOT NULL, -- Positive for grants, negative for usage
  feature_type ai_feature_type,
  token_source token_source,
  balance_after INTEGER NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription events table (webhook audit log)
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  previous_tier subscription_tier,
  new_tier subscription_tier,
  processed BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Token purchases table (one-time bucket purchases)
CREATE TABLE IF NOT EXISTS token_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  bucket_size INTEGER NOT NULL, -- 50, 150, or 400
  amount_cents INTEGER NOT NULL, -- Price paid in cents
  tokens_granted INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed, refunded
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Usage limits table (for free tier tracking)
CREATE TABLE IF NOT EXISTS usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL DEFAULT CURRENT_DATE,
  pantry_items_count INTEGER NOT NULL DEFAULT 0,
  saved_recipes_count INTEGER NOT NULL DEFAULT 0,
  barcode_scans_count INTEGER NOT NULL DEFAULT 0,
  grocery_lists_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, period_start)
);

-- Savings tracking table (for ROI messaging)
CREATE TABLE IF NOT EXISTS savings_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_start DATE NOT NULL,
  items_saved_from_waste INTEGER NOT NULL DEFAULT 0,
  estimated_savings_cents INTEGER NOT NULL DEFAULT 0,
  co2_avoided_grams INTEGER NOT NULL DEFAULT 0,
  meals_planned INTEGER NOT NULL DEFAULT 0,
  recipes_generated INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month_start)
);

-- Feature flags table
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_tier ON subscriptions(tier);

CREATE INDEX idx_token_balances_user_id ON token_balances(user_id);

CREATE INDEX idx_token_transactions_user_id ON token_transactions(user_id);
CREATE INDEX idx_token_transactions_created_at ON token_transactions(created_at DESC);
CREATE INDEX idx_token_transactions_type ON token_transactions(transaction_type);
CREATE INDEX idx_token_transactions_feature ON token_transactions(feature_type);

CREATE INDEX idx_subscription_events_stripe_event_id ON subscription_events(stripe_event_id);
CREATE INDEX idx_subscription_events_user_id ON subscription_events(user_id);
CREATE INDEX idx_subscription_events_created_at ON subscription_events(created_at DESC);

CREATE INDEX idx_token_purchases_user_id ON token_purchases(user_id);
CREATE INDEX idx_token_purchases_status ON token_purchases(status);

CREATE INDEX idx_usage_limits_user_period ON usage_limits(user_id, period_start);

CREATE INDEX idx_savings_tracking_user_month ON savings_tracking(user_id, month_start);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to get total available tokens for a user
CREATE OR REPLACE FUNCTION get_available_tokens(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_balance token_balances%ROWTYPE;
BEGIN
  SELECT * INTO v_balance FROM token_balances WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Total = subscription + purchased + rollover
  RETURN v_balance.subscription_tokens + v_balance.purchased_tokens + v_balance.rollover_tokens;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to consume tokens (uses purchased first, then subscription, then rollover)
CREATE OR REPLACE FUNCTION consume_tokens(
  p_user_id UUID,
  p_amount INTEGER,
  p_feature_type ai_feature_type,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_balance token_balances%ROWTYPE;
  v_remaining INTEGER;
  v_from_purchased INTEGER := 0;
  v_from_subscription INTEGER := 0;
  v_from_rollover INTEGER := 0;
  v_new_total INTEGER;
BEGIN
  -- Get current balance with lock
  SELECT * INTO v_balance 
  FROM token_balances 
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No token balance found');
  END IF;
  
  -- Check if enough tokens available
  v_new_total := v_balance.subscription_tokens + v_balance.purchased_tokens + v_balance.rollover_tokens;
  IF v_new_total < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient tokens', 'available', v_new_total, 'required', p_amount);
  END IF;
  
  -- Consume from purchased first
  v_remaining := p_amount;
  IF v_balance.purchased_tokens > 0 THEN
    v_from_purchased := LEAST(v_balance.purchased_tokens, v_remaining);
    v_remaining := v_remaining - v_from_purchased;
  END IF;
  
  -- Then from subscription
  IF v_remaining > 0 AND v_balance.subscription_tokens > 0 THEN
    v_from_subscription := LEAST(v_balance.subscription_tokens, v_remaining);
    v_remaining := v_remaining - v_from_subscription;
  END IF;
  
  -- Finally from rollover
  IF v_remaining > 0 AND v_balance.rollover_tokens > 0 THEN
    v_from_rollover := LEAST(v_balance.rollover_tokens, v_remaining);
    v_remaining := v_remaining - v_from_rollover;
  END IF;
  
  -- Update balances
  UPDATE token_balances
  SET 
    purchased_tokens = purchased_tokens - v_from_purchased,
    subscription_tokens = subscription_tokens - v_from_subscription,
    rollover_tokens = rollover_tokens - v_from_rollover,
    tokens_used_this_period = tokens_used_this_period + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Calculate new total
  v_new_total := v_new_total - p_amount;
  
  -- Log transaction
  INSERT INTO token_transactions (
    user_id, transaction_type, amount, feature_type, token_source, balance_after, description
  ) VALUES (
    p_user_id, 'usage', -p_amount, p_feature_type,
    CASE 
      WHEN v_from_purchased > 0 THEN 'purchased'::token_source
      WHEN v_from_subscription > 0 THEN 'subscription'::token_source
      ELSE 'rollover'::token_source
    END,
    v_new_total,
    COALESCE(p_description, 'AI feature usage: ' || p_feature_type::TEXT)
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'consumed', p_amount,
    'from_purchased', v_from_purchased,
    'from_subscription', v_from_subscription,
    'from_rollover', v_from_rollover,
    'balance_after', v_new_total
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to grant subscription tokens (called on billing cycle reset)
CREATE OR REPLACE FUNCTION grant_subscription_tokens(
  p_user_id UUID,
  p_amount INTEGER,
  p_is_annual BOOLEAN DEFAULT FALSE
)
RETURNS VOID AS $$
DECLARE
  v_balance token_balances%ROWTYPE;
  v_rollover INTEGER := 0;
  v_new_total INTEGER;
BEGIN
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
  
  -- Calculate rollover for annual plans (max 50 tokens)
  IF p_is_annual AND v_balance.subscription_tokens > 0 THEN
    v_rollover := LEAST(v_balance.subscription_tokens, 50);
  END IF;
  
  -- Update balances
  UPDATE token_balances
  SET 
    subscription_tokens = p_amount,
    rollover_tokens = LEAST(rollover_tokens + v_rollover, 50),
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

-- Function to add purchased tokens
CREATE OR REPLACE FUNCTION add_purchased_tokens(
  p_user_id UUID,
  p_amount INTEGER,
  p_purchase_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_new_total INTEGER;
BEGIN
  -- Ensure balance record exists
  INSERT INTO token_balances (user_id, purchased_tokens)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id) DO UPDATE
  SET 
    purchased_tokens = token_balances.purchased_tokens + p_amount,
    updated_at = NOW();
  
  -- Get new total
  SELECT subscription_tokens + purchased_tokens + rollover_tokens INTO v_new_total
  FROM token_balances WHERE user_id = p_user_id;
  
  -- Log transaction
  INSERT INTO token_transactions (
    user_id, transaction_type, amount, token_source, balance_after, description, metadata
  ) VALUES (
    p_user_id, 'purchase', p_amount, 'purchased', v_new_total, 'Token bucket purchase',
    CASE WHEN p_purchase_id IS NOT NULL THEN jsonb_build_object('purchase_id', p_purchase_id) ELSE '{}' END
  );
  
  RETURN v_new_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check feature access based on subscription tier
CREATE OR REPLACE FUNCTION check_feature_access(
  p_user_id UUID,
  p_feature TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_subscription subscriptions%ROWTYPE;
  v_usage usage_limits%ROWTYPE;
  v_tier subscription_tier;
  v_is_premium BOOLEAN;
BEGIN
  -- Get subscription
  SELECT * INTO v_subscription FROM subscriptions WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    v_tier := 'free';
  ELSE
    v_tier := v_subscription.tier;
  END IF;
  
  v_is_premium := v_tier IN ('premium_monthly', 'premium_annual', 'trial');
  
  -- Get usage limits for free tier
  IF NOT v_is_premium THEN
    SELECT * INTO v_usage 
    FROM usage_limits 
    WHERE user_id = p_user_id AND period_start = date_trunc('month', CURRENT_DATE)::DATE;
  END IF;
  
  -- Check specific features
  CASE p_feature
    WHEN 'ai_features' THEN
      IF NOT v_is_premium THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Premium subscription required for AI features');
      END IF;
      RETURN jsonb_build_object('allowed', true);
      
    WHEN 'unlimited_pantry' THEN
      IF NOT v_is_premium AND COALESCE(v_usage.pantry_items_count, 0) >= 50 THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Free tier limited to 50 pantry items', 'current', v_usage.pantry_items_count, 'limit', 50);
      END IF;
      RETURN jsonb_build_object('allowed', true);
      
    WHEN 'unlimited_recipes' THEN
      IF NOT v_is_premium AND COALESCE(v_usage.saved_recipes_count, 0) >= 25 THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Free tier limited to 25 saved recipes', 'current', v_usage.saved_recipes_count, 'limit', 25);
      END IF;
      RETURN jsonb_build_object('allowed', true);
      
    WHEN 'barcode_scan' THEN
      IF NOT v_is_premium AND COALESCE(v_usage.barcode_scans_count, 0) >= 10 THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Free tier limited to 10 barcode scans per month', 'current', v_usage.barcode_scans_count, 'limit', 10);
      END IF;
      RETURN jsonb_build_object('allowed', true);
      
    WHEN 'household_sharing' THEN
      IF NOT v_is_premium THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Premium subscription required for household sharing');
      END IF;
      RETURN jsonb_build_object('allowed', true);
      
    WHEN 'multiple_grocery_lists' THEN
      IF NOT v_is_premium AND COALESCE(v_usage.grocery_lists_count, 0) >= 1 THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Free tier limited to 1 grocery list', 'current', v_usage.grocery_lists_count, 'limit', 1);
      END IF;
      RETURN jsonb_build_object('allowed', true);
      
    WHEN 'recipe_scaling' THEN
      IF NOT v_is_premium THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Premium subscription required for recipe scaling');
      END IF;
      RETURN jsonb_build_object('allowed', true);
      
    ELSE
      RETURN jsonb_build_object('allowed', true);
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to initialize subscription for new user
CREATE OR REPLACE FUNCTION initialize_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Create free tier subscription
  INSERT INTO subscriptions (user_id, tier, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create token balance (0 for free tier)
  INSERT INTO token_balances (user_id, subscription_tokens, purchased_tokens, rollover_tokens)
  VALUES (NEW.id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Initialize usage limits
  INSERT INTO usage_limits (user_id, period_start)
  VALUES (NEW.id, date_trunc('month', CURRENT_DATE)::DATE)
  ON CONFLICT (user_id, period_start) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to initialize subscription for new users
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_subscription();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_token_balances_updated_at
  BEFORE UPDATE ON token_balances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_limits_updated_at
  BEFORE UPDATE ON usage_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_savings_tracking_updated_at
  BEFORE UPDATE ON savings_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to upsert savings tracking
CREATE OR REPLACE FUNCTION upsert_savings_tracking(
  p_user_id UUID,
  p_month_start DATE,
  p_items_saved INTEGER DEFAULT 0,
  p_savings_cents INTEGER DEFAULT 0,
  p_co2_grams INTEGER DEFAULT 0,
  p_meals_planned INTEGER DEFAULT 0,
  p_recipes_generated INTEGER DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO savings_tracking (
    user_id, month_start, items_saved_from_waste, estimated_savings_cents,
    co2_avoided_grams, meals_planned, recipes_generated
  ) VALUES (
    p_user_id, p_month_start, p_items_saved, p_savings_cents,
    p_co2_grams, p_meals_planned, p_recipes_generated
  )
  ON CONFLICT (user_id, month_start) DO UPDATE SET
    items_saved_from_waste = savings_tracking.items_saved_from_waste + p_items_saved,
    estimated_savings_cents = savings_tracking.estimated_savings_cents + p_savings_cents,
    co2_avoided_grams = savings_tracking.co2_avoided_grams + p_co2_grams,
    meals_planned = savings_tracking.meals_planned + p_meals_planned,
    recipes_generated = savings_tracking.recipes_generated + p_recipes_generated,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment usage limit
CREATE OR REPLACE FUNCTION increment_usage_limit(
  p_user_id UUID,
  p_period_start DATE,
  p_column TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Ensure the record exists
  INSERT INTO usage_limits (user_id, period_start)
  VALUES (p_user_id, p_period_start)
  ON CONFLICT (user_id, period_start) DO NOTHING;
  -- Increment the appropriate column
  EXECUTE format(
    'UPDATE usage_limits SET %I = %I + 1, updated_at = NOW() WHERE user_id = $1 AND period_start = $2',
    p_column, p_column
  ) USING p_user_id, p_period_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription data
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own token balance"
  ON token_balances FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own token transactions"
  ON token_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own subscription events"
  ON subscription_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own token purchases"
  ON token_purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own usage limits"
  ON usage_limits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own savings"
  ON savings_tracking FOR SELECT
  USING (auth.uid() = user_id);

-- Feature flags are readable by everyone
CREATE POLICY "Anyone can view feature flags"
  ON feature_flags FOR SELECT
  USING (true);

-- Service role can do everything (for webhooks)
CREATE POLICY "Service role full access subscriptions"
  ON subscriptions FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access token_balances"
  ON token_balances FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access token_transactions"
  ON token_transactions FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access subscription_events"
  ON subscription_events FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access token_purchases"
  ON token_purchases FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access usage_limits"
  ON usage_limits FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access savings_tracking"
  ON savings_tracking FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access feature_flags"
  ON feature_flags FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- SEED DATA
-- ============================================

-- Insert default feature flags
INSERT INTO feature_flags (name, enabled, description) VALUES
  ('subscriptions_enabled', false, 'Master switch for subscription system'),
  ('trial_enabled', true, 'Show 14-day trial option'),
  ('token_buckets_enabled', true, 'Allow token bucket purchases'),
  ('annual_plans_enabled', true, 'Show annual plan option'),
  ('roi_messaging_enabled', true, 'Display savings estimates')
ON CONFLICT (name) DO NOTHING;

-- Initialize subscriptions for existing users
INSERT INTO subscriptions (user_id, tier, status)
SELECT id, 'free', 'active' FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Initialize token balances for existing users
INSERT INTO token_balances (user_id, subscription_tokens, purchased_tokens, rollover_tokens)
SELECT id, 0, 0, 0 FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

