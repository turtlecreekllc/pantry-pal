import { RecipePreview, Recipe, RecipeIngredient, MealDBMeal, MealDBSearchResponse } from './types';

const BASE_URL = 'https://www.themealdb.com/api/json/v1/1';

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
