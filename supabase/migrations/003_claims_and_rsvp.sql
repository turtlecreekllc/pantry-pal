-- Migration for Item Claims and Meal RSVP features
-- Run this after 001_household_sharing.sql and 002_household_member_emails.sql

-- =====================================================
-- ITEM CLAIMS TABLE
-- Allows members to reserve items for themselves
-- =====================================================

CREATE TABLE IF NOT EXISTS item_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pantry_item_id UUID NOT NULL REFERENCES pantry_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pantry_item_id, user_id)
);

-- =====================================================
-- MEAL RSVP TABLE
-- Tracks who's attending planned meals
-- =====================================================

CREATE TABLE IF NOT EXISTS meal_rsvps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('attending', 'not_attending', 'maybe')) DEFAULT 'maybe',
  servings INTEGER DEFAULT 1,
  note VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(meal_plan_id, user_id)
);

-- =====================================================
-- MEAL ASSIGNMENTS TABLE
-- Assigns cooking responsibility to members
-- =====================================================

CREATE TABLE IF NOT EXISTS meal_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(meal_plan_id, user_id)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_item_claims_pantry_item ON item_claims(pantry_item_id);
CREATE INDEX IF NOT EXISTS idx_item_claims_user ON item_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_rsvps_meal_plan ON meal_rsvps(meal_plan_id);
CREATE INDEX IF NOT EXISTS idx_meal_rsvps_user ON meal_rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_assignments_meal_plan ON meal_assignments(meal_plan_id);
CREATE INDEX IF NOT EXISTS idx_meal_assignments_user ON meal_assignments(user_id);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE item_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_assignments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES FOR ITEM CLAIMS
-- =====================================================

-- Members can view claims in their household
CREATE POLICY "View household item claims"
  ON item_claims FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pantry_items pi
      WHERE pi.id = item_claims.pantry_item_id
      AND (
        pi.user_id = auth.uid()
        OR (pi.household_id IS NOT NULL AND is_household_member(pi.household_id))
      )
    )
  );

-- Users can claim items in their household
CREATE POLICY "Create item claims"
  ON item_claims FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM pantry_items pi
      WHERE pi.id = item_claims.pantry_item_id
      AND (
        pi.user_id = auth.uid()
        OR (pi.household_id IS NOT NULL AND is_household_member(pi.household_id))
      )
    )
  );

-- Users can update their own claims
CREATE POLICY "Update own item claims"
  ON item_claims FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own claims
CREATE POLICY "Delete own item claims"
  ON item_claims FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- RLS POLICIES FOR MEAL RSVPS
-- =====================================================

-- Members can view RSVPs in their household
CREATE POLICY "View household meal RSVPs"
  ON meal_rsvps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meal_plans mp
      WHERE mp.id = meal_rsvps.meal_plan_id
      AND (
        mp.user_id = auth.uid()
        OR (mp.household_id IS NOT NULL AND is_household_member(mp.household_id))
      )
    )
  );

-- Users can RSVP to household meals
CREATE POLICY "Create meal RSVPs"
  ON meal_rsvps FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM meal_plans mp
      WHERE mp.id = meal_rsvps.meal_plan_id
      AND (
        mp.user_id = auth.uid()
        OR (mp.household_id IS NOT NULL AND is_household_member(mp.household_id))
      )
    )
  );

-- Users can update their own RSVPs
CREATE POLICY "Update own meal RSVPs"
  ON meal_rsvps FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own RSVPs
CREATE POLICY "Delete own meal RSVPs"
  ON meal_rsvps FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- RLS POLICIES FOR MEAL ASSIGNMENTS
-- =====================================================

-- Members can view assignments in their household
CREATE POLICY "View household meal assignments"
  ON meal_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meal_plans mp
      WHERE mp.id = meal_assignments.meal_plan_id
      AND (
        mp.user_id = auth.uid()
        OR (mp.household_id IS NOT NULL AND is_household_member(mp.household_id))
      )
    )
  );

-- Admins/owners can create assignments
CREATE POLICY "Create meal assignments"
  ON meal_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meal_plans mp
      WHERE mp.id = meal_assignments.meal_plan_id
      AND (
        mp.user_id = auth.uid()
        OR (mp.household_id IS NOT NULL AND can_manage_household(mp.household_id))
      )
    )
  );

-- Admins/owners can update assignments
CREATE POLICY "Update meal assignments"
  ON meal_assignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM meal_plans mp
      WHERE mp.id = meal_assignments.meal_plan_id
      AND (
        mp.user_id = auth.uid()
        OR (mp.household_id IS NOT NULL AND can_manage_household(mp.household_id))
      )
    )
  );

-- Admins/owners can delete assignments, or users can remove themselves
CREATE POLICY "Delete meal assignments"
  ON meal_assignments FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM meal_plans mp
      WHERE mp.id = meal_assignments.meal_plan_id
      AND (
        mp.user_id = auth.uid()
        OR (mp.household_id IS NOT NULL AND can_manage_household(mp.household_id))
      )
    )
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at for meal_rsvps
DROP TRIGGER IF EXISTS update_meal_rsvps_updated_at ON meal_rsvps;
CREATE TRIGGER update_meal_rsvps_updated_at
  BEFORE UPDATE ON meal_rsvps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get item claims with user email
CREATE OR REPLACE FUNCTION get_item_claims_with_email(p_pantry_item_id UUID)
RETURNS TABLE (
  id UUID,
  pantry_item_id UUID,
  user_id UUID,
  note VARCHAR(255),
  created_at TIMESTAMPTZ,
  user_email VARCHAR(255)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ic.id,
    ic.pantry_item_id,
    ic.user_id,
    ic.note,
    ic.created_at,
    u.email::VARCHAR(255) as user_email
  FROM item_claims ic
  LEFT JOIN auth.users u ON ic.user_id = u.id
  WHERE ic.pantry_item_id = p_pantry_item_id;
END;
$$;

-- Function to get meal RSVPs with user email
CREATE OR REPLACE FUNCTION get_meal_rsvps_with_email(p_meal_plan_id UUID)
RETURNS TABLE (
  id UUID,
  meal_plan_id UUID,
  user_id UUID,
  status VARCHAR(20),
  servings INTEGER,
  note VARCHAR(255),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  user_email VARCHAR(255)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mr.id,
    mr.meal_plan_id,
    mr.user_id,
    mr.status,
    mr.servings,
    mr.note,
    mr.created_at,
    mr.updated_at,
    u.email::VARCHAR(255) as user_email
  FROM meal_rsvps mr
  LEFT JOIN auth.users u ON mr.user_id = u.id
  WHERE mr.meal_plan_id = p_meal_plan_id;
END;
$$;

-- Function to get meal assignments with user email
CREATE OR REPLACE FUNCTION get_meal_assignments_with_email(p_meal_plan_id UUID)
RETURNS TABLE (
  id UUID,
  meal_plan_id UUID,
  user_id UUID,
  assigned_by UUID,
  created_at TIMESTAMPTZ,
  user_email VARCHAR(255)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ma.id,
    ma.meal_plan_id,
    ma.user_id,
    ma.assigned_by,
    ma.created_at,
    u.email::VARCHAR(255) as user_email
  FROM meal_assignments ma
  LEFT JOIN auth.users u ON ma.user_id = u.id
  WHERE ma.meal_plan_id = p_meal_plan_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_item_claims_with_email(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_meal_rsvps_with_email(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_meal_assignments_with_email(UUID) TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE item_claims IS 'Allows household members to claim/reserve pantry items for themselves';
COMMENT ON TABLE meal_rsvps IS 'RSVP tracking for planned meals - who is attending';
COMMENT ON TABLE meal_assignments IS 'Assigns cooking responsibility for meals to household members';

