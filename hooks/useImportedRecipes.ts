import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ImportedRecipe, RecipeImportResult, ExtendedRecipe, RecipeIngredient } from '../lib/types';
import { useAuth } from '../context/AuthContext';

interface UseImportedRecipesReturn {
  importedRecipes: ImportedRecipe[];
  loading: boolean;
  error: string | null;
  saveImportedRecipe: (recipe: Partial<ImportedRecipe>) => Promise<ImportedRecipe>;
  updateImportedRecipe: (id: string, updates: Partial<ImportedRecipe>) => Promise<void>;
  deleteImportedRecipe: (id: string) => Promise<void>;
  getImportedRecipe: (id: string) => Promise<ImportedRecipe | null>;
  refreshImportedRecipes: () => Promise<void>;
  convertToExtendedRecipe: (imported: ImportedRecipe) => ExtendedRecipe;
}

export function useImportedRecipes(): UseImportedRecipesReturn {
  const [importedRecipes, setImportedRecipes] = useState<ImportedRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchImportedRecipes = useCallback(async () => {
    if (!user) {
      setImportedRecipes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('imported_recipes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Parse ingredients from JSONB
      const recipes = (data || []).map((recipe) => ({
        ...recipe,
        ingredients: recipe.ingredients as RecipeIngredient[],
        diets: recipe.diets || [],
        tags: recipe.tags || [],
      }));

      setImportedRecipes(recipes);
    } catch (err) {
      console.error('Error fetching imported recipes:', err);
      setError('Failed to load imported recipes');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchImportedRecipes();
  }, [fetchImportedRecipes]);

  const saveImportedRecipe = async (
    recipe: Partial<ImportedRecipe>
  ): Promise<ImportedRecipe> => {
    if (!user) {
      throw new Error('Please sign in to save recipes');
    }

    if (!recipe.title || !recipe.ingredients || !recipe.instructions) {
      throw new Error('Recipe must have a title, ingredients, and instructions');
    }

    try {
      const insertData = {
        user_id: user.id,
        source_url: recipe.source_url || null,
        source_platform: recipe.source_platform || 'web',
        title: recipe.title,
        description: recipe.description || null,
        image_url: recipe.image_url || null,
        prep_time: recipe.prep_time || null,
        cook_time: recipe.cook_time || null,
        total_time: recipe.total_time || null,
        servings: recipe.servings || null,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        cuisine: recipe.cuisine || null,
        category: recipe.category || null,
        difficulty: recipe.difficulty || null,
        diets: recipe.diets || [],
        tags: recipe.tags || [],
        nutrition: recipe.nutrition || null,
        import_metadata: recipe.import_metadata || null,
      };

      const { data, error: insertError } = await supabase
        .from('imported_recipes')
        .insert(insertData)
        .select()
        .single();

      if (insertError) throw insertError;

      const savedRecipe = {
        ...data,
        ingredients: data.ingredients as RecipeIngredient[],
        diets: data.diets || [],
        tags: data.tags || [],
      };

      setImportedRecipes((prev) => [savedRecipe, ...prev]);
      return savedRecipe;
    } catch (err) {
      console.error('Error saving imported recipe:', err);
      throw new Error('Failed to save recipe');
    }
  };

  const updateImportedRecipe = async (
    id: string,
    updates: Partial<ImportedRecipe>
  ): Promise<void> => {
    if (!user) return;

    try {
      const { error: updateError } = await supabase
        .from('imported_recipes')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setImportedRecipes((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                ...updates,
                updated_at: new Date().toISOString(),
              }
            : r
        )
      );
    } catch (err) {
      console.error('Error updating imported recipe:', err);
      throw new Error('Failed to update recipe');
    }
  };

  const deleteImportedRecipe = async (id: string): Promise<void> => {
    if (!user) return;

    try {
      const { error: deleteError } = await supabase
        .from('imported_recipes')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      setImportedRecipes((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error('Error deleting imported recipe:', err);
      throw new Error('Failed to delete recipe');
    }
  };

  const getImportedRecipe = async (id: string): Promise<ImportedRecipe | null> => {
    if (!user) return null;

    try {
      const { data, error: fetchError } = await supabase
        .from('imported_recipes')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      return {
        ...data,
        ingredients: data.ingredients as RecipeIngredient[],
        diets: data.diets || [],
        tags: data.tags || [],
      };
    } catch (err) {
      console.error('Error fetching imported recipe:', err);
      return null;
    }
  };

  /**
   * Convert an ImportedRecipe to an ExtendedRecipe for use with existing recipe components
   */
  const convertToExtendedRecipe = (imported: ImportedRecipe): ExtendedRecipe => {
    return {
      id: `imported-${imported.id}`,
      name: imported.title,
      category: imported.category || 'Uncategorized',
      area: imported.cuisine || 'Various',
      instructions: imported.instructions,
      thumbnail: imported.image_url || '',
      youtubeUrl: null,
      ingredients: imported.ingredients,
      source: imported.source_url,
      recipeSource: 'imported',
      readyInMinutes: imported.total_time || undefined,
      servings: imported.servings || undefined,
      diets: imported.diets,
      difficulty: imported.difficulty || undefined,
      nutrition: imported.nutrition || undefined,
    };
  };

  return {
    importedRecipes,
    loading,
    error,
    saveImportedRecipe,
    updateImportedRecipe,
    deleteImportedRecipe,
    getImportedRecipe,
    refreshImportedRecipes: fetchImportedRecipes,
    convertToExtendedRecipe,
  };
}
