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
  aisle: Aisle | null;
  meal_plan_id: string | null;
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

// ============================================================================
// Subscription / IAP config
// App Store Connect product IDs follow "<bundle>.<category>.<variant>".
// Bundle id is com.turtlecreekllc.dinnerplans (see app.json).
// ============================================================================

export const APPLE_IAP_CONFIG = {
  products: {
    premium_monthly: 'com.turtlecreekllc.dinnerplans.individual.monthly',
    premium_annual: 'com.turtlecreekllc.dinnerplans.individual.annual',
    family_monthly: 'com.turtlecreekllc.dinnerplans.family.monthly',
    family_annual: 'com.turtlecreekllc.dinnerplans.family.annual',
    tokens_50: 'com.turtlecreekllc.dinnerplans.tokens.50',
    tokens_150: 'com.turtlecreekllc.dinnerplans.tokens.150',
    tokens_400: 'com.turtlecreekllc.dinnerplans.tokens.400',
  },
} as const;

export interface PlanPrice {
  price: number; // cents
  displayPrice: string;
  monthlyEquivalent: string;
  tokens: number;
  rolloverEnabled: boolean;
  maxRollover: number;
}

export const PLAN_PRICING: Record<string, PlanPrice> = {
  premium_monthly: {
    price: 999,
    displayPrice: '$9.99',
    monthlyEquivalent: '$9.99',
    tokens: 100,
    rolloverEnabled: false,
    maxRollover: 0,
  },
  premium_annual: {
    price: 9900,
    displayPrice: '$99',
    monthlyEquivalent: '$8.25',
    tokens: 100,
    rolloverEnabled: true,
    maxRollover: 50,
  },
  individual_monthly: {
    price: 999,
    displayPrice: '$9.99',
    monthlyEquivalent: '$9.99',
    tokens: 100,
    rolloverEnabled: false,
    maxRollover: 0,
  },
  individual_annual: {
    price: 9900,
    displayPrice: '$99',
    monthlyEquivalent: '$8.25',
    tokens: 100,
    rolloverEnabled: true,
    maxRollover: 50,
  },
  family_monthly: {
    price: 1499,
    displayPrice: '$14.99',
    monthlyEquivalent: '$14.99',
    tokens: 200,
    rolloverEnabled: false,
    maxRollover: 0,
  },
  family_annual: {
    price: 14900,
    displayPrice: '$149',
    monthlyEquivalent: '$12.42',
    tokens: 200,
    rolloverEnabled: true,
    maxRollover: 100,
  },
};

export interface TokenBucket {
  size: 50 | 150 | 400;
  productId: string;
  price: number; // cents
  displayPrice: string;
}

export const TOKEN_BUCKETS: TokenBucket[] = [
  { size: 50, productId: APPLE_IAP_CONFIG.products.tokens_50, price: 299, displayPrice: '$2.99' },
  { size: 150, productId: APPLE_IAP_CONFIG.products.tokens_150, price: 799, displayPrice: '$7.99' },
  { size: 400, productId: APPLE_IAP_CONFIG.products.tokens_400, price: 1999, displayPrice: '$19.99' },
];

export const FREE_TIER_LIMITS = {
  tokensPerMonth: 25,
  recipesPerDay: 5,
  householdMembers: 1,
} as const;

export const FEATURE_ACCESS = {
  tonightSuggestions: ['individual', 'family', 'trial'],
  unlimitedRecipes: ['individual', 'family'],
  householdSharing: ['family'],
} as const;

export const APPLE_DISCLOSURE_TEXT = {
  externalPayment:
    'This app offers an external payment option. Payments processed outside the App Store are not subject to Apple review and refund policies.',
  termsLink: 'https://dinnerplans.ai/terms',
  privacyLink: 'https://dinnerplans.ai/privacy',
} as const;

// Apple storefront country codes considered "US" for paywall routing.
// Accepts ISO-3 (USA), ISO-2 (US), and case-insensitive variants.
export const US_STOREFRONTS: readonly string[] = ['USA', 'US'] as const;

export type SubscriptionTier =
  | 'free'
  | 'trial'
  | 'individual_monthly'
  | 'individual_annual'
  | 'family_monthly'
  | 'family_annual';

export type TierCategory = 'free' | 'trial' | 'individual' | 'family';

export function getTierCategory(tier: SubscriptionTier): TierCategory {
  if (tier === 'free') return 'free';
  if (tier === 'trial') return 'trial';
  if (tier.startsWith('family')) return 'family';
  return 'individual';
}

export function hasIndividualAccess(tier: SubscriptionTier): boolean {
  const cat = getTierCategory(tier);
  return cat === 'individual' || cat === 'family' || cat === 'trial';
}

export function hasFamilyAccess(tier: SubscriptionTier): boolean {
  return getTierCategory(tier) === 'family';
}

export function isTrialTier(tier: SubscriptionTier): boolean {
  return tier === 'trial';
}

export type PaymentProvider = 'apple' | 'stripe';

export interface PaywallConfig {
  showStripeOption: boolean;
  showAppleOption: boolean;
  recommendedProvider: PaymentProvider;
  stripeDisclosure: string | null;
  appleDisclosure: string | null;
  storefront: string | null;
  isUSUser: boolean;
}

export interface PurchaseResult {
  success: boolean;
  productId?: string;
  transactionId?: string;
  error?: string;
}

export interface EntitlementResult {
  hasAccess: boolean;
  tier: SubscriptionTier;
  expiresAt?: string | null;
}

export interface SubscriptionWithApple {
  tier: SubscriptionTier;
  provider: PaymentProvider;
  productId: string | null;
  status: 'active' | 'expired' | 'trialing' | 'cancelled';
  currentPeriodEnd: string | null;
}

export interface SubscriptionState {
  tier: SubscriptionTier;
  isActive: boolean;
  isTrialing: boolean;
  expiresAt: string | null;
  tokenBalance: number;
}

export interface FeatureAccessResult {
  hasAccess: boolean;
  reason?: string;
}

export interface CreateCheckoutParams {
  userId: string;
  tier: SubscriptionTier;
  provider: PaymentProvider;
}

export interface CreateTokenPurchaseParams {
  userId: string;
  bucketSize: 50 | 150 | 400;
  provider: PaymentProvider;
}
