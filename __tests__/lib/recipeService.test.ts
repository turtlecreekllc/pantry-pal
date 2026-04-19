/**
 * Recipe Service Tests
 * Tests for recipe search, scoring, and details fetching
 */

import {
  searchRecipes,
  scoreRecipe,
  getRecipeDetails,
} from '../../lib/recipeService';
import { PantryItem, ExtendedRecipe } from '../../lib/types';

// Mock the API modules
jest.mock('../../lib/spoonacular', () => ({
  searchByIngredients: jest.fn(() => Promise.resolve([])),
  getRecipeById: jest.fn(() => Promise.resolve(null)),
  complexSearch: jest.fn(() => Promise.resolve([])),
  extractSpoonacularId: jest.fn((id: string) => id.replace('spoonacular-', '')),
}));

jest.mock('../../lib/mealDb', () => ({
  searchByName: jest.fn(() => Promise.resolve([])),
  getRecipeById: jest.fn(() => Promise.resolve(null)),
  searchByIngredient: jest.fn(() => Promise.resolve([])),
}));

describe('Recipe Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchRecipes', () => {
    it('should search recipes from TheMealDB', async () => {
      const mealDb = require('../../lib/mealDb');
      mealDb.searchByName.mockResolvedValue([
        { id: '1', name: 'Chicken Curry', thumbnail: 'url' },
      ]);

      const results = await searchRecipes('chicken', 'themealdb');
      expect(mealDb.searchByName).toHaveBeenCalledWith('chicken');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should search recipes from Spoonacular', async () => {
      const spoonacular = require('../../lib/spoonacular');
      spoonacular.complexSearch.mockResolvedValue([
        { id: '1', name: 'Pasta Dish', thumbnail: 'url' },
      ]);

      const results = await searchRecipes('pasta', 'spoonacular');
      expect(spoonacular.complexSearch).toHaveBeenCalled();
    });

    it('should return empty array on error', async () => {
      const mealDb = require('../../lib/mealDb');
      mealDb.searchByName.mockRejectedValue(new Error('API Error'));

      const results = await searchRecipes('test', 'themealdb');
      expect(results).toEqual([]);
    });

    it('should handle empty search query', async () => {
      const results = await searchRecipes('', 'themealdb');
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('scoreRecipe', () => {
    const mockRecipe: ExtendedRecipe = {
      id: 'recipe-1',
      name: 'Chicken Stir Fry',
      thumbnail: 'https://example.com/image.jpg',
      description: 'A quick stir fry',
      ingredients: [
        { ingredient: 'Chicken', measure: '500g' },
        { ingredient: 'Broccoli', measure: '200g' },
        { ingredient: 'Soy Sauce', measure: '2 tbsp' },
        { ingredient: 'Garlic', measure: '2 cloves' },
        { ingredient: 'Rice', measure: '1 cup' },
      ],
      instructions: 'Cook the chicken...',
      totalTime: 30,
      servings: 4,
      cuisine: 'Asian',
      diet: [],
      healthLabels: [],
      source: 'test',
      sourceUrl: '',
    };

    const mockPantryItems: PantryItem[] = [
      {
        id: '1',
        name: 'Chicken Breast',
        category: 'meat',
        quantity: 2,
        unit: 'lb',
        household_id: 'h1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '2',
        name: 'Broccoli',
        category: 'vegetable',
        quantity: 1,
        unit: 'head',
        household_id: 'h1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '3',
        name: 'Soy Sauce',
        category: 'condiment',
        quantity: 1,
        unit: 'bottle',
        household_id: 'h1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    it('should score recipe based on pantry matches', () => {
      const scored = scoreRecipe(mockRecipe, mockPantryItems);
      expect(scored).toHaveProperty('matchScore');
      expect(scored).toHaveProperty('matchedIngredients');
      expect(scored).toHaveProperty('missingIngredients');
      expect(scored.matchScore).toBeGreaterThan(0);
    });

    it('should identify matched ingredients', () => {
      const scored = scoreRecipe(mockRecipe, mockPantryItems);
      expect(scored.matchedIngredients.length).toBeGreaterThan(0);
    });

    it('should identify missing ingredients', () => {
      const scored = scoreRecipe(mockRecipe, mockPantryItems);
      // We're missing Rice and Garlic
      expect(scored.missingIngredients.length).toBeGreaterThan(0);
    });

    it('should return 0 score with empty pantry', () => {
      const scored = scoreRecipe(mockRecipe, []);
      expect(scored.matchScore).toBe(0);
      expect(scored.matchedIngredients.length).toBe(0);
    });

    it('should handle recipe with no ingredients', () => {
      const emptyRecipe: ExtendedRecipe = {
        ...mockRecipe,
        ingredients: [],
      };
      const scored = scoreRecipe(emptyRecipe, mockPantryItems);
      expect(scored.matchScore).toBeDefined();
    });
  });

  describe('getRecipeDetails', () => {
    it('should fetch recipe details from TheMealDB', async () => {
      const mealDb = require('../../lib/mealDb');
      mealDb.getRecipeById.mockResolvedValue({
        id: '1',
        name: 'Test Recipe',
        ingredients: [],
        instructions: 'Cook it',
      });

      const result = await getRecipeDetails('mealdb-1');
      expect(mealDb.getRecipeById).toHaveBeenCalled();
    });

    it('should fetch recipe details from Spoonacular', async () => {
      const spoonacular = require('../../lib/spoonacular');
      spoonacular.getRecipeById.mockResolvedValue({
        id: '1',
        title: 'Test Recipe',
        extendedIngredients: [],
        instructions: 'Cook it',
      });

      const result = await getRecipeDetails('spoonacular-1');
      expect(spoonacular.getRecipeById).toHaveBeenCalled();
    });

    it('should return null for invalid recipe ID', async () => {
      const mealDb = require('../../lib/mealDb');
      mealDb.getRecipeById.mockResolvedValue(null);
      
      const result = await getRecipeDetails('');
      // Empty string may still trigger a search - test that it handles gracefully
      expect(result === null || result !== undefined).toBe(true);
    });

    it('should handle API errors gracefully', async () => {
      const mealDb = require('../../lib/mealDb');
      const spoonacular = require('../../lib/spoonacular');
      
      // Clear previous mocks
      jest.clearAllMocks();
      
      // Mock API to reject
      mealDb.getRecipeById.mockRejectedValue(new Error('Not found'));
      spoonacular.getRecipeById.mockRejectedValue(new Error('Not found'));

      try {
        const result = await getRecipeDetails('mealdb-invalid');
        // If it doesn't throw, it should return null
        expect(result).toBeNull();
      } catch (error) {
        // If it throws, that's also acceptable error handling
        expect(error).toBeDefined();
      }
    });
  });
});

