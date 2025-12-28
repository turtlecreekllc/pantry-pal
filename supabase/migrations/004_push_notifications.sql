-- Migration for Push Notifications
-- Run this after previous migrations

-- =====================================================
-- PUSH TOKENS TABLE
-- Stores Expo push tokens for each user/device
-- =====================================================

CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL,
  platform VARCHAR(20) CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- =====================================================
-- NOTIFICATION PREFERENCES TABLE
-- Stores user notification preferences
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  expiry_reminders BOOLEAN DEFAULT true,
  meal_reminders BOOLEAN DEFAULT true,
  household_activity BOOLEAN DEFAULT true,
  expiry_days_before INTEGER DEFAULT 3,
  meal_hours_before INTEGER DEFAULT 2,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Push tokens policies - users can only manage their own
CREATE POLICY "Users manage own push tokens"
  ON push_tokens FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Notification preferences policies
CREATE POLICY "Users manage own notification preferences"
  ON notification_preferences FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_push_tokens_updated_at ON push_tokens;
CREATE TRIGGER update_push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get household members' push tokens
-- Used for sending notifications to all household members
CREATE OR REPLACE FUNCTION get_household_push_tokens(p_household_id UUID)
RETURNS TABLE (
  user_id UUID,
  token VARCHAR(255),
  platform VARCHAR(20)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow household members to get tokens
  IF NOT is_household_member(p_household_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  RETURN QUERY
  SELECT 
    pt.user_id,
    pt.token,
    pt.platform
  FROM push_tokens pt
  INNER JOIN household_members hm ON pt.user_id = hm.user_id
  WHERE hm.household_id = p_household_id;
END;
$$;

-- Function to check if user wants notifications of a certain type
CREATE OR REPLACE FUNCTION should_notify_user(
  p_user_id UUID,
  p_notification_type VARCHAR(50)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefs notification_preferences%ROWTYPE;
  check_time TIME;
BEGIN
  SELECT * INTO prefs FROM notification_preferences WHERE user_id = p_user_id;
  
  -- If no preferences, default to true
  IF NOT FOUND THEN
    RETURN true;
  END IF;
  
  -- Check quiet hours
  check_time := LOCALTIME;
  IF prefs.quiet_hours_start IS NOT NULL AND prefs.quiet_hours_end IS NOT NULL THEN
    IF prefs.quiet_hours_start < prefs.quiet_hours_end THEN
      -- Normal range (e.g., 09:00 to 22:00)
      IF check_time < prefs.quiet_hours_start OR check_time > prefs.quiet_hours_end THEN
        RETURN false;
      END IF;
    ELSE
      -- Overnight range (e.g., 22:00 to 07:00)
      IF check_time >= prefs.quiet_hours_start OR check_time <= prefs.quiet_hours_end THEN
        RETURN false;
      END IF;
    END IF;
  END IF;
  
  -- Check notification type preference
  CASE p_notification_type
    WHEN 'expiry' THEN RETURN prefs.expiry_reminders;
    WHEN 'meal' THEN RETURN prefs.meal_reminders;
    WHEN 'household' THEN RETURN prefs.household_activity;
    ELSE RETURN true;
  END CASE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_household_push_tokens(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION should_notify_user(UUID, VARCHAR) TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE push_tokens IS 'Stores Expo push notification tokens for users';
COMMENT ON TABLE notification_preferences IS 'User preferences for push notifications';

