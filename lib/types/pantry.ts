// Fill level options for container items
export const FILL_LEVELS = ['full', '3/4', '1/2', '1/4', 'almost-empty'] as const;
export type FillLevel = (typeof FILL_LEVELS)[number];

// Aisle options for grocery items (defined early for use in GroceryItem)
export const AISLES = [
  'Produce',
  'Dairy',
  'Meat & Seafood',
  'Bakery',
  'Frozen',
  'Canned Goods',
  'Pasta & Grains',
  'Snacks',
  'Beverages',
  'Condiments',
  'Spices',
  'Other',
] as const;
export type Aisle = (typeof AISLES)[number];

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

export interface UsageHistoryEntry {
  amount: number;
  timestamp: string;
  note?: string;
  recipe_id?: string;
  recipe_name?: string;
  meal_plan_id?: string;
}

// Pantry Item types
export interface PantryItem {
  id: string;
  user_id: string;
  household_id?: string | null;
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
  fill_level?: string | null; // 'full', '3/4', '1/2', '1/4', 'almost-empty' - optional, not in all DB schemas
  original_quantity?: number | null;
  usage_history?: UsageHistoryEntry[] | null;
  added_at: string;
  updated_at: string;
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
