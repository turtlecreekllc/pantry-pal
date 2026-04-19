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

export interface UsageHistoryEntry {
  amount: number;
  timestamp: string;
  note?: string;
  recipe_id?: string;
  recipe_name?: string;
  meal_plan_id?: string;
}

// User preferences
export interface UserPreferences {
  id: string;
  user_id: string;
  // Household & Family
  household_size: number;
  has_children: boolean;
  children_ages: number[];
  // Dietary Preferences
  dietary_preferences: string[];
  allergies: string[];
  disliked_ingredients: string[];
  favorite_cuisines: string[];
  // Cooking Preferences
  cooking_skill: 'beginner' | 'intermediate' | 'advanced';
  max_cook_time: number;
  preferred_meal_types: string[];
  cooking_equipment: string[]; // ['stovetop', 'oven', 'microwave', 'air_fryer', 'grill', 'smoker', 'instant_pot', 'slow_cooker']
  high_altitude_cooking: boolean; // Adjustments for 3,000+ feet elevation
  // Notifications
  notification_dinner_time: string;
  notifications_enabled: boolean;
  weekly_summary_enabled: boolean;
  // Onboarding & App State
  onboarding_completed: boolean;
  onboarding_step: number;
  has_seen_tutorial: boolean;
  // Theme & Display
  theme: 'light' | 'dark' | 'system';
  measurement_system: 'imperial' | 'metric';
  // Timestamps
  created_at: string;
  updated_at: string;
}

// Grocery list (container for grocery items)
export interface GroceryList {
  id: string;
  user_id: string;
  household_id: string | null;
  name: string;
  description: string | null;
  status: 'active' | 'completed' | 'archived';
  source: 'manual' | 'meal_plan' | 'pantry' | 'recipe';
  source_date_range_start: string | null;
  source_date_range_end: string | null;
  item_count: number;
  checked_count: number;
  total_estimated_cost: number | null;
  created_at: string;
  updated_at: string;
}

// Grocery list item
export interface GroceryItem {
  id: string;
  user_id: string;
  household_id?: string | null;
  list_id?: string | null;
  name: string;
  quantity: number;
  unit: string;
  recipe_id: string | null;
  recipe_name: string | null;
  is_checked: boolean;
  aisle: Aisle | null;
  meal_plan_id: string | null;
  estimated_price?: number | null;
  notes?: string | null;
  priority?: number;
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
  servings?: number;
  readyInMinutes?: number;
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
  imageUrl?: string; // Product image URL from search
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

export interface RecipeCardScanResult {
  recipe: Partial<ImportedRecipe>;
  confidence: number;
  originalImage: string;
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

// Household Sharing types
export const HOUSEHOLD_ROLES = ['owner', 'admin', 'member'] as const;
export type HouseholdRole = (typeof HOUSEHOLD_ROLES)[number];

export const INVITE_STATUSES = ['pending', 'accepted', 'declined', 'expired'] as const;
export type InviteStatus = (typeof INVITE_STATUSES)[number];

export interface Household {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  joined_at: string;
  user_email?: string;
  user_avatar_url?: string;
}

export interface HouseholdInvite {
  id: string;
  household_id: string;
  email: string;
  token: string;
  expires_at: string;
  status: InviteStatus;
  created_at: string;
  household_name?: string;
}

export interface HouseholdActivity {
  id: string;
  household_id: string;
  user_id: string;
  user_email?: string;
  action_type: 'item_added' | 'item_updated' | 'item_deleted' | 'meal_planned' | 'meal_completed' | 'member_joined' | 'member_left';
  action_data: Record<string, unknown>;
  created_at: string;
}

/**
 * Item claim - marks a pantry item as reserved for a specific member
 */
export interface ItemClaim {
  id: string;
  pantry_item_id: string;
  user_id: string;
  user_email?: string;
  note?: string;
  created_at: string;
}

/**
 * RSVP status for meal plans
 */
export const RSVP_STATUSES = ['attending', 'not_attending', 'maybe'] as const;
export type RSVPStatus = (typeof RSVP_STATUSES)[number];

/**
 * Meal RSVP - tracks attendance for planned meals
 */
export interface MealRSVP {
  id: string;
  meal_plan_id: string;
  user_id: string;
  user_email?: string;
  status: RSVPStatus;
  servings?: number;
  note?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Meal assignment - assigns cooking responsibility to a member
 */
export interface MealAssignment {
  id: string;
  meal_plan_id: string;
  user_id: string;
  user_email?: string;
  assigned_by: string;
  created_at: string;
}

export interface HouseholdWithMembers extends Household {
  members: HouseholdMember[];
  member_count: number;
  current_user_role: HouseholdRole;
}

/**
 * Permission configuration for household roles
 */
export const ROLE_PERMISSIONS: Record<HouseholdRole, {
  canManageMembers: boolean;
  canInviteMembers: boolean;
  canRemoveMembers: boolean;
  canDeleteHousehold: boolean;
  canTransferOwnership: boolean;
  canEditSettings: boolean;
  canEditPantry: boolean;
  canEditMeals: boolean;
  canViewAll: boolean;
}> = {
  owner: {
    canManageMembers: true,
    canInviteMembers: true,
    canRemoveMembers: true,
    canDeleteHousehold: true,
    canTransferOwnership: true,
    canEditSettings: true,
    canEditPantry: true,
    canEditMeals: true,
    canViewAll: true,
  },
  admin: {
    canManageMembers: true,
    canInviteMembers: true,
    canRemoveMembers: false,
    canDeleteHousehold: false,
    canTransferOwnership: false,
    canEditSettings: true,
    canEditPantry: true,
    canEditMeals: true,
    canViewAll: true,
  },
  member: {
    canManageMembers: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    canDeleteHousehold: false,
    canTransferOwnership: false,
    canEditSettings: false,
    canEditPantry: true,
    canEditMeals: false,
    canViewAll: true,
  },
} as const;

// ============================================
// COOKBOOK & RECIPE IMPORT TYPES
// ============================================

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

// Result from recipe import (before saving)
export interface RecipeImportResult {
  success: boolean;
  recipe: Partial<ImportedRecipe> | null;
  error: string | null;
  confidence: number; // 0-1 score for extraction quality
  platform: ImportPlatform;
  warnings?: string[]; // Non-fatal issues during import
}

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

// ============================================
// GAMIFICATION TYPES
// ============================================

export type ImpactOutcome = 'rescued' | 'expired' | 'removed' | 'donated';

export interface ImpactRecord {
  id: string;
  user_id: string;
  household_id?: string | null;
  item_id?: string | null;
  item_name: string;
  outcome: ImpactOutcome;
  quantity_amount: number;
  quantity_unit: string;
  estimated_weight_g?: number;
  estimated_cost_cents?: number;
  co2_saved_g?: number;
  recorded_at: string;
  created_at: string;
}

export type ImpactPeriod = 'week' | 'month' | 'all_time';

export interface UserImpactSummary {
  id: string;
  user_id: string;
  period: ImpactPeriod;
  period_start: string;
  items_rescued: number;
  items_expired: number;
  weight_saved_g: number;
  money_saved_cents: number;
  co2_avoided_g: number;
  updated_at: string;
}

export type AchievementTier = 'bronze' | 'silver' | 'gold';
export type AchievementCategory = 'getting_started' | 'consistency' | 'impact' | 'rescue' | 'exploration';
export type ThresholdType = 'count' | 'streak' | 'cumulative';

export interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  icon_url?: string;
  tier: AchievementTier;
  category: AchievementCategory;
  threshold_value: number;
  threshold_type: ThresholdType;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  progress: number;
  is_seen: boolean;
  achievement?: Achievement; // For joined queries
}

export type ChallengeType = 'weekly' | 'monthly' | 'seasonal';
export type ChallengeGoalType = 'rescue_count' | 'rescue_percent' | 'money_saved';

export interface Challenge {
  id: string;
  name: string;
  description: string;
  type: ChallengeType;
  goal_value: number;
  goal_type: ChallengeGoalType;
  start_date: string;
  end_date: string;
  reward_badge_id?: string;
  created_at: string;
}

export type ChallengeStatus = 'active' | 'completed' | 'abandoned' | 'failed';

export interface UserChallenge {
  id: string;
  user_id: string;
  challenge_id: string;
  status: ChallengeStatus;
  progress: number;
  enrolled_at: string;
  completed_at?: string;
  challenge?: Challenge; // For joined queries
}

// ============================================
// SUBSCRIPTION & TOKEN TYPES
// ============================================

export const SUBSCRIPTION_TIERS = [
  'free',
  'individual_monthly',
  'individual_annual',
  'family_monthly',
  'family_annual',
  'trial_individual',
  'trial_family',
] as const;
export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

/** Base tier categories for simpler checks */
export type TierCategory = 'free' | 'individual' | 'family';

/** Helper to get tier category from subscription tier */
export function getTierCategory(tier: SubscriptionTier): TierCategory {
  if (tier === 'free') return 'free';
  if (tier.includes('individual')) return 'individual';
  if (tier.includes('family')) return 'family';
  return 'free';
}

/** Check if tier is a paid tier (individual or family) */
export function isPaidTier(tier: SubscriptionTier): boolean {
  return tier !== 'free' && !tier.startsWith('trial');
}

/** Check if tier is a trial tier */
export function isTrialTier(tier: SubscriptionTier): boolean {
  return tier.startsWith('trial');
}

/** Check if tier grants individual-level access */
export function hasIndividualAccess(tier: SubscriptionTier): boolean {
  return tier !== 'free';
}

/** Check if tier grants family-level access */
export function hasFamilyAccess(tier: SubscriptionTier): boolean {
  return tier.includes('family');
}

export const SUBSCRIPTION_STATUSES = ['active', 'canceled', 'past_due', 'trialing', 'incomplete'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const TOKEN_TRANSACTION_TYPES = ['usage', 'subscription_grant', 'purchase', 'rollover', 'reset', 'refund'] as const;
export type TokenTransactionType = (typeof TOKEN_TRANSACTION_TYPES)[number];

export const TOKEN_SOURCES = ['subscription', 'purchased', 'rollover', 'bonus'] as const;
export type TokenSource = (typeof TOKEN_SOURCES)[number];

export const AI_FEATURE_TYPES = [
  'quick_recipe_suggestion',
  'detailed_recipe_generation',
  'weekly_meal_plan',
  'ingredient_substitution',
  'nutritional_analysis',
  'smart_grocery_list',
  'recipe_modification',
  'use_it_up_plan',
  'chat_query',
] as const;
export type AIFeatureType = (typeof AI_FEATURE_TYPES)[number];

/**
 * Token cost configuration for AI features
 */
export const TOKEN_COSTS: Record<AIFeatureType, number> = {
  quick_recipe_suggestion: 1,
  detailed_recipe_generation: 3,
  weekly_meal_plan: 10,
  ingredient_substitution: 1,
  nutritional_analysis: 2,
  smart_grocery_list: 5,
  recipe_modification: 3,
  use_it_up_plan: 5,
  chat_query: 1,
} as const;

/**
 * Plan pricing configuration - Three-tier model
 */
export const PLAN_PRICING = {
  // Free tier
  free: {
    price: 0,
    displayPrice: '$0',
    interval: 'forever' as const,
    tokens: 0,
    householdMembers: 1,
    pantryLimit: 50,
    recipeLimit: 25,
    scanLimit: 10,
    groceryLists: 1,
  },
  // Individual tier
  individual_monthly: {
    price: 999, // cents ($9.99)
    displayPrice: '$9.99',
    interval: 'month' as const,
    tokens: 100,
    householdMembers: 1,
    rolloverEnabled: false,
    maxRollover: 0,
  },
  individual_annual: {
    price: 9900, // cents ($99.00)
    displayPrice: '$99',
    monthlyEquivalent: '$8.25',
    interval: 'year' as const,
    tokens: 100,
    householdMembers: 1,
    rolloverEnabled: true,
    maxRollover: 50,
    annualSavings: 2088, // cents saved vs monthly
    savingsPercent: 17,
  },
  // Family tier
  family_monthly: {
    price: 1499, // cents ($14.99)
    displayPrice: '$14.99',
    interval: 'month' as const,
    tokens: 150,
    householdMembers: 6,
    rolloverEnabled: false,
    maxRollover: 0,
  },
  family_annual: {
    price: 14900, // cents ($149.00)
    displayPrice: '$149',
    monthlyEquivalent: '$12.42',
    interval: 'year' as const,
    tokens: 150,
    householdMembers: 6,
    rolloverEnabled: true,
    maxRollover: 75,
    annualSavings: 3088, // cents saved vs monthly
    savingsPercent: 17,
  },
  // Trial configurations
  trial_individual: {
    price: 0,
    displayPrice: 'Free',
    duration: 14, // days
    tokens: 100,
    householdMembers: 1,
    convertsTo: 'individual_monthly' as SubscriptionTier,
  },
  trial_family: {
    price: 0,
    displayPrice: 'Free',
    duration: 14, // days
    tokens: 150,
    householdMembers: 6,
    convertsTo: 'family_monthly' as SubscriptionTier,
  },
  // Legacy mappings (deprecated, for backwards compatibility)
  premium_monthly: {
    price: 999,
    displayPrice: '$9.99',
    interval: 'month' as const,
    tokens: 100,
  },
  premium_annual: {
    price: 9900,
    displayPrice: '$99',
    monthlyEquivalent: '$8.25',
    interval: 'year' as const,
    tokens: 100,
    rolloverEnabled: true,
    maxRollover: 50,
  },
  trial: {
    price: 0,
    displayPrice: 'Free',
    duration: 14,
    tokens: 100,
  },
} as const;

/**
 * Token bucket pricing configuration
 */
export const TOKEN_BUCKETS = [
  { size: 50, price: 199, displayPrice: '$1.99', perToken: '$0.040' },
  { size: 150, price: 499, displayPrice: '$4.99', perToken: '$0.033' },
  { size: 400, price: 999, displayPrice: '$9.99', perToken: '$0.025' },
] as const;

/**
 * Free tier limits
 */
export const FREE_TIER_LIMITS = {
  pantryItems: 50,
  savedRecipes: 25,
  barcodeScans: 10,
  groceryLists: 1,
  aiFeatures: false,
  householdSharing: false,
  recipeScaling: false,
  expirationTracking: false,
  smartGroceryLists: false,
  aiMealPlanning: false,
  perPersonPreferences: false,
  calendarSync: false,
  householdMembers: 1,
  tokensMonthly: 0,
  adsEnabled: true,
} as const;

/**
 * Feature access configuration by tier
 * Defines what features are available at each subscription level
 */
export interface FeatureConfig {
  pantryLimit: number;
  recipeLimit: number;
  scanLimit: number;
  groceryLists: number;
  aiSuggestions: boolean;
  aiMealPlanning: boolean;
  expirationTracking: boolean;
  smartGroceryLists: boolean;
  householdMembers: number;
  perPersonPreferences: boolean;
  sharedPantry: boolean;
  recipeScaling: boolean;
  calendarSync: boolean;
  tokensMonthly: number;
  adsEnabled: boolean;
}

export const FEATURE_ACCESS: Record<TierCategory, FeatureConfig> = {
  free: {
    pantryLimit: 50,
    recipeLimit: 25,
    scanLimit: 10,
    groceryLists: 1,
    aiSuggestions: false,
    aiMealPlanning: false,
    expirationTracking: false,
    smartGroceryLists: false,
    householdMembers: 1,
    perPersonPreferences: false,
    sharedPantry: false,
    recipeScaling: false,
    calendarSync: false,
    tokensMonthly: 0,
    adsEnabled: true,
  },
  individual: {
    pantryLimit: Infinity,
    recipeLimit: Infinity,
    scanLimit: Infinity,
    groceryLists: Infinity,
    aiSuggestions: true,
    aiMealPlanning: false, // Family only
    expirationTracking: true,
    smartGroceryLists: true,
    householdMembers: 1,
    perPersonPreferences: false,
    sharedPantry: false,
    recipeScaling: false,
    calendarSync: false,
    tokensMonthly: 100,
    adsEnabled: false,
  },
  family: {
    pantryLimit: Infinity,
    recipeLimit: Infinity,
    scanLimit: Infinity,
    groceryLists: Infinity,
    aiSuggestions: true,
    aiMealPlanning: true,
    expirationTracking: true,
    smartGroceryLists: true,
    householdMembers: 6,
    perPersonPreferences: true,
    sharedPantry: true,
    recipeScaling: true,
    calendarSync: true,
    tokensMonthly: 150,
    adsEnabled: false,
  },
} as const;

/**
 * Paywall trigger types
 */
export type PaywallTrigger =
  | 'first_app_open'
  | 'pantry_limit'
  | 'recipe_limit'
  | 'scan_limit'
  | 'ai_suggestions'
  | 'meal_plan'
  | 'add_family_member'
  | 'recipe_scaling'
  | 'calendar_sync'
  | 'settings'
  | 'trial_expiring';

/**
 * Paywall context for analytics and display customization
 */
export interface PaywallContext {
  trigger: PaywallTrigger;
  featureAttempted?: string;
  currentTier: SubscriptionTier;
  highlightedTier?: 'individual' | 'family';
  currentUsage?: number;
  limit?: number;
}

/**
 * User subscription record
 */
export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_start: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  ended_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * User token balance
 */
export interface TokenBalance {
  id: string;
  user_id: string;
  subscription_tokens: number;
  purchased_tokens: number;
  rollover_tokens: number;
  tokens_used_this_period: number;
  last_reset_at: string;
  updated_at: string;
}

/**
 * Token transaction record
 */
export interface TokenTransaction {
  id: string;
  user_id: string;
  transaction_type: TokenTransactionType;
  amount: number;
  feature_type: AIFeatureType | null;
  token_source: TokenSource | null;
  balance_after: number;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * Subscription event (webhook audit log)
 */
export interface SubscriptionEvent {
  id: string;
  user_id: string | null;
  stripe_event_id: string;
  event_type: string;
  previous_tier: SubscriptionTier | null;
  new_tier: SubscriptionTier | null;
  processed: boolean;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * Token purchase record
 */
export interface TokenPurchase {
  id: string;
  user_id: string;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  bucket_size: number;
  amount_cents: number;
  tokens_granted: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
  completed_at: string | null;
}

/**
 * Usage limits for free tier tracking
 */
export interface UsageLimits {
  id: string;
  user_id: string;
  period_start: string;
  pantry_items_count: number;
  saved_recipes_count: number;
  barcode_scans_count: number;
  grocery_lists_count: number;
  updated_at: string;
}

/**
 * Savings tracking for ROI messaging
 */
export interface SavingsTracking {
  id: string;
  user_id: string;
  month_start: string;
  items_saved_from_waste: number;
  estimated_savings_cents: number;
  co2_avoided_grams: number;
  meals_planned: number;
  recipes_generated: number;
  created_at: string;
  updated_at: string;
}

/**
 * Feature flag configuration
 */
export interface FeatureFlag {
  id: string;
  name: string;
  enabled: boolean;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Combined subscription state for UI
 */
export interface SubscriptionState {
  subscription: Subscription | null;
  tokenBalance: TokenBalance | null;
  usageLimits: UsageLimits | null;
  savings: SavingsTracking | null;
  isPremium: boolean;
  isTrial: boolean;
  isTrialExpired: boolean;
  daysUntilRenewal: number | null;
  daysUntilTrialEnd: number | null;
  totalTokens: number;
  tokenUsagePercent: number;
  /** The category of the current tier (free, individual, family) */
  tierCategory?: TierCategory;
  /** Whether user has individual-level access */
  isIndividual?: boolean;
  /** Whether user has family-level access */
  isFamily?: boolean;
}

/**
 * Feature access check result
 */
export interface FeatureAccessResult {
  allowed: boolean;
  reason?: string;
  current?: number;
  limit?: number;
}

/**
 * Stripe checkout session creation params
 */
export interface CreateCheckoutParams {
  tier: 'premium_monthly' | 'premium_annual';
  successUrl: string;
  cancelUrl: string;
}

/**
 * Token bucket purchase params
 */
export interface CreateTokenPurchaseParams {
  bucketSize: 50 | 150 | 400;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Token consumption result
 */
export interface TokenConsumptionResult {
  success: boolean;
  error?: string;
  consumed?: number;
  from_purchased?: number;
  from_subscription?: number;
  from_rollover?: number;
  balance_after?: number;
  available?: number;
  required?: number;
}

/**
 * Upgrade prompt configuration
 */
export interface UpgradePromptConfig {
  location: 'feature_gate' | 'limit_reached' | 'token_depleted' | 'post_value' | 'trial_reminder';
  feature?: string;
  current?: number;
  limit?: number;
  savings?: number;
}

// ============================================
// MEAL VOTING TYPES (Flow Rework)
// ============================================

export const VOTE_STATUSES = ['voting', 'accepted', 'rejected', 'expired'] as const;
export type VoteStatus = (typeof VOTE_STATUSES)[number];

export const VOTE_RESPONSES = ['yes', 'maybe', 'no'] as const;
export type VoteResponse = (typeof VOTE_RESPONSES)[number];

/**
 * Meal vote - proposed meal for household voting
 */
export interface MealVote {
  id: string;
  household_id: string;
  proposed_by: string;
  recipe_id: string;
  recipe_name: string;
  recipe_thumbnail: string | null;
  proposed_date: string;
  meal_type: MealType;
  status: VoteStatus;
  voting_ends_at: string | null;
  created_at: string;
  updated_at: string;
  // Virtual fields
  responses?: MealVoteResponse[];
  yes_count?: number;
  no_count?: number;
  maybe_count?: number;
}

/**
 * Individual vote response
 */
export interface MealVoteResponse {
  id: string;
  vote_id: string;
  user_id: string;
  user_email?: string;
  response: VoteResponse;
  created_at: string;
}

// ============================================
// INSTACART INTEGRATION TYPES (Flow Rework)
// ============================================

export const INSTACART_ORDER_STATUSES = ['created', 'clicked', 'completed', 'cancelled'] as const;
export type InstacartOrderStatus = (typeof INSTACART_ORDER_STATUSES)[number];

/**
 * Instacart order tracking
 */
export interface InstacartOrder {
  id: string;
  user_id: string;
  household_id: string | null;
  grocery_list_snapshot: GroceryItem[];
  item_count: number;
  estimated_total_cents: number | null;
  instacart_link: string;
  utm_source: string;
  utm_campaign: string | null;
  status: InstacartOrderStatus;
  clicked_at: string | null;
  completed_at: string | null;
  commission_cents: number | null;
  created_at: string;
}

// ============================================
// PEPPER AI CONTEXT TYPES (Flow Rework)
// ============================================

export const PEPPER_CONTEXT_TYPES = ['tonight', 'plan', 'pantry', 'grocery', 'recipe', 'general'] as const;
export type PepperContextType = (typeof PEPPER_CONTEXT_TYPES)[number];

/**
 * Pepper conversation context
 */
export interface PepperContext {
  id: string;
  user_id: string;
  context_type: PepperContextType;
  context_data: Record<string, unknown>;
  last_interaction_at: string;
  created_at: string;
}

/**
 * Pepper suggestion record
 */
export interface PepperSuggestionRecord {
  id: string;
  user_id: string;
  suggestion_type: string;
  suggestion_data: Record<string, unknown>;
  context_type: PepperContextType;
  shown_at: string;
  acted_upon: boolean;
  acted_at: string | null;
  dismissed: boolean;
  dismissed_at: string | null;
}

/**
 * Recipe rejection tracking
 */
export interface RecipeRejection {
  id: string;
  user_id: string;
  recipe_id: string;
  rejection_reason: string | null;
  context: string;
  created_at: string;
}

// ============================================
// RECIPE REVIEW TYPES
// ============================================

/**
 * Recipe review left by a user
 */
export interface RecipeReview {
  id: string;
  user_id: string;
  recipe_id: string;
  recipe_source: RecipeSource;
  rating: number;
  review_text: string | null;
  author_display_name: string;
  created_at: string;
  updated_at: string;
}

/**
 * Aggregated rating stats for a recipe
 */
export interface RecipeRatingStats {
  recipeId: string;
  recipeSource: RecipeSource;
  averageRating: number;
  totalReviews: number;
}

// ============================================
// TONIGHT SCREEN TYPES (Flow Rework)
// ============================================

/**
 * Tonight preferences stored in user profile
 */
export interface TonightPreferences {
  preferred_cuisines?: string[];
  avoided_cuisines?: string[];
  max_cook_time?: number;
  default_servings?: number;
  prioritize_expiring?: boolean;
}

/**
 * Tonight suggestion with match reasoning
 */
export interface TonightSuggestion {
  recipe: EnhancedScoredRecipe;
  reason: string;
  isTopPick: boolean;
  pepperExplanation?: string;
}

/**
 * Quick category for empty state
 */
export interface QuickCategory {
  id: string;
  emoji: string;
  label: string;
  query?: string;
}

// ============================================
// AI FEEDBACK TYPES
// ============================================

export const AI_FEEDBACK_RATINGS = ['positive', 'negative'] as const;
export type AIFeedbackRating = (typeof AI_FEEDBACK_RATINGS)[number];

/**
 * AI feedback record for tracking user satisfaction with AI responses
 */
export interface AIFeedback {
  id: string;
  user_id: string;
  household_id: string | null;
  message_id: string;
  user_message: string;
  ai_response: string;
  rating: AIFeedbackRating;
  comment: string | null;
  screen_context: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating AI feedback
 */
export interface AIFeedbackInput {
  messageId: string;
  userMessage: string;
  aiResponse: string;
  rating: AIFeedbackRating;
  comment?: string;
  screenContext?: string;
}

// ============================================
// APPLE IAP & HYBRID PAYMENT TYPES
// ============================================

export const PAYMENT_PROVIDERS = ['stripe', 'apple'] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export const APPLE_TRANSACTION_STATUSES = [
  'purchased',
  'renewed',
  'expired',
  'revoked',
  'grace_period',
  'billing_retry',
] as const;
export type AppleTransactionStatus = (typeof APPLE_TRANSACTION_STATUSES)[number];

/**
 * Apple App Store Server Notification types (V2)
 */
export const APPLE_NOTIFICATION_TYPES = [
  'SUBSCRIBED',
  'DID_RENEW',
  'DID_FAIL_TO_RENEW',
  'DID_CHANGE_RENEWAL_STATUS',
  'DID_CHANGE_RENEWAL_PREF',
  'OFFER_REDEEMED',
  'EXPIRED',
  'GRACE_PERIOD_EXPIRED',
  'REFUND',
  'REVOKE',
  'CONSUMPTION_REQUEST',
  'RENEWAL_EXTENDED',
  'RENEWAL_EXTENSION',
  'PRICE_INCREASE',
  'REFUND_DECLINED',
  'REFUND_REVERSED',
  'EXTERNAL_PURCHASE_TOKEN',
  'ONE_TIME_CHARGE',
  'TEST',
] as const;
export type AppleNotificationType = (typeof APPLE_NOTIFICATION_TYPES)[number];

/**
 * Apple notification subtypes
 */
export const APPLE_NOTIFICATION_SUBTYPES = [
  'INITIAL_BUY',
  'RESUBSCRIBE',
  'DOWNGRADE',
  'UPGRADE',
  'AUTO_RENEW_ENABLED',
  'AUTO_RENEW_DISABLED',
  'VOLUNTARY',
  'BILLING_RETRY',
  'PRICE_INCREASE',
  'GRACE_PERIOD',
  'PENDING',
  'ACCEPTED',
  'BILLING_RECOVERY',
  'PRODUCT_NOT_FOR_SALE',
  'RENEWAL',
  'SUMMARY',
  'FAILURE',
  'UNREPORTED',
] as const;
export type AppleNotificationSubtype = (typeof APPLE_NOTIFICATION_SUBTYPES)[number];

/**
 * Extended Subscription with Apple IAP fields
 */
export interface SubscriptionWithApple extends Subscription {
  payment_provider: PaymentProvider;
  apple_original_transaction_id: string | null;
  apple_transaction_id: string | null;
  apple_product_id: string | null;
  apple_environment: 'Production' | 'Sandbox' | null;
  apple_purchase_date: string | null;
  apple_expires_date: string | null;
  apple_auto_renew_status: boolean;
  apple_is_in_billing_retry: boolean;
  apple_grace_period_expires: string | null;
  storefront: string | null;
  storefront_id: string | null;
}

/**
 * Apple Server Notification record
 */
export interface AppleServerNotification {
  id: string;
  user_id: string | null;
  notification_type: AppleNotificationType;
  subtype: AppleNotificationSubtype | null;
  notification_uuid: string;
  signed_date: string;
  original_transaction_id: string | null;
  transaction_id: string | null;
  product_id: string | null;
  environment: 'Production' | 'Sandbox';
  bundle_id: string | null;
  app_apple_id: number | null;
  raw_payload: Record<string, unknown>;
  processed: boolean;
  error_message: string | null;
  created_at: string;
}

/**
 * Apple receipt validation record
 */
export interface AppleReceiptValidation {
  id: string;
  user_id: string;
  original_transaction_id: string;
  transaction_id: string;
  product_id: string;
  purchase_date: string;
  expires_date: string | null;
  is_trial_period: boolean;
  is_in_intro_offer_period: boolean;
  is_upgraded: boolean;
  environment: 'Production' | 'Sandbox';
  validation_status: 'valid' | 'invalid' | 'expired';
  raw_receipt: Record<string, unknown> | null;
  validated_at: string;
  created_at: string;
}

/**
 * User storefront information
 */
export interface UserStorefront {
  id: string;
  user_id: string;
  storefront: string;
  storefront_id: string | null;
  detected_at: string;
  source: 'storekit' | 'ip' | 'manual';
  updated_at: string;
}

/**
 * Apple product configuration
 */
export interface AppleProduct {
  id: string;
  product_id: string;
  name: string;
  description: string | null;
  product_type: 'subscription' | 'non_consumable' | 'consumable';
  subscription_group_id: string | null;
  subscription_group_level: number | null;
  tier: SubscriptionTier | null;
  tokens_granted: number;
  price_cents: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * StoreKit 2 Product from react-native-iap
 */
export interface StoreKitProduct {
  productId: string;
  title: string;
  description: string;
  price: string;
  localizedPrice: string;
  currency: string;
  type: 'subs' | 'inapp';
  subscriptionPeriod?: {
    numberOfUnits: number;
    unit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
  };
}

/**
 * StoreKit 2 Purchase/Transaction
 */
export interface StoreKitPurchase {
  productId: string;
  transactionId: string;
  originalTransactionId: string;
  purchaseDate: number;
  expiresDate?: number;
  isUpgraded?: boolean;
  environment: 'Production' | 'Sandbox';
  appAccountToken?: string;
  transactionReceipt?: string;
}

/**
 * Payment option displayed in paywall
 */
export interface PaymentOption {
  provider: PaymentProvider;
  label: string;
  description: string;
  recommended?: boolean;
  processingFee?: string;
  disclosure?: string;
}

/**
 * Paywall configuration based on user location
 */
export interface PaywallConfig {
  showStripeOption: boolean;
  showAppleOption: boolean;
  recommendedProvider: PaymentProvider;
  stripeDisclosure: string | null;
  appleDisclosure: string | null;
  storefront: string | null;
  isUSUser: boolean;
}

/**
 * Apple IAP configuration
 * Product IDs must match those configured in App Store Connect
 */
export const APPLE_IAP_CONFIG = {
  bundleId: 'com.turtlecreekllc.dinnerplans',
  sharedSecret: process.env.EXPO_PUBLIC_APPLE_SHARED_SECRET || '',
  products: {
    // Individual tier (legacy names for backwards compatibility)
    premium_monthly: 'com.turtlecreekllc.dinnerplans.individual.monthly',
    premium_annual: 'com.turtlecreekllc.dinnerplans.individual.annual',
    // Individual tier (new naming)
    individual_monthly: 'com.turtlecreekllc.dinnerplans.individual.monthly',
    individual_annual: 'com.turtlecreekllc.dinnerplans.individual.annual',
    // Family tier
    family_monthly: 'com.turtlecreekllc.dinnerplans.family.monthly',
    family_annual: 'com.turtlecreekllc.dinnerplans.family.annual',
    // Token buckets
    tokens_50: 'com.turtlecreekllc.dinnerplans.tokens.50',
    tokens_150: 'com.turtlecreekllc.dinnerplans.tokens.150',
    tokens_400: 'com.turtlecreekllc.dinnerplans.tokens.400',
  },
  subscriptionGroupId: 'com.turtlecreekllc.dinnerplans.subscriptions',
} as const;

/**
 * Apple disclosure text (required for external payment links)
 */
export const APPLE_DISCLOSURE_TEXT = {
  externalPayment: `You will be directed to an external website to complete your purchase. Apple is not responsible for the privacy or security of transactions that take place outside of the App Store. DinnerPlans.ai is the merchant of record for this transaction.`,
  termsLink: 'https://dinnerplans.ai/terms',
  privacyLink: 'https://dinnerplans.ai/privacy',
} as const;

/**
 * US storefronts that allow external payment options
 */
export const US_STOREFRONTS = ['USA', 'US', 'usa', 'us'] as const;

/**
 * Purchase result from either provider
 */
export interface PurchaseResult {
  success: boolean;
  provider: PaymentProvider;
  transactionId?: string;
  productId?: string;
  error?: string;
  requiresVerification?: boolean;
}

/**
 * Unified entitlement check result
 */
export interface EntitlementResult {
  hasAccess: boolean;
  provider: PaymentProvider | null;
  tier: SubscriptionTier;
  expiresAt: string | null;
  isGracePeriod: boolean;
  isTrial: boolean;
}
