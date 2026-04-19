/**
 * Recipe Review Service
 * Handles CRUD operations for recipe reviews and ratings
 */

import { supabase } from './supabase';
import { RecipeReview, RecipeRatingStats, RecipeSource } from './types';

/**
 * Generates a display name from user email (First initial + last name style)
 * Example: "john.doe@example.com" -> "J. Doe"
 * Example: "johndoe@example.com" -> "J."
 * @param email - User's email address
 * @returns Display name for reviews
 */
export function generateDisplayName(email: string): string {
  const localPart = email.split('@')[0];
  const cleanPart = localPart.replace(/[^a-zA-Z.]/g, '');
  const parts = cleanPart.split(/[._]/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    const firstInitial = parts[0].charAt(0).toUpperCase();
    const lastName = parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase();
    return `${firstInitial}. ${lastName}`;
  }
  if (cleanPart.length > 0) {
    return `${cleanPart.charAt(0).toUpperCase()}.`;
  }
  return 'Anonymous';
}

interface CreateReviewParams {
  recipeId: string;
  recipeSource: RecipeSource;
  rating: number;
  reviewText?: string;
}

/**
 * Creates a new review or updates an existing one
 */
export async function createOrUpdateReview({
  recipeId,
  recipeSource,
  rating,
  reviewText,
}: CreateReviewParams): Promise<{ success: boolean; review?: RecipeReview; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'You must be logged in to leave a review' };
    }
    const displayName = generateDisplayName(user.email || 'user');
    const { data: existingReview } = await supabase
      .from('recipe_reviews')
      .select('id')
      .eq('user_id', user.id)
      .eq('recipe_id', recipeId)
      .eq('recipe_source', recipeSource)
      .single();
    if (existingReview) {
      const { data, error } = await supabase
        .from('recipe_reviews')
        .update({
          rating,
          review_text: reviewText || null,
          author_display_name: displayName,
        })
        .eq('id', existingReview.id)
        .select()
        .single();
      if (error) throw error;
      return { success: true, review: data as RecipeReview };
    }
    const { data, error } = await supabase
      .from('recipe_reviews')
      .insert({
        user_id: user.id,
        recipe_id: recipeId,
        recipe_source: recipeSource,
        rating,
        review_text: reviewText || null,
        author_display_name: displayName,
      })
      .select()
      .single();
    if (error) throw error;
    return { success: true, review: data as RecipeReview };
  } catch (error) {
    console.error('Error creating/updating review:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to save review' 
    };
  }
}

/**
 * Fetches all reviews for a specific recipe
 */
export async function getReviewsForRecipe(
  recipeId: string,
  recipeSource: RecipeSource
): Promise<RecipeReview[]> {
  try {
    const { data, error } = await supabase
      .from('recipe_reviews')
      .select('*')
      .eq('recipe_id', recipeId)
      .eq('recipe_source', recipeSource)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as RecipeReview[];
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }
}

/**
 * Fetches the current user's review for a recipe (if exists)
 */
export async function getUserReviewForRecipe(
  recipeId: string,
  recipeSource: RecipeSource
): Promise<RecipeReview | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('recipe_reviews')
      .select('*')
      .eq('user_id', user.id)
      .eq('recipe_id', recipeId)
      .eq('recipe_source', recipeSource)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data as RecipeReview | null;
  } catch (error) {
    console.error('Error fetching user review:', error);
    return null;
  }
}

/**
 * Calculates rating stats for a recipe
 */
export async function getRecipeRatingStats(
  recipeId: string,
  recipeSource: RecipeSource
): Promise<RecipeRatingStats> {
  try {
    const { data, error } = await supabase
      .from('recipe_reviews')
      .select('rating')
      .eq('recipe_id', recipeId)
      .eq('recipe_source', recipeSource);
    if (error) throw error;
    const reviews = data || [];
    const totalReviews = reviews.length;
    if (totalReviews === 0) {
      return {
        recipeId,
        recipeSource,
        averageRating: 0,
        totalReviews: 0,
      };
    }
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    const averageRating = sum / totalReviews;
    return {
      recipeId,
      recipeSource,
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews,
    };
  } catch (error) {
    console.error('Error calculating rating stats:', error);
    return {
      recipeId,
      recipeSource,
      averageRating: 0,
      totalReviews: 0,
    };
  }
}

/**
 * Deletes a user's review for a recipe
 */
export async function deleteReview(reviewId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('recipe_reviews')
      .delete()
      .eq('id', reviewId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting review:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete review' 
    };
  }
}

