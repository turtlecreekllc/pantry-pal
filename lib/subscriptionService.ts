/**
 * Subscription Service
 * Handles Stripe and Apple IAP integration for DinnerPlans.ai
 * 
 * Supports hybrid payment system:
 * - US users: Can choose Stripe (external) or Apple IAP
 * - International users: Apple IAP only
 */

import { Platform } from 'react-native';
import { supabase } from './supabase';
import {
  Subscription,
  SubscriptionWithApple,
  TokenBalance,
  TokenTransaction,
  SubscriptionState,
  SubscriptionTier,
  UsageLimits,
  SavingsTracking,
  FeatureAccessResult,
  CreateCheckoutParams,
  CreateTokenPurchaseParams,
  PaymentProvider,
  PurchaseResult,
  EntitlementResult,
  PaywallConfig,
  PLAN_PRICING,
  TOKEN_BUCKETS,
  FREE_TIER_LIMITS,
  FEATURE_ACCESS,
  APPLE_IAP_CONFIG,
  getTierCategory,
  hasIndividualAccess,
  hasFamilyAccess,
  isTrialTier,
  TierCategory,
} from './types';
import * as iapService from './iapService';
import { getPaywallConfig, isUSStorefront, detectStorefront } from './storefrontService';

// Stripe product IDs (configured in Stripe Dashboard)
const STRIPE_PRODUCTS = {
  // Individual tier
  individual_monthly: process.env.EXPO_PUBLIC_STRIPE_PRICE_INDIVIDUAL_MONTHLY || 'price_individual_monthly',
  individual_annual: process.env.EXPO_PUBLIC_STRIPE_PRICE_INDIVIDUAL_ANNUAL || 'price_individual_annual',
  // Family tier
  family_monthly: process.env.EXPO_PUBLIC_STRIPE_PRICE_FAMILY_MONTHLY || 'price_family_monthly',
  family_annual: process.env.EXPO_PUBLIC_STRIPE_PRICE_FAMILY_ANNUAL || 'price_family_annual',
  // Token buckets
  tokens_50: process.env.EXPO_PUBLIC_STRIPE_PRICE_TOKENS_50 || 'price_tokens_50',
  tokens_150: process.env.EXPO_PUBLIC_STRIPE_PRICE_TOKENS_150 || 'price_tokens_150',
  tokens_400: process.env.EXPO_PUBLIC_STRIPE_PRICE_TOKENS_400 || 'price_tokens_400',
  // Legacy mappings (for backwards compatibility)
  premium_monthly: process.env.EXPO_PUBLIC_STRIPE_PRICE_INDIVIDUAL_MONTHLY || 'price_individual_monthly',
  premium_annual: process.env.EXPO_PUBLIC_STRIPE_PRICE_INDIVIDUAL_ANNUAL || 'price_individual_annual',
} as const;

/**
 * Get the current user's subscription
 */
export async function getSubscription(userId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching subscription:', error);
    return null;
  }
  return data;
}

/**
 * Get the current user's token balance
 */
export async function getTokenBalance(userId: string): Promise<TokenBalance | null> {
  const { data, error } = await supabase
    .from('token_balances')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching token balance:', error);
    return null;
  }
  return data;
}

/**
 * Get usage limits for free tier tracking
 */
export async function getUsageLimits(userId: string): Promise<UsageLimits | null> {
  const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
  const { data, error } = await supabase
    .from('usage_limits')
    .select('*')
    .eq('user_id', userId)
    .eq('period_start', currentMonth)
    .single();
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching usage limits:', error);
    return null;
  }
  return data;
}

/**
 * Get savings tracking for ROI messaging
 */
export async function getSavingsTracking(userId: string): Promise<SavingsTracking | null> {
  const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
  const { data, error } = await supabase
    .from('savings_tracking')
    .select('*')
    .eq('user_id', userId)
    .eq('month_start', currentMonth)
    .single();
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching savings:', error);
    return null;
  }
  return data;
}

/**
 * Get token transaction history
 */
export async function getTokenTransactions(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
    featureType?: string;
  } = {}
): Promise<TokenTransaction[]> {
  const { limit = 50, offset = 0, startDate, endDate, featureType } = options;
  let query = supabase
    .from('token_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate);
  }
  if (featureType) {
    query = query.eq('feature_type', featureType);
  }
  const { data, error } = await query;
  if (error) {
    console.error('Error fetching token transactions:', error);
    return [];
  }
  return data || [];
}

/**
 * Get complete subscription state for UI
 */
export async function getSubscriptionState(userId: string): Promise<SubscriptionState> {
  const [subscription, tokenBalance, usageLimits, savings] = await Promise.all([
    getSubscription(userId),
    getTokenBalance(userId),
    getUsageLimits(userId),
    getSavingsTracking(userId),
  ]);
  const tier = subscription?.tier || 'free';
  const tierCategory = getTierCategory(tier);
  const isIndividual = hasIndividualAccess(tier);
  const isFamily = hasFamilyAccess(tier);
  const isTrial = isTrialTier(tier);
  // Check if trial is expired
  let isTrialExpired = false;
  if (isTrial && subscription?.trial_end) {
    isTrialExpired = new Date(subscription.trial_end) < new Date();
  }
  // Premium means paid or active trial
  const isPremium = (isIndividual || isFamily) && (!isTrial || !isTrialExpired);
  // Calculate days until renewal
  let daysUntilRenewal: number | null = null;
  if (subscription?.current_period_end) {
    const endDate = new Date(subscription.current_period_end);
    const now = new Date();
    daysUntilRenewal = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }
  // Calculate days until trial end
  let daysUntilTrialEnd: number | null = null;
  if (subscription?.trial_end) {
    const trialEnd = new Date(subscription.trial_end);
    const now = new Date();
    daysUntilTrialEnd = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }
  // Calculate total tokens
  const totalTokens = tokenBalance
    ? tokenBalance.subscription_tokens + tokenBalance.purchased_tokens + tokenBalance.rollover_tokens
    : 0;
  // Calculate usage percentage based on tier
  const monthlyAllocation = FEATURE_ACCESS[tierCategory].tokensMonthly;
  const tokenUsagePercent = monthlyAllocation > 0
    ? Math.round(((monthlyAllocation - (tokenBalance?.subscription_tokens || 0)) / monthlyAllocation) * 100)
    : 0;
  return {
    subscription,
    tokenBalance,
    usageLimits,
    savings,
    isPremium,
    isTrial,
    isTrialExpired,
    daysUntilRenewal,
    daysUntilTrialEnd,
    totalTokens,
    tokenUsagePercent,
    tierCategory,
    isIndividual,
    isFamily,
  } as SubscriptionState;
}

/**
 * Check if a feature is accessible based on subscription tier
 */
export async function checkFeatureAccess(
  userId: string,
  feature: string
): Promise<FeatureAccessResult> {
  const { data, error } = await supabase.rpc('check_feature_access', {
    p_user_id: userId,
    p_feature: feature,
  });
  if (error) {
    console.error('Error checking feature access:', error);
    return { allowed: false, reason: 'Error checking access' };
  }
  return data as FeatureAccessResult;
}

/**
 * Check if user has enough tokens for a feature
 */
export async function checkTokenAvailability(
  userId: string,
  requiredTokens: number
): Promise<{ available: boolean; balance: number; required: number }> {
  const { data, error } = await supabase.rpc('get_available_tokens', {
    p_user_id: userId,
  });
  if (error) {
    console.error('Error checking token availability:', error);
    return { available: false, balance: 0, required: requiredTokens };
  }
  const balance = data as number;
  return {
    available: balance >= requiredTokens,
    balance,
    required: requiredTokens,
  };
}

/** Map tier to Stripe price ID */
function getTierPriceId(tier: SubscriptionTier | 'premium_monthly' | 'premium_annual'): string {
  switch (tier) {
    case 'individual_monthly':
    case 'premium_monthly':
      return STRIPE_PRODUCTS.individual_monthly;
    case 'individual_annual':
    case 'premium_annual':
      return STRIPE_PRODUCTS.individual_annual;
    case 'family_monthly':
      return STRIPE_PRODUCTS.family_monthly;
    case 'family_annual':
      return STRIPE_PRODUCTS.family_annual;
    default:
      return STRIPE_PRODUCTS.individual_monthly;
  }
}

/**
 * Create a Stripe Checkout session for subscription
 */
export async function createCheckoutSession(
  userId: string,
  params: CreateCheckoutParams
): Promise<{ url: string | null; error: string | null }> {
  const priceId = getTierPriceId(params.tier);
  // Validate that we have a real price ID (not the fallback)
  if (!priceId || priceId.startsWith('price_individual') || priceId.startsWith('price_family')) {
    console.error('Invalid Stripe price ID - missing EXPO_PUBLIC_STRIPE_PRICE_* env vars');
    return { url: null, error: 'Payment configuration error. Please contact support.' };
  }
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: {
      userId,
      priceId,
      mode: 'subscription',
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
      metadata: {
        tier: params.tier,
      },
    },
  });
  if (error) {
    let errorMessage = error.message;
    if (data?.error) {
      errorMessage = data.error;
    }
    console.error('Error creating checkout session:', errorMessage, 'Response data:', data);
    return { url: null, error: errorMessage };
  }
  if (!data?.url) {
    console.error('No checkout URL returned:', data);
    return { url: null, error: 'Failed to create checkout session' };
  }
  return { url: data.url, error: null };
}

/**
 * Create a Stripe Checkout session for token bucket purchase
 */
export async function createTokenPurchaseSession(
  userId: string,
  params: CreateTokenPurchaseParams
): Promise<{ url: string | null; error: string | null }> {
  let priceId: string;
  switch (params.bucketSize) {
    case 50:
      priceId = STRIPE_PRODUCTS.tokens_50;
      break;
    case 150:
      priceId = STRIPE_PRODUCTS.tokens_150;
      break;
    case 400:
      priceId = STRIPE_PRODUCTS.tokens_400;
      break;
    default:
      return { url: null, error: 'Invalid bucket size' };
  }
  // Validate that we have a real price ID (not the fallback)
  if (!priceId || priceId.startsWith('price_tokens_')) {
    console.error('Invalid Stripe price ID - missing EXPO_PUBLIC_STRIPE_PRICE_TOKENS_* env vars');
    return { url: null, error: 'Payment configuration error. Please contact support.' };
  }
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: {
      userId,
      priceId,
      mode: 'payment',
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
      metadata: {
        type: 'token_purchase',
        bucket_size: params.bucketSize,
      },
    },
  });
  if (error) {
    // Extract detailed error message - check data first (Supabase includes response body there)
    let errorMessage = error.message;
    if (data?.error) {
      errorMessage = data.error;
    }
    console.error('Error creating token purchase session:', errorMessage, 'Response data:', data);
    return { url: null, error: errorMessage };
  }
  if (!data?.url) {
    console.error('No checkout URL returned:', data);
    return { url: null, error: 'Failed to create checkout session' };
  }
  return { url: data.url, error: null };
}

/**
 * Get Stripe Customer Portal URL for subscription management
 */
export async function getCustomerPortalUrl(
  userId: string,
  returnUrl: string
): Promise<{ url: string | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke('create-portal-session', {
    body: {
      userId,
      returnUrl,
    },
  });
  if (error) {
    console.error('Error creating portal session:', error);
    return { url: null, error: error.message };
  }
  return { url: data.url, error: null };
}

/**
 * Start a free trial for a specific tier
 * @param userId - User ID
 * @param trialTier - The trial tier to start (trial_individual or trial_family)
 */
export async function startFreeTrial(
  userId: string,
  trialTier: 'trial_individual' | 'trial_family' = 'trial_individual'
): Promise<{ success: boolean; error: string | null }> {
  const { data, error } = await supabase.functions.invoke('start-free-trial', {
    body: { userId, trialTier },
  });
  if (error) {
    console.error('Error starting free trial:', error);
    return { success: false, error: error.message };
  }
  if (data?.error) {
    return { success: false, error: data.error };
  }
  return { success: true, error: null };
}

/**
 * Cancel subscription at period end
 */
export async function cancelSubscription(
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase.functions.invoke('cancel-subscription', {
    body: { userId },
  });
  if (error) {
    console.error('Error canceling subscription:', error);
    return { success: false, error: error.message };
  }
  return { success: true, error: null };
}

/**
 * Resume a canceled subscription
 */
export async function resumeSubscription(
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase.functions.invoke('resume-subscription', {
    body: { userId },
  });
  if (error) {
    console.error('Error resuming subscription:', error);
    return { success: false, error: error.message };
  }
  return { success: true, error: null };
}

/**
 * Get estimated savings for ROI messaging
 */
export async function getEstimatedSavings(
  userId: string,
  period: 'week' | 'month' | 'all_time' = 'month'
): Promise<{
  itemsSaved: number;
  moneySaved: number;
  co2Avoided: number;
}> {
  const { data, error } = await supabase
    .from('savings_tracking')
    .select('*')
    .eq('user_id', userId);
  if (error) {
    console.error('Error fetching savings:', error);
    return { itemsSaved: 0, moneySaved: 0, co2Avoided: 0 };
  }
  if (!data || data.length === 0) {
    return { itemsSaved: 0, moneySaved: 0, co2Avoided: 0 };
  }
  const now = new Date();
  let filteredData = data;
  if (period === 'week') {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    filteredData = data.filter(d => new Date(d.month_start) >= weekAgo);
  } else if (period === 'month') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    filteredData = data.filter(d => new Date(d.month_start) >= monthStart);
  }
  const totals = filteredData.reduce(
    (acc, curr) => ({
      itemsSaved: acc.itemsSaved + curr.items_saved_from_waste,
      moneySaved: acc.moneySaved + curr.estimated_savings_cents / 100,
      co2Avoided: acc.co2Avoided + curr.co2_avoided_grams / 1000,
    }),
    { itemsSaved: 0, moneySaved: 0, co2Avoided: 0 }
  );
  return totals;
}

/**
 * Record savings event (for ROI tracking)
 */
export async function recordSavings(
  userId: string,
  data: {
    itemsSaved?: number;
    savingsCents?: number;
    co2Grams?: number;
    mealsPlanned?: number;
    recipesGenerated?: number;
  }
): Promise<void> {
  const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
  const { error } = await supabase.rpc('upsert_savings_tracking', {
    p_user_id: userId,
    p_month_start: currentMonth,
    p_items_saved: data.itemsSaved || 0,
    p_savings_cents: data.savingsCents || 0,
    p_co2_grams: data.co2Grams || 0,
    p_meals_planned: data.mealsPlanned || 0,
    p_recipes_generated: data.recipesGenerated || 0,
  });
  if (error) {
    console.error('Error recording savings:', error);
  }
}

/**
 * Increment usage counter for free tier
 */
export async function incrementUsage(
  userId: string,
  usageType: 'pantry_items' | 'saved_recipes' | 'barcode_scans' | 'grocery_lists'
): Promise<void> {
  const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
  const columnMap = {
    pantry_items: 'pantry_items_count',
    saved_recipes: 'saved_recipes_count',
    barcode_scans: 'barcode_scans_count',
    grocery_lists: 'grocery_lists_count',
  };
  const column = columnMap[usageType];
  // Upsert usage limits
  const { error } = await supabase.rpc('increment_usage_limit', {
    p_user_id: userId,
    p_period_start: currentMonth,
    p_column: column,
  });
  if (error) {
    console.error('Error incrementing usage:', error);
  }
}

/**
 * Get feature flags
 */
export async function getFeatureFlags(): Promise<Record<string, boolean>> {
  const { data, error } = await supabase
    .from('feature_flags')
    .select('name, enabled');
  if (error) {
    console.error('Error fetching feature flags:', error);
    return {};
  }
  return data.reduce((acc, flag) => {
    acc[flag.name] = flag.enabled;
    return acc;
  }, {} as Record<string, boolean>);
}

/**
 * Check if subscription system is enabled
 */
export async function isSubscriptionEnabled(): Promise<boolean> {
  const flags = await getFeatureFlags();
  return flags['subscriptions_enabled'] ?? false;
}

/**
 * Format price for display
 */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Get tier display name
 */
export function getTierDisplayName(tier: SubscriptionTier): string {
  switch (tier) {
    case 'free':
      return 'Free';
    case 'individual_monthly':
      return 'Individual Monthly';
    case 'individual_annual':
      return 'Individual Annual';
    case 'family_monthly':
      return 'Family Monthly';
    case 'family_annual':
      return 'Family Annual';
    case 'trial_individual':
      return 'Individual Trial';
    case 'trial_family':
      return 'Family Trial';
    default:
      return tier;
  }
}

/**
 * Get tier category display name
 */
export function getTierCategoryDisplayName(tierCategory: TierCategory): string {
  switch (tierCategory) {
    case 'free':
      return 'Free';
    case 'individual':
      return 'Individual';
    case 'family':
      return 'Family';
    default:
      return 'Free';
  }
}

/**
 * Calculate days remaining in subscription period
 */
export function getDaysRemaining(endDate: string | null): number {
  if (!endDate) return 0;
  const end = new Date(endDate);
  const now = new Date();
  const diffTime = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}

// ============================================
// HYBRID PAYMENT FUNCTIONS
// ============================================

/**
 * Get subscription with Apple IAP fields
 */
export async function getSubscriptionWithApple(
  userId: string
): Promise<SubscriptionWithApple | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching subscription:', error);
    return null;
  }
  return data as SubscriptionWithApple | null;
}

/**
 * Get the current payment provider for a user
 */
export async function getPaymentProvider(userId: string): Promise<PaymentProvider | null> {
  const subscription = await getSubscriptionWithApple(userId);
  if (!subscription) return null;
  return subscription.payment_provider || 'stripe';
}

/**
 * Initialize payment system based on platform
 */
export async function initializePayments(): Promise<void> {
  if (Platform.OS === 'ios') {
    await iapService.initializeIAP();
  }
}

/**
 * Terminate payment system
 */
export async function terminatePayments(): Promise<void> {
  if (Platform.OS === 'ios') {
    await iapService.terminateIAP();
  }
}

/**
 * Get paywall configuration for user
 */
export async function getPaywallConfiguration(userId: string): Promise<PaywallConfig> {
  return getPaywallConfig(userId);
}

/** Subscription tier type for purchase */
type PurchaseTier = 'individual_monthly' | 'individual_annual' | 'family_monthly' | 'family_annual' | 'premium_monthly' | 'premium_annual';

/**
 * Purchase subscription using the specified provider
 */
export async function purchaseSubscription(
  userId: string,
  tier: PurchaseTier,
  provider: PaymentProvider
): Promise<PurchaseResult> {
  // Map legacy tier names to new ones
  const normalizedTier = tier === 'premium_monthly' ? 'individual_monthly' :
                         tier === 'premium_annual' ? 'individual_annual' : tier;
  if (provider === 'apple') {
    // Map tier to Apple product ID
    let productId: string;
    switch (normalizedTier) {
      case 'individual_monthly':
        productId = APPLE_IAP_CONFIG.products.premium_monthly;
        break;
      case 'individual_annual':
        productId = APPLE_IAP_CONFIG.products.premium_annual;
        break;
      case 'family_monthly':
        productId = APPLE_IAP_CONFIG.products.family_monthly || APPLE_IAP_CONFIG.products.premium_monthly;
        break;
      case 'family_annual':
        productId = APPLE_IAP_CONFIG.products.family_annual || APPLE_IAP_CONFIG.products.premium_annual;
        break;
      default:
        productId = APPLE_IAP_CONFIG.products.premium_monthly;
    }
    return iapService.purchaseSubscription(productId, userId);
  }
  // Stripe: Create checkout session and return URL
  const successUrl = 'dinnerplans://subscription/success';
  const cancelUrl = 'dinnerplans://subscription/cancel';
  const result = await createCheckoutSession(userId, { tier: normalizedTier as any, successUrl, cancelUrl });
  if (result.error || !result.url) {
    return {
      success: false,
      provider: 'stripe',
      error: result.error || 'Failed to create checkout session',
    };
  }
  return {
    success: true,
    provider: 'stripe',
  };
}

/**
 * Purchase tokens using the specified provider
 */
export async function purchaseTokens(
  userId: string,
  bucketSize: 50 | 150 | 400,
  provider: PaymentProvider
): Promise<PurchaseResult> {
  if (provider === 'apple') {
    let productId: string;
    switch (bucketSize) {
      case 50:
        productId = APPLE_IAP_CONFIG.products.tokens_50;
        break;
      case 150:
        productId = APPLE_IAP_CONFIG.products.tokens_150;
        break;
      case 400:
        productId = APPLE_IAP_CONFIG.products.tokens_400;
        break;
    }
    return iapService.purchaseConsumable(productId, userId);
  }
  // Stripe token purchase
  const successUrl = 'dinnerplans://tokens/success';
  const cancelUrl = 'dinnerplans://tokens/cancel';
  const result = await createTokenPurchaseSession(userId, { bucketSize, successUrl, cancelUrl });
  if (result.error || !result.url) {
    return {
      success: false,
      provider: 'stripe',
      error: result.error || 'Failed to create checkout session',
    };
  }
  return { success: true, provider: 'stripe' };
}

/**
 * Restore purchases (Apple IAP only)
 */
export async function restorePurchases(userId: string): Promise<PurchaseResult> {
  if (Platform.OS !== 'ios') {
    return {
      success: false,
      provider: 'apple',
      error: 'Restore purchases only available on iOS',
    };
  }
  return iapService.restorePurchases(userId);
}

/**
 * Check entitlements from all providers
 */
export async function checkEntitlements(userId: string): Promise<EntitlementResult> {
  const subscription = await getSubscriptionWithApple(userId);
  if (!subscription) {
    return {
      hasAccess: false,
      provider: null,
      tier: 'free',
      expiresAt: null,
      isGracePeriod: false,
      isTrial: false,
    };
  }
  const isIndividual = hasIndividualAccess(subscription.tier);
  const isFamily = hasFamilyAccess(subscription.tier);
  const isTrial = isTrialTier(subscription.tier);
  const isActive = subscription.status === 'active' || subscription.status === 'trialing';
  // Check for grace period (Apple)
  const isGracePeriod = subscription.payment_provider === 'apple' && 
                        subscription.apple_is_in_billing_retry === true;
  // Check expiration
  let expiresAt: string | null = null;
  if (subscription.payment_provider === 'apple') {
    expiresAt = subscription.apple_expires_date;
  } else {
    expiresAt = subscription.current_period_end;
  }
  // Check if actually expired
  const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;
  const hasAccess = (isIndividual || isFamily) && (isActive || isGracePeriod) && !isExpired;
  return {
    hasAccess,
    provider: subscription.payment_provider,
    tier: subscription.tier,
    expiresAt,
    isGracePeriod,
    isTrial,
  };
}

/**
 * Fetch available products from both stores
 */
export async function fetchProducts(): Promise<{
  subscriptions: { provider: PaymentProvider; productId: string; price: string; title: string }[];
  tokens: { provider: PaymentProvider; productId: string; price: string; title: string; size: number }[];
}> {
  const result = {
    subscriptions: [] as { provider: PaymentProvider; productId: string; price: string; title: string }[],
    tokens: [] as { provider: PaymentProvider; productId: string; price: string; title: string; size: number }[],
  };
  // Add Stripe products (static pricing)
  result.subscriptions.push({
    provider: 'stripe',
    productId: 'premium_monthly',
    price: PLAN_PRICING.premium_monthly.displayPrice,
    title: 'Premium Monthly',
  });
  result.subscriptions.push({
    provider: 'stripe',
    productId: 'premium_annual',
    price: PLAN_PRICING.premium_annual.displayPrice,
    title: 'Premium Annual',
  });
  for (const bucket of TOKEN_BUCKETS) {
    result.tokens.push({
      provider: 'stripe',
      productId: `tokens_${bucket.size}`,
      price: bucket.displayPrice,
      title: `${bucket.size} AI Tokens`,
      size: bucket.size,
    });
  }
  // Fetch Apple products if on iOS
  if (Platform.OS === 'ios') {
    try {
      const appleProducts = await iapService.fetchAllProducts();
      for (const sub of appleProducts.subscriptions) {
        result.subscriptions.push({
          provider: 'apple',
          productId: sub.productId,
          price: sub.localizedPrice,
          title: sub.title,
        });
      }
      for (const consumable of appleProducts.consumables) {
        const size = consumable.productId.includes('50') ? 50 :
                     consumable.productId.includes('150') ? 150 :
                     consumable.productId.includes('400') ? 400 : 0;
        result.tokens.push({
          provider: 'apple',
          productId: consumable.productId,
          price: consumable.localizedPrice,
          title: consumable.title,
          size,
        });
      }
    } catch (error) {
      console.warn('[Subscription] Error fetching Apple products:', error);
    }
  }
  return result;
}

/** Checkout tier type */
type CheckoutTier = 'individual_monthly' | 'individual_annual' | 'family_monthly' | 'family_annual' | 'premium_monthly' | 'premium_annual';

/**
 * Get checkout URL for Stripe (for browser redirect flow)
 */
export async function getStripeCheckoutUrl(
  userId: string,
  tier: CheckoutTier,
  successUrl: string,
  cancelUrl: string
): Promise<string | null> {
  // Map legacy tier names to new ones
  const normalizedTier = tier === 'premium_monthly' ? 'individual_monthly' :
                         tier === 'premium_annual' ? 'individual_annual' : tier;
  const result = await createCheckoutSession(userId, { tier: normalizedTier as any, successUrl, cancelUrl });
  return result.url;
}

/**
 * Check if user should see external payment option
 */
export async function shouldShowExternalPayment(userId: string): Promise<boolean> {
  if (Platform.OS !== 'ios') return true; // Non-iOS always use Stripe
  const storefront = await detectStorefront(userId);
  return isUSStorefront(storefront?.storefront);
}

