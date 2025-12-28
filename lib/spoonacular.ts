import { ExtendedRecipe, RecipeIngredient, RecipePreview, NutritionInfo } from './types';

const BASE_URL = 'https://api.spoonacular.com';
const API_KEY = process.env.EXPO_PUBLIC_SPOONACULAR_API_KEY;

interface SpoonacularIngredient {
  id: number;
  original: string;
  name: string;
  amount: number;
  unit: string;
}

interface SpoonacularRecipe {
  id: number;
  title: string;
  image: string;
  readyInMinutes: number;
  servings: number;
  cuisines: string[];
  diets: string[];
  extendedIngredients: SpoonacularIngredient[];
  instructions: string;
  sourceUrl: string;
  analyzedInstructions?: {
    steps: { step: string }[];
  }[];
  nutrition?: {
    nutrients: {
      name: string;
      amount: number;
      unit: string;
    }[];
  };
}

interface SpoonacularSearchResult {
  id: number;
  title: string;
  image: string;
  usedIngredientCount?: number;
  missedIngredientCount?: number;
}

// Search recipes by ingredients
export async function searchByIngredients(ingredients: string[]): Promise<RecipePreview[]> {
  if (!API_KEY) {
    console.error('Spoonacular API key not configured');
    return [];
  }

  try {
    const response = await fetch(
      `${BASE_URL}/recipes/findByIngredients?apiKey=${API_KEY}&ingredients=${encodeURIComponent(ingredients.join(','))}&number=10&ranking=1`
    );

    if (!response.ok) {
      console.error('Spoonacular API error:', response.status);
      return [];
    }

    const data: SpoonacularSearchResult[] = await response.json();

    return data.map((r) => ({
      id: `spoonacular-${r.id}`,
      name: r.title,
      thumbnail: r.image,
    }));
  } catch (error) {
    console.error('Spoonacular search error:', error);
    return [];
  }
}

// Complex search with filters
export async function complexSearch(params: {
  query?: string;
  cuisine?: string;
  diet?: string;
  maxReadyTime?: number;
  number?: number;
}): Promise<RecipePreview[]> {
  if (!API_KEY) {
    console.error('Spoonacular API key not configured');
    return [];
  }

  try {
    const searchParams = new URLSearchParams({
      apiKey: API_KEY,
      number: (params.number || 10).toString(),
    });

    if (params.query) searchParams.append('query', params.query);
    if (params.cuisine) searchParams.append('cuisine', params.cuisine);
    if (params.diet) searchParams.append('diet', params.diet);
    if (params.maxReadyTime) searchParams.append('maxReadyTime', params.maxReadyTime.toString());

    const response = await fetch(`${BASE_URL}/recipes/complexSearch?${searchParams}`);

    if (!response.ok) {
      console.error('Spoonacular API error:', response.status);
      return [];
    }

    const data = await response.json();

    return (data.results || []).map((r: SpoonacularSearchResult) => ({
      id: `spoonacular-${r.id}`,
      name: r.title,
      thumbnail: r.image,
    }));
  } catch (error) {
    console.error('Spoonacular complex search error:', error);
    return [];
  }
}

// Get full recipe details by ID
export async function getRecipeById(id: number): Promise<ExtendedRecipe | null> {
  if (!API_KEY) {
    console.error('Spoonacular API key not configured');
    return null;
  }

  try {
    const response = await fetch(
      `${BASE_URL}/recipes/${id}/information?apiKey=${API_KEY}&includeNutrition=true`
    );

    if (!response.ok) {
      console.error('Spoonacular API error:', response.status);
      return null;
    }

    const data: SpoonacularRecipe = await response.json();

    // Parse instructions - either from analyzedInstructions or plain text
    let instructions = data.instructions || '';
    if (data.analyzedInstructions && data.analyzedInstructions.length > 0) {
      instructions = data.analyzedInstructions[0].steps
        .map((step, index) => `${index + 1}. ${step.step}`)
        .join('\n');
    }

    const ingredients: RecipeIngredient[] = (data.extendedIngredients || []).map((ing) => ({
      ingredient: ing.name,
      measure: `${ing.amount} ${ing.unit}`.trim(),
    }));

    const nutrients = data.nutrition?.nutrients || [];
    const nutrition: NutritionInfo = {
      energy_kcal: nutrients.find(n => n.name === 'Calories')?.amount,
      proteins: nutrients.find(n => n.name === 'Protein')?.amount,
      fat: nutrients.find(n => n.name === 'Fat')?.amount,
      carbohydrates: nutrients.find(n => n.name === 'Carbohydrates')?.amount,
      fiber: nutrients.find(n => n.name === 'Fiber')?.amount,
      sodium: nutrients.find(n => n.name === 'Sodium')?.amount,
      saturated_fat: nutrients.find(n => n.name === 'Saturated Fat')?.amount,
      sugars: nutrients.find(n => n.name === 'Sugar')?.amount,
      salt: nutrients.find(n => n.name === 'Salt')?.amount,
    };

    return {
      id: `spoonacular-${data.id}`,
      name: data.title,
      category: data.cuisines[0] || 'Other',
      area: data.cuisines.join(', ') || 'International',
      instructions,
      thumbnail: data.image,
      youtubeUrl: null,
      source: data.sourceUrl,
      ingredients,
      recipeSource: 'spoonacular',
      readyInMinutes: data.readyInMinutes,
      servings: data.servings,
      diets: data.diets,
      nutrition,
    };
  } catch (error) {
    console.error('Spoonacular getRecipe error:', error);
    return null;
  }
}

// Extract numeric ID from prefixed ID
export function extractSpoonacularId(prefixedId: string): number | null {
  if (!prefixedId.startsWith('spoonacular-')) return null;
  const numericId = parseInt(prefixedId.replace('spoonacular-', ''), 10);
  return isNaN(numericId) ? null : numericId;
}
