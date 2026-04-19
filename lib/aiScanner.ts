import { ScannedItem, ReceiptScanResult, PhotoScanResult, RecipeCardScanResult, Location, Unit, ImportedRecipe } from './types';
import { callClaudeVision } from './claudeService';
import { compressImageForClaude } from './imageUtils';

// Generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 15);

// Parse unit string to Unit type
function parseUnit(unitStr: string): Unit {
  const normalized = unitStr.toLowerCase().trim();

  const unitMap: Record<string, Unit> = {
    'item': 'item',
    'items': 'item',
    'piece': 'item',
    'pieces': 'item',
    'pcs': 'item',
    'each': 'item',
    'oz': 'oz',
    'ounce': 'oz',
    'ounces': 'oz',
    'lb': 'lb',
    'lbs': 'lb',
    'pound': 'lb',
    'pounds': 'lb',
    'g': 'g',
    'gram': 'g',
    'grams': 'g',
    'kg': 'kg',
    'kilogram': 'kg',
    'kilograms': 'kg',
    'ml': 'ml',
    'milliliter': 'ml',
    'milliliters': 'ml',
    'l': 'l',
    'liter': 'l',
    'liters': 'l',
    'cup': 'cup',
    'cups': 'cup',
    'tbsp': 'tbsp',
    'tablespoon': 'tbsp',
    'tablespoons': 'tbsp',
    'tsp': 'tsp',
    'teaspoon': 'tsp',
    'teaspoons': 'tsp',
  };

  return unitMap[normalized] || 'item';
}

// AI prompts
const RECEIPT_PROMPT = `Analyze this grocery receipt image and extract all food items.
For each item, provide:
- name: The product name (clean, without price or codes)
- quantity: Numeric quantity purchased (default to 1 if unclear)
- unit: The unit (item, oz, lb, g, kg, ml, l, cup, tbsp, tsp)
- brand: Brand name if visible (null if not)
- category: One of (Produce, Dairy, Meat, Pantry, Frozen, Beverages, Snacks, Other)
- confidence: Your confidence in the extraction (0.0 to 1.0)

Also extract:
- storeName: The store name if visible (null if not)
- date: The receipt date if visible in YYYY-MM-DD format (null if not)
- total: The total amount if visible (null if not)

IMPORTANT: Only include actual food/grocery items. Skip non-food items, taxes, discounts, subtotals, etc.

Respond ONLY with valid JSON, no markdown or explanation:
{
  "items": [
    {"name": "...", "quantity": 1, "unit": "item", "brand": "..." or null, "category": "...", "confidence": 0.9}
  ],
  "storeName": "..." or null,
  "date": "YYYY-MM-DD" or null,
  "total": 0.00 or null
}`;

const SHELF_PROMPT = `Analyze this photo of a kitchen shelf, cupboard, refrigerator, or pantry and identify all visible food items.

For each item you can clearly identify, provide DETAILED quantity information:
- name: The product name (clean, descriptive name)
- unitCount: Number of packages, cans, bottles, boxes, or individual items visible (e.g., 3 for "3 cans")
- volumeQuantity: Size/volume per unit if visible on label (e.g., 12 for "12 oz can") - use null if not visible
- volumeUnit: Unit for the volume (oz, lb, g, kg, ml, l) - use null if no volume visible
- brand: Brand name if visible on packaging (null if not readable)
- category: One of (Produce, Dairy, Meat, Pantry, Frozen, Beverages, Snacks, Other)
- fillLevel: For containers (oils, spices, sauces), estimate fill level: "full", "3/4", "1/2", "1/4", "almost-empty" - use null for sealed/unopened items
- confidence: Your confidence in the identification (0.0 to 1.0)

IMPORTANT:
- Be specific with quantity: prefer "3 cans of 12 oz" over "36 oz"
- Look for size labels on packaging (12 oz, 16 oz, 1 lb, etc.)
- For produce, estimate reasonable quantities
- Use fillLevel only for opened/transparent containers where fill is visible
- Estimate quantities conservatively
- For partially visible items, use lower confidence scores

Respond ONLY with valid JSON, no markdown or explanation:
{
  "items": [
    {
      "name": "Chicken Broth",
      "unitCount": 3,
      "volumeQuantity": 14.5,
      "volumeUnit": "oz",
      "brand": "Swanson",
      "category": "Pantry",
      "fillLevel": null,
      "confidence": 0.95
    }
  ]
}`;

const RECIPE_CARD_PROMPT = `Analyze this recipe card image (which may be handwritten, multi-column, or in a foreign language) and extract the recipe details.
For the recipe, provide:
- title: The name of the recipe
- description: A brief description if available
- ingredients: List of ingredients with:
  - ingredient: Name of the ingredient
  - measure: Quantity and unit (e.g., "2 cups", "1 tbsp")
- instructions: Step-by-step cooking instructions as a single string (lines separated by newlines). If the text is multi-column, ensure you follow the logical reading order.
- prep_time: Preparation time in minutes (estimate if not explicit)
- cook_time: Cooking time in minutes (estimate if not explicit)
- servings: Number of servings (number)
- cuisine: Type of cuisine (Italian, Mexican, etc.) if inferable
- category: Meal category (Breakfast, Dinner, Dessert, etc.)
- difficulty: Estimated difficulty (easy, medium, hard) based on complexity
- confidence: Your confidence in reading the text (0.0 to 1.0). Lower confidence if text is faded, illegible, or ambiguous.

If the recipe is in a language other than English, translate the keys (like instructions, category) to English, but keep the name/title in the original language (optionally with English translation in parentheses).

Respond ONLY with valid JSON, no markdown or explanation:
{
  "recipe": {
    "title": "...",
    "description": "...",
    "ingredients": [{"ingredient": "...", "measure": "..."}],
    "instructions": "...",
    "prep_time": 15,
    "cook_time": 30,
    "servings": 4,
    "cuisine": "...",
    "category": "...",
    "difficulty": "easy"
  },
  "confidence": 0.9
}`;

interface ParsedReceiptResponse {
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    brand?: string | null;
    category?: string;
    confidence: number;
  }>;
  storeName?: string | null;
  date?: string | null;
  total?: number | null;
}

interface ParsedShelfResponse {
  items: Array<{
    name: string;
    quantity?: number;
    unit?: string;
    unitCount?: number;
    volumeQuantity?: number | null;
    volumeUnit?: string | null;
    brand?: string | null;
    category?: string;
    fillLevel?: string | null;
    confidence: number;
  }>;
}


function parseJSONResponse<T>(content: string): T {
  // Remove markdown code blocks if present
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
    throw new Error('Failed to parse AI response as JSON');
  }
}

export async function analyzeReceiptImage(imageBase64: string): Promise<ReceiptScanResult> {
  const compressed = await compressImageForClaude(imageBase64);
  const content = await callClaudeVision(RECEIPT_PROMPT, compressed, 'image/jpeg');
  const parsed = parseJSONResponse<ParsedReceiptResponse>(content);

  const items: ScannedItem[] = (parsed.items || []).map((item) => ({
    id: generateId(),
    name: item.name,
    quantity: item.quantity || 1,
    unit: parseUnit(item.unit || 'item'),
    brand: item.brand || undefined,
    category: item.category,
    confidence: Math.min(1, Math.max(0, item.confidence || 0.8)),
    status: 'pending' as const,
    originalData: {
      name: item.name,
      quantity: item.quantity || 1,
      unit: parseUnit(item.unit || 'item'),
    },
  }));

  return {
    items,
    storeName: parsed.storeName || undefined,
    date: parsed.date || undefined,
    total: parsed.total || undefined,
    imageUri: '',
  };
}

export async function analyzeShelfPhoto(
  imageBase64: string,
  location: Location
): Promise<PhotoScanResult> {
  const compressed = await compressImageForClaude(imageBase64);
  const content = await callClaudeVision(SHELF_PROMPT, compressed, 'image/jpeg');
  const parsed = parseJSONResponse<ParsedShelfResponse>(content);

  const items: ScannedItem[] = (parsed.items || []).map((item) => {
    // Handle both old format (quantity/unit) and new format (unitCount/volumeQuantity/volumeUnit)
    const unitCount = item.unitCount || item.quantity || 1;
    const volumeQuantity = item.volumeQuantity || undefined;
    const volumeUnit = item.volumeUnit ? parseUnit(item.volumeUnit) : undefined;

    // Calculate total quantity
    let totalQuantity: number;
    let finalUnit: Unit;

    if (volumeQuantity && volumeUnit) {
      // New dual-quantity format: e.g., 3 cans of 12 oz = 36 oz total
      totalQuantity = unitCount * volumeQuantity;
      finalUnit = volumeUnit;
    } else {
      // Simple quantity: e.g., 3 items
      totalQuantity = unitCount;
      finalUnit = item.unit ? parseUnit(item.unit) : 'item';
    }

    // Parse fill level if provided
    const validFillLevels = ['full', '3/4', '1/2', '1/4', 'almost-empty'];
    const fillLevel = item.fillLevel && validFillLevels.includes(item.fillLevel)
      ? (item.fillLevel as 'full' | '3/4' | '1/2' | '1/4' | 'almost-empty')
      : undefined;

    return {
      id: generateId(),
      name: item.name,
      quantity: totalQuantity,
      unit: finalUnit,
      unitCount: unitCount,
      volumeQuantity: volumeQuantity,
      volumeUnit: volumeUnit,
      brand: item.brand || undefined,
      category: item.category,
      fillLevel: fillLevel,
      confidence: Math.min(1, Math.max(0, item.confidence || 0.8)),
      status: 'pending' as const,
      originalData: {
        name: item.name,
        quantity: totalQuantity,
        unit: finalUnit,
      },
    };
  });

  return {
    items,
    location,
    imageUri: '',
  };
}

export async function analyzeRecipeCard(imageBase64: string): Promise<RecipeCardScanResult> {
  const compressed = await compressImageForClaude(imageBase64);
  const content = await callClaudeVision(RECIPE_CARD_PROMPT, compressed, 'image/jpeg');
  const parsed = parseJSONResponse<{ recipe: any; confidence: number }>(content);

  const recipe: Partial<ImportedRecipe> = {
    title: parsed.recipe.title || 'Untitled Recipe',
    description: parsed.recipe.description || null,
    ingredients: parsed.recipe.ingredients || [],
    instructions: parsed.recipe.instructions || '',
    prep_time: parsed.recipe.prep_time || null,
    cook_time: parsed.recipe.cook_time || null,
    total_time: (parsed.recipe.prep_time || 0) + (parsed.recipe.cook_time || 0) || null,
    servings: parsed.recipe.servings || null,
    cuisine: parsed.recipe.cuisine || null,
    category: parsed.recipe.category || null,
    difficulty: parsed.recipe.difficulty || null,
    source_platform: 'recipe_card',
    diets: [],
    tags: ['family-recipe'],
    image_url: null, // Will be set by the caller using the uploaded image URL
  };

  return {
    recipe,
    confidence: parsed.confidence || 0.8,
    originalImage: '',
  };
}
