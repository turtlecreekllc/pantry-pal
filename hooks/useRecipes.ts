import { useState, useCallback } from 'react';
import { RecipePreview, Recipe, ExtendedRecipe } from '../lib/types';
import { searchByIngredient, searchByName } from '../lib/mealDb';
import { getRecipeDetails } from '../lib/recipeService';

// Fallback recipes for IDs that start with 'fallback-'
const FALLBACK_RECIPES: Record<string, ExtendedRecipe> = {
  'fallback-1': {
    id: 'fallback-1',
    name: 'Classic Spaghetti Bolognese',
    thumbnail: 'https://www.themealdb.com/images/media/meals/sutysw1468247559.jpg',
    category: 'Pasta',
    area: 'Italian',
    ingredients: [
      { ingredient: 'Ground Beef', measure: '500g' },
      { ingredient: 'Spaghetti', measure: '400g' },
      { ingredient: 'Onion', measure: '1 large' },
      { ingredient: 'Tomato Sauce', measure: '400ml' },
      { ingredient: 'Garlic', measure: '3 cloves' },
      { ingredient: 'Olive Oil', measure: '2 tbsp' },
      { ingredient: 'Salt', measure: 'to taste' },
      { ingredient: 'Pepper', measure: 'to taste' },
      { ingredient: 'Italian Herbs', measure: '1 tsp' },
    ],
    instructions: '1. Heat olive oil in a large pan over medium heat.\n\n2. Add diced onion and cook until soft, about 5 minutes.\n\n3. Add minced garlic and cook for 1 minute.\n\n4. Add ground beef and cook until browned, breaking it up as it cooks.\n\n5. Pour in the tomato sauce and add Italian herbs, salt, and pepper.\n\n6. Simmer for 20-30 minutes, stirring occasionally.\n\n7. Meanwhile, cook spaghetti according to package directions.\n\n8. Drain pasta and serve topped with the bolognese sauce.\n\n9. Garnish with fresh basil and parmesan cheese if desired.',
    readyInMinutes: 45,
    servings: 4,
    youtubeUrl: null,
    source: null,
    recipeSource: 'themealdb',
  },
  'fallback-2': {
    id: 'fallback-2',
    name: 'Chicken Stir Fry',
    thumbnail: 'https://www.themealdb.com/images/media/meals/yvxwey1511796614.jpg',
    category: 'Chicken',
    area: 'Asian',
    ingredients: [
      { ingredient: 'Chicken Breast', measure: '500g' },
      { ingredient: 'Bell Peppers', measure: '2' },
      { ingredient: 'Broccoli', measure: '1 head' },
      { ingredient: 'Soy Sauce', measure: '3 tbsp' },
      { ingredient: 'Garlic', measure: '2 cloves' },
      { ingredient: 'Ginger', measure: '1 inch' },
      { ingredient: 'Vegetable Oil', measure: '2 tbsp' },
      { ingredient: 'Cornstarch', measure: '1 tbsp' },
    ],
    instructions: '1. Cut chicken breast into thin strips.\n\n2. Mix soy sauce with cornstarch to make a sauce.\n\n3. Heat oil in a wok or large skillet over high heat.\n\n4. Add chicken and stir-fry until golden, about 5 minutes. Remove and set aside.\n\n5. Add more oil if needed, then stir-fry garlic and ginger for 30 seconds.\n\n6. Add bell peppers and broccoli, stir-fry for 3-4 minutes.\n\n7. Return chicken to the wok.\n\n8. Pour in the sauce and toss everything together.\n\n9. Cook until sauce thickens, about 2 minutes.\n\n10. Serve hot over steamed rice.',
    readyInMinutes: 25,
    servings: 4,
    youtubeUrl: null,
    source: null,
    recipeSource: 'themealdb',
  },
  'fallback-3': {
    id: 'fallback-3',
    name: 'Creamy Garlic Pasta',
    thumbnail: 'https://www.themealdb.com/images/media/meals/wvqpwt1468339226.jpg',
    category: 'Pasta',
    area: 'Italian',
    ingredients: [
      { ingredient: 'Pasta', measure: '400g' },
      { ingredient: 'Heavy Cream', measure: '200ml' },
      { ingredient: 'Parmesan', measure: '100g' },
      { ingredient: 'Garlic', measure: '4 cloves' },
      { ingredient: 'Butter', measure: '2 tbsp' },
      { ingredient: 'Salt', measure: 'to taste' },
      { ingredient: 'Black Pepper', measure: 'to taste' },
      { ingredient: 'Fresh Parsley', measure: 'for garnish' },
    ],
    instructions: '1. Cook pasta according to package directions until al dente. Reserve 1 cup pasta water before draining.\n\n2. While pasta cooks, melt butter in a large pan over medium heat.\n\n3. Add minced garlic and cook for 1-2 minutes until fragrant (don\'t brown).\n\n4. Pour in heavy cream and bring to a gentle simmer.\n\n5. Add grated parmesan and stir until melted and smooth.\n\n6. Season with salt and pepper to taste.\n\n7. Add drained pasta to the sauce and toss to coat.\n\n8. Add pasta water as needed to reach desired consistency.\n\n9. Serve immediately, garnished with extra parmesan and fresh parsley.',
    readyInMinutes: 20,
    servings: 4,
    youtubeUrl: null,
    source: null,
    recipeSource: 'themealdb',
  },
  'fallback-4': {
    id: 'fallback-4',
    name: 'Beef Tacos',
    thumbnail: 'https://www.themealdb.com/images/media/meals/ypxvwv1505333929.jpg',
    category: 'Mexican',
    area: 'Mexican',
    ingredients: [
      { ingredient: 'Ground Beef', measure: '500g' },
      { ingredient: 'Taco Shells', measure: '8' },
      { ingredient: 'Lettuce', measure: '1 head' },
      { ingredient: 'Cheese', measure: '200g' },
      { ingredient: 'Salsa', measure: '200ml' },
      { ingredient: 'Sour Cream', measure: '100ml' },
      { ingredient: 'Taco Seasoning', measure: '1 packet' },
      { ingredient: 'Onion', measure: '1' },
    ],
    instructions: '1. Heat a large skillet over medium-high heat.\n\n2. Add ground beef and diced onion, cook until beef is browned.\n\n3. Drain excess fat if needed.\n\n4. Add taco seasoning and water according to packet directions.\n\n5. Simmer for 5 minutes until sauce thickens.\n\n6. Warm taco shells according to package directions.\n\n7. Shred lettuce and grate cheese.\n\n8. Fill each taco shell with seasoned beef.\n\n9. Top with lettuce, cheese, salsa, and sour cream.\n\n10. Serve immediately with lime wedges if desired.',
    readyInMinutes: 25,
    servings: 4,
    youtubeUrl: null,
    source: null,
    recipeSource: 'themealdb',
  },
  'fallback-5': {
    id: 'fallback-5',
    name: 'Vegetable Soup',
    thumbnail: 'https://www.themealdb.com/images/media/meals/r6hjb51685118640.jpg',
    category: 'Soup',
    area: 'American',
    ingredients: [
      { ingredient: 'Carrots', measure: '3' },
      { ingredient: 'Celery', measure: '3 stalks' },
      { ingredient: 'Onion', measure: '1' },
      { ingredient: 'Vegetable Broth', measure: '1L' },
      { ingredient: 'Potatoes', measure: '2' },
      { ingredient: 'Green Beans', measure: '1 cup' },
      { ingredient: 'Garlic', measure: '2 cloves' },
      { ingredient: 'Bay Leaf', measure: '1' },
    ],
    instructions: '1. Dice all vegetables into bite-sized pieces.\n\n2. Heat olive oil in a large pot over medium heat.\n\n3. Add onion, carrots, and celery. Cook for 5 minutes until softened.\n\n4. Add minced garlic and cook for 1 minute.\n\n5. Pour in vegetable broth and add potatoes, green beans, and bay leaf.\n\n6. Bring to a boil, then reduce heat and simmer for 25-30 minutes.\n\n7. Season with salt and pepper to taste.\n\n8. Remove bay leaf before serving.\n\n9. Serve hot with crusty bread.',
    readyInMinutes: 40,
    servings: 6,
    youtubeUrl: null,
    source: null,
    recipeSource: 'themealdb',
  },
};

interface UseRecipesReturn {
  recipes: RecipePreview[];
  selectedRecipe: ExtendedRecipe | null;
  loading: boolean;
  error: string | null;
  searchRecipes: (query: string, byIngredient?: boolean) => Promise<void>;
  fetchRecipeDetails: (id: string) => Promise<void>;
  clearRecipes: () => void;
  clearSelectedRecipe: () => void;
}

export function useRecipes(): UseRecipesReturn {
  const [recipes, setRecipes] = useState<RecipePreview[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<ExtendedRecipe | null>(null);
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
      // Handle fallback recipes
      if (id.startsWith('fallback-')) {
        const fallbackRecipe = FALLBACK_RECIPES[id];
        if (fallbackRecipe) {
          setSelectedRecipe(fallbackRecipe);
        } else {
          setError('Recipe not found');
          setSelectedRecipe(null);
        }
        return;
      }

      // Use unified getRecipeDetails which handles both TheMealDB and Spoonacular IDs
      const recipe = await getRecipeDetails(id);
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
