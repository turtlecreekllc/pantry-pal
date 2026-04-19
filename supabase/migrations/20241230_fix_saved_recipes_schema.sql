-- Migration to fix saved_recipes schema for recipe import functionality
-- The saved_recipes table was missing columns needed for full recipe storage

-- Add missing columns to saved_recipes
ALTER TABLE saved_recipes
  ADD COLUMN IF NOT EXISTS recipe_data JSONB,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add made_count if not exists (may have been added by previous migration)
ALTER TABLE saved_recipes
  ADD COLUMN IF NOT EXISTS made_count INTEGER DEFAULT 0;

-- Migrate existing data: populate recipe_data from existing columns
-- This creates a basic recipe_data object from existing recipe_name and recipe_image_url
UPDATE saved_recipes
SET recipe_data = jsonb_build_object(
  'id', recipe_id,
  'name', COALESCE(recipe_name, 'Untitled Recipe'),
  'thumbnail', COALESCE(recipe_image_url, ''),
  'category', 'Uncategorized',
  'area', 'Various',
  'instructions', '',
  'youtubeUrl', null,
  'ingredients', '[]'::jsonb,
  'source', null,
  'recipeSource', recipe_source
)
WHERE recipe_data IS NULL AND recipe_name IS NOT NULL;

-- Create index for faster JSONB queries
CREATE INDEX IF NOT EXISTS idx_saved_recipes_recipe_data ON saved_recipes USING GIN (recipe_data);

-- Create index on updated_at for sorting
CREATE INDEX IF NOT EXISTS idx_saved_recipes_updated_at ON saved_recipes(updated_at DESC);

-- Add RLS policy for update if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'saved_recipes' 
    AND policyname = 'Users can update own saved recipes'
  ) THEN
    CREATE POLICY "Users can update own saved recipes" ON saved_recipes
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_saved_recipes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS trigger_update_saved_recipes_updated_at ON saved_recipes;
CREATE TRIGGER trigger_update_saved_recipes_updated_at
  BEFORE UPDATE ON saved_recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_recipes_updated_at();

