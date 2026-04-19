/**
 * Nudge Service
 * Coordinates behavioral nudges and notifications for subscription conversion
 * Implements the DinnerPlans Behavioral Nudge Requirements PRD
 */

import { SchedulableTriggerInputTypes } from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import * as notificationService from './notificationService';
import { SubscriptionState, AIFeatureType } from './types';

// Storage keys for tracking nudge state
const STORAGE_KEYS = {
  LAST_NUDGE_DATE: '@nudge_last_shown',
  NUDGE_SHOWN_COUNT: '@nudge_shown_count',
  FIRST_VALUE_SEEN: '@nudge_first_value_seen',
  FEATURE_ATTRIBUTION_COUNT: '@nudge_feature_attribution_count',
  LAST_TOKEN_WARNING: '@nudge_last_token_warning',
  ANNUAL_UPSELL_SHOWN: '@nudge_annual_upsell_shown',
  POWER_USER_DISMISSED: '@nudge_power_user_dismissed',
  MILESTONE_CELEBRATIONS: '@nudge_milestones',
} as const;

// Nudge frequency caps from PRD
const FREQUENCY_CAPS = {
  IN_APP_MODALS_PER_DAY: 1,
  FEATURE_ATTRIBUTION_PER_SESSION: 2,
  PUSH_NOTIFICATIONS_PER_WEEK: 3,
  PROMOTIONAL_EMAILS_PER_MONTH: 1,
} as const;

interface NudgeState {
  lastNudgeDate: string | null;
  nudgeShownToday: number;
  firstValueSeen: boolean;
  featureAttributionCount: number;
  lastTokenWarningLevel: string | null;
  annualUpsellLastShown: string | null;
  powerUserDismissed: boolean;
  celebratedMilestones: string[];
}

export interface TrialProgress {
  pantryItems: number;
  savedRecipes: number;
  mealPlansGenerated: number;
  estimatedSavings: number;
  daysInTrial: number;
}

/**
 * Get current nudge state from storage
 */
export async function getNudgeState(): Promise<NudgeState> {
  try {
    const [
      lastNudgeDate,
      nudgeShownCount,
      firstValueSeen,
      featureAttributionCount,
      lastTokenWarning,
      annualUpsellShown,
      powerUserDismissed,
      milestones,
    ] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.LAST_NUDGE_DATE),
      AsyncStorage.getItem(STORAGE_KEYS.NUDGE_SHOWN_COUNT),
      AsyncStorage.getItem(STORAGE_KEYS.FIRST_VALUE_SEEN),
      AsyncStorage.getItem(STORAGE_KEYS.FEATURE_ATTRIBUTION_COUNT),
      AsyncStorage.getItem(STORAGE_KEYS.LAST_TOKEN_WARNING),
      AsyncStorage.getItem(STORAGE_KEYS.ANNUAL_UPSELL_SHOWN),
      AsyncStorage.getItem(STORAGE_KEYS.POWER_USER_DISMISSED),
      AsyncStorage.getItem(STORAGE_KEYS.MILESTONE_CELEBRATIONS),
    ]);
    return {
      lastNudgeDate,
      nudgeShownToday: nudgeShownCount ? parseInt(nudgeShownCount, 10) : 0,
      firstValueSeen: firstValueSeen === 'true',
      featureAttributionCount: featureAttributionCount ? parseInt(featureAttributionCount, 10) : 0,
      lastTokenWarningLevel: lastTokenWarning,
      annualUpsellLastShown: annualUpsellShown,
      powerUserDismissed: powerUserDismissed === 'true',
      celebratedMilestones: milestones ? JSON.parse(milestones) : [],
    };
  } catch (error) {
    console.error('Error getting nudge state:', error);
    return {
      lastNudgeDate: null,
      nudgeShownToday: 0,
      firstValueSeen: false,
      featureAttributionCount: 0,
      lastTokenWarningLevel: null,
      annualUpsellLastShown: null,
      powerUserDismissed: false,
      celebratedMilestones: [],
    };
  }
}

/**
 * Reset daily nudge count if new day
 */
async function resetDailyCountIfNeeded(state: NudgeState): Promise<NudgeState> {
  const today = new Date().toDateString();
  if (state.lastNudgeDate !== today) {
    await AsyncStorage.setItem(STORAGE_KEYS.NUDGE_SHOWN_COUNT, '0');
    return { ...state, nudgeShownToday: 0, lastNudgeDate: today };
  }
  return state;
}

/**
 * Check if we can show an in-app modal today
 */
export async function canShowModal(): Promise<boolean> {
  const state = await getNudgeState();
  const updatedState = await resetDailyCountIfNeeded(state);
  return updatedState.nudgeShownToday < FREQUENCY_CAPS.IN_APP_MODALS_PER_DAY;
}

/**
 * Record that a modal was shown
 */
export async function recordModalShown(): Promise<void> {
  const state = await getNudgeState();
  const today = new Date().toDateString();
  await AsyncStorage.setItem(STORAGE_KEYS.LAST_NUDGE_DATE, today);
  await AsyncStorage.setItem(
    STORAGE_KEYS.NUDGE_SHOWN_COUNT,
    String(state.nudgeShownToday + 1)
  );
}

/**
 * Check if feature attribution can be shown this session
 */
export async function canShowFeatureAttribution(): Promise<boolean> {
  const state = await getNudgeState();
  return state.featureAttributionCount < FREQUENCY_CAPS.FEATURE_ATTRIBUTION_PER_SESSION;
}

/**
 * Record feature attribution shown
 */
export async function recordFeatureAttributionShown(): Promise<void> {
  const state = await getNudgeState();
  await AsyncStorage.setItem(
    STORAGE_KEYS.FEATURE_ATTRIBUTION_COUNT,
    String(state.featureAttributionCount + 1)
  );
}

/**
 * Reset feature attribution count (call on app start/resume)
 */
export async function resetFeatureAttributionCount(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.FEATURE_ATTRIBUTION_COUNT, '0');
}

/**
 * Mark first value moment as seen
 */
export async function markFirstValueSeen(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.FIRST_VALUE_SEEN, 'true');
}

/**
 * Get trial progress for user
 */
export async function getTrialProgress(userId: string): Promise<TrialProgress> {
  try {
    const [pantryResult, recipesResult, savingsResult, subscriptionResult] = await Promise.all([
      supabase.from('pantry_items').select('id', { count: 'exact' }).eq('user_id', userId),
      supabase.from('saved_recipes').select('id', { count: 'exact' }).eq('user_id', userId),
      supabase.from('savings_tracking').select('*').eq('user_id', userId),
      supabase.from('subscriptions').select('trial_start').eq('user_id', userId).single(),
    ]);
    const pantryItems = pantryResult.count || 0;
    const savedRecipes = recipesResult.count || 0;
    // Calculate estimated savings from savings tracking
    const savings = savingsResult.data || [];
    const estimatedSavings = savings.reduce(
      (sum, s) => sum + (s.estimated_savings_cents || 0),
      0
    ) / 100;
    // Get meal plans generated count from token transactions
    const { count: mealPlansCount } = await supabase
      .from('token_transactions')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('feature_type', 'weekly_meal_plan');
    // Calculate days in trial
    let daysInTrial = 0;
    if (subscriptionResult.data?.trial_start) {
      const trialStart = new Date(subscriptionResult.data.trial_start);
      const now = new Date();
      daysInTrial = Math.ceil((now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24));
    }
    return {
      pantryItems,
      savedRecipes,
      mealPlansGenerated: mealPlansCount || 0,
      estimatedSavings,
      daysInTrial,
    };
  } catch (error) {
    console.error('Error getting trial progress:', error);
    return {
      pantryItems: 0,
      savedRecipes: 0,
      mealPlansGenerated: 0,
      estimatedSavings: 0,
      daysInTrial: 0,
    };
  }
}

/**
 * Check and celebrate milestones
 */
export async function checkMilestones(
  userId: string,
  progress: TrialProgress
): Promise<string | null> {
  const state = await getNudgeState();
  const celebrated = state.celebratedMilestones;
  // Define milestones
  const milestones = [
    { key: 'pantry_10', check: () => progress.pantryItems >= 10 && !celebrated.includes('pantry_10') },
    { key: 'recipes_5', check: () => progress.savedRecipes >= 5 && !celebrated.includes('recipes_5') },
    { key: 'first_ai_plan', check: () => progress.mealPlansGenerated >= 1 && !celebrated.includes('first_ai_plan') },
    { key: 'savings_milestone', check: () => progress.estimatedSavings >= 8 && !celebrated.includes('savings_milestone') },
  ];
  for (const milestone of milestones) {
    if (milestone.check()) {
      // Mark milestone as celebrated
      celebrated.push(milestone.key);
      await AsyncStorage.setItem(
        STORAGE_KEYS.MILESTONE_CELEBRATIONS,
        JSON.stringify(celebrated)
      );
      return milestone.key;
    }
  }
  return null;
}

/**
 * Get token warning level based on balance
 */
export function getTokenWarningLevel(
  tokensRemaining: number,
  usagePercent: number
): 'none' | '50' | '30' | '10' | 'depleted' {
  if (tokensRemaining === 0) return 'depleted';
  if (tokensRemaining <= 10) return '10';
  if (usagePercent >= 70) return '30';
  if (usagePercent >= 50) return '50';
  return 'none';
}

/**
 * Check if token warning should be shown (escalating only)
 */
export async function shouldShowTokenWarning(
  currentLevel: 'none' | '50' | '30' | '10' | 'depleted'
): Promise<boolean> {
  if (currentLevel === 'none') return false;
  const state = await getNudgeState();
  const levelOrder = { 'none': 0, '50': 1, '30': 2, '10': 3, 'depleted': 4 };
  const lastLevel = state.lastTokenWarningLevel as keyof typeof levelOrder || 'none';
  // Only show if escalating to higher urgency
  return levelOrder[currentLevel] > levelOrder[lastLevel];
}

/**
 * Record token warning shown
 */
export async function recordTokenWarningShown(
  level: '50' | '30' | '10' | 'depleted'
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.LAST_TOKEN_WARNING, level);
}

/**
 * Reset token warning tracking (at billing cycle reset)
 */
export async function resetTokenWarningTracking(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.LAST_TOKEN_WARNING);
}

/**
 * Check if annual upsell should be shown
 */
export async function shouldShowAnnualUpsell(
  monthsSubscribed: number,
  tier: string
): Promise<boolean> {
  if (tier !== 'premium_monthly') return false;
  if (monthsSubscribed < 2) return false;
  const state = await getNudgeState();
  if (state.annualUpsellLastShown) {
    const lastShown = new Date(state.annualUpsellLastShown);
    const now = new Date();
    const monthsDiff = (now.getFullYear() - lastShown.getFullYear()) * 12 +
                       (now.getMonth() - lastShown.getMonth());
    if (monthsDiff < 1) return false;
  }
  return true;
}

/**
 * Record annual upsell shown
 */
export async function recordAnnualUpsellShown(): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEYS.ANNUAL_UPSELL_SHOWN,
    new Date().toISOString()
  );
}

/**
 * Check if power user banner should be shown
 */
export async function shouldShowPowerUserBanner(
  userId: string
): Promise<{ show: boolean; monthsAtHighUsage: number }> {
  const state = await getNudgeState();
  if (state.powerUserDismissed) {
    return { show: false, monthsAtHighUsage: 0 };
  }
  // Check last 3 months of usage
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const { data: usageData } = await supabase
    .from('token_balances')
    .select('tokens_used_this_period, last_reset_at')
    .eq('user_id', userId)
    .gte('last_reset_at', threeMonthsAgo.toISOString());
  if (!usageData || usageData.length === 0) {
    return { show: false, monthsAtHighUsage: 0 };
  }
  // Count months with 80%+ usage
  const monthsAtHighUsage = usageData.filter(
    (d) => d.tokens_used_this_period >= 80
  ).length;
  return {
    show: monthsAtHighUsage >= 2,
    monthsAtHighUsage,
  };
}

/**
 * Dismiss power user banner
 */
export async function dismissPowerUserBanner(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.POWER_USER_DISMISSED, 'true');
}

// ============================================
// PUSH NOTIFICATION SCHEDULING
// ============================================

/**
 * Schedule trial reminder notifications
 * Based on PRD timing: Day 1, 7, 11, 14
 */
export async function scheduleTrialNotifications(
  trialEndDate: Date
): Promise<void> {
  const now = new Date();
  const daysUntilEnd = Math.ceil(
    (trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  // Day 1 evening (if no pantry activity)
  if (daysUntilEnd >= 13) {
    const day1 = new Date(trialEndDate);
    day1.setDate(day1.getDate() - 13);
    day1.setHours(19, 0, 0, 0);
    if (day1 > now) {
      await notificationService.scheduleLocalNotification({
        title: 'Your pantry is waiting 🥫',
        body: 'Add a few items to get started with meal planning',
        data: { type: 'trial_reminder', day: 1 },
        trigger: { type: SchedulableTriggerInputTypes.DATE, date: day1 },
      });
    }
  }
  // Day 7 halfway
  if (daysUntilEnd >= 7) {
    const day7 = new Date(trialEndDate);
    day7.setDate(day7.getDate() - 7);
    day7.setHours(14, 0, 0, 0);
    if (day7 > now) {
      await notificationService.scheduleLocalNotification({
        title: 'Halfway through your trial! 🎉',
        body: 'See what you\'ve saved so far →',
        data: { type: 'trial_reminder', day: 7 },
        trigger: { type: SchedulableTriggerInputTypes.DATE, date: day7 },
      });
    }
  }
  // Day 11 (3 days left)
  if (daysUntilEnd >= 3) {
    const day11 = new Date(trialEndDate);
    day11.setDate(day11.getDate() - 3);
    day11.setHours(10, 0, 0, 0);
    if (day11 > now) {
      await notificationService.scheduleLocalNotification({
        title: '3 days left on your trial',
        body: 'Here\'s what you\'d lose →',
        data: { type: 'trial_reminder', day: 11 },
        trigger: { type: SchedulableTriggerInputTypes.DATE, date: day11 },
      });
    }
  }
  // Day 14 final day
  const finalDay = new Date(trialEndDate);
  finalDay.setHours(10, 0, 0, 0);
  if (finalDay > now) {
    await notificationService.scheduleLocalNotification({
      title: 'Last day of Premium',
      body: 'Subscribe to keep everything →',
      data: { type: 'trial_reminder', day: 14 },
      trigger: { type: SchedulableTriggerInputTypes.DATE, date: finalDay },
    });
  }
}

/**
 * Schedule token low notification
 */
export async function scheduleTokenLowNotification(
  tokensRemaining: number
): Promise<void> {
  await notificationService.scheduleLocalNotification({
    title: 'Running low on AI tokens',
    body: `You're down to ${tokensRemaining} tokens. Need more? →`,
    data: { type: 'token_low', tokens: tokensRemaining },
  });
}

/**
 * Cancel all trial reminder notifications
 */
export async function cancelTrialNotifications(): Promise<void> {
  await notificationService.cancelAllNotifications();
}

/**
 * Get nudge type for current trial day
 */
export function getNudgeTypeForDay(
  daysInTrial: number,
  firstValueSeen: boolean
): 'first_value' | 'halfway' | 'soft_urgency' | 'strong_urgency' | 'final_push' | null {
  if (daysInTrial <= 3 && !firstValueSeen) return 'first_value';
  if (daysInTrial === 7) return 'halfway';
  if (daysInTrial === 10) return 'soft_urgency';
  if (daysInTrial === 12 || daysInTrial === 13) return 'strong_urgency';
  if (daysInTrial === 14) return 'final_push';
  return null;
}

/**
 * Clear all nudge state (for testing/reset)
 */
export async function clearAllNudgeState(): Promise<void> {
  await Promise.all(
    Object.values(STORAGE_KEYS).map((key) => AsyncStorage.removeItem(key))
  );
}

