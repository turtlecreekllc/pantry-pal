/**
 * useSubscription Hook
 * React hook for managing subscription state and operations
 * Supports hybrid payment system (Apple IAP + Stripe)
 */

import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import {
  SubscriptionState,
  TokenTransaction,
  AIFeatureType,
  FeatureAccessResult,
  PaymentProvider,
  PaywallConfig,
  PurchaseResult,
  EntitlementResult,
  TOKEN_COSTS,
  PLAN_PRICING,
  TOKEN_BUCKETS,
  FREE_TIER_LIMITS,
  FEATURE_ACCESS,
  TierCategory,
  getTierCategory,
  hasIndividualAccess,
  hasFamilyAccess,
} from '../lib/types';
import * as subscriptionService from '../lib/subscriptionService';
import * as tokenService from '../lib/tokenService';

/** Checkout tier type */
type CheckoutTier = 'individual_monthly' | 'individual_annual' | 'family_monthly' | 'family_annual' | 'premium_monthly' | 'premium_annual';

interface UseSubscriptionReturn {
  // State
  state: SubscriptionState | null;
  loading: boolean;
  error: string | null;
  // Subscription info
  isPremium: boolean;
  isTrial: boolean;
  isTrialExpired: boolean;
  tier: string;
  tierCategory: TierCategory;
  isIndividual: boolean;
  isFamily: boolean;
  daysUntilRenewal: number | null;
  daysUntilTrialEnd: number | null;
  // Payment provider info
  paymentProvider: PaymentProvider | null;
  paywallConfig: PaywallConfig | null;
  isUSUser: boolean;
  // Token info
  totalTokens: number;
  tokenUsagePercent: number;
  subscriptionTokens: number;
  purchasedTokens: number;
  rolloverTokens: number;
  // Actions
  refresh: () => Promise<void>;
  checkFeatureAccess: (feature: string) => Promise<FeatureAccessResult>;
  hasEnoughTokens: (featureType: AIFeatureType) => Promise<boolean>;
  consumeTokens: (featureType: AIFeatureType, description?: string) => Promise<boolean>;
  startTrial: (trialTier?: 'trial_individual' | 'trial_family') => Promise<{ success: boolean; error?: string }>;
  openCheckout: (tier: CheckoutTier) => Promise<void>;
  openTokenPurchase: (bucketSize: 50 | 150 | 400) => Promise<void>;
  openCustomerPortal: () => Promise<void>;
  cancelSubscription: () => Promise<{ success: boolean; error?: string }>;
  resumeSubscription: () => Promise<{ success: boolean; error?: string }>;
  // Hybrid payment actions
  purchase: (
    tier: CheckoutTier,
    provider: PaymentProvider
  ) => Promise<PurchaseResult>;
  purchaseTokens: (
    bucketSize: 50 | 150 | 400,
    provider: PaymentProvider
  ) => Promise<PurchaseResult>;
  restorePurchases: () => Promise<PurchaseResult>;
  checkEntitlements: () => Promise<EntitlementResult>;
  loadPaywallConfig: () => Promise<PaywallConfig | null>;
  // Token history
  getTokenHistory: (limit?: number) => Promise<TokenTransaction[]>;
  getTokenStats: (days?: number) => Promise<{
    totalUsed: number;
    byFeature: Record<AIFeatureType, number>;
    dailyUsage: { date: string; tokens: number }[];
  }>;
  // Savings
  getSavings: (period?: 'week' | 'month' | 'all_time') => Promise<{
    itemsSaved: number;
    moneySaved: number;
    co2Avoided: number;
  }>;
  // Utils
  getTokenCost: (featureType: AIFeatureType) => number;
  formatPrice: (cents: number) => string;
  // Feature access helpers
  canUseMealPlanning: boolean;
  canUseRecipeScaling: boolean;
  canAddHouseholdMember: boolean;
  canUseCalendarSync: boolean;
  hasAds: boolean;
}

/**
 * Hook for managing subscription state and operations
 * Includes fail-safe defaults to prevent crashes
 * Supports hybrid payment system (Apple IAP + Stripe)
 */
export function useSubscription(): UseSubscriptionReturn {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider | null>(null);
  const [paywallConfig, setPaywallConfig] = useState<PaywallConfig | null>(null);

  /**
   * Fetch subscription state with error handling
   */
  const refresh = useCallback(async () => {
    if (!user?.id) {
      setState(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const subscriptionState = await subscriptionService.getSubscriptionState(user.id);
      setState(subscriptionState);
    } catch (err) {
      // Log error but don't crash - use default free tier state
      console.warn('[useSubscription] Failed to load subscription state:', err);
      setError(err instanceof Error ? err.message : 'Failed to load subscription');
      // Set a safe default state so app continues to work
      setState(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Initial load with safety timeout
  useEffect(() => {
    let isMounted = true;
    const loadSubscription = async () => {
      try {
        await refresh();
      } catch (err) {
        // Catch any unhandled errors to prevent crash
        if (isMounted) {
          console.warn('[useSubscription] Unhandled error during refresh:', err);
          setLoading(false);
        }
      }
    };
    loadSubscription();
    return () => {
      isMounted = false;
    };
  }, [refresh]);
  /**
   * Check if a feature is accessible (fail-safe)
   */
  const checkFeatureAccess = useCallback(
    async (feature: string): Promise<FeatureAccessResult> => {
      if (!user?.id) {
        return { allowed: false, reason: 'Not authenticated' };
      }
      try {
        return await subscriptionService.checkFeatureAccess(user.id, feature);
      } catch (err) {
        console.warn('[useSubscription] checkFeatureAccess error:', err);
        // Default to allowing access on error to not block users
        return { allowed: true, reason: 'Error checking access - defaulting to allowed' };
      }
    },
    [user?.id]
  );

  /**
   * Check if user has enough tokens for a feature (fail-safe)
   */
  const hasEnoughTokens = useCallback(
    async (featureType: AIFeatureType): Promise<boolean> => {
      if (!user?.id) return false;
      try {
        return await tokenService.hasEnoughTokens(user.id, featureType);
      } catch (err) {
        console.warn('[useSubscription] hasEnoughTokens error:', err);
        // Default to true on error to not block users
        return true;
      }
    },
    [user?.id]
  );

  /**
   * Consume tokens for a feature (fail-safe)
   */
  const consumeTokens = useCallback(
    async (featureType: AIFeatureType, description?: string): Promise<boolean> => {
      if (!user?.id) return false;
      try {
        const result = await tokenService.consumeTokens(user.id, featureType, description);
        if (result.success) {
          // Refresh state to update token balance (don't await to not block)
          refresh().catch(err => console.warn('[useSubscription] refresh after consume error:', err));
        }
        return result.success;
      } catch (err) {
        console.warn('[useSubscription] consumeTokens error:', err);
        return false;
      }
    },
    [user?.id, refresh]
  );

  /**
   * Start free trial (fail-safe)
   * @param trialTier - The trial tier to start (trial_individual or trial_family)
   */
  const startTrial = useCallback(async (
    trialTier: 'trial_individual' | 'trial_family' = 'trial_individual'
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) {
      return { success: false, error: 'Not authenticated' };
    }
    try {
      const result = await subscriptionService.startFreeTrial(user.id, trialTier);
      if (result.success) {
        refresh().catch(err => console.warn('[useSubscription] refresh after trial error:', err));
      }
      return result;
    } catch (err) {
      console.warn('[useSubscription] startTrial error:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to start trial' };
    }
  }, [user?.id, refresh]);
  /**
   * Open Stripe Checkout for subscription (fail-safe)
   */
  const openCheckout = useCallback(
    async (tier: CheckoutTier): Promise<void> => {
      if (!user?.id) return;
      try {
        // Use deep linking URLs for mobile app
        const successUrl = 'dinnerplans://subscription/success';
        const cancelUrl = 'dinnerplans://subscription/cancel';
        const result = await subscriptionService.createCheckoutSession(user.id, {
          tier: tier as any,
          successUrl,
          cancelUrl,
        });
        if (result.url) {
          // Open in browser using expo-web-browser
          const { openBrowserAsync } = await import('expo-web-browser');
          await openBrowserAsync(result.url);
        }
      } catch (err) {
        console.warn('[useSubscription] openCheckout error:', err);
      }
    },
    [user?.id]
  );

  /**
   * Open Stripe Checkout for token purchase (fail-safe)
   */
  const openTokenPurchase = useCallback(
    async (bucketSize: 50 | 150 | 400): Promise<void> => {
      if (!user?.id) return;
      try {
        const successUrl = 'dinnerplans://tokens/success';
        const cancelUrl = 'dinnerplans://tokens/cancel';
        const result = await subscriptionService.createTokenPurchaseSession(user.id, {
          bucketSize,
          successUrl,
          cancelUrl,
        });
        if (result.url) {
          const { openBrowserAsync } = await import('expo-web-browser');
          await openBrowserAsync(result.url);
        }
      } catch (err) {
        console.warn('[useSubscription] openTokenPurchase error:', err);
      }
    },
    [user?.id]
  );

  /**
   * Open Stripe Customer Portal (fail-safe)
   */
  const openCustomerPortal = useCallback(async (): Promise<void> => {
    if (!user?.id) return;
    try {
      const returnUrl = 'dinnerplans://settings/subscription';
      const result = await subscriptionService.getCustomerPortalUrl(user.id, returnUrl);
      if (result.url) {
        const { openBrowserAsync } = await import('expo-web-browser');
        await openBrowserAsync(result.url);
      }
    } catch (err) {
      console.warn('[useSubscription] openCustomerPortal error:', err);
    }
  }, [user?.id]);

  /**
   * Cancel subscription (fail-safe)
   */
  const cancelSubscription = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) {
      return { success: false, error: 'Not authenticated' };
    }
    try {
      const result = await subscriptionService.cancelSubscription(user.id);
      if (result.success) {
        refresh().catch(err => console.warn('[useSubscription] refresh after cancel error:', err));
      }
      return result;
    } catch (err) {
      console.warn('[useSubscription] cancelSubscription error:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to cancel' };
    }
  }, [user?.id, refresh]);

  /**
   * Resume canceled subscription (fail-safe)
   */
  const resumeSubscription = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) {
      return { success: false, error: 'Not authenticated' };
    }
    try {
      const result = await subscriptionService.resumeSubscription(user.id);
      if (result.success) {
        refresh().catch(err => console.warn('[useSubscription] refresh after resume error:', err));
      }
      return result;
    } catch (err) {
      console.warn('[useSubscription] resumeSubscription error:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to resume' };
    }
  }, [user?.id, refresh]);

  /**
   * Get token transaction history (fail-safe)
   */
  const getTokenHistory = useCallback(
    async (limit: number = 20): Promise<TokenTransaction[]> => {
      if (!user?.id) return [];
      try {
        return await tokenService.getRecentTransactions(user.id, limit);
      } catch (err) {
        console.warn('[useSubscription] getTokenHistory error:', err);
        return [];
      }
    },
    [user?.id]
  );

  /**
   * Get token usage statistics (fail-safe)
   */
  const getTokenStats = useCallback(
    async (days: number = 30) => {
      const emptyStats = { totalUsed: 0, byFeature: {} as Record<AIFeatureType, number>, dailyUsage: [] };
      if (!user?.id) return emptyStats;
      try {
        return await tokenService.getTokenUsageStats(user.id, days);
      } catch (err) {
        console.warn('[useSubscription] getTokenStats error:', err);
        return emptyStats;
      }
    },
    [user?.id]
  );

  /**
   * Get savings data for ROI messaging (fail-safe)
   */
  const getSavings = useCallback(
    async (period: 'week' | 'month' | 'all_time' = 'month') => {
      const emptySavings = { itemsSaved: 0, moneySaved: 0, co2Avoided: 0 };
      if (!user?.id) return emptySavings;
      try {
        return await subscriptionService.getEstimatedSavings(user.id, period);
      } catch (err) {
        console.warn('[useSubscription] getSavings error:', err);
        return emptySavings;
      }
    },
    [user?.id]
  );
  /**
   * Get token cost for a feature
   */
  const getTokenCost = useCallback((featureType: AIFeatureType): number => {
    return TOKEN_COSTS[featureType];
  }, []);
  /**
   * Format price in cents to display string
   */
  const formatPrice = useCallback((cents: number): string => {
    return subscriptionService.formatPrice(cents);
  }, []);

  /**
   * Load paywall configuration (hybrid payments)
   */
  const loadPaywallConfig = useCallback(async (): Promise<PaywallConfig | null> => {
    if (!user?.id) return null;
    try {
      const config = await subscriptionService.getPaywallConfiguration(user.id);
      setPaywallConfig(config);
      return config;
    } catch (err) {
      console.warn('[useSubscription] loadPaywallConfig error:', err);
      return null;
    }
  }, [user?.id]);

  /**
   * Purchase subscription with specified provider (hybrid payments)
   */
  const purchase = useCallback(
    async (
      tier: CheckoutTier,
      provider: PaymentProvider
    ): Promise<PurchaseResult> => {
      if (!user?.id) {
        return { success: false, provider, error: 'Not authenticated' };
      }
      try {
        const result = await subscriptionService.purchaseSubscription(user.id, tier as any, provider);
        if (result.success) {
          refresh().catch(err => console.warn('[useSubscription] refresh after purchase error:', err));
        }
        return result;
      } catch (err) {
        console.warn('[useSubscription] purchase error:', err);
        return { 
          success: false, 
          provider, 
          error: err instanceof Error ? err.message : 'Purchase failed' 
        };
      }
    },
    [user?.id, refresh]
  );

  /**
   * Purchase tokens with specified provider (hybrid payments)
   */
  const purchaseTokensHybrid = useCallback(
    async (
      bucketSize: 50 | 150 | 400,
      provider: PaymentProvider
    ): Promise<PurchaseResult> => {
      if (!user?.id) {
        return { success: false, provider, error: 'Not authenticated' };
      }
      try {
        const result = await subscriptionService.purchaseTokens(user.id, bucketSize, provider);
        if (result.success) {
          refresh().catch(err => console.warn('[useSubscription] refresh after token purchase error:', err));
        }
        return result;
      } catch (err) {
        console.warn('[useSubscription] purchaseTokens error:', err);
        return { 
          success: false, 
          provider, 
          error: err instanceof Error ? err.message : 'Purchase failed' 
        };
      }
    },
    [user?.id, refresh]
  );

  /**
   * Restore purchases (Apple IAP)
   */
  const restorePurchases = useCallback(async (): Promise<PurchaseResult> => {
    if (!user?.id) {
      return { success: false, provider: 'apple', error: 'Not authenticated' };
    }
    try {
      const result = await subscriptionService.restorePurchases(user.id);
      if (result.success) {
        refresh().catch(err => console.warn('[useSubscription] refresh after restore error:', err));
      }
      return result;
    } catch (err) {
      console.warn('[useSubscription] restorePurchases error:', err);
      return { 
        success: false, 
        provider: 'apple', 
        error: err instanceof Error ? err.message : 'Restore failed' 
      };
    }
  }, [user?.id, refresh]);

  /**
   * Check entitlements from all providers
   */
  const checkEntitlements = useCallback(async (): Promise<EntitlementResult> => {
    if (!user?.id) {
      return {
        hasAccess: false,
        provider: null,
        tier: 'free',
        expiresAt: null,
        isGracePeriod: false,
        isTrial: false,
      };
    }
    try {
      return await subscriptionService.checkEntitlements(user.id);
    } catch (err) {
      console.warn('[useSubscription] checkEntitlements error:', err);
      return {
        hasAccess: false,
        provider: null,
        tier: 'free',
        expiresAt: null,
        isGracePeriod: false,
        isTrial: false,
      };
    }
  }, [user?.id]);

  // Load payment provider and paywall config on mount
  useEffect(() => {
    if (user?.id) {
      subscriptionService.getPaymentProvider(user.id).then(provider => {
        setPaymentProvider(provider);
      }).catch(err => {
        console.warn('[useSubscription] getPaymentProvider error:', err);
      });
      loadPaywallConfig().catch(err => {
        console.warn('[useSubscription] loadPaywallConfig error:', err);
      });
    }
  }, [user?.id, loadPaywallConfig]);

  // Derived values
  const isPremium = state?.isPremium ?? false;
  const isTrial = state?.isTrial ?? false;
  const isTrialExpired = state?.isTrialExpired ?? false;
  const tier = state?.subscription?.tier ?? 'free';
  const tierCategory: TierCategory = state?.tierCategory ?? getTierCategory(tier as any);
  const isIndividual = state?.isIndividual ?? hasIndividualAccess(tier as any);
  const isFamily = state?.isFamily ?? hasFamilyAccess(tier as any);
  const daysUntilRenewal = state?.daysUntilRenewal ?? null;
  const daysUntilTrialEnd = state?.daysUntilTrialEnd ?? null;
  const totalTokens = state?.totalTokens ?? 0;
  const tokenUsagePercent = state?.tokenUsagePercent ?? 0;
  const subscriptionTokens = state?.tokenBalance?.subscription_tokens ?? 0;
  const purchasedTokens = state?.tokenBalance?.purchased_tokens ?? 0;
  const rolloverTokens = state?.tokenBalance?.rollover_tokens ?? 0;
  const isUSUser = paywallConfig?.isUSUser ?? false;
  // Feature access based on tier
  const featureConfig = FEATURE_ACCESS[tierCategory];
  const canUseMealPlanning = featureConfig.aiMealPlanning;
  const canUseRecipeScaling = featureConfig.recipeScaling;
  const canAddHouseholdMember = featureConfig.householdMembers > 1;
  const canUseCalendarSync = featureConfig.calendarSync;
  const hasAds = featureConfig.adsEnabled;
  return {
    state,
    loading,
    error,
    isPremium,
    isTrial,
    isTrialExpired,
    tier,
    tierCategory,
    isIndividual,
    isFamily,
    daysUntilRenewal,
    daysUntilTrialEnd,
    paymentProvider,
    paywallConfig,
    isUSUser,
    totalTokens,
    tokenUsagePercent,
    subscriptionTokens,
    purchasedTokens,
    rolloverTokens,
    refresh,
    checkFeatureAccess,
    hasEnoughTokens,
    consumeTokens,
    startTrial,
    openCheckout,
    openTokenPurchase,
    openCustomerPortal,
    cancelSubscription,
    resumeSubscription,
    purchase,
    purchaseTokens: purchaseTokensHybrid,
    restorePurchases,
    checkEntitlements,
    loadPaywallConfig,
    getTokenHistory,
    getTokenStats,
    getSavings,
    getTokenCost,
    formatPrice,
    canUseMealPlanning,
    canUseRecipeScaling,
    canAddHouseholdMember,
    canUseCalendarSync,
    hasAds,
  };
}

/**
 * Hook to check if a specific feature is accessible
 */
export function useFeatureAccess(feature: string) {
  const { user } = useAuth();
  const [access, setAccess] = useState<FeatureAccessResult>({ allowed: true });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user?.id) {
      setAccess({ allowed: false, reason: 'Not authenticated' });
      setLoading(false);
      return;
    }
    subscriptionService.checkFeatureAccess(user.id, feature).then(result => {
      setAccess(result);
      setLoading(false);
    });
  }, [user?.id, feature]);
  return { ...access, loading };
}

/**
 * Hook to check token availability for a feature
 */
export function useTokenAvailability(featureType: AIFeatureType) {
  const { user } = useAuth();
  const [available, setAvailable] = useState(false);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const cost = TOKEN_COSTS[featureType];
  useEffect(() => {
    if (!user?.id) {
      setAvailable(false);
      setLoading(false);
      return;
    }
    tokenService.getTokenBalance(user.id).then(result => {
      setBalance(result.total);
      setAvailable(result.total >= cost);
      setLoading(false);
    });
  }, [user?.id, cost]);
  return { available, balance, cost, loading };
}

export { PLAN_PRICING, TOKEN_BUCKETS, FREE_TIER_LIMITS, FEATURE_ACCESS };

