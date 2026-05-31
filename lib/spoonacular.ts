import { ExtendedRecipe, RecipeIngredient, RecipePreview, NutritionInfo } from './types';
import { supabase } from './supabase';

/**
 * Spoonacular client (SEC-006).
 *
 * Requests are proxied through the Supabase `spoonacular-proxy` edge function
 * so the upstream API key never ships in the client bundle. Auth is the user's
 * Supabase JWT.
 */

type SpoonacularEndpoint = 'findByIngredients' | 'complexSearch' | 'recipeInformation';

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

// Track if we've already warned about quota to avoid log spam
let quotaWarningShown = false;

function getProxyUrl(): string | null {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, '')}/functions/v1/spoonacular-proxy`;
}

async function callProxy(
  endpoint: SpoonacularEndpoint,
  options: { params?: Record<string, string | number | boolean>; id?: number },
  context: string,
): Promise<unknown | null> {
  const url = getProxyUrl();
  if (!url) {
    console.log('[Spoonacular] Supabase URL not configured, skipping');
    return null;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) {
    // Not signed in — Spoonacular features degrade silently for anonymous use.
    return null;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ endpoint, params: options.params ?? {}, id: options.id }),
    });

    if (!response.ok) {
      handleApiError(response.status, context);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn(`[Spoonacular] Network error in ${context}:`, error);
    return null;
  }
}

/**
 * Handle Spoonacular API response errors
 */
function handleApiError(status: number, context: string): boolean {
  if (status === 402) {
    if (!quotaWarningShown) {
      console.warn(`[Spoonacular] API quota exceeded. Using fallback recipes.`);
      quotaWarningShown = true;
    }
    return true;
  }
  if (status === 401) {
    console.warn(`[Spoonacular] Invalid API key`);
    return true;
  }
  if (status === 429) {
    console.warn(`[Spoonacular] Rate limited. Try again later.`);
    return true;
  }
  console.warn(`[Spoonacular] ${context}: HTTP ${status}`);
  return true;
}

// Search recipes by ingredients
export async function searchByIngredients(ingredients: string[]): Promise<RecipePreview[]> {
  const data = (await callProxy(
    'findByIngredients',
    {
      params: {
        ingredients: ingredients.join(','),
        number: 10,
        ranking: 1,
      },
    },
    'searchByIngredients',
  )) as SpoonacularSearchResult[] | null;

  if (!data) return [];

  return data.map((r) => ({
    id: `spoonacular-${r.id}`,
    name: r.title,
    thumbnail: r.image,
  }));
}

// Complex search with filters
export async function complexSearch(params: {
  query?: string;
  cuisine?: string;
  diet?: string;
  maxReadyTime?: number;
  number?: number;
}): Promise<RecipePreview[]> {
  const upstreamParams: Record<string, string | number> = {
    number: params.number || 10,
  };
  if (params.query) upstreamParams.query = params.query;
  if (params.cuisine) upstreamParams.cuisine = params.cuisine;
  if (params.diet) upstreamParams.diet = params.diet;
  if (params.maxReadyTime) upstreamParams.maxReadyTime = params.maxReadyTime;

  const data = (await callProxy(
    'complexSearch',
    { params: upstreamParams },
    'complexSearch',
  )) as { results?: SpoonacularSearchResult[] } | null;

  if (!data) return [];

  return (data.results || []).map((r) => ({
    id: `spoonacular-${r.id}`,
    name: r.title,
    thumbnail: r.image,
  }));
}

// Get full recipe details by ID
export async function getRecipeById(id: number): Promise<ExtendedRecipe | null> {
  const data = (await callProxy(
    'recipeInformation',
    { id, params: { includeNutrition: true } },
    `getRecipeById(${id})`,
  )) as SpoonacularRecipe | null;

  if (!data) return null;

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
}

// Extract numeric ID from prefixed ID
export function extractSpoonacularId(prefixedId: string): number | null {
  if (!prefixedId.startsWith('spoonacular-')) return null;
  const numericId = parseInt(prefixedId.replace('spoonacular-', ''), 10);
  return isNaN(numericId) ? null : numericId;
}
