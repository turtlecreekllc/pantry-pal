-- Household Sharing Feature Migration
-- This migration creates the database schema for household sharing functionality
-- Run this in your Supabase SQL Editor or as a migration

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLES
-- =====================================================

-- Households table
CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Household members join table
CREATE TABLE IF NOT EXISTS household_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'member')) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(household_id, user_id)
);

-- Household invitations
CREATE TABLE IF NOT EXISTS household_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Household activity log for activity feed
CREATE TABLE IF NOT EXISTS household_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
    'item_added', 'item_updated', 'item_deleted',
    'meal_planned', 'meal_completed',
    'member_joined', 'member_left'
  )),
  action_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- MODIFY EXISTING TABLES
-- Add household_id to existing tables for shared data
-- =====================================================

-- Add household_id to pantry_items
ALTER TABLE pantry_items 
ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE CASCADE;

-- Add household_id to meal_plans
ALTER TABLE meal_plans 
ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE CASCADE;

-- Add household_id to grocery_items
ALTER TABLE grocery_items 
ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE CASCADE;

-- Add household_id to meal_completion_logs
ALTER TABLE meal_completion_logs 
ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE CASCADE;

-- =====================================================
-- INDEXES
-- =====================================================

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_household_members_household_id ON household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_household_members_user_id ON household_members(user_id);
CREATE INDEX IF NOT EXISTS idx_household_invites_email ON household_invites(email);
CREATE INDEX IF NOT EXISTS idx_household_invites_token ON household_invites(token);
CREATE INDEX IF NOT EXISTS idx_household_invites_status ON household_invites(status);
CREATE INDEX IF NOT EXISTS idx_household_activities_household_id ON household_activities(household_id);
CREATE INDEX IF NOT EXISTS idx_household_activities_created_at ON household_activities(created_at DESC);

-- Indexes for household_id on existing tables
CREATE INDEX IF NOT EXISTS idx_pantry_items_household_id ON pantry_items(household_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_household_id ON meal_plans(household_id);
CREATE INDEX IF NOT EXISTS idx_grocery_items_household_id ON grocery_items(household_id);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get current user's household_id from JWT claims
CREATE OR REPLACE FUNCTION get_household_id() RETURNS UUID AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'household_id')::UUID;
$$ LANGUAGE SQL STABLE;

-- Function to check if user is a member of a household
CREATE OR REPLACE FUNCTION is_household_member(p_household_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM household_members
    WHERE household_id = p_household_id
    AND user_id = auth.uid()
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Function to get user's role in a household
CREATE OR REPLACE FUNCTION get_household_role(p_household_id UUID) RETURNS VARCHAR AS $$
  SELECT role FROM household_members
  WHERE household_id = p_household_id
  AND user_id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Function to check if user can manage members (owner or admin)
CREATE OR REPLACE FUNCTION can_manage_household(p_household_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM household_members
    WHERE household_id = p_household_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_activities ENABLE ROW LEVEL SECURITY;

-- Households policies
DROP POLICY IF EXISTS "Users can view households they belong to" ON households;
CREATE POLICY "Users can view households they belong to"
  ON households FOR SELECT
  USING (is_household_member(id));

DROP POLICY IF EXISTS "Users can create households" ON households;
CREATE POLICY "Users can create households"
  ON households FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Owners can update their household" ON households;
CREATE POLICY "Owners can update their household"
  ON households FOR UPDATE
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can delete their household" ON households;
CREATE POLICY "Owners can delete their household"
  ON households FOR DELETE
  USING (owner_id = auth.uid());

-- Household members policies
DROP POLICY IF EXISTS "Members can view other members in their household" ON household_members;
CREATE POLICY "Members can view other members in their household"
  ON household_members FOR SELECT
  USING (is_household_member(household_id));

DROP POLICY IF EXISTS "Users can join households (via invite)" ON household_members;
CREATE POLICY "Users can join households (via invite)"
  ON household_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Owners/Admins can manage members" ON household_members;
CREATE POLICY "Owners/Admins can manage members"
  ON household_members FOR UPDATE
  USING (can_manage_household(household_id));

DROP POLICY IF EXISTS "Owners can remove members or members can leave" ON household_members;
CREATE POLICY "Owners can remove members or members can leave"
  ON household_members FOR DELETE
  USING (
    user_id = auth.uid() OR 
    (SELECT role FROM household_members WHERE household_id = household_members.household_id AND user_id = auth.uid()) = 'owner'
  );

-- Household invites policies
DROP POLICY IF EXISTS "Members can view invites for their household" ON household_invites;
CREATE POLICY "Members can view invites for their household"
  ON household_invites FOR SELECT
  USING (
    is_household_member(household_id) OR
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Owners/Admins can create invites" ON household_invites;
CREATE POLICY "Owners/Admins can create invites"
  ON household_invites FOR INSERT
  WITH CHECK (can_manage_household(household_id));

DROP POLICY IF EXISTS "Owners/Admins can update invites" ON household_invites;
CREATE POLICY "Owners/Admins can update invites"
  ON household_invites FOR UPDATE
  USING (can_manage_household(household_id));

DROP POLICY IF EXISTS "Owners/Admins can delete invites" ON household_invites;
CREATE POLICY "Owners/Admins can delete invites"
  ON household_invites FOR DELETE
  USING (can_manage_household(household_id));

-- Household activities policies
DROP POLICY IF EXISTS "Members can view activities in their household" ON household_activities;
CREATE POLICY "Members can view activities in their household"
  ON household_activities FOR SELECT
  USING (is_household_member(household_id));

DROP POLICY IF EXISTS "Members can create activities" ON household_activities;
CREATE POLICY "Members can create activities"
  ON household_activities FOR INSERT
  WITH CHECK (is_household_member(household_id));

-- =====================================================
-- UPDATED RLS POLICIES FOR EXISTING TABLES
-- These policies allow access via user_id OR household_id
-- =====================================================

-- Drop existing policies if they exist and recreate with household support
-- Note: You may need to adjust these based on your existing policies

-- Pantry items policies (example - adjust based on existing policies)
DROP POLICY IF EXISTS "Users can view their own items" ON pantry_items;
DROP POLICY IF EXISTS "Users can view household items" ON pantry_items;
DROP POLICY IF EXISTS "Users can view their items or household items" ON pantry_items;

CREATE POLICY "Users can view their items or household items"
  ON pantry_items FOR SELECT
  USING (
    user_id = auth.uid() OR 
    (household_id IS NOT NULL AND is_household_member(household_id))
  );

DROP POLICY IF EXISTS "Users can insert their own items" ON pantry_items;
DROP POLICY IF EXISTS "Users can insert household items" ON pantry_items;
DROP POLICY IF EXISTS "Users can insert items" ON pantry_items;

CREATE POLICY "Users can insert items"
  ON pantry_items FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    (household_id IS NULL OR is_household_member(household_id))
  );

DROP POLICY IF EXISTS "Users can update their own items" ON pantry_items;
DROP POLICY IF EXISTS "Users can update household items" ON pantry_items;
DROP POLICY IF EXISTS "Users can update items" ON pantry_items;

CREATE POLICY "Users can update items"
  ON pantry_items FOR UPDATE
  USING (
    user_id = auth.uid() OR 
    (household_id IS NOT NULL AND is_household_member(household_id))
  );

DROP POLICY IF EXISTS "Users can delete their own items" ON pantry_items;
DROP POLICY IF EXISTS "Users can delete household items" ON pantry_items;
DROP POLICY IF EXISTS "Users can delete items" ON pantry_items;

CREATE POLICY "Users can delete items"
  ON pantry_items FOR DELETE
  USING (
    user_id = auth.uid() OR 
    (household_id IS NOT NULL AND is_household_member(household_id))
  );

-- Meal plans policies
DROP POLICY IF EXISTS "Users can view their own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can view household meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can view meal plans" ON meal_plans;

CREATE POLICY "Users can view meal plans"
  ON meal_plans FOR SELECT
  USING (
    user_id = auth.uid() OR 
    (household_id IS NOT NULL AND is_household_member(household_id))
  );

DROP POLICY IF EXISTS "Users can insert their own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can insert household meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can insert meal plans" ON meal_plans;

CREATE POLICY "Users can insert meal plans"
  ON meal_plans FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    (household_id IS NULL OR is_household_member(household_id))
  );

DROP POLICY IF EXISTS "Users can update their own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can update household meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can update meal plans" ON meal_plans;

CREATE POLICY "Users can update meal plans"
  ON meal_plans FOR UPDATE
  USING (
    user_id = auth.uid() OR 
    (household_id IS NOT NULL AND is_household_member(household_id))
  );

DROP POLICY IF EXISTS "Users can delete their own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can delete household meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can delete meal plans" ON meal_plans;

CREATE POLICY "Users can delete meal plans"
  ON meal_plans FOR DELETE
  USING (
    user_id = auth.uid() OR 
    (household_id IS NOT NULL AND is_household_member(household_id))
  );

-- Grocery items policies
DROP POLICY IF EXISTS "Users can view their own grocery items" ON grocery_items;
DROP POLICY IF EXISTS "Users can view household grocery items" ON grocery_items;
DROP POLICY IF EXISTS "Users can view grocery items" ON grocery_items;

CREATE POLICY "Users can view grocery items"
  ON grocery_items FOR SELECT
  USING (
    user_id = auth.uid() OR 
    (household_id IS NOT NULL AND is_household_member(household_id))
  );

DROP POLICY IF EXISTS "Users can insert their own grocery items" ON grocery_items;
DROP POLICY IF EXISTS "Users can insert household grocery items" ON grocery_items;
DROP POLICY IF EXISTS "Users can insert grocery items" ON grocery_items;

CREATE POLICY "Users can insert grocery items"
  ON grocery_items FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    (household_id IS NULL OR is_household_member(household_id))
  );

DROP POLICY IF EXISTS "Users can update their own grocery items" ON grocery_items;
DROP POLICY IF EXISTS "Users can update household grocery items" ON grocery_items;
DROP POLICY IF EXISTS "Users can update grocery items" ON grocery_items;

CREATE POLICY "Users can update grocery items"
  ON grocery_items FOR UPDATE
  USING (
    user_id = auth.uid() OR 
    (household_id IS NOT NULL AND is_household_member(household_id))
  );

DROP POLICY IF EXISTS "Users can delete their own grocery items" ON grocery_items;
DROP POLICY IF EXISTS "Users can delete household grocery items" ON grocery_items;
DROP POLICY IF EXISTS "Users can delete grocery items" ON grocery_items;

CREATE POLICY "Users can delete grocery items"
  ON grocery_items FOR DELETE
  USING (
    user_id = auth.uid() OR 
    (household_id IS NOT NULL AND is_household_member(household_id))
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to automatically set household owner when creating a household
CREATE OR REPLACE FUNCTION set_household_owner()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_household_owner_trigger ON households;
CREATE TRIGGER set_household_owner_trigger
  BEFORE INSERT ON households
  FOR EACH ROW
  EXECUTE FUNCTION set_household_owner();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_households_updated_at ON households;
CREATE TRIGGER update_households_updated_at
  BEFORE UPDATE ON households
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Trigger to expire old invites
CREATE OR REPLACE FUNCTION expire_old_invites()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE household_invites 
  SET status = 'expired' 
  WHERE expires_at < NOW() AND status = 'pending';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- This could be run periodically via a cron job or Supabase edge function
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('expire-invites', '0 * * * *', 'SELECT expire_old_invites()');

-- =====================================================
-- SAMPLE QUERIES FOR TESTING
-- =====================================================

-- Create a household:
-- INSERT INTO households (name) VALUES ('Smith Family');

-- Get user's households:
-- SELECT h.*, hm.role as user_role 
-- FROM households h 
-- JOIN household_members hm ON h.id = hm.household_id 
-- WHERE hm.user_id = auth.uid();

-- Get all members of a household:
-- SELECT hm.*, u.email 
-- FROM household_members hm 
-- JOIN auth.users u ON hm.user_id = u.id 
-- WHERE hm.household_id = 'household-uuid';

-- Create an invite:
-- INSERT INTO household_invites (household_id, email, token, expires_at)
-- VALUES ('household-uuid', 'newmember@example.com', 'random-token', NOW() + INTERVAL '7 days');

COMMENT ON TABLE households IS 'Households for shared pantry management';
COMMENT ON TABLE household_members IS 'Many-to-many relationship between users and households with role support';
COMMENT ON TABLE household_invites IS 'Pending invitations to join households';
COMMENT ON TABLE household_activities IS 'Activity feed for household actions';

