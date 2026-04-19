/**
 * Nudge Manager Hook
 * Coordinates all behavioral nudges in the app
 * Implements the DinnerPlans Behavioral Nudge Requirements PRD
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useSubscription } from './useSubscription';
import * as nudgeService from '../lib/nudgeService';

interface NudgeManagerState {
  // Trial nudges
  showTrialNudgeModal: boolean;
  trialNudgeType: 'first_value' | 'halfway' | 'soft_urgency' | 'strong_urgency' | 'final_push' | null;
  trialProgress: nudgeService.TrialProgress | null;
  // Token warnings
  showTokenWarning: boolean;
  tokenWarningLevel: 'none' | '50' | '30' | '10' | 'depleted';
  // Annual upsell
  showAnnualUpsell: boolean;
  monthsSubscribed: number;
  totalPaidCents: number;
  // Power user
  showPowerUserBanner: boolean;
  powerUserMonths: number;
  // Feature attribution
  canShowFeatureAttribution: boolean;
  // Milestone
  currentMilestone: string | null;
}

interface NudgeManagerActions {
  dismissTrialNudge: () => void;
  dismissTokenWarning: () => void;
  dismissAnnualUpsell: () => void;
  dismissPowerUserBanner: () => void;
  dismissMilestone: () => void;
  recordFeatureAttributionShown: () => void;
  markFirstValueSeen: () => void;
  checkAndShowNudges: () => Promise<void>;
  refreshNudgeState: () => Promise<void>;
}

interface UseNudgeManagerReturn extends NudgeManagerState, NudgeManagerActions {
  isLoading: boolean;
}

/**
 * Hook to manage all behavioral nudges in the app
 */
export function useNudgeManager(): UseNudgeManagerReturn {
  const { state: subscriptionState, isPremium, isTrial, totalTokens, tokensUsed } = useSubscription();
  const [isLoading, setIsLoading] = useState(true);
  const [nudgeState, setNudgeState] = useState<NudgeManagerState>({
    showTrialNudgeModal: false,
    trialNudgeType: null,
    trialProgress: null,
    showTokenWarning: false,
    tokenWarningLevel: 'none',
    showAnnualUpsell: false,
    monthsSubscribed: 0,
    totalPaidCents: 0,
    showPowerUserBanner: false,
    powerUserMonths: 0,
    canShowFeatureAttribution: true,
    currentMilestone: null,
  });
  const appStateRef = useRef(AppState.currentState);
  const hasInitializedRef = useRef(false);

  /**
   * Check and trigger appropriate nudges based on user state
   */
  const checkAndShowNudges = useCallback(async () => {
    if (!subscriptionState?.subscription) return;
    const userId = subscriptionState.subscription.user_id;
    const tier = subscriptionState.subscription.tier;
    // Check if we can show any modal today
    const canShowModal = await nudgeService.canShowModal();
    // Trial nudges
    if (isTrial && canShowModal) {
      const progress = await nudgeService.getTrialProgress(userId);
      const nudgeState = await nudgeService.getNudgeState();
      const nudgeType = nudgeService.getNudgeTypeForDay(
        progress.daysInTrial,
        nudgeState.firstValueSeen
      );
      // Check for milestones
      const milestone = await nudgeService.checkMilestones(userId, progress);
      if (nudgeType) {
        setNudgeState((prev) => ({
          ...prev,
          showTrialNudgeModal: true,
          trialNudgeType: nudgeType,
          trialProgress: progress,
          currentMilestone: milestone,
        }));
        return; // Only show one modal at a time
      }
    }
    // Token warning for premium users
    if (isPremium && totalTokens > 0) {
      const usagePercent = (tokensUsed / totalTokens) * 100;
      const tokensRemaining = totalTokens - tokensUsed;
      const warningLevel = nudgeService.getTokenWarningLevel(tokensRemaining, usagePercent);
      const shouldShow = await nudgeService.shouldShowTokenWarning(warningLevel);
      if (shouldShow && canShowModal) {
        setNudgeState((prev) => ({
          ...prev,
          showTokenWarning: true,
          tokenWarningLevel: warningLevel,
        }));
        return;
      }
    }
    // Annual upsell for monthly subscribers
    if (tier === 'premium_monthly') {
      const startDate = new Date(subscriptionState.subscription.current_period_start || '');
      const now = new Date();
      const monthsSubscribed = Math.floor(
        (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      const shouldShowUpsell = await nudgeService.shouldShowAnnualUpsell(monthsSubscribed, tier);
      if (shouldShowUpsell && canShowModal) {
        // Calculate total paid (simplified - in real app, fetch from Stripe)
        const monthlyPrice = 499; // $4.99 in cents
        const totalPaid = monthsSubscribed * monthlyPrice;
        setNudgeState((prev) => ({
          ...prev,
          showAnnualUpsell: true,
          monthsSubscribed,
          totalPaidCents: totalPaid,
        }));
        return;
      }
    }
    // Power user banner (non-modal, can show alongside)
    if (isPremium) {
      const powerUserResult = await nudgeService.shouldShowPowerUserBanner(userId);
      if (powerUserResult.show) {
        setNudgeState((prev) => ({
          ...prev,
          showPowerUserBanner: true,
          powerUserMonths: powerUserResult.monthsAtHighUsage,
        }));
      }
    }
  }, [subscriptionState, isPremium, isTrial, totalTokens, tokensUsed]);

  /**
   * Refresh feature attribution availability
   */
  const refreshFeatureAttribution = useCallback(async () => {
    const canShow = await nudgeService.canShowFeatureAttribution();
    setNudgeState((prev) => ({ ...prev, canShowFeatureAttribution: canShow }));
  }, []);

  /**
   * Refresh all nudge state
   */
  const refreshNudgeState = useCallback(async () => {
    setIsLoading(true);
    await refreshFeatureAttribution();
    await checkAndShowNudges();
    setIsLoading(false);
  }, [checkAndShowNudges, refreshFeatureAttribution]);

  // Dismiss handlers
  const dismissTrialNudge = useCallback(async () => {
    await nudgeService.recordModalShown();
    setNudgeState((prev) => ({
      ...prev,
      showTrialNudgeModal: false,
      trialNudgeType: null,
    }));
  }, []);

  const dismissTokenWarning = useCallback(async () => {
    if (nudgeState.tokenWarningLevel !== 'none') {
      await nudgeService.recordTokenWarningShown(nudgeState.tokenWarningLevel as '50' | '30' | '10' | 'depleted');
    }
    await nudgeService.recordModalShown();
    setNudgeState((prev) => ({
      ...prev,
      showTokenWarning: false,
    }));
  }, [nudgeState.tokenWarningLevel]);

  const dismissAnnualUpsell = useCallback(async () => {
    await nudgeService.recordAnnualUpsellShown();
    await nudgeService.recordModalShown();
    setNudgeState((prev) => ({
      ...prev,
      showAnnualUpsell: false,
    }));
  }, []);

  const dismissPowerUserBanner = useCallback(async () => {
    await nudgeService.dismissPowerUserBanner();
    setNudgeState((prev) => ({
      ...prev,
      showPowerUserBanner: false,
    }));
  }, []);

  const dismissMilestone = useCallback(() => {
    setNudgeState((prev) => ({
      ...prev,
      currentMilestone: null,
    }));
  }, []);

  const recordFeatureAttributionShown = useCallback(async () => {
    await nudgeService.recordFeatureAttributionShown();
    await refreshFeatureAttribution();
  }, [refreshFeatureAttribution]);

  const markFirstValueSeen = useCallback(async () => {
    await nudgeService.markFirstValueSeen();
  }, []);

  // Initialize on mount
  useEffect(() => {
    if (!hasInitializedRef.current && subscriptionState?.subscription) {
      hasInitializedRef.current = true;
      refreshNudgeState();
    }
  }, [subscriptionState, refreshNudgeState]);

  // Reset feature attribution on app foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        nudgeService.resetFeatureAttributionCount();
        refreshFeatureAttribution();
      }
      appStateRef.current = nextAppState;
    });
    return () => {
      subscription.remove();
    };
  }, [refreshFeatureAttribution]);

  // Schedule trial notifications when trial starts
  useEffect(() => {
    if (isTrial && subscriptionState?.subscription?.trial_end) {
      const trialEnd = new Date(subscriptionState.subscription.trial_end);
      nudgeService.scheduleTrialNotifications(trialEnd);
    }
  }, [isTrial, subscriptionState?.subscription?.trial_end]);

  return {
    ...nudgeState,
    isLoading,
    dismissTrialNudge,
    dismissTokenWarning,
    dismissAnnualUpsell,
    dismissPowerUserBanner,
    dismissMilestone,
    recordFeatureAttributionShown,
    markFirstValueSeen,
    checkAndShowNudges,
    refreshNudgeState,
  };
}

