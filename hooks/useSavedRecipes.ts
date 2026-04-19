import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { SavedRecipe, ExtendedRecipe, RecipeSource } from '../lib/types';
import { useAuth } from '../context/AuthContext';

interface UseSavedRecipesReturn {
  savedRecipes: SavedRecipe[];
  loading: boolean;
  error: string | null;
  saveRecipe: (recipe: ExtendedRecipe, source: RecipeSource) => Promise<void>;
  unsaveRecipe: (recipeId: string, source: RecipeSource) => Promise<void>;
  isRecipeSaved: (recipeId: string, source: RecipeSource) => boolean;
  updateRecipeNotes: (id: string, notes: string) => Promise<void>;
  updateRecipeRating: (id: string, rating: number) => Promise<void>;
  refreshSavedRecipes: () => Promise<void>;
}

export function useSavedRecipes(): UseSavedRecipesReturn {
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchSavedRecipes = useCallback(async () => {
    if (!user) {
      setSavedRecipes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('saved_recipes')
        .select('*')
        .eq('user_id', user.id)
        .order('saved_at', { ascending: false });

      if (fetchError) throw fetchError;
      setSavedRecipes(data || []);
    } catch (err) {
      console.error('Error fetching saved recipes:', err);
      setError('Failed to load saved recipes');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSavedRecipes();
  }, [fetchSavedRecipes]);

  const saveRecipe = async (recipe: ExtendedRecipe, source: RecipeSource) => {
    if (!user) {
      setError('Please sign in to save recipes');
      return;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('saved_recipes')
        .insert({
          user_id: user.id,
          recipe_id: recipe.id,
          recipe_source: source,
          recipe_data: recipe,
          tags: [],
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          // Unique constraint violation - already saved
          return;
        }
        throw insertError;
      }

      setSavedRecipes((prev) => [data, ...prev]);
    } catch (err) {
      const error = err as { message?: string; code?: string; details?: string };
      console.error('Error saving recipe to saved_recipes:', {
        error: error.message,
        code: error.code,
        details: error.details,
        recipeId: recipe.id,
        recipeName: recipe.name,
        hasThumbnail: !!recipe.thumbnail,
      });
      setError(error.message || 'Failed to save recipe');
      throw err;
    }
  };

  const unsaveRecipe = async (recipeId: string, source: RecipeSource) => {
    if (!user) return;

    try {
      const { error: deleteError } = await supabase
        .from('saved_recipes')
        .delete()
        .eq('user_id', user.id)
        .eq('recipe_id', recipeId)
        .eq('recipe_source', source);

      if (deleteError) throw deleteError;

      setSavedRecipes((prev) =>
        prev.filter((r) => !(r.recipe_id === recipeId && r.recipe_source === source))
      );
    } catch (err) {
      console.error('Error unsaving recipe:', err);
      setError('Failed to remove recipe');
      throw err;
    }
  };

  const isRecipeSaved = (recipeId: string, source: RecipeSource): boolean => {
    return savedRecipes.some(
      (r) => r.recipe_id === recipeId && r.recipe_source === source
    );
  };

  const updateRecipeNotes = async (id: string, notes: string) => {
    if (!user) return;

    try {
      const { error: updateError } = await supabase
        .from('saved_recipes')
        .update({ notes, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setSavedRecipes((prev) =>
        prev.map((r) => (r.id === id ? { ...r, notes } : r))
      );
    } catch (err) {
      console.error('Error updating recipe notes:', err);
      throw err;
    }
  };

  const updateRecipeRating = async (id: string, rating: number) => {
    if (!user) return;

    try {
      const { error: updateError } = await supabase
        .from('saved_recipes')
        .update({ rating, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setSavedRecipes((prev) =>
        prev.map((r) => (r.id === id ? { ...r, rating } : r))
      );
    } catch (err) {
      console.error('Error updating recipe rating:', err);
      throw err;
    }
  };

  return {
    savedRecipes,
    loading,
    error,
    saveRecipe,
    unsaveRecipe,
    isRecipeSaved,
    updateRecipeNotes,
    updateRecipeRating,
    refreshSavedRecipes: fetchSavedRecipes,
  };
}
