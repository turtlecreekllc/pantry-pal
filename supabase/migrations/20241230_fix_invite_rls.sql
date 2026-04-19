-- Fix RLS policy for household_invites
-- The previous policy queried auth.users directly which causes permission errors
-- This fix uses auth.jwt() to get the email from the authenticated token

-- Drop the problematic policy
DROP POLICY IF EXISTS "Members can view invites for their household" ON household_invites;

-- Recreate with fixed email check using JWT token
CREATE POLICY "Members can view invites for their household"
  ON household_invites FOR SELECT
  USING (
    is_household_member(household_id) OR
    lower(email) = lower(auth.jwt() ->> 'email')
  );

-- Also add a policy for users to view their own pending invites by email
DROP POLICY IF EXISTS "Users can view their own pending invites" ON household_invites;
CREATE POLICY "Users can view their own pending invites"
  ON household_invites FOR SELECT
  USING (
    lower(email) = lower(auth.jwt() ->> 'email')
  );

-- Allow invited users to update their own invites (accept/decline)
DROP POLICY IF EXISTS "Invited users can update their own invites" ON household_invites;
CREATE POLICY "Invited users can update their own invites"
  ON household_invites FOR UPDATE
  USING (
    lower(email) = lower(auth.jwt() ->> 'email')
  );

