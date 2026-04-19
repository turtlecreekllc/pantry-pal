-- Apple IAP Support Migration
-- Adds support for hybrid payment system (Apple IAP + Stripe)

-- ============================================
-- ENUMS
-- ============================================

-- Payment provider enum
CREATE TYPE payment_provider AS ENUM ('stripe', 'apple');

-- Apple transaction status enum
CREATE TYPE apple_transaction_status AS ENUM (
  'purchased',
  'renewed',
  'expired',
  'revoked',
  'grace_period',
  'billing_retry'
);

-- ============================================
-- ALTER TABLES
-- ============================================

-- Add payment provider and Apple-specific fields to subscriptions
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS payment_provider payment_provider DEFAULT 'stripe',
ADD COLUMN IF NOT EXISTS apple_original_transaction_id TEXT,
ADD COLUMN IF NOT EXISTS apple_transaction_id TEXT,
ADD COLUMN IF NOT EXISTS apple_product_id TEXT,
ADD COLUMN IF NOT EXISTS apple_environment TEXT, -- 'Production' or 'Sandbox'
ADD COLUMN IF NOT EXISTS apple_purchase_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS apple_expires_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS apple_auto_renew_status BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS apple_is_in_billing_retry BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS apple_grace_period_expires TIMESTAMPTZ;

-- Add storefront info for location detection
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS storefront TEXT, -- e.g., 'USA', 'GBR', 'CAN'
ADD COLUMN IF NOT EXISTS storefront_id TEXT;

-- ============================================
-- NEW TABLES
-- ============================================

-- Apple App Store Server Notifications log
CREATE TABLE IF NOT EXISTS apple_server_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL, -- SUBSCRIBED, DID_RENEW, etc.
  subtype TEXT, -- INITIAL_BUY, RESUBSCRIBE, etc.
  notification_uuid TEXT NOT NULL UNIQUE,
  signed_date TIMESTAMPTZ NOT NULL,
  original_transaction_id TEXT,
  transaction_id TEXT,
  product_id TEXT,
  environment TEXT, -- 'Production' or 'Sandbox'
  bundle_id TEXT,
  app_apple_id BIGINT,
  raw_payload JSONB,
  processed BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Apple receipt validation cache
CREATE TABLE IF NOT EXISTS apple_receipt_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_transaction_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  purchase_date TIMESTAMPTZ NOT NULL,
  expires_date TIMESTAMPTZ,
  is_trial_period BOOLEAN DEFAULT FALSE,
  is_in_intro_offer_period BOOLEAN DEFAULT FALSE,
  is_upgraded BOOLEAN DEFAULT FALSE,
  environment TEXT NOT NULL,
  validation_status TEXT NOT NULL, -- 'valid', 'invalid', 'expired'
  raw_receipt JSONB,
  validated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(original_transaction_id, transaction_id)
);

-- User storefront tracking (for determining payment options)
CREATE TABLE IF NOT EXISTS user_storefronts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storefront TEXT NOT NULL, -- ISO 3166-1 alpha-3 country code
  storefront_id TEXT, -- App Store Connect storefront ID
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT NOT NULL, -- 'storekit', 'ip', 'manual'
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Apple product configuration (mirrors App Store Connect products)
CREATE TABLE IF NOT EXISTS apple_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL UNIQUE, -- App Store Connect product ID
  name TEXT NOT NULL,
  description TEXT,
  product_type TEXT NOT NULL, -- 'subscription', 'non_consumable', 'consumable'
  subscription_group_id TEXT,
  subscription_group_level INTEGER, -- For upgrade/downgrade detection
  tier subscription_tier, -- Maps to internal tier
  tokens_granted INTEGER DEFAULT 0, -- For token products
  price_cents INTEGER, -- Reference price (actual price from StoreKit)
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_subscriptions_payment_provider ON subscriptions(payment_provider);
CREATE INDEX idx_subscriptions_apple_original_transaction ON subscriptions(apple_original_transaction_id);
CREATE INDEX idx_subscriptions_storefront ON subscriptions(storefront);

CREATE INDEX idx_apple_notifications_user_id ON apple_server_notifications(user_id);
CREATE INDEX idx_apple_notifications_original_transaction ON apple_server_notifications(original_transaction_id);
CREATE INDEX idx_apple_notifications_notification_uuid ON apple_server_notifications(notification_uuid);
CREATE INDEX idx_apple_notifications_created_at ON apple_server_notifications(created_at DESC);

CREATE INDEX idx_apple_receipts_user_id ON apple_receipt_validations(user_id);
CREATE INDEX idx_apple_receipts_original_transaction ON apple_receipt_validations(original_transaction_id);
CREATE INDEX idx_apple_receipts_validated_at ON apple_receipt_validations(validated_at DESC);

CREATE INDEX idx_user_storefronts_user_id ON user_storefronts(user_id);
CREATE INDEX idx_user_storefronts_storefront ON user_storefronts(storefront);

CREATE INDEX idx_apple_products_product_id ON apple_products(product_id);
CREATE INDEX idx_apple_products_tier ON apple_products(tier);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update subscription from Apple notification
CREATE OR REPLACE FUNCTION update_subscription_from_apple(
  p_user_id UUID,
  p_original_transaction_id TEXT,
  p_transaction_id TEXT,
  p_product_id TEXT,
  p_purchase_date TIMESTAMPTZ,
  p_expires_date TIMESTAMPTZ,
  p_auto_renew_status BOOLEAN,
  p_environment TEXT
)
RETURNS VOID AS $$
DECLARE
  v_tier subscription_tier;
  v_tokens INTEGER;
BEGIN
  -- Get tier and tokens from product configuration
  SELECT tier, tokens_granted INTO v_tier, v_tokens
  FROM apple_products
  WHERE product_id = p_product_id;
  
  IF v_tier IS NULL THEN
    -- Default mapping based on product ID patterns
    IF p_product_id LIKE '%annual%' THEN
      v_tier := 'premium_annual';
    ELSIF p_product_id LIKE '%monthly%' THEN
      v_tier := 'premium_monthly';
    ELSE
      v_tier := 'premium_monthly';
    END IF;
    v_tokens := 100;
  END IF;
  
  -- Update or insert subscription
  INSERT INTO subscriptions (
    user_id,
    payment_provider,
    tier,
    status,
    apple_original_transaction_id,
    apple_transaction_id,
    apple_product_id,
    apple_purchase_date,
    apple_expires_date,
    apple_auto_renew_status,
    apple_environment,
    current_period_start,
    current_period_end
  ) VALUES (
    p_user_id,
    'apple',
    v_tier,
    'active',
    p_original_transaction_id,
    p_transaction_id,
    p_product_id,
    p_purchase_date,
    p_expires_date,
    p_auto_renew_status,
    p_environment,
    p_purchase_date,
    p_expires_date
  )
  ON CONFLICT (user_id) DO UPDATE SET
    payment_provider = 'apple',
    tier = v_tier,
    status = 'active',
    apple_original_transaction_id = p_original_transaction_id,
    apple_transaction_id = p_transaction_id,
    apple_product_id = p_product_id,
    apple_purchase_date = p_purchase_date,
    apple_expires_date = p_expires_date,
    apple_auto_renew_status = p_auto_renew_status,
    apple_environment = p_environment,
    current_period_start = p_purchase_date,
    current_period_end = p_expires_date,
    updated_at = NOW();
  
  -- Grant tokens if new subscription
  IF v_tokens > 0 THEN
    PERFORM grant_subscription_tokens(
      p_user_id,
      v_tokens,
      v_tier = 'premium_annual'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle Apple subscription expiration
CREATE OR REPLACE FUNCTION expire_apple_subscription(
  p_user_id UUID,
  p_original_transaction_id TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE subscriptions
  SET 
    tier = 'free',
    status = 'canceled',
    ended_at = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id
  AND apple_original_transaction_id = p_original_transaction_id;
  
  -- Reset subscription tokens (keep purchased)
  UPDATE token_balances
  SET 
    subscription_tokens = 0,
    rollover_tokens = 0,
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle Apple grace period
CREATE OR REPLACE FUNCTION set_apple_grace_period(
  p_user_id UUID,
  p_original_transaction_id TEXT,
  p_grace_period_expires TIMESTAMPTZ
)
RETURNS VOID AS $$
BEGIN
  UPDATE subscriptions
  SET 
    status = 'past_due',
    apple_is_in_billing_retry = TRUE,
    apple_grace_period_expires = p_grace_period_expires,
    updated_at = NOW()
  WHERE user_id = p_user_id
  AND apple_original_transaction_id = p_original_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to save user storefront
CREATE OR REPLACE FUNCTION save_user_storefront(
  p_user_id UUID,
  p_storefront TEXT,
  p_storefront_id TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'storekit'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_storefronts (user_id, storefront, storefront_id, source)
  VALUES (p_user_id, p_storefront, p_storefront_id, p_source)
  ON CONFLICT (user_id) DO UPDATE SET
    storefront = p_storefront,
    storefront_id = COALESCE(p_storefront_id, user_storefronts.storefront_id),
    source = p_source,
    updated_at = NOW();
  
  -- Also update subscription record
  UPDATE subscriptions
  SET 
    storefront = p_storefront,
    storefront_id = COALESCE(p_storefront_id, subscriptions.storefront_id),
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is in US storefront
CREATE OR REPLACE FUNCTION is_us_storefront(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_storefront TEXT;
BEGIN
  SELECT storefront INTO v_storefront
  FROM user_storefronts
  WHERE user_id = p_user_id;
  
  RETURN v_storefront = 'USA';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE apple_server_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE apple_receipt_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_storefronts ENABLE ROW LEVEL SECURITY;
ALTER TABLE apple_products ENABLE ROW LEVEL SECURITY;

-- Users can view their own Apple data
CREATE POLICY "Users can view own apple notifications"
  ON apple_server_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own receipt validations"
  ON apple_receipt_validations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own storefront"
  ON user_storefronts FOR SELECT
  USING (auth.uid() = user_id);

-- Anyone can view active Apple products (for purchase flow)
CREATE POLICY "Anyone can view active products"
  ON apple_products FOR SELECT
  USING (is_active = TRUE);

-- Service role can do everything
CREATE POLICY "Service role full access apple_notifications"
  ON apple_server_notifications FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access apple_receipts"
  ON apple_receipt_validations FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access user_storefronts"
  ON user_storefronts FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access apple_products"
  ON apple_products FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- SEED DATA - Apple Products
-- ============================================

-- Insert product configurations (update with your App Store Connect product IDs)
-- Product IDs must match those configured in App Store Connect
INSERT INTO apple_products (product_id, name, description, product_type, tier, tokens_granted, price_cents) VALUES
  ('com.turtlecreekllc.dinnerplans.premium.monthly', 'Premium Monthly', 'Monthly premium subscription', 'subscription', 'premium_monthly', 100, 699),
  ('com.turtlecreekllc.dinnerplans.premium.annual', 'Premium Annual', 'Annual premium subscription with 17% savings', 'subscription', 'premium_annual', 100, 6900),
  ('com.turtlecreekllc.dinnerplans.tokens.50', '50 AI Tokens', 'Token pack for AI features', 'consumable', NULL, 50, 199),
  ('com.turtlecreekllc.dinnerplans.tokens.150', '150 AI Tokens', 'Token pack for AI features', 'consumable', NULL, 150, 499),
  ('com.turtlecreekllc.dinnerplans.tokens.400', '400 AI Tokens', 'Token pack for AI features', 'consumable', NULL, 400, 999)
ON CONFLICT (product_id) DO NOTHING;

-- Add feature flag for Apple payments
INSERT INTO feature_flags (name, enabled, description) VALUES
  ('apple_iap_enabled', true, 'Enable Apple In-App Purchase option'),
  ('external_payments_us_only', true, 'Only show Stripe option to US users')
ON CONFLICT (name) DO NOTHING;

