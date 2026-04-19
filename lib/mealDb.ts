import { RecipePreview, Recipe, RecipeIngredient, MealDBMeal, MealDBSearchResponse, PantryItem } from './types';

const BASE_URL = 'https://www.themealdb.com/api/json/v1/1';

// Recipe with match score
export interface ScoredRecipe extends Recipe {
  matchScore: number; // 0-100 percentage
  matchedIngredients: string[];
  missingIngredients: string[];
}

export async function searchByIngredient(ingredient: string): Promise<RecipePreview[]> {
  try {
    const response = await fetch(
      `${BASE_URL}/filter.php?i=${encodeURIComponent(ingredient)}`
    );

    if (!response.ok) {
      console.error('TheMealDB API error:', response.status);
      return [];
    }

    const data: MealDBSearchResponse = await response.json();

    if (!data.meals) {
      return [];
    }

    return data.meals.map((meal) => ({
      id: meal.idMeal,
      name: meal.strMeal,
      thumbnail: meal.strMealThumb || '',
    }));
  } catch (error) {
    console.error('TheMealDB API error:', error);
    return [];
  }
}

export async function searchByName(name: string): Promise<RecipePreview[]> {
  try {
    const response = await fetch(
      `${BASE_URL}/search.php?s=${encodeURIComponent(name)}`
    );

    if (!response.ok) {
      console.error('TheMealDB API error:', response.status);
      return [];
    }

    const data: MealDBSearchResponse = await response.json();

    if (!data.meals) {
      return [];
    }

    return data.meals.map((meal) => ({
      id: meal.idMeal,
      name: meal.strMeal,
      thumbnail: meal.strMealThumb || '',
    }));
  } catch (error) {
    console.error('TheMealDB API error:', error);
    return [];
  }
}

export async function getRecipeById(id: string): Promise<Recipe | null> {
  try {
    const response = await fetch(`${BASE_URL}/lookup.php?i=${id}`);

    if (!response.ok) {
      console.error('TheMealDB API error:', response.status);
      return null;
    }

    const data: MealDBSearchResponse = await response.json();

    if (!data.meals || data.meals.length === 0) {
      return null;
    }

    const meal = data.meals[0];
    return parseMealToRecipe(meal);
  } catch (error) {
    console.error('TheMealDB API error:', error);
    return null;
  }
}

function parseMealToRecipe(meal: MealDBMeal): Recipe {
  const ingredients: RecipeIngredient[] = [];

  // TheMealDB stores ingredients as strIngredient1-20 and strMeasure1-20
  for (let i = 1; i <= 20; i++) {
    const ingredient = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];

    if (ingredient && ingredient.trim()) {
      ingredients.push({
        ingredient: ingredient.trim(),
        measure: measure?.trim() || '',
      });
    }
  }

  return {
    id: meal.idMeal,
    name: meal.strMeal,
    category: meal.strCategory || '',
    area: meal.strArea || '',
    instructions: meal.strInstructions || '',
    thumbnail: meal.strMealThumb || '',
    youtubeUrl: meal.strYoutube || null,
    ingredients,
    source: meal.strSource || null,
  };
}

export async function getRandomRecipe(): Promise<Recipe | null> {
  try {
    const response = await fetch(`${BASE_URL}/random.php`);

    if (!response.ok) {
      console.error('TheMealDB API error:', response.status);
      return null;
    }

    const data: MealDBSearchResponse = await response.json();

    if (!data.meals || data.meals.length === 0) {
      return null;
    }

    return parseMealToRecipe(data.meals[0]);
  } catch (error) {
    console.error('TheMealDB API error:', error);
    return null;
  }
}

// Helper function to normalize ingredient names for comparison - with null-safety
function normalizeIngredient(name: string | null | undefined): string {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

// Check if a pantry item name matches a recipe ingredient - with null-safety
function ingredientMatches(pantryItemName: string | null | undefined, recipeIngredient: string | null | undefined): boolean {
  if (!pantryItemName || !recipeIngredient) return false;
  const normalizedPantry = normalizeIngredient(pantryItemName);
  const normalizedRecipe = normalizeIngredient(recipeIngredient);

  if (!normalizedPantry || !normalizedRecipe) return false;

  // Direct match
  if (normalizedPantry === normalizedRecipe) return true;

  // Partial match (pantry item contains recipe ingredient or vice versa)
  if (normalizedPantry.includes(normalizedRecipe) || normalizedRecipe.includes(normalizedPantry)) return true;

  // Word-level match (any word matches)
  const pantryWords = normalizedPantry.split(' ');
  const recipeWords = normalizedRecipe.split(' ');

  for (const pantryWord of pantryWords) {
    if (pantryWord.length >= 3) { // Only match words with 3+ chars
      for (const recipeWord of recipeWords) {
        if (recipeWord.length >= 3 && (pantryWord.includes(recipeWord) || recipeWord.includes(pantryWord))) {
          return true;
        }
      }
    }
  }

  return false;
}

// Score a recipe based on how many ingredients match pantry items - with null-safety
function scoreRecipe(recipe: Recipe, pantryItems: PantryItem[]): ScoredRecipe {
  const ingredients = recipe.ingredients ?? [];
  const pantryNames = (pantryItems ?? []).map(item => item?.name).filter(Boolean);
  const matchedIngredients: string[] = [];
  const missingIngredients: string[] = [];

  for (const recipeIng of ingredients) {
    const ingredientName = recipeIng?.ingredient;
    if (!ingredientName) continue;
    const matched = pantryNames.some(pantryName =>
      ingredientMatches(pantryName, ingredientName)
    );

    if (matched) {
      matchedIngredients.push(ingredientName);
    } else {
      missingIngredients.push(ingredientName);
    }
  }

  const totalIngredients = ingredients.length;
  const matchScore = totalIngredients > 0
    ? Math.round((matchedIngredients.length / totalIngredients) * 100)
    : 0;

  return {
    ...recipe,
    matchScore,
    matchedIngredients,
    missingIngredients,
  };
}

// Search for recipes using multiple pantry items and score them
export async function searchAndScoreRecipes(
  selectedPantryItems: PantryItem[],
  allPantryItems: PantryItem[]
): Promise<ScoredRecipe[]> {
  if (selectedPantryItems.length === 0) {
    return [];
  }

  // Search for recipes using each selected ingredient
  const allRecipePreviews: Map<string, RecipePreview> = new Map();

  await Promise.all(
    selectedPantryItems.map(async (item) => {
      const previews = await searchByIngredient(item.name);
      previews.forEach(preview => {
        if (!allRecipePreviews.has(preview.id)) {
          allRecipePreviews.set(preview.id, preview);
        }
      });
    })
  );

  // Get full recipe details and score them
  const recipeIds = Array.from(allRecipePreviews.keys());

  // Limit to top 20 recipes to avoid too many API calls
  const limitedIds = recipeIds.slice(0, 20);

  const fullRecipes = await Promise.all(
    limitedIds.map(id => getRecipeById(id))
  );

  // Score recipes using ALL pantry items (not just selected ones)
  const scoredRecipes = fullRecipes
    .filter((recipe): recipe is Recipe => recipe !== null)
    .map(recipe => scoreRecipe(recipe, allPantryItems))
    .sort((a, b) => b.matchScore - a.matchScore);

  return scoredRecipes;
}

// Get recipe previews for multiple ingredients
export async function searchByMultipleIngredients(
  ingredients: string[]
): Promise<RecipePreview[]> {
  if (ingredients.length === 0) return [];

  const allPreviews: Map<string, RecipePreview> = new Map();

  await Promise.all(
    ingredients.map(async (ingredient) => {
      const previews = await searchByIngredient(ingredient);
      previews.forEach(preview => {
        if (!allPreviews.has(preview.id)) {
          allPreviews.set(preview.id, preview);
        }
      });
    })
  );

  return Array.from(allPreviews.values());
}
