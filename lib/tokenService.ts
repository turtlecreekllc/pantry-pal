/**
 * Token Service
 * Handles AI token consumption and tracking for DinnerPlans.ai
 */

import { supabase } from './supabase';
import {
  AIFeatureType,
  TokenConsumptionResult,
  TokenTransaction,
  TOKEN_COSTS,
} from './types';

/**
 * Get the token cost for an AI feature
 */
export function getTokenCost(featureType: AIFeatureType): number {
  return TOKEN_COSTS[featureType];
}

/**
 * Check if user has enough tokens for a feature
 */
export async function hasEnoughTokens(
  userId: string,
  featureType: AIFeatureType
): Promise<boolean> {
  const cost = getTokenCost(featureType);
  const { data, error } = await supabase.rpc('get_available_tokens', {
    p_user_id: userId,
  });
  if (error) {
    console.error('Error checking tokens:', error);
    return false;
  }
  return (data as number) >= cost;
}

/**
 * Consume tokens for an AI feature
 * Returns result with success status and remaining balance
 */
export async function consumeTokens(
  userId: string,
  featureType: AIFeatureType,
  description?: string
): Promise<TokenConsumptionResult> {
  const cost = getTokenCost(featureType);
  const { data, error } = await supabase.rpc('consume_tokens', {
    p_user_id: userId,
    p_amount: cost,
    p_feature_type: featureType,
    p_description: description,
  });
  if (error) {
    console.error('Error consuming tokens:', error);
    return {
      success: false,
      error: error.message,
    };
  }
  return data as TokenConsumptionResult;
}

/**
 * Get current token balance
 */
export async function getTokenBalance(userId: string): Promise<{
  total: number;
  subscription: number;
  purchased: number;
  rollover: number;
  usedThisPeriod: number;
}> {
  const { data, error } = await supabase
    .from('token_balances')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error || !data) {
    return {
      total: 0,
      subscription: 0,
      purchased: 0,
      rollover: 0,
      usedThisPeriod: 0,
    };
  }
  return {
    total: data.subscription_tokens + data.purchased_tokens + data.rollover_tokens,
    subscription: data.subscription_tokens,
    purchased: data.purchased_tokens,
    rollover: data.rollover_tokens,
    usedThisPeriod: data.tokens_used_this_period,
  };
}

/**
 * Get token usage statistics for a period
 */
export async function getTokenUsageStats(
  userId: string,
  days: number = 30
): Promise<{
  totalUsed: number;
  byFeature: Record<AIFeatureType, number>;
  dailyUsage: { date: string; tokens: number }[];
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const { data, error } = await supabase
    .from('token_transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('transaction_type', 'usage')
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true });
  if (error || !data) {
    return {
      totalUsed: 0,
      byFeature: {} as Record<AIFeatureType, number>,
      dailyUsage: [],
    };
  }
  // Calculate total used
  const totalUsed = data.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  // Calculate by feature
  const byFeature = data.reduce((acc, t) => {
    if (t.feature_type) {
      acc[t.feature_type as AIFeatureType] = (acc[t.feature_type as AIFeatureType] || 0) + Math.abs(t.amount);
    }
    return acc;
  }, {} as Record<AIFeatureType, number>);
  // Calculate daily usage
  const dailyMap = new Map<string, number>();
  data.forEach(t => {
    const date = t.created_at.split('T')[0];
    dailyMap.set(date, (dailyMap.get(date) || 0) + Math.abs(t.amount));
  });
  const dailyUsage = Array.from(dailyMap.entries()).map(([date, tokens]) => ({
    date,
    tokens,
  }));
  return { totalUsed, byFeature, dailyUsage };
}

/**
 * Get recent token transactions
 */
export async function getRecentTransactions(
  userId: string,
  limit: number = 20
): Promise<TokenTransaction[]> {
  const { data, error } = await supabase
    .from('token_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
  return data || [];
}

/**
 * Estimate tokens needed for a weekly meal plan
 */
export function estimateMealPlanTokens(days: number): number {
  // Weekly meal plan costs 10 tokens base
  // Additional days beyond 7 cost 1.5 tokens each
  const baseTokens = TOKEN_COSTS.weekly_meal_plan;
  if (days <= 7) {
    return baseTokens;
  }
  const extraDays = days - 7;
  return Math.ceil(baseTokens + extraDays * 1.5);
}

/**
 * Get projected token depletion date based on current usage
 */
export async function getProjectedDepletionDate(
  userId: string
): Promise<Date | null> {
  const balance = await getTokenBalance(userId);
  const stats = await getTokenUsageStats(userId, 14);
  if (stats.totalUsed === 0 || balance.total === 0) {
    return null;
  }
  // Calculate average daily usage
  const avgDailyUsage = stats.totalUsed / 14;
  if (avgDailyUsage === 0) {
    return null;
  }
  // Calculate days until depletion
  const daysRemaining = Math.floor(balance.total / avgDailyUsage);
  const depletionDate = new Date();
  depletionDate.setDate(depletionDate.getDate() + daysRemaining);
  return depletionDate;
}

/**
 * Check if user should be warned about low tokens
 */
export async function shouldShowLowTokenWarning(
  userId: string
): Promise<{ show: boolean; percentage: number; tokensRemaining: number }> {
  const balance = await getTokenBalance(userId);
  // Get subscription to check monthly allocation
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('tier')
    .eq('user_id', userId)
    .single();
  const isPremium = subscription?.tier === 'premium_monthly' || 
                    subscription?.tier === 'premium_annual' ||
                    subscription?.tier === 'trial';
  if (!isPremium) {
    return { show: false, percentage: 0, tokensRemaining: balance.total };
  }
  // Monthly allocation is 100 tokens for premium
  const monthlyAllocation = 100;
  const usagePercent = (balance.usedThisPeriod / monthlyAllocation) * 100;
  // Show warning at 80% usage
  const show = usagePercent >= 80;
  return {
    show,
    percentage: Math.round(usagePercent),
    tokensRemaining: balance.subscription,
  };
}

/**
 * Get feature name for display
 */
export function getFeatureDisplayName(featureType: AIFeatureType): string {
  const names: Record<AIFeatureType, string> = {
    quick_recipe_suggestion: 'Quick Recipe Suggestion',
    detailed_recipe_generation: 'Recipe Generation',
    weekly_meal_plan: 'Weekly Meal Plan',
    ingredient_substitution: 'Ingredient Substitution',
    nutritional_analysis: 'Nutritional Analysis',
    smart_grocery_list: 'Smart Grocery List',
    recipe_modification: 'Recipe Modification',
    use_it_up_plan: 'Use It Up Plan',
    chat_query: 'AI Chat',
  };
  return names[featureType] || featureType;
}

/**
 * Format token amount for display
 */
export function formatTokenAmount(amount: number): string {
  if (amount >= 0) {
    return `+${amount}`;
  }
  return amount.toString();
}

/**
 * Get transaction type display name
 */
export function getTransactionTypeDisplay(type: string): string {
  const types: Record<string, string> = {
    usage: 'Used',
    subscription_grant: 'Monthly Tokens',
    purchase: 'Purchased',
    rollover: 'Rolled Over',
    reset: 'Reset',
    refund: 'Refunded',
  };
  return types[type] || type;
}

/**
 * Wrapper for AI features that handles token consumption
 * Use this to wrap AI-powered functions
 */
export async function withTokenConsumption<T>(
  userId: string,
  featureType: AIFeatureType,
  operation: () => Promise<T>,
  options: {
    description?: string;
    onInsufficientTokens?: () => void;
  } = {}
): Promise<{ success: boolean; result?: T; error?: string; tokensRemaining?: number }> {
  // Check token availability
  const hasTokens = await hasEnoughTokens(userId, featureType);
  if (!hasTokens) {
    options.onInsufficientTokens?.();
    return {
      success: false,
      error: 'Insufficient tokens',
    };
  }
  // Consume tokens first
  const consumption = await consumeTokens(userId, featureType, options.description);
  if (!consumption.success) {
    return {
      success: false,
      error: consumption.error || 'Failed to consume tokens',
    };
  }
  // Execute the operation
  try {
    const result = await operation();
    return {
      success: true,
      result,
      tokensRemaining: consumption.balance_after,
    };
  } catch (error) {
    // TODO: Consider refunding tokens on failure
    console.error('Operation failed after token consumption:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Operation failed',
      tokensRemaining: consumption.balance_after,
    };
  }
}

