import type { RecipeSource } from './recipe';

/**
 * Recipe review left by a user
 */
export interface RecipeReview {
  id: string;
  user_id: string;
  recipe_id: string;
  recipe_source: RecipeSource;
  rating: number;
  review_text: string | null;
  author_display_name: string;
  created_at: string;
  updated_at: string;
}

/**
 * Aggregated rating stats for a recipe
 */
export interface RecipeRatingStats {
  recipeId: string;
  recipeSource: RecipeSource;
  averageRating: number;
  totalReviews: number;
}
