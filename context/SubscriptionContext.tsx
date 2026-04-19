/**
 * SubscriptionContext
 * Global subscription state management for DinnerPlans.ai
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  SubscriptionState,
  AIFeatureType,
  FeatureAccessResult,
  TokenConsumptionResult,
  TierCategory,
  FEATURE_ACCESS,
} from '../lib/types';
import * as subscriptionService from '../lib/subscriptionService';
import * as tokenService from '../lib/tokenService';

interface SubscriptionContextType {
  // State
  state: SubscriptionState | null;
  loading: boolean;
  error: string | null;
  // Computed values
  isPremium: boolean;
  isTrial: boolean;
  isTrialExpired: boolean;
  tier: string;
  tierCategory: TierCategory;
  isIndividual: boolean;
  isFamily: boolean;
  totalTokens: number;
  // Methods
  refresh: () => Promise<void>;
  checkFeatureAccess: (feature: string) => Promise<FeatureAccessResult>;
  consumeTokens: (featureType: AIFeatureType, description?: string) => Promise<TokenConsumptionResult>;
  hasEnoughTokens: (featureType: AIFeatureType) => Promise<boolean>;
  // Feature gates
  canUseAI: boolean;
  canAddPantryItem: () => Promise<boolean>;
  canSaveRecipe: () => Promise<boolean>;
  canScanBarcode: () => Promise<boolean>;
  // New feature checks
  canUseMealPlanning: boolean;
  canUseRecipeScaling: boolean;
  canAddHouseholdMember: boolean;
  canUseCalendarSync: boolean;
  hasAds: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /**
   * Refresh subscription state from server
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
      setError(err instanceof Error ? err.message : 'Failed to load subscription');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);
  // Initial load and refresh on user change
  useEffect(() => {
    refresh();
  }, [refresh]);
  // Refresh subscription when app comes to foreground
  useEffect(() => {
    const interval = setInterval(() => {
      if (user?.id && !loading) {
        refresh();
      }
    }, 5 * 60 * 1000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, [user?.id, loading, refresh]);
  /**
   * Check if a feature is accessible
   */
  const checkFeatureAccess = useCallback(
    async (feature: string): Promise<FeatureAccessResult> => {
      if (!user?.id) {
        return { allowed: false, reason: 'Not authenticated' };
      }
      return subscriptionService.checkFeatureAccess(user.id, feature);
    },
    [user?.id]
  );
  /**
   * Consume tokens for an AI feature
   */
  const consumeTokens = useCallback(
    async (featureType: AIFeatureType, description?: string): Promise<TokenConsumptionResult> => {
      if (!user?.id) {
        return { success: false, error: 'Not authenticated' };
      }
      const result = await tokenService.consumeTokens(user.id, featureType, description);
      if (result.success) {
        // Refresh state to update token balance
        await refresh();
      }
      return result;
    },
    [user?.id, refresh]
  );
  /**
   * Check if user has enough tokens for a feature
   */
  const hasEnoughTokens = useCallback(
    async (featureType: AIFeatureType): Promise<boolean> => {
      if (!user?.id) return false;
      return tokenService.hasEnoughTokens(user.id, featureType);
    },
    [user?.id]
  );
  /**
   * Check if user can add a pantry item
   */
  const canAddPantryItem = useCallback(async (): Promise<boolean> => {
    const result = await checkFeatureAccess('unlimited_pantry');
    return result.allowed;
  }, [checkFeatureAccess]);
  /**
   * Check if user can save a recipe
   */
  const canSaveRecipe = useCallback(async (): Promise<boolean> => {
    const result = await checkFeatureAccess('unlimited_recipes');
    return result.allowed;
  }, [checkFeatureAccess]);
  /**
   * Check if user can scan a barcode
   */
  const canScanBarcode = useCallback(async (): Promise<boolean> => {
    const result = await checkFeatureAccess('barcode_scan');
    return result.allowed;
  }, [checkFeatureAccess]);
  // Computed values
  const isPremium = state?.isPremium ?? false;
  const isTrial = state?.isTrial ?? false;
  const isTrialExpired = state?.isTrialExpired ?? false;
  const tier = state?.subscription?.tier ?? 'free';
  const tierCategory: TierCategory = state?.tierCategory ?? 'free';
  const isIndividual = state?.isIndividual ?? false;
  const isFamily = state?.isFamily ?? false;
  const totalTokens = state?.totalTokens ?? 0;
  // Feature access based on tier
  const featureConfig = FEATURE_ACCESS[tierCategory];
  const canUseAI = featureConfig.aiSuggestions;
  const canUseMealPlanning = featureConfig.aiMealPlanning;
  const canUseRecipeScaling = featureConfig.recipeScaling;
  const canAddHouseholdMember = featureConfig.householdMembers > 1;
  const canUseCalendarSync = featureConfig.calendarSync;
  const hasAds = featureConfig.adsEnabled;
  const value: SubscriptionContextType = {
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
    totalTokens,
    refresh,
    checkFeatureAccess,
    consumeTokens,
    hasEnoughTokens,
    canUseAI,
    canAddPantryItem,
    canSaveRecipe,
    canScanBarcode,
    canUseMealPlanning,
    canUseRecipeScaling,
    canAddHouseholdMember,
    canUseCalendarSync,
    hasAds,
  };
  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

/**
 * Hook to access subscription context
 * Use this when you need the context-based subscription state
 */
export function useSubscriptionContext(): SubscriptionContextType {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscriptionContext must be used within a SubscriptionProvider');
  }
  return context;
}

/**
 * Safe version that returns defaults if context is not available
 * This prevents crashes when used outside the provider
 */
export function useSubscriptionSafe(): SubscriptionContextType | null {
  const context = useContext(SubscriptionContext);
  return context ?? null;
}

/**
 * Hook to check and gate AI features
 * Returns a function that either executes the operation or shows upgrade prompt
 */
export function useAIFeatureGate() {
  const { canUseAI, hasEnoughTokens, consumeTokens, totalTokens } = useSubscriptionContext();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [pendingFeature, setPendingFeature] = useState<AIFeatureType | null>(null);
  const executeWithTokens = useCallback(
    async <T,>(
      featureType: AIFeatureType,
      operation: () => Promise<T>,
      options: { description?: string } = {}
    ): Promise<{ success: boolean; result?: T; error?: string }> => {
      // Check if user has AI access
      if (!canUseAI) {
        setPendingFeature(featureType);
        setShowUpgradeModal(true);
        return { success: false, error: 'Premium required' };
      }
      // Check token availability
      const hasTokens = await hasEnoughTokens(featureType);
      if (!hasTokens) {
        setPendingFeature(featureType);
        setShowTokenModal(true);
        return { success: false, error: 'Insufficient tokens' };
      }
      // Consume tokens
      const consumption = await consumeTokens(featureType, options.description);
      if (!consumption.success) {
        return { success: false, error: consumption.error };
      }
      // Execute operation
      try {
        const result = await operation();
        return { success: true, result };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Operation failed',
        };
      }
    },
    [canUseAI, hasEnoughTokens, consumeTokens]
  );
  return {
    executeWithTokens,
    showUpgradeModal,
    showTokenModal,
    pendingFeature,
    closeUpgradeModal: () => setShowUpgradeModal(false),
    closeTokenModal: () => setShowTokenModal(false),
    canUseAI,
    totalTokens,
  };
}

