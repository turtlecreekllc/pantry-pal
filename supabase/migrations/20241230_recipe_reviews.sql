-- Recipe Reviews Table
-- Allows users to leave ratings and reviews on recipes

-- Create recipe_reviews table
CREATE TABLE IF NOT EXISTS public.recipe_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id TEXT NOT NULL,
  recipe_source TEXT NOT NULL CHECK (recipe_source IN ('themealdb', 'spoonacular', 'web', 'imported')),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  author_display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Each user can only review a recipe once
  CONSTRAINT unique_user_recipe_review UNIQUE (user_id, recipe_id, recipe_source)
);

-- Create index for faster lookups by recipe
CREATE INDEX IF NOT EXISTS idx_recipe_reviews_recipe 
  ON public.recipe_reviews(recipe_id, recipe_source);

-- Create index for user's reviews
CREATE INDEX IF NOT EXISTS idx_recipe_reviews_user 
  ON public.recipe_reviews(user_id);

-- Enable RLS
ALTER TABLE public.recipe_reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read reviews
CREATE POLICY "Anyone can read reviews"
  ON public.recipe_reviews
  FOR SELECT
  USING (true);

-- Policy: Authenticated users can create their own reviews
CREATE POLICY "Users can create their own reviews"
  ON public.recipe_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own reviews
CREATE POLICY "Users can update their own reviews"
  ON public.recipe_reviews
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own reviews
CREATE POLICY "Users can delete their own reviews"
  ON public.recipe_reviews
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_recipe_review_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_recipe_review_timestamp
  BEFORE UPDATE ON public.recipe_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_recipe_review_updated_at();

-- Grant permissions
GRANT SELECT ON public.recipe_reviews TO anon;
GRANT ALL ON public.recipe_reviews TO authenticated;

