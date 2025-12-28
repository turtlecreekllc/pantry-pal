import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Cookbook, CookbookRecipe, SavedRecipe, SmartCriteria } from '../lib/types';
import { useAuth } from '../context/AuthContext';

interface CookbookWithRecipes extends Cookbook {
  recipes: SavedRecipe[];
}

interface UseCookbooksReturn {
  cookbooks: Cookbook[];
  loading: boolean;
  error: string | null;
  createCookbook: (name: string, description?: string, coverImageUrl?: string) => Promise<Cookbook>;
  updateCookbook: (id: string, updates: Partial<Cookbook>) => Promise<void>;
  deleteCookbook: (id: string) => Promise<void>;
  getCookbookWithRecipes: (id: string) => Promise<CookbookWithRecipes | null>;
  addRecipeToCookbook: (cookbookId: string, savedRecipeId: string) => Promise<void>;
  removeRecipeFromCookbook: (cookbookId: string, savedRecipeId: string) => Promise<void>;
  getRecipeCookbooks: (savedRecipeId: string) => Promise<Cookbook[]>;
  getSmartCollections: (savedRecipes: SavedRecipe[]) => Cookbook[];
  refreshCookbooks: () => Promise<void>;
}

// Smart collection definitions
const SMART_COLLECTIONS: Array<{ name: string; criteria: SmartCriteria; icon: string }> = [
  {
    name: 'Quick Meals',
    criteria: { type: 'quick_meals', maxTime: 30 },
    icon: 'time-outline',
  },
  {
    name: 'Highly Rated',
    criteria: { type: 'highly_rated', minRating: 4 },
    icon: 'star',
  },
  {
    name: 'Recently Made',
    criteria: { type: 'recently_made', daysSince: 30 },
    icon: 'calendar-outline',
  },
];

export function useCookbooks(): UseCookbooksReturn {
  const [cookbooks, setCookbooks] = useState<Cookbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchCookbooks = useCallback(async () => {
    if (!user) {
      setCookbooks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch cookbooks with recipe count
      const { data, error: fetchError } = await supabase
        .from('cookbooks')
        .select(`
          *,
          cookbook_recipes(count)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Transform data to include recipe count
      const cookbooksWithCount = (data || []).map((cookbook) => ({
        ...cookbook,
        recipe_count: cookbook.cookbook_recipes?.[0]?.count || 0,
      }));

      setCookbooks(cookbooksWithCount);
    } catch (err) {
      console.error('Error fetching cookbooks:', err);
      setError('Failed to load cookbooks');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCookbooks();
  }, [fetchCookbooks]);

  const createCookbook = async (
    name: string,
    description?: string,
    coverImageUrl?: string
  ): Promise<Cookbook> => {
    if (!user) {
      throw new Error('Please sign in to create cookbooks');
    }

    if (!name.trim()) {
      throw new Error('Cookbook name is required');
    }

    try {
      const { data, error: insertError } = await supabase
        .from('cookbooks')
        .insert({
          user_id: user.id,
          name: name.trim(),
          description: description?.trim() || null,
          cover_image_url: coverImageUrl || null,
          is_public: false,
          is_smart: false,
          smart_criteria: null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const newCookbook = { ...data, recipe_count: 0 };
      setCookbooks((prev) => [newCookbook, ...prev]);
      return newCookbook;
    } catch (err) {
      console.error('Error creating cookbook:', err);
      throw new Error('Failed to create cookbook');
    }
  };

  const updateCookbook = async (id: string, updates: Partial<Cookbook>): Promise<void> => {
    if (!user) return;

    try {
      const { error: updateError } = await supabase
        .from('cookbooks')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setCookbooks((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, ...updates, updated_at: new Date().toISOString() }
            : c
        )
      );
    } catch (err) {
      console.error('Error updating cookbook:', err);
      throw new Error('Failed to update cookbook');
    }
  };

  const deleteCookbook = async (id: string): Promise<void> => {
    if (!user) return;

    try {
      const { error: deleteError } = await supabase
        .from('cookbooks')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      setCookbooks((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error('Error deleting cookbook:', err);
      throw new Error('Failed to delete cookbook');
    }
  };

  const getCookbookWithRecipes = async (id: string): Promise<CookbookWithRecipes | null> => {
    if (!user) return null;

    try {
      // Fetch cookbook
      const { data: cookbook, error: cookbookError } = await supabase
        .from('cookbooks')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (cookbookError) throw cookbookError;

      // Fetch recipes in this cookbook
      const { data: junctions, error: junctionError } = await supabase
        .from('cookbook_recipes')
        .select('saved_recipe_id')
        .eq('cookbook_id', id);

      if (junctionError) throw junctionError;

      const recipeIds = junctions.map((j) => j.saved_recipe_id);

      if (recipeIds.length === 0) {
        return { ...cookbook, recipes: [], recipe_count: 0 };
      }

      const { data: recipes, error: recipesError } = await supabase
        .from('saved_recipes')
        .select('*')
        .in('id', recipeIds);

      if (recipesError) throw recipesError;

      return {
        ...cookbook,
        recipes: recipes || [],
        recipe_count: recipes?.length || 0,
      };
    } catch (err) {
      console.error('Error fetching cookbook with recipes:', err);
      return null;
    }
  };

  const addRecipeToCookbook = async (cookbookId: string, savedRecipeId: string): Promise<void> => {
    if (!user) return;

    try {
      const { error: insertError } = await supabase
        .from('cookbook_recipes')
        .insert({
          cookbook_id: cookbookId,
          saved_recipe_id: savedRecipeId,
        });

      if (insertError) {
        // Ignore duplicate key errors
        if (insertError.code !== '23505') {
          throw insertError;
        }
        return;
      }

      // Update local state
      setCookbooks((prev) =>
        prev.map((c) =>
          c.id === cookbookId
            ? { ...c, recipe_count: (c.recipe_count || 0) + 1 }
            : c
        )
      );
    } catch (err) {
      console.error('Error adding recipe to cookbook:', err);
      throw new Error('Failed to add recipe to cookbook');
    }
  };

  const removeRecipeFromCookbook = async (
    cookbookId: string,
    savedRecipeId: string
  ): Promise<void> => {
    if (!user) return;

    try {
      const { error: deleteError } = await supabase
        .from('cookbook_recipes')
        .delete()
        .eq('cookbook_id', cookbookId)
        .eq('saved_recipe_id', savedRecipeId);

      if (deleteError) throw deleteError;

      // Update local state
      setCookbooks((prev) =>
        prev.map((c) =>
          c.id === cookbookId
            ? { ...c, recipe_count: Math.max((c.recipe_count || 0) - 1, 0) }
            : c
        )
      );
    } catch (err) {
      console.error('Error removing recipe from cookbook:', err);
      throw new Error('Failed to remove recipe from cookbook');
    }
  };

  const getRecipeCookbooks = async (savedRecipeId: string): Promise<Cookbook[]> => {
    if (!user) return [];

    try {
      const { data: junctions, error: junctionError } = await supabase
        .from('cookbook_recipes')
        .select('cookbook_id')
        .eq('saved_recipe_id', savedRecipeId);

      if (junctionError) throw junctionError;

      const cookbookIds = junctions.map((j) => j.cookbook_id);

      return cookbooks.filter((c) => cookbookIds.includes(c.id));
    } catch (err) {
      console.error('Error fetching recipe cookbooks:', err);
      return [];
    }
  };

  /**
   * Generate smart collections based on saved recipes
   */
  const getSmartCollections = (savedRecipes: SavedRecipe[]): Cookbook[] => {
    const smartCookbooks: Cookbook[] = [];
    const now = new Date();

    for (const collection of SMART_COLLECTIONS) {
      let matchingRecipes: SavedRecipe[] = [];

      switch (collection.criteria.type) {
        case 'quick_meals':
          matchingRecipes = savedRecipes.filter(
            (r) =>
              r.recipe_data.readyInMinutes &&
              r.recipe_data.readyInMinutes <= (collection.criteria.maxTime || 30)
          );
          break;

        case 'highly_rated':
          matchingRecipes = savedRecipes.filter(
            (r) => r.rating && r.rating >= (collection.criteria.minRating || 4)
          );
          break;

        case 'recently_made':
          const daysCutoff = collection.criteria.daysSince || 30;
          matchingRecipes = savedRecipes.filter((r) => {
            if (!r.last_made_at) return false;
            const madeDate = new Date(r.last_made_at);
            const diffDays = (now.getTime() - madeDate.getTime()) / (1000 * 60 * 60 * 24);
            return diffDays <= daysCutoff;
          });
          break;
      }

      if (matchingRecipes.length > 0) {
        smartCookbooks.push({
          id: `smart-${collection.criteria.type}`,
          user_id: user?.id || '',
          name: collection.name,
          description: null,
          cover_image_url: matchingRecipes[0]?.recipe_data.thumbnail || null,
          is_public: false,
          is_smart: true,
          smart_criteria: collection.criteria,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
          recipe_count: matchingRecipes.length,
        });
      }
    }

    return smartCookbooks;
  };

  return {
    cookbooks,
    loading,
    error,
    createCookbook,
    updateCookbook,
    deleteCookbook,
    getCookbookWithRecipes,
    addRecipeToCookbook,
    removeRecipeFromCookbook,
    getRecipeCookbooks,
    getSmartCollections,
    refreshCookbooks: fetchCookbooks,
  };
}
