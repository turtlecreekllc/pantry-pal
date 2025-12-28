import { PantryItem, ImportedRecipe, RecipeIngredient, NutritionInfo } from './types';

// Get API key from environment
const getOpenAIKey = (): string => {
  const key = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!key) {
    throw new Error('EXPO_PUBLIC_OPENAI_API_KEY is not configured');
  }
  return key;
};

export interface GenerateRecipeOptions {
  cuisine?: string;
  dietary?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  maxTime?: number;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert';
  prioritizeExpiring?: boolean;
}

interface GeneratedRecipeResult {
  success: boolean;
  recipe: Partial<ImportedRecipe> | null;
  error: string | null;
  usedIngredients: string[];
  additionalIngredientsNeeded: string[];
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  error?: {
    message: string;
  };
}

const RECIPE_GENERATION_PROMPT = `You are a creative chef AI. Generate a delicious, practical recipe using the provided pantry ingredients.

REQUIREMENTS:
- Create a recipe that primarily uses the ingredients provided
- The recipe should be realistic and actually taste good
- Include specific measurements for all ingredients
- Write clear, numbered cooking instructions
- Estimate accurate prep time, cook time, and total time
- Consider the specified preferences (cuisine, dietary restrictions, difficulty)

RESPOND WITH VALID JSON ONLY:
{
  "title": "Recipe Name",
  "description": "A brief, appetizing description",
  "ingredients": [
    {"ingredient": "Ingredient name", "measure": "Amount and unit"}
  ],
  "instructions": "1. First step...\\n2. Second step...",
  "prepTime": 15,
  "cookTime": 30,
  "totalTime": 45,
  "servings": 4,
  "cuisine": "Cuisine type",
  "category": "Meal category",
  "difficulty": "easy|medium|hard",
  "diets": ["array of applicable diets"],
  "usedIngredients": ["list of pantry ingredients used"],
  "additionalIngredients": ["any extra ingredients needed"]
}`;

const LEFTOVER_TRANSFORMATION_PROMPT = `You are a creative chef AI specializing in transforming leftovers into new dishes.

Given the leftover ingredients from a previous meal, create an entirely NEW recipe that:
- Transforms the leftovers into something that feels fresh and different
- Uses creative techniques (add new seasonings, change texture, combine differently)
- Is practical and delicious

RESPOND WITH VALID JSON ONLY:
{
  "title": "New Recipe Name",
  "description": "Description explaining the transformation",
  "ingredients": [
    {"ingredient": "Ingredient name", "measure": "Amount and unit"}
  ],
  "instructions": "1. First step...\\n2. Second step...",
  "prepTime": 10,
  "cookTime": 20,
  "totalTime": 30,
  "servings": 4,
  "cuisine": "Cuisine type",
  "category": "Meal category",
  "difficulty": "easy|medium|hard",
  "diets": [],
  "usedIngredients": ["list of leftover ingredients used"],
  "additionalIngredients": ["any extra ingredients needed"]
}`;

/**
 * Timeout wrapper for promises
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * Retry wrapper for network requests with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  initialDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on API key errors or timeouts
      const errorMessage = lastError.message.toLowerCase();
      if (
        errorMessage.includes('api key') ||
        errorMessage.includes('401') ||
        errorMessage.includes('400') ||
        errorMessage.includes('configured') ||
        errorMessage.includes('timeout')
      ) {
        throw lastError;
      }

      if (attempt < maxRetries) {
        const delay = initialDelayMs * Math.pow(2, attempt - 1);
        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Request failed after retries');
}

/**
 * Call OpenAI API for recipe generation
 */
async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = getOpenAIKey();

  const fetchPromise = fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    }),
  });

  // 30 second timeout for recipe generation
  const response = await withTimeout(
    fetchPromise,
    30000,
    'Recipe generation timed out. Please try again.'
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `OpenAI API error: ${response.status} - ${(errorData as OpenAIResponse).error?.message || response.statusText}`
    );
  }

  const data: OpenAIResponse = await response.json();

  if (!data.choices?.[0]?.message?.content) {
    throw new Error('Invalid response from OpenAI API');
  }

  return data.choices[0].message.content;
}

/**
 * Parse JSON response from AI
 */
function parseJSONResponse<T>(content: string): T {
  let cleaned = content.trim();

  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Failed to parse AI response:', content);
    throw new Error('Failed to parse recipe from AI response');
  }
}

/**
 * Format pantry items for the prompt
 */
function formatPantryItems(items: PantryItem[], prioritizeExpiring: boolean = false): string {
  // Sort by expiration if needed
  let sortedItems = [...items];

  if (prioritizeExpiring) {
    const now = new Date();
    sortedItems.sort((a, b) => {
      if (!a.expiration_date && !b.expiration_date) return 0;
      if (!a.expiration_date) return 1;
      if (!b.expiration_date) return -1;

      const daysA = (new Date(a.expiration_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      const daysB = (new Date(b.expiration_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      return daysA - daysB;
    });
  }

  return sortedItems
    .map((item) => {
      const parts = [`${item.name} (${item.quantity} ${item.unit})`];

      if (prioritizeExpiring && item.expiration_date) {
        const now = new Date();
        const expDate = new Date(item.expiration_date);
        const daysUntil = Math.round((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntil <= 3) {
          parts.push('⚠️ EXPIRING SOON - use this!');
        } else if (daysUntil <= 7) {
          parts.push(`expires in ${daysUntil} days`);
        }
      }

      return parts.join(' ');
    })
    .join('\n');
}

/**
 * Generate a recipe from available pantry ingredients
 */
export async function generateRecipeFromIngredients(
  pantryItems: PantryItem[],
  options: GenerateRecipeOptions = {}
): Promise<GeneratedRecipeResult> {
  if (pantryItems.length === 0) {
    return {
      success: false,
      recipe: null,
      error: 'No pantry items provided',
      usedIngredients: [],
      additionalIngredientsNeeded: [],
    };
  }

  try {
    const ingredientList = formatPantryItems(pantryItems, options.prioritizeExpiring);

    const preferences: string[] = [];
    if (options.cuisine) preferences.push(`Cuisine: ${options.cuisine}`);
    if (options.dietary?.length) preferences.push(`Dietary: ${options.dietary.join(', ')}`);
    if (options.difficulty) preferences.push(`Difficulty: ${options.difficulty}`);
    if (options.maxTime) preferences.push(`Max total time: ${options.maxTime} minutes`);
    if (options.mealType) preferences.push(`Meal type: ${options.mealType}`);
    if (options.prioritizeExpiring) preferences.push('IMPORTANT: Prioritize using items marked as expiring soon!');

    const userPrompt = `
AVAILABLE PANTRY INGREDIENTS:
${ingredientList}

${preferences.length > 0 ? 'PREFERENCES:\n' + preferences.join('\n') : ''}

Create a delicious recipe that makes the best use of these ingredients. Minimize additional ingredients needed.
`;

    const aiResponse = await withRetry(() => callOpenAI(RECIPE_GENERATION_PROMPT, userPrompt));
    const parsed = parseJSONResponse<{
      title: string;
      description: string;
      ingredients: Array<{ ingredient: string; measure: string }>;
      instructions: string;
      prepTime: number;
      cookTime: number;
      totalTime: number;
      servings: number;
      cuisine: string;
      category: string;
      difficulty: 'easy' | 'medium' | 'hard';
      diets: string[];
      usedIngredients: string[];
      additionalIngredients: string[];
    }>(aiResponse);

    const recipe: Partial<ImportedRecipe> = {
      title: parsed.title,
      description: parsed.description,
      ingredients: parsed.ingredients.map((ing) => ({
        ingredient: ing.ingredient,
        measure: ing.measure,
      })),
      instructions: parsed.instructions,
      prep_time: parsed.prepTime,
      cook_time: parsed.cookTime,
      total_time: parsed.totalTime,
      servings: parsed.servings,
      cuisine: parsed.cuisine,
      category: parsed.category,
      difficulty: parsed.difficulty,
      diets: parsed.diets || [],
      tags: ['AI Generated'],
      source_platform: 'text',
      import_metadata: {
        generatedAt: new Date().toISOString(),
        generationType: 'from_pantry',
        options,
      },
    };

    return {
      success: true,
      recipe,
      error: null,
      usedIngredients: parsed.usedIngredients || [],
      additionalIngredientsNeeded: parsed.additionalIngredients || [],
    };
  } catch (error) {
    console.error('Error generating recipe:', error);
    return {
      success: false,
      recipe: null,
      error: (error as Error).message,
      usedIngredients: [],
      additionalIngredientsNeeded: [],
    };
  }
}

/**
 * Transform leftover ingredients into a new dish
 */
export async function suggestLeftoverTransformation(
  leftoverItems: PantryItem[],
  previousRecipeName?: string
): Promise<GeneratedRecipeResult> {
  if (leftoverItems.length === 0) {
    return {
      success: false,
      recipe: null,
      error: 'No leftover items provided',
      usedIngredients: [],
      additionalIngredientsNeeded: [],
    };
  }

  try {
    const ingredientList = formatPantryItems(leftoverItems);

    const userPrompt = `
LEFTOVER INGREDIENTS TO TRANSFORM:
${ingredientList}

${previousRecipeName ? `These are leftovers from: ${previousRecipeName}` : ''}

Transform these leftovers into a completely new and different dish. Be creative!
`;

    const aiResponse = await withRetry(() => callOpenAI(LEFTOVER_TRANSFORMATION_PROMPT, userPrompt));
    const parsed = parseJSONResponse<{
      title: string;
      description: string;
      ingredients: Array<{ ingredient: string; measure: string }>;
      instructions: string;
      prepTime: number;
      cookTime: number;
      totalTime: number;
      servings: number;
      cuisine: string;
      category: string;
      difficulty: 'easy' | 'medium' | 'hard';
      diets: string[];
      usedIngredients: string[];
      additionalIngredients: string[];
    }>(aiResponse);

    const recipe: Partial<ImportedRecipe> = {
      title: parsed.title,
      description: parsed.description,
      ingredients: parsed.ingredients.map((ing) => ({
        ingredient: ing.ingredient,
        measure: ing.measure,
      })),
      instructions: parsed.instructions,
      prep_time: parsed.prepTime,
      cook_time: parsed.cookTime,
      total_time: parsed.totalTime,
      servings: parsed.servings,
      cuisine: parsed.cuisine,
      category: parsed.category,
      difficulty: parsed.difficulty,
      diets: parsed.diets || [],
      tags: ['AI Generated', 'Leftover Transformation'],
      source_platform: 'text',
      import_metadata: {
        generatedAt: new Date().toISOString(),
        generationType: 'leftover_transformation',
        previousRecipe: previousRecipeName,
      },
    };

    return {
      success: true,
      recipe,
      error: null,
      usedIngredients: parsed.usedIngredients || [],
      additionalIngredientsNeeded: parsed.additionalIngredients || [],
    };
  } catch (error) {
    console.error('Error transforming leftovers:', error);
    return {
      success: false,
      recipe: null,
      error: (error as Error).message,
      usedIngredients: [],
      additionalIngredientsNeeded: [],
    };
  }
}

/**
 * Get expiring items that should be used soon
 */
export function getExpiringItems(pantryItems: PantryItem[], daysThreshold: number = 3): PantryItem[] {
  const now = new Date();

  return pantryItems.filter((item) => {
    if (!item.expiration_date) return false;

    const expDate = new Date(item.expiration_date);
    const daysUntil = (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    return daysUntil >= 0 && daysUntil <= daysThreshold;
  });
}

/**
 * Get recipe suggestions that prioritize expiring ingredients
 */
export function prioritizeExpiringRecipes(
  pantryItems: PantryItem[],
  daysThreshold: number = 7
): { expiringItems: PantryItem[]; urgency: 'high' | 'medium' | 'low' } {
  const now = new Date();
  const expiringItems: PantryItem[] = [];
  let urgency: 'high' | 'medium' | 'low' = 'low';

  for (const item of pantryItems) {
    if (!item.expiration_date) continue;

    const expDate = new Date(item.expiration_date);
    const daysUntil = (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    if (daysUntil <= 0) {
      // Already expired - don't include
      continue;
    } else if (daysUntil <= 2) {
      expiringItems.push(item);
      urgency = 'high';
    } else if (daysUntil <= daysThreshold) {
      expiringItems.push(item);
      if (urgency !== 'high') {
        urgency = daysUntil <= 4 ? 'high' : 'medium';
      }
    }
  }

  // Sort by expiration date (soonest first)
  expiringItems.sort((a, b) => {
    const dateA = new Date(a.expiration_date!);
    const dateB = new Date(b.expiration_date!);
    return dateA.getTime() - dateB.getTime();
  });

  return { expiringItems, urgency };
}
