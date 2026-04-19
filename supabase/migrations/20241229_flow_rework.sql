-- DinnerPlans.ai UX Rework Database Migration
-- Version 2.0 - December 2024

-- ============================================
-- Utility Functions (defined first for use in triggers)
-- ============================================

-- Function to update timestamps (used by multiple triggers)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Grocery System
-- ============================================

-- Grocery items table (create if not exists)
CREATE TABLE IF NOT EXISTS grocery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  list_id UUID, -- Will reference grocery_lists after it's created
  name TEXT NOT NULL,
  quantity DECIMAL(10, 2) DEFAULT 1,
  unit TEXT DEFAULT 'item',
  recipe_id TEXT,
  recipe_name TEXT,
  meal_plan_id UUID,
  is_checked BOOLEAN DEFAULT FALSE,
  aisle TEXT,
  estimated_price DECIMAL(10, 2),
  notes TEXT,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grocery lists table (groups of grocery items)
CREATE TABLE IF NOT EXISTS grocery_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Shopping List',
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'meal_plan', 'pantry', 'recipe')),
  source_date_range_start DATE,
  source_date_range_end DATE,
  item_count INTEGER DEFAULT 0,
  checked_count INTEGER DEFAULT 0,
  total_estimated_cost DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key from grocery_items to grocery_lists (if not exists)
DO $$ 
BEGIN
  -- Add list_id foreign key constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'grocery_items_list_id_fkey' 
    AND table_name = 'grocery_items'
  ) THEN
    -- First ensure the column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'grocery_items' 
                   AND column_name = 'list_id') THEN
      ALTER TABLE grocery_items ADD COLUMN list_id UUID;
    END IF;
    -- Then add the foreign key
    ALTER TABLE grocery_items 
      ADD CONSTRAINT grocery_items_list_id_fkey 
      FOREIGN KEY (list_id) REFERENCES grocery_lists(id) ON DELETE SET NULL;
  END IF;
  
  -- Add household_id if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'grocery_items' 
                 AND column_name = 'household_id') THEN
    ALTER TABLE grocery_items ADD COLUMN household_id UUID REFERENCES households(id) ON DELETE CASCADE;
  END IF;
  
  -- Add other optional columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'grocery_items' 
                 AND column_name = 'estimated_price') THEN
    ALTER TABLE grocery_items ADD COLUMN estimated_price DECIMAL(10, 2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'grocery_items' 
                 AND column_name = 'notes') THEN
    ALTER TABLE grocery_items ADD COLUMN notes TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'grocery_items' 
                 AND column_name = 'priority') THEN
    ALTER TABLE grocery_items ADD COLUMN priority INTEGER DEFAULT 0;
  END IF;
END $$;

-- Enable RLS on grocery_items if not already enabled
ALTER TABLE grocery_items ENABLE ROW LEVEL SECURITY;

-- Grocery items policies (drop if exist and recreate)
DROP POLICY IF EXISTS "Users can manage their own grocery items" ON grocery_items;
CREATE POLICY "Users can manage their own grocery items" ON grocery_items
  FOR ALL
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Household members can view shared grocery items" ON grocery_items;
CREATE POLICY "Household members can view shared grocery items" ON grocery_items
  FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Household members can manage shared grocery items" ON grocery_items;
CREATE POLICY "Household members can manage shared grocery items" ON grocery_items
  FOR ALL
  USING (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );

-- Index for grocery lists
CREATE INDEX IF NOT EXISTS idx_grocery_lists_user_id ON grocery_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_grocery_lists_household_id ON grocery_lists(household_id);
CREATE INDEX IF NOT EXISTS idx_grocery_lists_status ON grocery_lists(status);
CREATE INDEX IF NOT EXISTS idx_grocery_items_list_id ON grocery_items(list_id);

-- Enable RLS on grocery_lists
ALTER TABLE grocery_lists ENABLE ROW LEVEL SECURITY;

-- Grocery lists policies
CREATE POLICY "Users can manage their own grocery lists" ON grocery_lists
  FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Household members can view shared grocery lists" ON grocery_lists
  FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can update shared grocery lists" ON grocery_lists
  FOR UPDATE
  USING (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );

-- Function to update grocery list counts
CREATE OR REPLACE FUNCTION update_grocery_list_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE grocery_lists 
    SET 
      item_count = (SELECT COUNT(*) FROM grocery_items WHERE list_id = OLD.list_id),
      checked_count = (SELECT COUNT(*) FROM grocery_items WHERE list_id = OLD.list_id AND is_checked = true),
      updated_at = NOW()
    WHERE id = OLD.list_id;
    RETURN OLD;
  ELSE
    UPDATE grocery_lists 
    SET 
      item_count = (SELECT COUNT(*) FROM grocery_items WHERE list_id = NEW.list_id),
      checked_count = (SELECT COUNT(*) FROM grocery_items WHERE list_id = NEW.list_id AND is_checked = true),
      updated_at = NOW()
    WHERE id = NEW.list_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Triggers to keep list counts updated (separate triggers for INSERT/UPDATE vs DELETE)
DROP TRIGGER IF EXISTS grocery_items_count_trigger ON grocery_items;
DROP TRIGGER IF EXISTS grocery_items_insert_update_trigger ON grocery_items;
DROP TRIGGER IF EXISTS grocery_items_delete_trigger ON grocery_items;

CREATE TRIGGER grocery_items_insert_update_trigger
  AFTER INSERT OR UPDATE ON grocery_items
  FOR EACH ROW
  WHEN (NEW.list_id IS NOT NULL)
  EXECUTE FUNCTION update_grocery_list_counts();

CREATE TRIGGER grocery_items_delete_trigger
  AFTER DELETE ON grocery_items
  FOR EACH ROW
  WHEN (OLD.list_id IS NOT NULL)
  EXECUTE FUNCTION update_grocery_list_counts();

-- ============================================
-- Meal Voting System
-- ============================================

-- Meal vote proposals table
CREATE TABLE IF NOT EXISTS meal_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  proposed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id TEXT NOT NULL,
  recipe_name TEXT NOT NULL,
  recipe_image TEXT,
  proposed_date DATE NOT NULL,
  status TEXT DEFAULT 'voting' CHECK (status IN ('voting', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vote responses table
CREATE TABLE IF NOT EXISTS vote_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id UUID NOT NULL REFERENCES meal_votes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response TEXT NOT NULL CHECK (response IN ('yes', 'maybe', 'no')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vote_id, user_id)
);

-- ============================================
-- Instacart Integration
-- ============================================

-- Instacart order tracking table
CREATE TABLE IF NOT EXISTS instacart_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grocery_list_id UUID REFERENCES grocery_lists(id) ON DELETE SET NULL,
  instacart_link TEXT NOT NULL,
  status TEXT DEFAULT 'created' CHECK (status IN ('created', 'opened', 'completed')),
  item_count INTEGER,
  estimated_total DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Pepper AI Context
-- ============================================

-- Pepper conversation context table
CREATE TABLE IF NOT EXISTS pepper_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context_type TEXT NOT NULL CHECK (context_type IN ('tonight', 'plan', 'pantry', 'grocery', 'recipe', 'general')),
  context_data JSONB DEFAULT '{}',
  screen_name TEXT,
  last_interaction TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- User Preferences
-- ============================================

-- Create user_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Household & Family
  household_size INTEGER DEFAULT 2,
  has_children BOOLEAN DEFAULT FALSE,
  children_ages JSONB DEFAULT '[]',
  -- Dietary Preferences
  dietary_preferences JSONB DEFAULT '[]',
  allergies JSONB DEFAULT '[]',
  disliked_ingredients JSONB DEFAULT '[]',
  favorite_cuisines JSONB DEFAULT '[]',
  -- Cooking Preferences
  cooking_skill TEXT DEFAULT 'intermediate' CHECK (cooking_skill IN ('beginner', 'intermediate', 'advanced')),
  max_cook_time INTEGER DEFAULT 60,
  preferred_meal_types JSONB DEFAULT '["dinner"]',
  -- Notifications
  notification_dinner_time TIME DEFAULT '17:00',
  notifications_enabled BOOLEAN DEFAULT TRUE,
  weekly_summary_enabled BOOLEAN DEFAULT TRUE,
  -- Onboarding & App State
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_step INTEGER DEFAULT 0,
  has_seen_tutorial BOOLEAN DEFAULT FALSE,
  -- Theme & Display
  theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  measurement_system TEXT DEFAULT 'imperial' CHECK (measurement_system IN ('imperial', 'metric')),
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on user_preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- User preferences policies
CREATE POLICY "Users can manage their own preferences" ON user_preferences
  FOR ALL
  USING (user_id = auth.uid());

-- Index for user_preferences
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Trigger to update timestamps
DROP TRIGGER IF EXISTS user_preferences_updated_at ON user_preferences;
CREATE TRIGGER user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Function to auto-create preferences for new users (if not already exists)
CREATE OR REPLACE FUNCTION create_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create preferences on user signup (run only if not already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_preferences'
  ) THEN
    CREATE TRIGGER on_auth_user_created_preferences
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION create_user_preferences();
  END IF;
END $$;

-- ============================================
-- Indexes for Performance
-- ============================================

-- Meal votes indexes
CREATE INDEX IF NOT EXISTS idx_meal_votes_household_id ON meal_votes(household_id);
CREATE INDEX IF NOT EXISTS idx_meal_votes_proposed_date ON meal_votes(proposed_date);
CREATE INDEX IF NOT EXISTS idx_meal_votes_status ON meal_votes(status);
CREATE INDEX IF NOT EXISTS idx_meal_votes_household_date ON meal_votes(household_id, proposed_date, status);

-- Vote responses indexes
CREATE INDEX IF NOT EXISTS idx_vote_responses_vote_id ON vote_responses(vote_id);
CREATE INDEX IF NOT EXISTS idx_vote_responses_user_id ON vote_responses(user_id);

-- Instacart orders indexes
CREATE INDEX IF NOT EXISTS idx_instacart_orders_user_id ON instacart_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_instacart_orders_created_at ON instacart_orders(created_at DESC);

-- Pepper contexts indexes
CREATE INDEX IF NOT EXISTS idx_pepper_contexts_user_id ON pepper_contexts(user_id);
CREATE INDEX IF NOT EXISTS idx_pepper_contexts_type ON pepper_contexts(context_type);

-- ============================================
-- Row Level Security Policies
-- ============================================

-- Enable RLS on new tables
ALTER TABLE meal_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE instacart_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE pepper_contexts ENABLE ROW LEVEL SECURITY;

-- Meal votes policies (household members can view/create)
CREATE POLICY "Household members can view meal votes" ON meal_votes
  FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can create meal votes" ON meal_votes
  FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
    AND proposed_by = auth.uid()
  );

CREATE POLICY "Vote proposer can update their votes" ON meal_votes
  FOR UPDATE
  USING (proposed_by = auth.uid());

-- Vote responses policies
CREATE POLICY "Household members can view vote responses" ON vote_responses
  FOR SELECT
  USING (
    vote_id IN (
      SELECT id FROM meal_votes WHERE household_id IN (
        SELECT household_id FROM household_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage their own vote responses" ON vote_responses
  FOR ALL
  USING (user_id = auth.uid());

-- Instacart orders policies
CREATE POLICY "Users can manage their own instacart orders" ON instacart_orders
  FOR ALL
  USING (user_id = auth.uid());

-- Pepper contexts policies
CREATE POLICY "Users can manage their own pepper contexts" ON pepper_contexts
  FOR ALL
  USING (user_id = auth.uid());

-- ============================================
-- Triggers for Real-time Updates
-- ============================================

-- Triggers for updated_at (function defined at top of file)
DROP TRIGGER IF EXISTS meal_votes_updated_at ON meal_votes;
CREATE TRIGGER meal_votes_updated_at
  BEFORE UPDATE ON meal_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS vote_responses_updated_at ON vote_responses;
CREATE TRIGGER vote_responses_updated_at
  BEFORE UPDATE ON vote_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS instacart_orders_updated_at ON instacart_orders;
CREATE TRIGGER instacart_orders_updated_at
  BEFORE UPDATE ON instacart_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Function to Auto-Resolve Votes
-- ============================================

CREATE OR REPLACE FUNCTION auto_resolve_vote()
RETURNS TRIGGER AS $$
DECLARE
  vote_record RECORD;
  household_member_count INTEGER;
  response_count INTEGER;
  yes_count INTEGER;
  no_count INTEGER;
BEGIN
  -- Get the vote and household info
  SELECT mv.*, 
         (SELECT COUNT(*) FROM household_members hm WHERE hm.household_id = mv.household_id) as member_count
  INTO vote_record
  FROM meal_votes mv
  WHERE mv.id = NEW.vote_id;
  
  IF vote_record.status != 'voting' THEN
    RETURN NEW;
  END IF;
  
  -- Count responses
  SELECT COUNT(*), 
         COUNT(*) FILTER (WHERE response = 'yes'),
         COUNT(*) FILTER (WHERE response = 'no')
  INTO response_count, yes_count, no_count
  FROM vote_responses
  WHERE vote_id = NEW.vote_id;
  
  -- If all members voted, resolve the vote
  IF response_count >= vote_record.member_count THEN
    IF yes_count > no_count THEN
      UPDATE meal_votes SET status = 'accepted' WHERE id = NEW.vote_id;
      
      -- Add to meal plan
      INSERT INTO meal_plans (household_id, recipe_id, date, meal_type, created_by, source)
      VALUES (
        vote_record.household_id,
        vote_record.recipe_id,
        vote_record.proposed_date,
        'dinner',
        vote_record.proposed_by,
        'vote'
      )
      ON CONFLICT DO NOTHING;
    ELSE
      UPDATE meal_votes SET status = 'rejected' WHERE id = NEW.vote_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-resolve votes
DROP TRIGGER IF EXISTS auto_resolve_vote_trigger ON vote_responses;
CREATE TRIGGER auto_resolve_vote_trigger
  AFTER INSERT OR UPDATE ON vote_responses
  FOR EACH ROW
  EXECUTE FUNCTION auto_resolve_vote();

-- ============================================
-- Seed Data for Testing (commented out for production)
-- ============================================

-- Uncomment for development/testing:
-- INSERT INTO meal_votes (household_id, proposed_by, recipe_id, recipe_name, proposed_date, status)
-- SELECT 
--   (SELECT id FROM households LIMIT 1),
--   (SELECT id FROM auth.users LIMIT 1),
--   '52772',
--   'Teriyaki Chicken Casserole',
--   CURRENT_DATE + INTERVAL '2 days',
--   'voting'
-- WHERE EXISTS (SELECT 1 FROM households LIMIT 1);
