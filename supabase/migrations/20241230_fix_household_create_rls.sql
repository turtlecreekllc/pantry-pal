-- Fix RLS policy for household creation
-- This ensures any authenticated user can create a new household

-- Drop existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Users can create households" ON households;

-- Recreate the INSERT policy with the correct permissions
-- Any authenticated user should be able to create a household
CREATE POLICY "Users can create households"
  ON households FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Also ensure the household_members INSERT policy allows the owner to add themselves
DROP POLICY IF EXISTS "Users can join households (via invite)" ON household_members;

-- Updated policy: Users can add themselves as members
-- This allows both joining via invite AND creating as owner
CREATE POLICY "Users can add themselves to households"
  ON household_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Grant necessary permissions
GRANT INSERT ON households TO authenticated;
GRANT INSERT ON household_members TO authenticated;

