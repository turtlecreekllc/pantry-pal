import type { NutritionInfo } from './pantry';

// TheMealDB types
export interface RecipePreview {
  id: string;
  name: string;
  thumbnail: string;
}

export interface RecipeIngredient {
  ingredient: string;
  measure: string;
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
  servings?: number;
  readyInMinutes?: number;
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

// Recipe source types
export type RecipeSource = 'themealdb' | 'spoonacular' | 'web' | 'imported';

// Import platform types for recipe import
export type ImportPlatform = 'instagram' | 'tiktok' | 'youtube' | 'pinterest' | 'facebook' | 'web' | 'text' | 'photo' | 'recipe_card';

// Extended Recipe for multi-source support
export interface ExtendedRecipe extends Recipe {
  recipeSource?: RecipeSource;
  readyInMinutes?: number;
  servings?: number;
  diets?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  nutrition?: NutritionInfo;
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
  made_count: number;
  last_made_at: string | null;
  imported_recipe_id: string | null;
  saved_at: string;
  updated_at: string;
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

// Enhanced scored recipe with expiration awareness
export interface EnhancedScoredRecipe extends ScoredRecipe {
  matchPercentage: number; // 0-100
  expiringIngredients: string[]; // Ingredients that expire soon
  priorityScore: number; // Boosted score for using expiring items
  substitutions?: IngredientSubstitution[];
}

// Ingredient substitution suggestion
export interface IngredientSubstitution {
  original: string;
  substitute: string;
  ratio: string; // e.g., "1:1", "1 tbsp = 2 tsp"
  notes: string | null;
}

// Cook mode step (parsed from instructions)
export interface CookingStep {
  stepNumber: number;
  instruction: string;
  timerMinutes?: number; // Extracted from text like "bake for 20 minutes"
  ingredients?: string[]; // Ingredients mentioned in this step
}

// Serving scale result
export interface ScaledIngredient extends RecipeIngredient {
  originalMeasure: string;
  scaledMeasure: string;
  scaleFactor: number;
}

// User preferences for cook mode and display
export interface CookingPreferences {
  unitSystem: 'metric' | 'imperial';
  keepScreenAwake: boolean;
  defaultServings: number;
  timerSoundEnabled: boolean;
}

// Smart collection criteria for auto-generated cookbooks
export interface SmartCriteria {
  type: 'quick_meals' | 'highly_rated' | 'recently_made' | 'cuisine' | 'dietary' | 'custom';
  maxTime?: number; // For quick meals (minutes)
  minRating?: number; // For highly rated
  daysSince?: number; // For recently made
  cuisine?: string; // For cuisine-based
  diets?: string[]; // For dietary collections
  tags?: string[]; // Custom tags
}

// Cookbook for organizing recipes
export interface Cookbook {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  is_public: boolean;
  is_smart: boolean;
  smart_criteria: SmartCriteria | null;
  created_at: string;
  updated_at: string;
  // Virtual fields (computed on fetch)
  recipe_count?: number;
}

// Junction table entry for cookbook-recipe relationship
export interface CookbookRecipe {
  id: string;
  cookbook_id: string;
  saved_recipe_id: string;
  added_at: string;
}

// Imported recipe from URL, text, or photo
export interface ImportedRecipe {
  id: string;
  user_id: string;
  source_url: string | null;
  source_platform: ImportPlatform;
  title: string;
  description: string | null;
  image_url: string | null;
  prep_time: number | null;
  cook_time: number | null;
  total_time: number | null;
  servings: number | null;
  ingredients: RecipeIngredient[];
  instructions: string;
  cuisine: string | null;
  category: string | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  diets: string[];
  tags: string[];
  nutrition: NutritionInfo | null;
  import_metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// User-uploaded photo for a recipe
export interface RecipeUserPhoto {
  id: string;
  user_id: string;
  saved_recipe_id: string;
  photo_url: string;
  caption: string | null;
  cooking_history_id: string | null;
  uploaded_at: string;
}

// Cooking history entry for tracking when recipes are made
export interface CookingHistoryEntry {
  id: string;
  user_id: string;
  saved_recipe_id: string;
  cooked_at: string;
  servings_made: number | null;
  notes: string | null;
  rating: number | null;
  // Virtual field - photos linked to this history entry
  photos?: RecipeUserPhoto[];
}

// Result from recipe import (before saving)
export interface RecipeImportResult {
  success: boolean;
  recipe: Partial<ImportedRecipe> | null;
  error: string | null;
  confidence: number; // 0-1 score for extraction quality
  platform: ImportPlatform;
  warnings?: string[]; // Non-fatal issues during import
}
