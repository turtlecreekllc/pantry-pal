-- Migration for Social Download PRD Features
-- Run this in the Supabase SQL Editor

-- ============================================
-- COOKBOOKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS cookbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  is_public BOOLEAN DEFAULT false,
  is_smart BOOLEAN DEFAULT false,
  smart_criteria JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for cookbooks
ALTER TABLE cookbooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cookbooks" ON cookbooks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public cookbooks" ON cookbooks
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can insert their own cookbooks" ON cookbooks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cookbooks" ON cookbooks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cookbooks" ON cookbooks
  FOR DELETE USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_cookbooks_user_id ON cookbooks(user_id);

-- ============================================
-- COOKBOOK_RECIPES JUNCTION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS cookbook_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cookbook_id UUID REFERENCES cookbooks(id) ON DELETE CASCADE NOT NULL,
  saved_recipe_id UUID REFERENCES saved_recipes(id) ON DELETE CASCADE NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cookbook_id, saved_recipe_id)
);

-- RLS for cookbook_recipes
ALTER TABLE cookbook_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cookbook recipes they own" ON cookbook_recipes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cookbooks c WHERE c.id = cookbook_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert into their own cookbooks" ON cookbook_recipes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM cookbooks c WHERE c.id = cookbook_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete from their own cookbooks" ON cookbook_recipes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM cookbooks c WHERE c.id = cookbook_id AND c.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_cookbook_recipes_cookbook_id ON cookbook_recipes(cookbook_id);
CREATE INDEX idx_cookbook_recipes_saved_recipe_id ON cookbook_recipes(saved_recipe_id);

-- ============================================
-- RECIPE COOKING HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS recipe_cooking_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  saved_recipe_id UUID REFERENCES saved_recipes(id) ON DELETE CASCADE NOT NULL,
  cooked_at TIMESTAMPTZ DEFAULT NOW(),
  servings_made INTEGER,
  notes TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5)
);

-- RLS for recipe_cooking_history
ALTER TABLE recipe_cooking_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cooking history" ON recipe_cooking_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cooking history" ON recipe_cooking_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cooking history" ON recipe_cooking_history
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cooking history" ON recipe_cooking_history
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_recipe_cooking_history_user_id ON recipe_cooking_history(user_id);
CREATE INDEX idx_recipe_cooking_history_saved_recipe_id ON recipe_cooking_history(saved_recipe_id);
CREATE INDEX idx_recipe_cooking_history_cooked_at ON recipe_cooking_history(cooked_at DESC);

-- ============================================
-- RECIPE USER PHOTOS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS recipe_user_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  saved_recipe_id UUID REFERENCES saved_recipes(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  caption TEXT,
  cooking_history_id UUID REFERENCES recipe_cooking_history(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for recipe_user_photos
ALTER TABLE recipe_user_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own photos" ON recipe_user_photos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own photos" ON recipe_user_photos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own photos" ON recipe_user_photos
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_recipe_user_photos_saved_recipe_id ON recipe_user_photos(saved_recipe_id);

-- ============================================
-- IMPORTED RECIPES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS imported_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source_url TEXT,
  source_platform TEXT, -- 'instagram', 'tiktok', 'youtube', 'pinterest', 'facebook', 'web', 'text', 'photo'
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  prep_time INTEGER, -- minutes
  cook_time INTEGER, -- minutes
  total_time INTEGER, -- minutes
  servings INTEGER,
  ingredients JSONB NOT NULL, -- Array of {ingredient: string, measure: string}
  instructions TEXT NOT NULL,
  cuisine TEXT,
  category TEXT,
  difficulty TEXT, -- 'easy', 'medium', 'hard'
  diets TEXT[], -- ['Vegetarian', 'Vegan', etc.]
  tags TEXT[],
  nutrition JSONB,
  import_metadata JSONB, -- Store original extraction data for debugging
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for imported_recipes
ALTER TABLE imported_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own imported recipes" ON imported_recipes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own imported recipes" ON imported_recipes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own imported recipes" ON imported_recipes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own imported recipes" ON imported_recipes
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_imported_recipes_user_id ON imported_recipes(user_id);
CREATE INDEX idx_imported_recipes_source_platform ON imported_recipes(source_platform);
CREATE INDEX idx_imported_recipes_created_at ON imported_recipes(created_at DESC);

-- ============================================
-- ALTER EXISTING TABLES
-- ============================================

-- Add new columns to saved_recipes
ALTER TABLE saved_recipes
  ADD COLUMN IF NOT EXISTS made_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_made_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS imported_recipe_id UUID REFERENCES imported_recipes(id) ON DELETE SET NULL;

-- Add new columns to grocery_items
ALTER TABLE grocery_items
  ADD COLUMN IF NOT EXISTS aisle TEXT,
  ADD COLUMN IF NOT EXISTS meal_plan_id UUID REFERENCES meal_plans(id) ON DELETE SET NULL;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to increment made_count when cooking history is added
CREATE OR REPLACE FUNCTION increment_recipe_made_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE saved_recipes
  SET
    made_count = COALESCE(made_count, 0) + 1,
    last_made_at = NEW.cooked_at
  WHERE id = NEW.saved_recipe_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for incrementing made_count
DROP TRIGGER IF EXISTS trigger_increment_made_count ON recipe_cooking_history;
CREATE TRIGGER trigger_increment_made_count
  AFTER INSERT ON recipe_cooking_history
  FOR EACH ROW
  EXECUTE FUNCTION increment_recipe_made_count();

-- Function to decrement made_count when cooking history is deleted
CREATE OR REPLACE FUNCTION decrement_recipe_made_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE saved_recipes
  SET made_count = GREATEST(COALESCE(made_count, 0) - 1, 0)
  WHERE id = OLD.saved_recipe_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger for decrementing made_count
DROP TRIGGER IF EXISTS trigger_decrement_made_count ON recipe_cooking_history;
CREATE TRIGGER trigger_decrement_made_count
  AFTER DELETE ON recipe_cooking_history
  FOR EACH ROW
  EXECUTE FUNCTION decrement_recipe_made_count();

-- ============================================
-- STORAGE BUCKET FOR RECIPE PHOTOS
-- ============================================
-- Run this if you haven't already set up storage for recipe photos
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('recipe-photos', 'recipe-photos', true)
-- ON CONFLICT (id) DO NOTHING;

-- Storage policy for recipe photos
-- CREATE POLICY "Users can upload recipe photos" ON storage.objects
--   FOR INSERT WITH CHECK (
--     bucket_id = 'recipe-photos' AND auth.uid()::text = (storage.foldername(name))[1]
--   );

-- CREATE POLICY "Users can view all recipe photos" ON storage.objects
--   FOR SELECT USING (bucket_id = 'recipe-photos');

-- CREATE POLICY "Users can delete their own recipe photos" ON storage.objects
--   FOR DELETE USING (
--     bucket_id = 'recipe-photos' AND auth.uid()::text = (storage.foldername(name))[1]
--   );
