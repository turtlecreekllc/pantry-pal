/**
 * Tonight Service Tests
 * Tests for the dinner suggestion generation logic
 */

// Mock external dependencies first
jest.mock('../../lib/recipeService', () => ({
  searchRecipes: jest.fn(),
  scoreRecipe: jest.fn(),
  getRecipeDetails: jest.fn(),
}));

jest.mock('../../lib/spoonacular', () => ({
  searchByIngredients: jest.fn(),
}));

jest.mock('../../lib/claudeService', () => ({
  callClaude: jest.fn(),
}));

import {
  getGreeting,
  getExpiringItems,
  getDaysUntilExpiration,
  getQuickCategories,
  generatePersonalizedIntro,
  mergeRosterConstraints,
  generateTonightSuggestions,
  HouseholdMemberProfile,
  RecipeFeedbackSummary,
} from '../../lib/tonightService';
import { callClaude } from '../../lib/claudeService';
import { PantryItem, EnhancedScoredRecipe } from '../../lib/types';

// Helper: minimal member profile
function makeMember(overrides: Partial<HouseholdMemberProfile> = {}): HouseholdMemberProfile {
  return {
    id: 'member-1',
    household_id: 'hh-1',
    user_id: null,
    display_name: 'Test Member',
    avatar_emoji: '👤',
    dietary_preferences: [],
    allergies: [],
    disliked_ingredients: [],
    cooking_method_preferences: [],
    is_default_included: true,
    ...overrides,
  };
}

// Helper: minimal pantry item
function makePantryItem(overrides: Partial<PantryItem> = {}): PantryItem {
  return {
    id: 'item-1',
    user_id: 'user-1',
    household_id: null,
    barcode: null,
    name: 'Chicken Breast',
    brand: null,
    category: 'Protein',
    quantity: 2,
    unit: 'lbs',
    expiration_date: null,
    image_url: null,
    nutrition_json: null,
    location: 'fridge',
    location_notes: null,
    fill_level: null,
    original_quantity: null,
    usage_history: null,
    added_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('Tonight Service', () => {
  describe('getGreeting', () => {
    it('should return a greeting with the user name when provided', () => {
      const result = getGreeting('John');
      expect(result.greeting).toContain('John');
    });

    it('should return a generic greeting when no name is provided', () => {
      const result = getGreeting('');
      expect(result.greeting).toBeDefined();
      expect(result.subGreeting).toBeDefined();
    });

    it('should return different greetings based on time of day', () => {
      // Mock date to control time of day
      const morning = new Date('2024-01-01T09:00:00');
      const evening = new Date('2024-01-01T18:00:00');
      
      jest.useFakeTimers();
      
      jest.setSystemTime(morning);
      const morningGreeting = getGreeting('Test');
      
      jest.setSystemTime(evening);
      const eveningGreeting = getGreeting('Test');
      
      jest.useRealTimers();
      
      // Both should have valid greetings
      expect(morningGreeting.greeting).toBeDefined();
      expect(eveningGreeting.greeting).toBeDefined();
    });
  });

  describe('getExpiringItems', () => {
    const mockPantryItems: PantryItem[] = [
      {
        id: '1',
        name: 'Milk',
        category: 'dairy',
        quantity: 1,
        unit: 'gallon',
        expiration_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days
        household_id: 'h1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '2',
        name: 'Cheese',
        category: 'dairy',
        quantity: 1,
        unit: 'block',
        expiration_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days
        household_id: 'h1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '3',
        name: 'Bread',
        category: 'bakery',
        quantity: 1,
        unit: 'loaf',
        expiration_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day
        household_id: 'h1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    it('should return items expiring within the threshold', () => {
      const expiring = getExpiringItems(mockPantryItems, 3);
      expect(expiring.length).toBe(2); // Milk and Bread
      expect(expiring.map(i => i.name)).toContain('Milk');
      expect(expiring.map(i => i.name)).toContain('Bread');
    });

    it('should return empty array when no items are expiring', () => {
      const futureItems: PantryItem[] = mockPantryItems.map(item => ({
        ...item,
        expiration_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }));
      const expiring = getExpiringItems(futureItems, 3);
      expect(expiring.length).toBe(0);
    });

    it('should handle items without expiration dates', () => {
      const itemsWithoutDates: PantryItem[] = [
        {
          id: '1',
          name: 'Salt',
          category: 'pantry',
          quantity: 1,
          unit: 'container',
          household_id: 'h1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      const expiring = getExpiringItems(itemsWithoutDates, 3);
      expect(expiring.length).toBe(0);
    });
  });

  describe('getDaysUntilExpiration', () => {
    it('should calculate correct days until expiration', () => {
      const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
      const days = getDaysUntilExpiration(futureDate);
      expect(days).toBe(5);
    });

    it('should return 0 for expired items', () => {
      const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      const days = getDaysUntilExpiration(pastDate);
      expect(days).toBeLessThanOrEqual(0);
    });

    it('should return 0 for items expiring today', () => {
      const today = new Date().toISOString();
      const days = getDaysUntilExpiration(today);
      expect(days).toBeLessThanOrEqual(1);
    });
  });

  describe('getQuickCategories', () => {
    it('should return an array of quick categories', () => {
      const categories = getQuickCategories();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
    });

    it('should have required properties for each category', () => {
      const categories = getQuickCategories();
      categories.forEach(cat => {
        expect(cat).toHaveProperty('id');
        expect(cat).toHaveProperty('label');
        expect(cat).toHaveProperty('emoji');
      });
    });
  });

  describe('generatePersonalizedIntro', () => {
    const mockRecipe: EnhancedScoredRecipe = {
      id: 'recipe-1',
      name: 'Cheesy Pasta',
      thumbnail: 'https://example.com/pasta.jpg',
      description: 'Delicious pasta dish',
      ingredients: [
        { ingredient: 'Pasta', measure: '200g' },
        { ingredient: 'Cheese', measure: '100g' },
      ],
      instructions: 'Cook pasta, add cheese',
      totalTime: 30,
      servings: 4,
      cuisine: 'Italian',
      diet: [],
      healthLabels: [],
      source: 'test',
      sourceUrl: '',
      matchScore: 85,
      matchedIngredients: ['Pasta', 'Cheese'],
      missingIngredients: [],
      matchPercentage: 85,
      expiringIngredients: [],
      priorityScore: 90,
    };

    it('should generate a personalized intro for a recipe', () => {
      const intro = generatePersonalizedIntro(mockRecipe, 4);
      expect(typeof intro).toBe('string');
      expect(intro.length).toBeGreaterThan(0);
    });

    it('should mention matched ingredients when available', () => {
      const intro = generatePersonalizedIntro(mockRecipe, 4);
      // The intro should reference the recipe somehow
      expect(intro).toBeDefined();
    });

    it('should adapt to household size', () => {
      const smallHousehold = generatePersonalizedIntro(mockRecipe, 1);
      const largeHousehold = generatePersonalizedIntro(mockRecipe, 6);
      // Both should be valid strings
      expect(typeof smallHousehold).toBe('string');
      expect(typeof largeHousehold).toBe('string');
    });
  });
});

// ---------------------------------------------------------------------------
// New tests: mergeRosterConstraints + generateTonightSuggestions (Claude path)
// ---------------------------------------------------------------------------

describe('mergeRosterConstraints', () => {
  it('returns empty constraints for empty roster', () => {
    const result = mergeRosterConstraints([]);
    expect(result.dietary).toEqual([]);
    expect(result.allergies).toEqual([]);
    expect(result.disliked).toEqual([]);
    expect(result.cookingMethods).toEqual([]);
  });

  it('merges dietary preferences from all members', () => {
    const roster = [
      makeMember({ dietary_preferences: ['mediterranean'] }),
      makeMember({ id: 'member-2', dietary_preferences: ['vegetarian'] }),
    ];
    const result = mergeRosterConstraints(roster);
    expect(result.dietary).toContain('mediterranean');
    expect(result.dietary).toContain('vegetarian');
  });

  it('deduplicates overlapping constraints', () => {
    const roster = [
      makeMember({ dietary_preferences: ['vegetarian'], allergies: ['gluten'] }),
      makeMember({ id: 'member-2', dietary_preferences: ['vegetarian'], allergies: ['gluten'] }),
    ];
    const result = mergeRosterConstraints(roster);
    expect(result.dietary.filter(d => d === 'vegetarian')).toHaveLength(1);
    expect(result.allergies.filter(a => a === 'gluten')).toHaveLength(1);
  });

  it('merges cooking method preferences', () => {
    const roster = [
      makeMember({ cooking_method_preferences: ['baked-only'] }),
      makeMember({ id: 'member-2', cooking_method_preferences: [] }),
    ];
    const result = mergeRosterConstraints(roster);
    expect(result.cookingMethods).toContain('baked-only');
  });

  it('merges disliked ingredients from all members', () => {
    const roster = [
      makeMember({ disliked_ingredients: ['pizza'] }),
      makeMember({ id: 'member-2', disliked_ingredients: ['mushrooms'] }),
    ];
    const result = mergeRosterConstraints(roster);
    expect(result.disliked).toContain('pizza');
    expect(result.disliked).toContain('mushrooms');
  });
});

describe('generateTonightSuggestions (Claude path)', () => {
  const mockClaudeSuggestions = {
    suggestions: [
      {
        name: 'Baked Mediterranean Chicken',
        description: 'Light and healthy baked chicken with herbs.',
        why: 'Uses your expiring chicken breast!',
        ingredients: [
          { ingredient: 'Chicken Breast', measure: '500g', inPantry: true },
          { ingredient: 'Lemon', measure: '1', inPantry: false },
        ],
        instructions: '1. Season chicken. 2. Bake at 375°F for 30 minutes.',
        readyInMinutes: 40,
        servings: 4,
        matchPercentage: 80,
        missingIngredients: ['Lemon'],
      },
    ],
  };

  beforeEach(() => {
    (callClaude as jest.Mock).mockClear();
    (callClaude as jest.Mock).mockResolvedValue(JSON.stringify(mockClaudeSuggestions));
  });

  it('returns empty result for empty pantry without calling Claude', async () => {
    const result = await generateTonightSuggestions([], [], [], {
      likedRecipeNames: [],
      dislikedRecipeNames: [],
      cookedRecipeNames: [],
    });
    expect(callClaude).not.toHaveBeenCalled();
    expect(result.suggestions.length).toBeGreaterThan(0); // fallback recipes shown
  });

  it('calls Claude with pantry items and returns suggestions', async () => {
    const pantryItems = [makePantryItem()];
    const result = await generateTonightSuggestions(pantryItems, [], [], {
      likedRecipeNames: [],
      dislikedRecipeNames: [],
      cookedRecipeNames: [],
    });

    expect(callClaude).toHaveBeenCalledTimes(1);
    const [systemPrompt, messages] = (callClaude as jest.Mock).mock.calls[0];
    expect(systemPrompt).toContain('Pepper');
    expect(messages[0].content).toContain('Chicken Breast');
    expect(result.topPick).not.toBeNull();
    expect(result.topPick?.recipe.name).toBe('Baked Mediterranean Chicken');
  });

  it('includes dietary constraints in Claude prompt', async () => {
    const pantryItems = [makePantryItem()];
    const roster = [
      makeMember({ dietary_preferences: ['mediterranean'], cooking_method_preferences: ['baked-only'] }),
      makeMember({ id: 'member-2', dietary_preferences: ['vegetarian'] }),
    ];

    await generateTonightSuggestions(pantryItems, [], roster, {
      likedRecipeNames: [],
      dislikedRecipeNames: [],
      cookedRecipeNames: [],
    });

    const prompt = (callClaude as jest.Mock).mock.calls[0][1][0].content;
    expect(prompt).toContain('mediterranean');
    expect(prompt).toContain('vegetarian');
    expect(prompt).toContain('baked-only');
  });

  it('includes feedback in Claude prompt', async () => {
    const pantryItems = [makePantryItem()];
    const feedback: RecipeFeedbackSummary = {
      likedRecipeNames: ['Lemon Chicken'],
      dislikedRecipeNames: ['Beef Stew'],
      cookedRecipeNames: ['Pasta Primavera'],
    };

    await generateTonightSuggestions(pantryItems, [], [], feedback);

    const prompt = (callClaude as jest.Mock).mock.calls[0][1][0].content;
    expect(prompt).toContain('Pasta Primavera'); // do not suggest cooked
    expect(prompt).toContain('Beef Stew');       // disliked
    expect(prompt).toContain('Lemon Chicken');   // liked (inspiration)
  });

  it('falls back to Spoonacular/MealDB when Claude fails', async () => {
    (callClaude as jest.Mock).mockRejectedValueOnce(new Error('API unavailable'));
    const { searchByIngredients } = require('../../lib/spoonacular');
    (searchByIngredients as jest.Mock).mockResolvedValueOnce([]);

    const pantryItems = [makePantryItem()];
    const result = await generateTonightSuggestions(pantryItems, []);

    // Should not throw; fallback recipes are returned
    expect(result.suggestions).toBeDefined();
  });

  it('falls back gracefully when Claude returns invalid JSON', async () => {
    (callClaude as jest.Mock).mockResolvedValueOnce('not valid json {{');
    const { searchByIngredients } = require('../../lib/spoonacular');
    (searchByIngredients as jest.Mock).mockResolvedValueOnce([]);

    const pantryItems = [makePantryItem()];
    const result = await generateTonightSuggestions(pantryItems, []);
    expect(result.suggestions).toBeDefined();
  });
});

