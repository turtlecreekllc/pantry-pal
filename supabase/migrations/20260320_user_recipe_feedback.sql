-- Migration: user_recipe_feedback
-- Purpose: Persists swipe likes/dislikes and "Did you cook this?" signals.
--          Fed into Claude's Tonight prompt to personalize future suggestions.
--
-- Feedback loop:
--   Swipe right  → liked=true
--   Swipe left   → disliked=true
--   "Cook this"  → cooked=true, cooked_at=NOW()
--
-- Claude injection format (in tonightService):
--   "Recent feedback:
--    Liked this week: Lemon Chicken, Pasta Primavera
--    Disliked: Beef Stew
--    Cooked this week: Lemon Chicken (don't suggest again)"

CREATE TABLE IF NOT EXISTS user_recipe_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  recipe_id TEXT NOT NULL,       -- Spoonacular ID, MealDB ID, or custom UUID
  recipe_name TEXT NOT NULL,
  liked BOOLEAN NOT NULL DEFAULT false,
  disliked BOOLEAN NOT NULL DEFAULT false,
  cooked BOOLEAN NOT NULL DEFAULT false,
  cooked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One feedback row per user per recipe; update in place
  CONSTRAINT user_recipe_feedback_unique UNIQUE (user_id, recipe_id)
);

CREATE INDEX IF NOT EXISTS idx_user_recipe_feedback_user
  ON user_recipe_feedback(user_id);

CREATE INDEX IF NOT EXISTS idx_user_recipe_feedback_household
  ON user_recipe_feedback(household_id) WHERE household_id IS NOT NULL;

-- For efficiently fetching recent feedback (last 30 days)
CREATE INDEX IF NOT EXISTS idx_user_recipe_feedback_created
  ON user_recipe_feedback(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION update_user_recipe_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_recipe_feedback_updated_at
  BEFORE UPDATE ON user_recipe_feedback
  FOR EACH ROW EXECUTE FUNCTION update_user_recipe_feedback_updated_at();

-- RLS
ALTER TABLE user_recipe_feedback ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own feedback
CREATE POLICY "users_manage_own_feedback"
  ON user_recipe_feedback FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Household members can read shared household feedback (for collaborative filtering)
CREATE POLICY "household_members_can_read_feedback"
  ON user_recipe_feedback FOR SELECT
  USING (
    household_id IS NOT NULL AND
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );
