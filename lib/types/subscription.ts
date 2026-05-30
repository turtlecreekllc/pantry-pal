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
