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
  added_at: string;
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

// Open Food Facts API response
export interface ProductInfo {
  barcode: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  nutrition: NutritionInfo | null;
  categories: string[];
}

export interface OpenFoodFactsResponse {
  status: number;
  status_verbose: string;
  product?: {
    product_name?: string;
    brands?: string;
    image_url?: string;
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
