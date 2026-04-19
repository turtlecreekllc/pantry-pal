import * as mealDb from './mealDb';
import * as spoonacular from './spoonacular';
import { RecipePreview, ExtendedRecipe, PantryItem, ScoredRecipe, RecipeSource, ImportedRecipe, RecipeIngredient } from './types';
import { supabase } from './supabase';

export type { RecipeSource };

/**
 * Fetches an imported recipe from Supabase and converts to ExtendedRecipe format
 */
async function getImportedRecipeDetails(importedId: string): Promise<ExtendedRecipe | null> {
  try {
    const { data, error } = await supabase
      .from('imported_recipes')
      .select('*')
      .eq('id', importedId)
      .single();
    if (error || !data) {
      console.error('Error fetching imported recipe:', error);
      return null;
    }
    const imported = {
      ...data,
      ingredients: data.ingredients as RecipeIngredient[],
      diets: data.diets || [],
      tags: data.tags || [],
    } as ImportedRecipe;
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
  } catch (err) {
    console.error('Error in getImportedRecipeDetails:', err);
    return null;
  }
}

// Unified recipe search across all sources
export async function searchRecipes(
  query: string,
  source: RecipeSource | 'all' = 'all'
): Promise<RecipePreview[]> {
  const results: RecipePreview[] = [];

  if (source === 'all' || source === 'themealdb') {
    try {
      const mealDbResults = await mealDb.searchByName(query);
      results.push(...mealDbResults);
    } catch (error) {
      console.error('TheMealDB search error:', error);
    }
  }

  if (source === 'all' || source === 'spoonacular') {
    try {
      const spoonResults = await spoonacular.complexSearch({ query });
      results.push(...spoonResults);
    } catch (error) {
      console.error('Spoonacular search error:', error);
    }
  }

  return results;
}

// Search by ingredients across all sources
export async function searchByIngredients(
  ingredients: string[],
  source: RecipeSource | 'all' = 'all'
): Promise<RecipePreview[]> {
  const results: RecipePreview[] = [];

  if (source === 'all' || source === 'themealdb') {
    try {
      // TheMealDB only supports single ingredient search, search the first few
      const searches = ingredients.slice(0, 3).map((ing) => mealDb.searchByIngredient(ing));
      const mealDbResults = await Promise.all(searches);
      const uniqueRecipes = new Map<string, RecipePreview>();
      mealDbResults.flat().forEach((recipe) => {
        uniqueRecipes.set(recipe.id, recipe);
      });
      results.push(...uniqueRecipes.values());
    } catch (error) {
      console.error('TheMealDB ingredient search error:', error);
    }
  }

  if (source === 'all' || source === 'spoonacular') {
    try {
      const spoonResults = await spoonacular.searchByIngredients(ingredients);
      results.push(...spoonResults);
    } catch (error) {
      console.error('Spoonacular ingredient search error:', error);
    }
  }

  return results;
}

// Get recipe details from appropriate source
export async function getRecipeDetails(id: string): Promise<ExtendedRecipe | null> {
  // Handle imported recipes (format: imported-{uuid})
  if (id.startsWith('imported-')) {
    const importedId = id.replace('imported-', '');
    return getImportedRecipeDetails(importedId);
  }
  // Handle Spoonacular recipes (format: spoonacular-{id})
  if (id.startsWith('spoonacular-')) {
    const numericId = spoonacular.extractSpoonacularId(id);
    if (numericId) {
      return spoonacular.getRecipeById(numericId);
    }
    return null;
  }
  // Default to TheMealDB
  const recipe = await mealDb.getRecipeById(id);
  if (recipe) {
    return {
      ...recipe,
      recipeSource: 'themealdb',
    };
  }
  return null;
}

// Normalize ingredient name for matching - with null-safety
function normalizeIngredient(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

// Check if two ingredients match - with null-safety
function ingredientMatches(recipeIngredient: string | null | undefined, pantryItem: string | null | undefined): boolean {
  if (!recipeIngredient || !pantryItem) return false;
  const normalized1 = normalizeIngredient(recipeIngredient);
  const normalized2 = normalizeIngredient(pantryItem);

  if (!normalized1 || !normalized2) return false;

  // Direct match
  if (normalized1 === normalized2) return true;

  // Partial match (one contains the other)
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) return true;

  // Word-level matching
  const words1 = normalized1.split(/\s+/).filter((w) => w.length >= 3);
  const words2 = normalized2.split(/\s+/).filter((w) => w.length >= 3);

  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1.includes(word2) || word2.includes(word1)) {
        return true;
      }
    }
  }

  return false;
}

// Score a recipe based on pantry items - with null-safety
export function scoreRecipe(recipe: ExtendedRecipe, pantryItems: PantryItem[]): ScoredRecipe {
  const ingredients = recipe.ingredients ?? [];
  const pantryNames = (pantryItems ?? []).map((item) => item?.name).filter(Boolean);
  const matchedIngredients: string[] = [];
  const missingIngredients: string[] = [];

  for (const recipeIng of ingredients) {
    const ingredientName = recipeIng?.ingredient;
    if (!ingredientName) continue;
    const matched = pantryNames.some((pantryName) =>
      ingredientMatches(ingredientName, pantryName)
    );

    if (matched) {
      matchedIngredients.push(ingredientName);
    } else {
      missingIngredients.push(ingredientName);
    }
  }

  const totalIngredients = ingredients.length;
  const matchScore = totalIngredients > 0 ? (matchedIngredients.length / totalIngredients) * 100 : 0;

  return {
    ...recipe,
    matchScore: Math.round(matchScore),
    matchedIngredients,
    missingIngredients,
  };
}

// Search and score recipes based on pantry items
export async function searchAndScoreRecipes(
  selectedItems: PantryItem[],
  allPantryItems: PantryItem[],
  source: RecipeSource | 'all' = 'all'
): Promise<ScoredRecipe[]> {
  const ingredientNames = selectedItems.map((item) => item.name);

  // Search for recipes
  const previews = await searchByIngredients(ingredientNames, source);

  // Limit to avoid too many API calls
  const limitedPreviews = previews.slice(0, 20);

  // Fetch full details and score each recipe
  const scoredRecipes: ScoredRecipe[] = [];

  for (const preview of limitedPreviews) {
    try {
      const fullRecipe = await getRecipeDetails(preview.id);
      if (fullRecipe) {
        const scored = scoreRecipe(fullRecipe, allPantryItems);
        scoredRecipes.push(scored);
      }
    } catch (error) {
      console.error(`Error fetching recipe ${preview.id}:`, error);
    }
  }

  // Sort by match score descending
  return scoredRecipes.sort((a, b) => b.matchScore - a.matchScore);
}

// Apply filters to scored recipes - with null-safety
export function filterRecipes(
  recipes: ScoredRecipe[],
  filters: {
    cuisine?: string | null;
    diet?: string | null;
    maxTime?: number | null;
    searchText?: string;
  }
): ScoredRecipe[] {
  return (recipes ?? []).filter((recipe) => {
    if (!recipe) return false;
    // Cuisine filter
    if (filters.cuisine && recipe.area) {
      const area = recipe.area ?? '';
      const cuisine = filters.cuisine ?? '';
      if (!area.toLowerCase().includes(cuisine.toLowerCase())) {
        return false;
      }
    }

    // Diet filter (Spoonacular recipes have diets array)
    if (filters.diet && recipe.diets) {
      const dietFilter = filters.diet ?? '';
      if (!(recipe.diets ?? []).some((d) => (d ?? '').toLowerCase().includes(dietFilter.toLowerCase()))) {
        return false;
      }
    }

    // Max time filter
    if (filters.maxTime && recipe.readyInMinutes) {
      if (recipe.readyInMinutes > filters.maxTime) {
        return false;
      }
    }

    // Text search
    if (filters.searchText) {
      const searchLower = (filters.searchText ?? '').toLowerCase();
      const recipeName = (recipe.name ?? '').toLowerCase();
      if (!recipeName.includes(searchLower)) {
        return false;
      }
    }

    return true;
  });
}

// Sort recipes
export function sortRecipes(
  recipes: ScoredRecipe[],
  sortBy: 'matchScore' | 'time' | 'name',
  order: 'asc' | 'desc' = 'desc'
): ScoredRecipe[] {
  const sorted = [...recipes].sort((a, b) => {
    switch (sortBy) {
      case 'matchScore':
        return b.matchScore - a.matchScore;
      case 'time':
        return (a.readyInMinutes || 999) - (b.readyInMinutes || 999);
      case 'name':
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  return order === 'asc' ? sorted.reverse() : sorted;
}
