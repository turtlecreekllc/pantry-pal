/**
 * useFeatureGate Hook
 * Provides feature gating for the three-tier subscription model
 * Use this hook to check if a feature is available and show paywall if not
 */

import { useState, useCallback } from 'react';
import { useSubscriptionContext } from '../context/SubscriptionContext';
import {
  FEATURE_ACCESS,
  TierCategory,
  PaywallTrigger,
  PaywallContext,
  getTierCategory,
} from '../lib/types';

interface FeatureGateResult {
  /** Whether the feature is available */
  isAvailable: boolean;
  /** The required tier to access this feature */
  requiredTier: TierCategory | null;
  /** Current usage count (for limited features) */
  currentUsage?: number;
  /** Usage limit (for limited features) */
  limit?: number;
  /** Percentage of limit used */
  usagePercent?: number;
}

interface UseFeatureGateReturn {
  /** Check if a feature is available */
  checkFeature: (feature: string) => FeatureGateResult;
  /** Show paywall modal state */
  showPaywall: boolean;
  /** Paywall context for customization */
  paywallContext: PaywallContext | null;
  /** Open paywall with specific context */
  openPaywall: (trigger: PaywallTrigger, feature?: string, highlightTier?: TierCategory) => void;
  /** Close paywall */
  closePaywall: () => void;
  /** Execute action with feature check, showing paywall if needed */
  gatedAction: <T>(
    feature: string,
    action: () => Promise<T>,
    trigger?: PaywallTrigger
  ) => Promise<T | null>;
  /** Quick checks for common features */
  canUseAI: boolean;
  canUseMealPlanning: boolean;
  canUseRecipeScaling: boolean;
  canAddHouseholdMember: boolean;
  canUseCalendarSync: boolean;
  canUseExpirationTracking: boolean;
  canUseSmartGroceryLists: boolean;
  hasAds: boolean;
}

/** Map feature names to their required tier */
const FEATURE_TIER_REQUIREMENTS: Record<string, TierCategory> = {
  // Individual+ features
  ai_suggestions: 'individual',
  ai_features: 'individual',
  expiration_tracking: 'individual',
  smart_grocery_lists: 'individual',
  unlimited_pantry: 'individual',
  unlimited_recipes: 'individual',
  unlimited_scans: 'individual',
  multiple_grocery_lists: 'individual',
  ads_free: 'individual',
  // Family-only features
  ai_meal_planning: 'family',
  weekly_meal_plan: 'family',
  recipe_scaling: 'family',
  calendar_sync: 'family',
  per_person_preferences: 'family',
  shared_pantry: 'family',
  add_household_member: 'family',
  household_sharing: 'family',
};

/** Map trigger to highlighted tier */
const TRIGGER_TO_TIER: Record<PaywallTrigger, TierCategory> = {
  first_app_open: 'individual',
  pantry_limit: 'individual',
  recipe_limit: 'individual',
  scan_limit: 'individual',
  ai_suggestions: 'individual',
  meal_plan: 'family',
  add_family_member: 'family',
  recipe_scaling: 'family',
  calendar_sync: 'family',
  settings: 'individual',
  trial_expiring: 'individual',
};

/**
 * Hook for feature gating with paywall integration
 */
export function useFeatureGate(): UseFeatureGateReturn {
  const subscription = useSubscriptionContext();
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallContext, setPaywallContext] = useState<PaywallContext | null>(null);
  const tierCategory = subscription.tierCategory;
  const state = subscription.state;
  /**
   * Check if a feature is available based on current subscription
   */
  const checkFeature = useCallback((feature: string): FeatureGateResult => {
    const requiredTier = FEATURE_TIER_REQUIREMENTS[feature] || null;
    // If no tier required, feature is available
    if (!requiredTier) {
      return { isAvailable: true, requiredTier: null };
    }
    const featureConfig = FEATURE_ACCESS[tierCategory];
    // Check tier hierarchy: family > individual > free
    const tierHierarchy: TierCategory[] = ['free', 'individual', 'family'];
    const currentTierIndex = tierHierarchy.indexOf(tierCategory);
    const requiredTierIndex = tierHierarchy.indexOf(requiredTier);
    const hasAccess = currentTierIndex >= requiredTierIndex;
    // Handle usage-limited features for free tier
    if (tierCategory === 'free') {
      const usageLimits = state?.usageLimits;
      switch (feature) {
        case 'unlimited_pantry':
          const pantryCount = usageLimits?.pantry_items_count || 0;
          const pantryLimit = FEATURE_ACCESS.free.pantryLimit;
          return {
            isAvailable: pantryCount < pantryLimit,
            requiredTier,
            currentUsage: pantryCount,
            limit: pantryLimit,
            usagePercent: Math.round((pantryCount / pantryLimit) * 100),
          };
        case 'unlimited_recipes':
          const recipeCount = usageLimits?.saved_recipes_count || 0;
          const recipeLimit = FEATURE_ACCESS.free.recipeLimit;
          return {
            isAvailable: recipeCount < recipeLimit,
            requiredTier,
            currentUsage: recipeCount,
            limit: recipeLimit,
            usagePercent: Math.round((recipeCount / recipeLimit) * 100),
          };
        case 'unlimited_scans':
          const scanCount = usageLimits?.barcode_scans_count || 0;
          const scanLimit = FEATURE_ACCESS.free.scanLimit;
          return {
            isAvailable: scanCount < scanLimit,
            requiredTier,
            currentUsage: scanCount,
            limit: scanLimit,
            usagePercent: Math.round((scanCount / scanLimit) * 100),
          };
        case 'multiple_grocery_lists':
          const listCount = usageLimits?.grocery_lists_count || 0;
          const listLimit = FEATURE_ACCESS.free.groceryLists;
          return {
            isAvailable: listCount < listLimit,
            requiredTier,
            currentUsage: listCount,
            limit: listLimit,
            usagePercent: Math.round((listCount / listLimit) * 100),
          };
      }
    }
    return { isAvailable: hasAccess, requiredTier };
  }, [tierCategory, state]);
  /**
   * Open paywall with specific context
   */
  const openPaywall = useCallback((
    trigger: PaywallTrigger,
    feature?: string,
    highlightTier?: TierCategory
  ) => {
    const featureResult = feature ? checkFeature(feature) : null;
    setPaywallContext({
      trigger,
      featureAttempted: feature,
      currentTier: subscription.tier as any,
      highlightedTier: highlightTier || TRIGGER_TO_TIER[trigger],
      currentUsage: featureResult?.currentUsage,
      limit: featureResult?.limit,
    });
    setShowPaywall(true);
  }, [subscription.tier, checkFeature]);
  /**
   * Close paywall
   */
  const closePaywall = useCallback(() => {
    setShowPaywall(false);
    setPaywallContext(null);
  }, []);
  /**
   * Execute action with feature check, showing paywall if needed
   */
  const gatedAction = useCallback(async <T,>(
    feature: string,
    action: () => Promise<T>,
    trigger?: PaywallTrigger
  ): Promise<T | null> => {
    const result = checkFeature(feature);
    if (!result.isAvailable) {
      openPaywall(
        trigger || 'settings',
        feature,
        result.requiredTier || undefined
      );
      return null;
    }
    return action();
  }, [checkFeature, openPaywall]);
  // Quick access to common feature checks
  const featureConfig = FEATURE_ACCESS[tierCategory];
  return {
    checkFeature,
    showPaywall,
    paywallContext,
    openPaywall,
    closePaywall,
    gatedAction,
    canUseAI: featureConfig.aiSuggestions,
    canUseMealPlanning: featureConfig.aiMealPlanning,
    canUseRecipeScaling: featureConfig.recipeScaling,
    canAddHouseholdMember: featureConfig.householdMembers > 1,
    canUseCalendarSync: featureConfig.calendarSync,
    canUseExpirationTracking: featureConfig.expirationTracking,
    canUseSmartGroceryLists: featureConfig.smartGroceryLists,
    hasAds: featureConfig.adsEnabled,
  };
}

/**
 * Hook for checking a specific feature's availability
 * Simpler version for components that only need one feature check
 */
export function useFeatureCheck(feature: string): FeatureGateResult & {
  showPaywall: () => void;
} {
  const gate = useFeatureGate();
  const result = gate.checkFeature(feature);
  return {
    ...result,
    showPaywall: () => gate.openPaywall('settings', feature),
  };
}

export default useFeatureGate;

