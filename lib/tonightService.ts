/**
 * Tonight Service
 * Generates personalized dinner suggestions based on pantry inventory,
 * expiring items, and user preferences.
 */

import { PantryItem, ExtendedRecipe, ScoredRecipe, EnhancedScoredRecipe } from './types';
import { searchRecipes, scoreRecipe, getRecipeDetails } from './recipeService';
import { searchByIngredients as spoonacularSearchByIngredients } from './spoonacular';
import { callClaude } from './claudeService';

// ---------------------------------------------------------------------------
// Per-member dietary profile (from household_member_profiles table)
// ---------------------------------------------------------------------------
export interface HouseholdMemberProfile {
  id: string;
  household_id: string;
  user_id: string | null;
  display_name: string;
  avatar_emoji: string;
  dietary_preferences: string[];
  allergies: string[];
  disliked_ingredients: string[];
  cooking_method_preferences: string[];
  is_default_included: boolean;
}

// Merged dietary constraints from an active dinner roster
export interface MergedDietaryConstraints {
  dietary: string[];        // e.g. ['mediterranean', 'vegetarian']
  allergies: string[];      // e.g. ['gluten']
  disliked: string[];       // e.g. ['pizza']
  cookingMethods: string[]; // e.g. ['baked-only']
}

// Recent feedback from user_recipe_feedback table
export interface RecipeFeedbackSummary {
  likedRecipeNames: string[];   // swipe-right recipes (last 30 days)
  dislikedRecipeNames: string[]; // swipe-left recipes (last 30 days)
  cookedRecipeNames: string[];   // cooked recipes (last 7 days — don't repeat)
}

/**
 * Merges dietary constraints from all active roster members into a single set.
 * A dinner suggestion must satisfy ALL members simultaneously.
 */
export function mergeRosterConstraints(roster: HouseholdMemberProfile[]): MergedDietaryConstraints {
  return {
    dietary: [...new Set(roster.flatMap(m => m.dietary_preferences))],
    allergies: [...new Set(roster.flatMap(m => m.allergies))],
    disliked: [...new Set(roster.flatMap(m => m.disliked_ingredients))],
    cookingMethods: [...new Set(roster.flatMap(m => m.cooking_method_preferences))],
  };
}

/** Configuration for suggestion generation */
const CONFIG = {
  MAX_SUGGESTIONS: 10,
  EXPIRING_DAYS_THRESHOLD: 3,
  MIN_MATCH_SCORE: 30,
  EXPIRING_BOOST_MULTIPLIER: 1.5,
  RECENTLY_MADE_PENALTY: 0.7,
} as const;

/** Greeting messages based on time of day */
const GREETINGS = {
  morning: [
    "Good morning! 🌅",
    "Rise and shine! ☀️",
    "Morning, chef! 🍳",
  ],
  afternoon: [
    "Good afternoon! 🌤️",
    "Hey there! 👋",
    "Hope you're having a great day! ✨",
  ],
  evening: [
    "Good evening! 🌙",
    "Dinnertime's approaching! 🍽️",
    "Ready to cook something amazing? 🌶️",
  ],
} as const;

/** Popular recipes for empty pantry state */
const POPULAR_RECIPE_QUERIES = [
  'chicken',
  'pasta',
  'stir fry',
  'tacos',
  'soup',
  'salad',
] as const;

/** Fallback recipes for when API is unavailable */
const FALLBACK_RECIPES: EnhancedScoredRecipe[] = [
  {
    id: 'fallback-1',
    name: 'Classic Spaghetti Bolognese',
    category: 'Pasta',
    area: 'Italian',
    youtubeUrl: null,
    source: null,
    thumbnail: 'https://www.themealdb.com/images/media/meals/sutysw1468247559.jpg',
    ingredients: [
      { ingredient: 'Ground Beef', measure: '500g' },
      { ingredient: 'Spaghetti', measure: '400g' },
      { ingredient: 'Onion', measure: '1 large' },
      { ingredient: 'Tomato Sauce', measure: '400ml' },
      { ingredient: 'Garlic', measure: '3 cloves' },
    ],
    instructions: 'Brown the beef, sauté onions and garlic, add tomato sauce, simmer, serve over spaghetti.',
    readyInMinutes: 45,
    servings: 4,
    matchScore: 75,
    matchedIngredients: [],
    missingIngredients: [],
    matchPercentage: 75,
    expiringIngredients: [],
    priorityScore: 75,
  },
  {
    id: 'fallback-2',
    name: 'Chicken Stir Fry',
    category: 'Chicken',
    area: 'Asian',
    youtubeUrl: null,
    source: null,
    thumbnail: 'https://www.themealdb.com/images/media/meals/yvxwey1511796614.jpg',
    ingredients: [
      { ingredient: 'Chicken Breast', measure: '500g' },
      { ingredient: 'Bell Peppers', measure: '2' },
      { ingredient: 'Broccoli', measure: '1 head' },
      { ingredient: 'Soy Sauce', measure: '3 tbsp' },
      { ingredient: 'Garlic', measure: '2 cloves' },
    ],
    instructions: 'Slice chicken, stir fry with vegetables, add soy sauce, serve over rice.',
    readyInMinutes: 25,
    servings: 4,
    matchScore: 70,
    matchedIngredients: [],
    missingIngredients: [],
    matchPercentage: 70,
    expiringIngredients: [],
    priorityScore: 70,
  },
  {
    id: 'fallback-3',
    name: 'Creamy Garlic Pasta',
    category: 'Pasta',
    area: 'Italian',
    youtubeUrl: null,
    source: null,
    thumbnail: 'https://www.themealdb.com/images/media/meals/wvqpwt1468339226.jpg',
    ingredients: [
      { ingredient: 'Pasta', measure: '400g' },
      { ingredient: 'Heavy Cream', measure: '200ml' },
      { ingredient: 'Parmesan', measure: '100g' },
      { ingredient: 'Garlic', measure: '4 cloves' },
      { ingredient: 'Butter', measure: '2 tbsp' },
    ],
    instructions: 'Cook pasta, sauté garlic in butter, add cream and parmesan, toss with pasta.',
    readyInMinutes: 20,
    servings: 4,
    matchScore: 65,
    matchedIngredients: [],
    missingIngredients: [],
    matchPercentage: 65,
    expiringIngredients: [],
    priorityScore: 65,
  },
  {
    id: 'fallback-4',
    name: 'Beef Tacos',
    category: 'Beef',
    area: 'Mexican',
    youtubeUrl: null,
    source: null,
    thumbnail: 'https://www.themealdb.com/images/media/meals/ypxvwv1505333929.jpg',
    ingredients: [
      { ingredient: 'Ground Beef', measure: '500g' },
      { ingredient: 'Taco Shells', measure: '8' },
      { ingredient: 'Lettuce', measure: '1 head' },
      { ingredient: 'Cheese', measure: '200g' },
      { ingredient: 'Salsa', measure: '200ml' },
    ],
    instructions: 'Brown beef with taco seasoning, fill shells, top with lettuce, cheese, and salsa.',
    readyInMinutes: 25,
    servings: 4,
    matchScore: 60,
    matchedIngredients: [],
    missingIngredients: [],
    matchPercentage: 60,
    expiringIngredients: [],
    priorityScore: 60,
  },
  {
    id: 'fallback-5',
    name: 'Vegetable Soup',
    category: 'Side',
    area: 'American',
    youtubeUrl: null,
    source: null,
    thumbnail: 'https://www.themealdb.com/images/media/meals/r6hjb51685118640.jpg',
    ingredients: [
      { ingredient: 'Carrots', measure: '3' },
      { ingredient: 'Celery', measure: '3 stalks' },
      { ingredient: 'Onion', measure: '1' },
      { ingredient: 'Vegetable Broth', measure: '1L' },
      { ingredient: 'Potatoes', measure: '2' },
    ],
    instructions: 'Sauté vegetables, add broth, simmer until tender, season to taste.',
    readyInMinutes: 40,
    servings: 6,
    matchScore: 55,
    matchedIngredients: [],
    missingIngredients: [],
    matchPercentage: 55,
    expiringIngredients: [],
    priorityScore: 55,
  },
];

interface TonightSuggestion {
  recipe: EnhancedScoredRecipe;
  reason: string;
  isTopPick: boolean;
}

interface TonightState {
  greeting: string;
  subGreeting: string;
  topPick: TonightSuggestion | null;
  moreSuggestions: TonightSuggestion[];
  expiringItems: PantryItem[];
  weekPlan: { day: string; meal: string | null; isToday: boolean }[];
  isEmpty: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * Gets time-appropriate greeting message with user's first name
 */
export function getGreeting(firstName?: string): { greeting: string; subGreeting: string } {
  const hour = new Date().getHours();
  let timeOfDay: 'morning' | 'afternoon' | 'evening';
  
  if (hour < 12) {
    timeOfDay = 'morning';
  } else if (hour < 17) {
    timeOfDay = 'afternoon';
  } else {
    timeOfDay = 'evening';
  }
  
  // Format greeting as "Good morning, Sarah!" or "Good morning!"
  const greeting = firstName 
    ? `Good ${timeOfDay}, ${firstName}! 👋`
    : `Good ${timeOfDay}! 👋`;
  
  const subGreetings = [
    "Here's what I'm thinking for tonight...",
    "Let's figure out dinner together!",
    "I've got some ideas for you...",
  ];
  
  return {
    greeting,
    subGreeting: subGreetings[Math.floor(Math.random() * subGreetings.length)],
  };
}

/** Recipe appeal categories for personalization */
const RECIPE_APPEALS = {
  cheesy: ['cheese', 'cheddar', 'mozzarella', 'parmesan', 'cream cheese'],
  kidFriendly: ['chicken nugget', 'mac and cheese', 'pizza', 'taco', 'pasta', 'burger', 'grilled cheese'],
  spicy: ['chili', 'jalapeño', 'sriracha', 'cayenne', 'hot sauce', 'curry'],
  comfort: ['soup', 'stew', 'casserole', 'pot pie', 'meatloaf', 'mashed'],
  healthy: ['salad', 'grilled', 'steamed', 'quinoa', 'kale', 'spinach'],
  quick: [], // determined by cook time
} as const;

/**
 * Generates a personalized intro paragraph for a recipe suggestion
 * Considers family preferences, ingredients, and recipe characteristics
 */
export function generatePersonalizedIntro(
  recipe: EnhancedScoredRecipe,
  householdSize?: number,
  dietaryPreferences?: string[]
): string {
  const intros: string[] = [];
  const recipeName = (recipe.name ?? '').toLowerCase();
  const ingredients = (recipe.ingredients ?? [])
    .map((i) => (i?.ingredient ?? '').toLowerCase())
    .filter(Boolean)
    .join(' ');
  
  // Check for cheese appeal
  const hasCheese = RECIPE_APPEALS.cheesy.some(
    (c) => recipeName.includes(c) || ingredients.includes(c)
  );
  
  // Check for kid-friendly characteristics
  const isKidFriendly = RECIPE_APPEALS.kidFriendly.some(
    (k) => recipeName.includes(k)
  );
  
  // Check for comfort food
  const isComfort = RECIPE_APPEALS.comfort.some(
    (c) => recipeName.includes(c)
  );
  
  // Check cook time
  const isQuick = recipe.readyInMinutes && recipe.readyInMinutes <= 30;
  
  // Build personalized intro based on recipe characteristics
  if (hasCheese && householdSize && householdSize >= 3) {
    intros.push("We think this will be a hit with the kids tonight! This features cheese lovers' favorites that the whole family will enjoy.");
  } else if (hasCheese) {
    intros.push("Perfect for cheese lovers! This dish features rich, melty goodness that's sure to satisfy.");
  }
  
  if (isKidFriendly && householdSize && householdSize >= 3 && !intros.length) {
    intros.push("A family-friendly classic that kids absolutely love! Easy to make and sure to clean plates.");
  }
  
  if (isComfort && !intros.length) {
    intros.push("Cozy comfort food at its finest. Perfect for winding down and enjoying a warm, satisfying meal together.");
  }
  
  if (isQuick && !intros.length) {
    intros.push("Quick and delicious! Ready in under 30 minutes, perfect for busy weeknight dinners.");
  }
  
  // Check for high match score
  if (recipe.matchScore >= 85 && !intros.length) {
    intros.push(`Great news—you already have most of what you need! This recipe is a ${recipe.matchScore}% match with your pantry.`);
  }
  
  // Check for expiring ingredients usage
  if (recipe.expiringIngredients && recipe.expiringIngredients.length > 0 && !intros.length) {
    const items = recipe.expiringIngredients.slice(0, 2).join(' and ');
    intros.push(`Smart choice! This helps use up your ${items} before it expires. Delicious and no waste!`);
  }
  
  // Default intros
  if (!intros.length) {
    const defaults = [
      "A delicious choice for tonight! Based on your ingredients, this recipe is a perfect match.",
      "This popular recipe matches well with what's in your kitchen. Give it a try!",
      "Families love this one! A satisfying meal that's sure to please.",
    ];
    intros.push(defaults[Math.floor(Math.random() * defaults.length)]);
  }
  
  return intros[0];
}

/**
 * Gets items expiring within the threshold
 */
export function getExpiringItems(
  pantryItems: PantryItem[],
  daysThreshold: number = CONFIG.EXPIRING_DAYS_THRESHOLD
): PantryItem[] {
  const now = new Date();
  const thresholdDate = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);
  
  return pantryItems
    .filter((item) => {
      if (!item.expiration_date) return false;
      const expDate = new Date(item.expiration_date);
      return expDate >= now && expDate <= thresholdDate;
    })
    .sort((a, b) => {
      const dateA = new Date(a.expiration_date!);
      const dateB = new Date(b.expiration_date!);
      return dateA.getTime() - dateB.getTime();
    });
}

/**
 * Calculates days until expiration
 */
export function getDaysUntilExpiration(expirationDate: string): number {
  const now = new Date();
  const expDate = new Date(expirationDate);
  return Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Safely compares two strings with null-safety
 */
function safeStringIncludes(str1: string | null | undefined, str2: string | null | undefined): boolean {
  if (!str1 || !str2) return false;
  return str1.toLowerCase().includes(str2.toLowerCase());
}

/**
 * Enhances a scored recipe with expiration awareness and priority
 */
function enhanceRecipe(
  recipe: ScoredRecipe,
  expiringItems: PantryItem[]
): EnhancedScoredRecipe {
  const matchedIngredients = recipe.matchedIngredients ?? [];
  const expiringIngredients = matchedIngredients.filter((ingredient) => {
    if (!ingredient) return false;
    return expiringItems.some((item) => {
      const itemName = item?.name;
      if (!itemName) return false;
      return safeStringIncludes(itemName, ingredient) || safeStringIncludes(ingredient, itemName);
    });
  });
  
  // Calculate priority score - boost recipes that use expiring items
  let priorityScore = recipe.matchScore;
  if (expiringIngredients.length > 0) {
    priorityScore *= CONFIG.EXPIRING_BOOST_MULTIPLIER;
    priorityScore += expiringIngredients.length * 10;
  }
  
  return {
    ...recipe,
    matchPercentage: recipe.matchScore,
    expiringIngredients,
    priorityScore: Math.min(priorityScore, 150), // Cap at 150
  };
}

/**
 * Generates reason text for why a recipe was suggested
 */
function generateReason(recipe: EnhancedScoredRecipe): string {
  if (recipe.expiringIngredients.length > 0) {
    const items = recipe.expiringIngredients.slice(0, 2).join(' and ');
    return `Uses ${items} before it expires!`;
  }
  
  if (recipe.matchScore >= 90) {
    return `You have almost everything you need!`;
  }
  
  if (recipe.matchScore >= 70) {
    return `You have ${recipe.matchedIngredients?.length ?? 0} of ${recipe.ingredients?.length ?? 0} ingredients!`;
  }
  
  if (recipe.readyInMinutes && recipe.readyInMinutes <= 30) {
    return `Quick ${recipe.readyInMinutes}-minute meal!`;
  }
  
  return `A delicious choice based on what you have.`;
}

/**
 * Fetches popular recipes for users with empty pantry
 */
async function getPopularRecipes(): Promise<ExtendedRecipe[]> {
  const recipes: ExtendedRecipe[] = [];
  
  // Fetch from a few popular categories
  const queries = POPULAR_RECIPE_QUERIES.slice(0, 3);
  
  for (const query of queries) {
    try {
      const previews = await searchRecipes(query, 'themealdb');
      if (previews.length > 0) {
        const details = await getRecipeDetails(previews[0].id);
        if (details) {
          recipes.push(details);
        }
      }
    } catch (error) {
      console.error(`Error fetching popular recipe for ${query}:`, error);
    }
    
    if (recipes.length >= 5) break;
  }
  
  return recipes;
}

// ---------------------------------------------------------------------------
// Claude prompt for Tonight suggestions
// ---------------------------------------------------------------------------

const TONIGHT_SYSTEM_PROMPT = `You are Pepper, the AI cooking assistant for Dinner Plans.
Your job is to suggest realistic, delicious dinner recipes based on what's in the user's pantry,
respecting everyone's dietary needs for tonight.

You must ALWAYS return valid JSON — no markdown, no explanation, just the JSON object.

Rules:
- ONLY suggest recipes compatible with ALL dietary constraints listed
- PRIORITIZE recipes that use expiring ingredients
- NEVER suggest recipes with disliked ingredients
- NEVER suggest recipes cooked in the last 7 days
- Prefer recipes where the user has most ingredients already
- Cooking method constraints (e.g. "baked-only") are non-negotiable`;

interface ClaudeSuggestion {
  name: string;
  description: string;
  why: string; // Pepper's reason (expiring items, pantry match, etc.)
  ingredients: Array<{ ingredient: string; measure: string; inPantry: boolean }>;
  instructions: string;
  readyInMinutes: number;
  servings: number;
  matchPercentage: number;
  missingIngredients: string[];
}

interface ClaudeTonightResponse {
  suggestions: ClaudeSuggestion[];
}

function buildTonightPrompt(
  pantryItems: PantryItem[],
  expiringItems: PantryItem[],
  constraints: MergedDietaryConstraints,
  feedback: RecipeFeedbackSummary,
  recentlyMadeRecipeIds: string[]
): string {
  const pantryList = pantryItems
    .map(item => {
      const expiring = expiringItems.some(e => e.id === item.id);
      return `- ${item.name} (${item.quantity} ${item.unit})${expiring ? ' ⚠️ EXPIRING SOON' : ''}`;
    })
    .join('\n');

  const constraintLines: string[] = [];
  if (constraints.dietary.length > 0) {
    constraintLines.push(`Dietary requirements: ${constraints.dietary.join(', ')}`);
  }
  if (constraints.allergies.length > 0) {
    constraintLines.push(`Allergies (strict — NEVER include): ${constraints.allergies.join(', ')}`);
  }
  if (constraints.disliked.length > 0) {
    constraintLines.push(`Disliked ingredients (avoid): ${constraints.disliked.join(', ')}`);
  }
  if (constraints.cookingMethods.length > 0) {
    constraintLines.push(`Required cooking methods: ${constraints.cookingMethods.join(', ')}`);
  }

  const feedbackLines: string[] = [];
  if (feedback.cookedRecipeNames.length > 0) {
    feedbackLines.push(`DO NOT suggest (cooked this week): ${feedback.cookedRecipeNames.join(', ')}`);
  }
  if (feedback.dislikedRecipeNames.length > 0) {
    feedbackLines.push(`Household dislikes: ${feedback.dislikedRecipeNames.join(', ')}`);
  }
  if (feedback.likedRecipeNames.length > 0) {
    feedbackLines.push(`Household likes (use as style inspiration): ${feedback.likedRecipeNames.join(', ')}`);
  }

  const pantryCount = pantryItems.length;
  const degradeNote = pantryCount < 5
    ? '\nNote: Pantry is light. Suggest simple recipes and clearly list what needs to be purchased.'
    : pantryCount < 10
    ? '\nNote: Moderate pantry. Show what additional items would be needed.'
    : '';

  return `PANTRY ITEMS:
${pantryList}
${degradeNote}

DIETARY CONSTRAINTS FOR TONIGHT'S DINNER:
${constraintLines.length > 0 ? constraintLines.join('\n') : 'No restrictions'}

FEEDBACK:
${feedbackLines.length > 0 ? feedbackLines.join('\n') : 'No prior feedback'}

Suggest 5 dinner recipes. Return ONLY this JSON:
{
  "suggestions": [
    {
      "name": "Recipe Name",
      "description": "One appetizing sentence",
      "why": "Pepper's reason (use expiring X, great pantry match, etc.)",
      "ingredients": [
        {"ingredient": "Chicken breast", "measure": "500g", "inPantry": true},
        {"ingredient": "Lemon", "measure": "1", "inPantry": false}
      ],
      "instructions": "1. Step one.\\n2. Step two.",
      "readyInMinutes": 30,
      "servings": 4,
      "matchPercentage": 85,
      "missingIngredients": ["Lemon"]
    }
  ]
}`;
}

function claudeSuggestionToEnhanced(
  s: ClaudeSuggestion,
  index: number,
  expiringItems: PantryItem[]
): EnhancedScoredRecipe {
  const matchedIngredients = s.ingredients
    .filter(i => i.inPantry)
    .map(i => i.ingredient);

  const expiringIngredients = matchedIngredients.filter(name =>
    expiringItems.some(e =>
      e.name.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(e.name.toLowerCase())
    )
  );

  let priorityScore = s.matchPercentage;
  if (expiringIngredients.length > 0) {
    priorityScore = Math.min(priorityScore * CONFIG.EXPIRING_BOOST_MULTIPLIER + expiringIngredients.length * 10, 150);
  }

  return {
    id: `claude-${index}-${Date.now()}`,
    name: s.name,
    category: 'AI Suggestion',
    area: '',
    youtubeUrl: null,
    source: null,
    thumbnail: '',
    ingredients: s.ingredients.map(i => ({ ingredient: i.ingredient, measure: i.measure })),
    instructions: s.instructions,
    readyInMinutes: s.readyInMinutes,
    servings: s.servings,
    matchScore: s.matchPercentage,
    matchedIngredients,
    missingIngredients: s.missingIngredients,
    matchPercentage: s.matchPercentage,
    expiringIngredients,
    priorityScore,
  };
}

/**
 * Main function to generate tonight's dinner suggestions.
 *
 * Uses Claude claude-sonnet-4-6 with full dietary constraint awareness.
 * Falls back to legacy Spoonacular/MealDB if Claude is unavailable.
 *
 * Data flow:
 *   pantryItems + activeRoster + recentFeedback
 *     → mergeRosterConstraints()
 *     → buildTonightPrompt()
 *     → callClaude()
 *     → claudeSuggestionToEnhanced()
 *     → TonightSuggestion[]
 */
export async function generateTonightSuggestions(
  pantryItems: PantryItem[],
  recentlyMadeRecipeIds: string[] = [],
  activeRoster: HouseholdMemberProfile[] = [],
  recentFeedback: RecipeFeedbackSummary = {
    likedRecipeNames: [],
    dislikedRecipeNames: [],
    cookedRecipeNames: [],
  }
): Promise<{
  topPick: TonightSuggestion | null;
  suggestions: TonightSuggestion[];
  expiringItems: PantryItem[];
}> {
  const expiringItems = getExpiringItems(pantryItems);
  const constraints = mergeRosterConstraints(activeRoster);

  // Empty pantry: show degraded state prompt (UI handles the <5 item banner)
  if (pantryItems.length === 0) {
    console.log('[Tonight] Empty pantry - showing fallback recipes');
    const suggestions: TonightSuggestion[] = FALLBACK_RECIPES.map((recipe, index) => ({
      recipe,
      reason: 'A popular family favorite!',
      isTopPick: index === 0,
    }));
    return { topPick: suggestions[0] || null, suggestions: suggestions.slice(1), expiringItems: [] };
  }

  // Attempt Claude-powered suggestions
  try {
    console.log('[Tonight] Generating Claude suggestions with constraints:', constraints);
    const prompt = buildTonightPrompt(pantryItems, expiringItems, constraints, recentFeedback, recentlyMadeRecipeIds);
    const responseText = await callClaude(TONIGHT_SYSTEM_PROMPT, [{ role: 'user', content: prompt }], {
      maxTokens: 3000,
      temperature: 0.7,
    });

    const parsed: ClaudeTonightResponse = JSON.parse(responseText);
    if (!parsed.suggestions || parsed.suggestions.length === 0) {
      throw new Error('Claude returned empty suggestions');
    }

    const enhanced = parsed.suggestions.map((s, i) => claudeSuggestionToEnhanced(s, i, expiringItems));
    enhanced.sort((a, b) => b.priorityScore - a.priorityScore);

    const suggestions: TonightSuggestion[] = enhanced.map((recipe, index) => ({
      recipe,
      reason: recipe.expiringIngredients.length > 0
        ? `Uses ${recipe.expiringIngredients.slice(0, 2).join(' and ')} before it expires!`
        : parsed.suggestions[index]?.why ?? generateReason(recipe),
      isTopPick: index === 0,
    }));

    console.log(`[Tonight] Claude returned ${suggestions.length} suggestions`);
    return { topPick: suggestions[0] || null, suggestions: suggestions.slice(1), expiringItems };

  } catch (error) {
    console.warn('[Tonight] Claude unavailable, falling back to Spoonacular/MealDB:', error);
  }

  // Fallback: legacy Spoonacular + MealDB pipeline (no dietary filtering)
  const ingredientNames = pantryItems.map(item => item.name);
  const priorityIngredients = expiringItems.length > 0
    ? expiringItems.map(item => item.name)
    : ingredientNames.slice(0, 5);

  let scoredRecipes: EnhancedScoredRecipe[] = [];

  try {
    const spoonacularResults = await spoonacularSearchByIngredients(priorityIngredients);
    for (const preview of spoonacularResults.slice(0, CONFIG.MAX_SUGGESTIONS * 2)) {
      try {
        const fullRecipe = await getRecipeDetails(preview.id);
        if (fullRecipe) {
          const scored = scoreRecipe(fullRecipe, pantryItems);
          if (scored.matchScore >= CONFIG.MIN_MATCH_SCORE) {
            if (recentlyMadeRecipeIds.includes(preview.id)) {
              scored.matchScore *= CONFIG.RECENTLY_MADE_PENALTY;
            }
            scoredRecipes.push(enhanceRecipe(scored, expiringItems));
          }
        }
      } catch (err) {
        console.error(`[Tonight] Error processing Spoonacular recipe ${preview.id}:`, err);
      }
    }

    if (scoredRecipes.length < 3) {
      const mealDbResults = await searchRecipes(priorityIngredients[0], 'themealdb');
      for (const preview of mealDbResults.slice(0, CONFIG.MAX_SUGGESTIONS)) {
        try {
          const fullRecipe = await getRecipeDetails(preview.id);
          if (fullRecipe) {
            const scored = scoreRecipe(fullRecipe, pantryItems);
            if (scored.matchScore >= Math.max(CONFIG.MIN_MATCH_SCORE - 20, 10)) {
              scoredRecipes.push(enhanceRecipe(scored, expiringItems));
            }
          }
        } catch (err) {
          console.error(`[Tonight] Error processing MealDB recipe ${preview.id}:`, err);
        }
      }
    }
  } catch (error) {
    console.error('[Tonight] Error in fallback search:', error);
  }

  // Supplement with hardcoded fallbacks if still not enough
  const MIN_SUGGESTIONS = 5;
  if (scoredRecipes.length < MIN_SUGGESTIONS) {
    const existingIds = new Set(scoredRecipes.map(r => r.id));
    const fallbacksToAdd = FALLBACK_RECIPES
      .filter(r => !existingIds.has(r.id))
      .slice(0, MIN_SUGGESTIONS - scoredRecipes.length)
      .map(recipe => {
        const matchedIngredients = recipe.ingredients
          .filter(ing => pantryItems.some(item =>
            item.name.toLowerCase().includes(ing.ingredient.toLowerCase()) ||
            ing.ingredient.toLowerCase().includes(item.name.toLowerCase())
          ))
          .map(ing => ing.ingredient);
        const matchScore = Math.max(
          Math.round((matchedIngredients.length / recipe.ingredients.length) * 100),
          40
        );
        return {
          ...recipe,
          matchScore,
          matchedIngredients,
          missingIngredients: recipe.ingredients
            .filter(ing => !matchedIngredients.includes(ing.ingredient))
            .map(ing => ing.ingredient),
          matchPercentage: matchScore,
          priorityScore: matchScore,
        };
      });
    scoredRecipes = [...scoredRecipes, ...fallbacksToAdd];
  }

  scoredRecipes.sort((a, b) => b.priorityScore - a.priorityScore);

  const suggestions: TonightSuggestion[] = scoredRecipes
    .slice(0, Math.max(CONFIG.MAX_SUGGESTIONS, MIN_SUGGESTIONS))
    .map((recipe, index) => ({
      recipe,
      reason: generateReason(recipe),
      isTopPick: index === 0,
    }));

  return { topPick: suggestions[0] || null, suggestions: suggestions.slice(1), expiringItems };
}

/**
 * Gets quick category options for empty state
 */
export function getQuickCategories(): { id: string; emoji: string; label: string }[] {
  return [
    { id: 'pasta', emoji: '🍝', label: 'Pasta' },
    { id: 'mexican', emoji: '🌮', label: 'Mexican' },
    { id: 'chicken', emoji: '🍗', label: 'Chicken' },
    { id: 'light', emoji: '🥗', label: 'Light' },
    { id: 'comfort', emoji: '🍲', label: 'Comfort' },
    { id: 'quick', emoji: '⚡', label: 'Quick' },
  ];
}

/**
 * Generates Pepper's explanation for why a recipe was picked
 */
export function generatePepperExplanation(
  recipe: EnhancedScoredRecipe,
  expiringItems: PantryItem[]
): string {
  const reasons: string[] = [];
  
  if (recipe.expiringIngredients.length > 0) {
    const items = recipe.expiringIngredients.join(', ');
    reasons.push(`you have ${items} that needs to be used soon`);
  }
  
  if (recipe.matchScore >= 80) {
    reasons.push(`you already have ${recipe.matchedIngredients.length} out of ${recipe.ingredients.length} ingredients`);
  }
  
  if (recipe.readyInMinutes && recipe.readyInMinutes <= 30) {
    reasons.push(`it's ready in just ${recipe.readyInMinutes} minutes`);
  }
  
  if (reasons.length === 0) {
    return "I picked this because it matches well with what's in your pantry and it's a crowd-pleaser!";
  }
  
  const reasonText = reasons.join(', and ');
  return `I picked this because ${reasonText}!`;
}

export default {
  getGreeting,
  getExpiringItems,
  getDaysUntilExpiration,
  generateTonightSuggestions,
  getQuickCategories,
  generatePepperExplanation,
};

