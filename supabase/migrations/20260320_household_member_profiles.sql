-- Migration: household_member_profiles
-- Purpose: Per-member dietary preferences for "Who's eating tonight?" feature.
--          Supports non-app members (children) via nullable user_id.
--
-- Member profile relationships:
--
--   households (1)
--     └─→ household_member_profiles (many)
--           ├─ user_id (nullable — null for children/guests without accounts)
--           ├─ dietary_preferences[] e.g. ['mediterranean', 'vegetarian']
--           ├─ allergies[] e.g. ['gluten', 'dairy']
--           ├─ disliked_ingredients[] e.g. ['pizza', 'mushrooms']
--           ├─ cooking_method_preferences[] e.g. ['baked-only', 'no-fry']
--           └─ is_default_included — pre-checked in tonight roster by default

CREATE TABLE IF NOT EXISTS household_member_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- nullable for children/guests
  display_name TEXT NOT NULL,
  avatar_emoji TEXT NOT NULL DEFAULT '👤',
  dietary_preferences TEXT[] NOT NULL DEFAULT '{}',
  allergies TEXT[] NOT NULL DEFAULT '{}',
  disliked_ingredients TEXT[] NOT NULL DEFAULT '{}',
  cooking_method_preferences TEXT[] NOT NULL DEFAULT '{}', -- e.g. ['baked-only', 'no-fry']
  is_default_included BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by household
CREATE INDEX IF NOT EXISTS idx_household_member_profiles_household
  ON household_member_profiles(household_id);

-- Index for linking app users to their profile
CREATE INDEX IF NOT EXISTS idx_household_member_profiles_user
  ON household_member_profiles(user_id) WHERE user_id IS NOT NULL;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_household_member_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER household_member_profiles_updated_at
  BEFORE UPDATE ON household_member_profiles
  FOR EACH ROW EXECUTE FUNCTION update_household_member_profiles_updated_at();

-- RLS
ALTER TABLE household_member_profiles ENABLE ROW LEVEL SECURITY;

-- Household members can read all profiles in their household
CREATE POLICY "household_members_can_read_profiles"
  ON household_member_profiles FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );

-- Household members can insert profiles into their household
CREATE POLICY "household_members_can_insert_profiles"
  ON household_member_profiles FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );

-- Household members can update profiles in their household
CREATE POLICY "household_members_can_update_profiles"
  ON household_member_profiles FOR UPDATE
  USING (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );

-- Household members can delete profiles in their household
CREATE POLICY "household_members_can_delete_profiles"
  ON household_member_profiles FOR DELETE
  USING (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );
