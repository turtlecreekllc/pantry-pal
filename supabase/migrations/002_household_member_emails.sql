-- Migration to add function for fetching household members with user emails
-- Run this after 001_household_sharing.sql

-- =====================================================
-- FUNCTION: Get household members with email
-- Returns members with user email from auth.users
-- =====================================================

CREATE OR REPLACE FUNCTION get_household_members_with_email(p_household_id UUID)
RETURNS TABLE (
  id UUID,
  household_id UUID,
  user_id UUID,
  role VARCHAR(20),
  joined_at TIMESTAMPTZ,
  user_email VARCHAR(255)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return if user is a member of this household
  IF NOT is_household_member(p_household_id) THEN
    RAISE EXCEPTION 'Not authorized to view this household''s members';
  END IF;
  
  RETURN QUERY
  SELECT 
    hm.id,
    hm.household_id,
    hm.user_id,
    hm.role,
    hm.joined_at,
    u.email::VARCHAR(255) as user_email
  FROM household_members hm
  LEFT JOIN auth.users u ON hm.user_id = u.id
  WHERE hm.household_id = p_household_id
  ORDER BY 
    CASE hm.role 
      WHEN 'owner' THEN 1 
      WHEN 'admin' THEN 2 
      ELSE 3 
    END,
    hm.joined_at ASC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_household_members_with_email(UUID) TO authenticated;

COMMENT ON FUNCTION get_household_members_with_email IS 
  'Returns household members with their email addresses. Only accessible to household members.';

