// Fill level options for container items
export const FILL_LEVELS = ['full', '3/4', '1/2', '1/4', 'almost-empty'] as const;
export type FillLevel = (typeof FILL_LEVELS)[number];

// Pantry Item types
export interface PantryItem {
  id: string;
  user_id: string;
  barcode: string | null;
  name: string;
  brand: string | null;
  category: string | null;
  quantity: number;
  unit: string;
  expiration_date: string | null;
  image_url: string | null;
  nutrition_json: NutritionInfo | null;
  location: 'pantry' | 'fridge' | 'freezer';
  location_notes: string | null;
  fill_level: string | null; // 'full', '3/4', '1/2', '1/4', 'almost-empty'
  original_quantity: number | null;
  usage_history: UsageHistoryEntry[] | null;
  added_at: string;
  updated_at: string;
}

export interface UsageHistoryEntry {
  amount: number;
  timestamp: string;
  note?: string;
  recipe_id?: string;
  recipe_name?: string;
  meal_plan_id?: string;
}

// Grocery list item
export interface GroceryItem {
  id: string;
  user_id: string;
  name: string;
  quantity: number;
  unit: string;
  recipe_id: string | null;
  recipe_name: string | null;
  is_checked: boolean;
  created_at: string;
  updated_at: string;
}

export interface NutritionInfo {
  energy_kcal?: number;
  fat?: number;
  saturated_fat?: number;
  carbohydrates?: number;
  sugars?: number;
  fiber?: number;
  proteins?: number;
  salt?: number;
  sodium?: number;
}

// Parsed quantity from product
export interface ParsedQuantity {
  value: number;
  unit: Unit;
}

// Open Food Facts API response
export interface ProductInfo {
  barcode: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  nutrition: NutritionInfo | null;
  categories: string[];
  productQuantity: string | null;
  servingSize: string | null;
  parsedQuantity: ParsedQuantity | null;
}

export interface OpenFoodFactsResponse {
  status: number;
  status_verbose: string;
  product?: {
    product_name?: string;
    brands?: string;
    image_url?: string;
    quantity?: string;
    serving_size?: string;
    product_quantity?: number;
    nutriments?: {
      'energy-kcal'?: number;
      fat?: number;
      'saturated-fat'?: number;
      carbohydrates?: number;
      sugars?: number;
      fiber?: number;
      proteins?: number;
      salt?: number;
      sodium?: number;
    };
    categories_tags?: string[];
  };
}

// TheMealDB types
export interface RecipePreview {
  id: string;
  name: string;
  thumbnail: string;
}

export interface Recipe {
  id: string;
  name: string;
  category: string;
  area: string;
  instructions: string;
  thumbnail: string;
  youtubeUrl: string | null;
  ingredients: RecipeIngredient[];
  source: string | null;
}

export interface RecipeIngredient {
  ingredient: string;
  measure: string;
}

export interface MealDBMeal {
  idMeal: string;
  strMeal: string;
  strCategory?: string;
  strArea?: string;
  strInstructions?: string;
  strMealThumb?: string;
  strYoutube?: string;
  strSource?: string;
  [key: string]: string | undefined; // For strIngredient1-20 and strMeasure1-20
}

export interface MealDBSearchResponse {
  meals: MealDBMeal[] | null;
}

// User type from Supabase
export interface User {
  id: string;
  email: string;
  created_at: string;
}

// Category options
export const CATEGORIES = [
  'Produce',
  'Dairy',
  'Meat',
  'Pantry',
  'Frozen',
  'Beverages',
  'Snacks',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

// Location options
export const LOCATIONS = ['pantry', 'fridge', 'freezer'] as const;
export type Location = (typeof LOCATIONS)[number];

// Unit options
export const UNITS = ['item', 'oz', 'lb', 'g', 'kg', 'ml', 'l', 'cup', 'tbsp', 'tsp'] as const;
export type Unit = (typeof UNITS)[number];

// Recipe source types
export type RecipeSource = 'themealdb' | 'spoonacular' | 'web';

// Extended Recipe for multi-source support
export interface ExtendedRecipe extends Recipe {
  recipeSource?: RecipeSource;
  readyInMinutes?: number;
  servings?: number;
  diets?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
}

// Scored recipe from pantry matching
export interface ScoredRecipe extends ExtendedRecipe {
  matchScore: number;
  matchedIngredients: string[];
  missingIngredients: string[];
}

// Saved Recipe
export interface SavedRecipe {
  id: string;
  user_id: string;
  recipe_id: string;
  recipe_source: RecipeSource;
  recipe_data: ExtendedRecipe;
  notes: string | null;
  rating: number | null;
  tags: string[];
  saved_at: string;
  updated_at: string;
}

// Meal Plan
export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export interface MealPlan {
  id: string;
  user_id: string;
  date: string;
  meal_type: MealType;
  recipe_id: string | null;
  recipe_source: RecipeSource | null;
  recipe_name: string;
  recipe_thumbnail: string | null;
  servings: number;
  notes: string | null;
  is_completed: boolean;
  completed_at: string | null;
  ingredient_deductions: IngredientDeduction[] | null;
  created_at: string;
  updated_at: string;
}

// Ingredient deduction for meal completion
export interface IngredientDeduction {
  pantry_item_id: string;
  pantry_item_name: string;
  amount_to_deduct: number;
  unit: string;
  confirmed: boolean;
}

// Meal completion log
export interface MealCompletionLog {
  id: string;
  user_id: string;
  meal_plan_id: string;
  deductions: IngredientDeduction[];
  completed_at: string;
}

// Recipe filter options
export interface RecipeFilters {
  cuisine: string | null;
  diet: string | null;
  maxTime: number | null;
  sortBy: 'matchScore' | 'time' | 'name';
  sortOrder: 'asc' | 'desc';
}

export const CUISINES = [
  'Italian', 'Mexican', 'Asian', 'American', 'Indian',
  'Mediterranean', 'French', 'Chinese', 'Japanese', 'Thai',
] as const;

export const DIETS = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free',
  'Keto', 'Paleo', 'Low-Carb',
] as const;

// AI Scanner types
export interface ScannedItem {
  id: string;
  name: string;
  quantity: number; // Total quantity (unitCount * volumeQuantity when both present)
  unit: Unit;
  unitCount?: number; // Number of packages/cans/bottles (e.g., 3 cans)
  volumeQuantity?: number; // Size per unit (e.g., 12 oz per can)
  volumeUnit?: Unit; // Unit for volume (oz, ml, g, etc.)
  brand?: string;
  category?: string;
  confidence: number; // 0-1 confidence score from AI
  status: 'pending' | 'accepted' | 'edited' | 'rejected';
  fillLevel?: FillLevel; // Fill level for container items
  expirationDate?: string; // User-entered expiration date (YYYY-MM-DD)
  originalData?: {
    name: string;
    quantity: number;
    unit: Unit;
  };
}

export interface ReceiptScanResult {
  items: ScannedItem[];
  storeName?: string;
  date?: string;
  total?: number;
  imageUri: string;
}

export interface PhotoScanResult {
  items: ScannedItem[];
  location: Location;
  imageUri: string;
}

// Chat types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  actions?: ChatAction[];
  recipes?: RecipePreview[];
  items?: PantryItem[];
}

export interface ChatAction {
  type: 'view_recipe' | 'add_to_grocery' | 'update_item' | 'view_item';
  label: string;
  data: any;
}
