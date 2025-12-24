import { useState, useCallback } from 'react';
import { RecipePreview, Recipe } from '../lib/types';
import { searchByIngredient, searchByName, getRecipeById } from '../lib/mealDb';

interface UseRecipesReturn {
  recipes: RecipePreview[];
  selectedRecipe: Recipe | null;
  loading: boolean;
  error: string | null;
  searchRecipes: (query: string, byIngredient?: boolean) => Promise<void>;
  fetchRecipeDetails: (id: string) => Promise<void>;
  clearRecipes: () => void;
  clearSelectedRecipe: () => void;
}

export function useRecipes(): UseRecipesReturn {
  const [recipes, setRecipes] = useState<RecipePreview[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchRecipes = useCallback(async (query: string, byIngredient: boolean = true) => {
    if (!query.trim()) {
      setRecipes([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const results = byIngredient
        ? await searchByIngredient(query)
        : await searchByName(query);
      setRecipes(results);
    } catch (err) {
      console.error('Error searching recipes:', err);
      setError('Failed to search recipes');
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRecipeDetails = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const recipe = await getRecipeById(id);
      setSelectedRecipe(recipe);
    } catch (err) {
      console.error('Error fetching recipe details:', err);
      setError('Failed to load recipe details');
      setSelectedRecipe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearRecipes = useCallback(() => {
    setRecipes([]);
    setError(null);
  }, []);

  const clearSelectedRecipe = useCallback(() => {
    setSelectedRecipe(null);
    setError(null);
  }, []);

  return {
    recipes,
    selectedRecipe,
    loading,
    error,
    searchRecipes,
    fetchRecipeDetails,
    clearRecipes,
    clearSelectedRecipe,
  };
}
