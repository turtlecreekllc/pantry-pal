import {
  getTokenCost,
  estimateMealPlanTokens,
  getFeatureDisplayName,
  formatTokenAmount,
  getTransactionTypeDisplay,
  getTokenBalance,
  hasEnoughTokens,
  consumeTokens,
  getTokenUsageStats,
  getRecentTransactions,
  withTokenConsumption,
} from '../../lib/tokenService';
import { AIFeatureType, TOKEN_COSTS } from '../../lib/types';

// Get the Supabase mock
const { supabase } = require('../../lib/supabase');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('tokenService — pure functions', () => {
  describe('getTokenCost', () => {
    it('returns correct cost for quick_recipe_suggestion', () => {
      expect(getTokenCost('quick_recipe_suggestion')).toBe(TOKEN_COSTS.quick_recipe_suggestion);
    });

    it('returns correct cost for weekly_meal_plan', () => {
      expect(getTokenCost('weekly_meal_plan')).toBe(10);
    });

    it('returns correct cost for chat_query', () => {
      expect(getTokenCost('chat_query')).toBe(1);
    });

    it('returns correct cost for detailed_recipe_generation', () => {
      expect(getTokenCost('detailed_recipe_generation')).toBe(3);
    });
  });

  describe('estimateMealPlanTokens', () => {
    it('returns base cost (10) for 7 days', () => {
      expect(estimateMealPlanTokens(7)).toBe(10);
    });

    it('returns base cost for days <= 7', () => {
      expect(estimateMealPlanTokens(1)).toBe(10);
      expect(estimateMealPlanTokens(5)).toBe(10);
    });

    it('adds extra tokens for days beyond 7', () => {
      // 8 days: 10 + 1*1.5 = 12 (ceil)
      expect(estimateMealPlanTokens(8)).toBe(12);
    });

    it('scales for 14 days', () => {
      // 14 days: 10 + 7*1.5 = 20.5 → ceil = 21
      expect(estimateMealPlanTokens(14)).toBe(21);
    });
  });

  describe('getFeatureDisplayName', () => {
    it('returns display name for quick_recipe_suggestion', () => {
      expect(getFeatureDisplayName('quick_recipe_suggestion')).toBe('Quick Recipe Suggestion');
    });

    it('returns display name for weekly_meal_plan', () => {
      expect(getFeatureDisplayName('weekly_meal_plan')).toBe('Weekly Meal Plan');
    });

    it('returns display name for chat_query', () => {
      expect(getFeatureDisplayName('chat_query')).toBe('AI Chat');
    });

    it('returns display name for smart_grocery_list', () => {
      expect(getFeatureDisplayName('smart_grocery_list')).toBe('Smart Grocery List');
    });

    it('falls back to the featureType key for unknown types', () => {
      expect(getFeatureDisplayName('unknown_feature' as AIFeatureType)).toBe('unknown_feature');
    });
  });

  describe('formatTokenAmount', () => {
    it('formats positive amounts with + prefix', () => {
      expect(formatTokenAmount(50)).toBe('+50');
      expect(formatTokenAmount(0)).toBe('+0');
    });

    it('formats negative amounts without + prefix', () => {
      expect(formatTokenAmount(-10)).toBe('-10');
    });
  });

  describe('getTransactionTypeDisplay', () => {
    it('returns display for usage', () => {
      expect(getTransactionTypeDisplay('usage')).toBe('Used');
    });

    it('returns display for subscription_grant', () => {
      expect(getTransactionTypeDisplay('subscription_grant')).toBe('Monthly Tokens');
    });

    it('returns display for purchase', () => {
      expect(getTransactionTypeDisplay('purchase')).toBe('Purchased');
    });

    it('returns display for rollover', () => {
      expect(getTransactionTypeDisplay('rollover')).toBe('Rolled Over');
    });

    it('falls back to raw type for unknown', () => {
      expect(getTransactionTypeDisplay('custom_type')).toBe('custom_type');
    });
  });
});

describe('tokenService — Supabase-backed functions', () => {
  describe('getTokenBalance', () => {
    it('returns correct balance from DB', async () => {
      const mockBalance = {
        subscription_tokens: 80,
        purchased_tokens: 20,
        rollover_tokens: 10,
        tokens_used_this_period: 40,
      };
      supabase.from.mockImplementationOnce(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() =>
              Promise.resolve({ data: mockBalance, error: null })
            ),
          })),
        })),
      }));
      const result = await getTokenBalance('user-1');
      expect(result.total).toBe(110); // 80+20+10
      expect(result.subscription).toBe(80);
      expect(result.purchased).toBe(20);
      expect(result.rollover).toBe(10);
      expect(result.usedThisPeriod).toBe(40);
    });

    it('returns zero balance on error', async () => {
      supabase.from.mockImplementationOnce(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() =>
              Promise.resolve({ data: null, error: { message: 'not found' } })
            ),
          })),
        })),
      }));
      const result = await getTokenBalance('user-1');
      expect(result.total).toBe(0);
      expect(result.subscription).toBe(0);
    });
  });

  describe('hasEnoughTokens', () => {
    it('returns true when balance exceeds cost', async () => {
      supabase.rpc.mockResolvedValueOnce({ data: 50, error: null });
      const result = await hasEnoughTokens('user-1', 'chat_query'); // cost = 1
      expect(result).toBe(true);
    });

    it('returns false when balance is below cost', async () => {
      supabase.rpc.mockResolvedValueOnce({ data: 0, error: null });
      const result = await hasEnoughTokens('user-1', 'weekly_meal_plan'); // cost = 10
      expect(result).toBe(false);
    });

    it('returns false on RPC error', async () => {
      supabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'rpc error' } });
      const result = await hasEnoughTokens('user-1', 'chat_query');
      expect(result).toBe(false);
    });
  });

  describe('consumeTokens', () => {
    it('returns success result from RPC', async () => {
      const mockResult = { success: true, balance_after: 49 };
      supabase.rpc.mockResolvedValueOnce({ data: mockResult, error: null });
      const result = await consumeTokens('user-1', 'chat_query');
      expect(result.success).toBe(true);
    });

    it('returns failure on RPC error', async () => {
      supabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'insufficient tokens' } });
      const result = await consumeTokens('user-1', 'weekly_meal_plan');
      expect(result.success).toBe(false);
      expect(result.error).toBe('insufficient tokens');
    });
  });

  describe('getTokenUsageStats', () => {
    it('aggregates usage by feature and date', async () => {
      const mockTransactions = [
        { amount: -1, feature_type: 'chat_query', created_at: '2026-04-18T10:00:00Z' },
        { amount: -3, feature_type: 'detailed_recipe_generation', created_at: '2026-04-18T11:00:00Z' },
        { amount: -1, feature_type: 'chat_query', created_at: '2026-04-19T09:00:00Z' },
      ];
      supabase.from.mockImplementationOnce(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              gte: jest.fn(() => ({
                order: jest.fn(() => Promise.resolve({ data: mockTransactions, error: null })),
              })),
            })),
          })),
        })),
      }));
      const result = await getTokenUsageStats('user-1', 30);
      expect(result.totalUsed).toBe(5); // 1+3+1
      expect(result.byFeature['chat_query']).toBe(2);
      expect(result.byFeature['detailed_recipe_generation']).toBe(3);
    });

    it('returns empty stats on error', async () => {
      supabase.from.mockImplementationOnce(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              gte: jest.fn(() => ({
                order: jest.fn(() => Promise.resolve({ data: null, error: { message: 'error' } })),
              })),
            })),
          })),
        })),
      }));
      const result = await getTokenUsageStats('user-1');
      expect(result.totalUsed).toBe(0);
      expect(result.dailyUsage).toEqual([]);
    });
  });

  describe('getRecentTransactions', () => {
    it('returns transactions from DB', async () => {
      const mockTx = [{ id: 'tx-1', amount: -1, feature_type: 'chat_query' }];
      supabase.from.mockImplementationOnce(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => Promise.resolve({ data: mockTx, error: null })),
            })),
          })),
        })),
      }));
      const result = await getRecentTransactions('user-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('tx-1');
    });

    it('returns empty array on error', async () => {
      supabase.from.mockImplementationOnce(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => Promise.resolve({ data: null, error: { message: 'error' } })),
            })),
          })),
        })),
      }));
      const result = await getRecentTransactions('user-1');
      expect(result).toEqual([]);
    });
  });

  describe('withTokenConsumption', () => {
    it('executes operation when tokens are sufficient', async () => {
      supabase.rpc
        .mockResolvedValueOnce({ data: 50, error: null }) // hasEnoughTokens
        .mockResolvedValueOnce({ data: { success: true, balance_after: 49 }, error: null }); // consumeTokens

      const operation = jest.fn().mockResolvedValue('recipe result');
      const result = await withTokenConsumption('user-1', 'chat_query', operation);

      expect(result.success).toBe(true);
      expect(result.result).toBe('recipe result');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('skips operation when tokens are insufficient', async () => {
      supabase.rpc.mockResolvedValueOnce({ data: 0, error: null }); // hasEnoughTokens

      const operation = jest.fn();
      const onInsufficientTokens = jest.fn();
      const result = await withTokenConsumption('user-1', 'weekly_meal_plan', operation, {
        onInsufficientTokens,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient tokens');
      expect(operation).not.toHaveBeenCalled();
      expect(onInsufficientTokens).toHaveBeenCalledTimes(1);
    });

    it('handles operation failure gracefully', async () => {
      supabase.rpc
        .mockResolvedValueOnce({ data: 50, error: null })
        .mockResolvedValueOnce({ data: { success: true, balance_after: 47 }, error: null });

      const operation = jest.fn().mockRejectedValue(new Error('API timeout'));
      const result = await withTokenConsumption('user-1', 'detailed_recipe_generation', operation);

      expect(result.success).toBe(false);
      expect(result.error).toBe('API timeout');
    });

    it('returns failure when token consumption fails', async () => {
      supabase.rpc
        .mockResolvedValueOnce({ data: 50, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

      const operation = jest.fn();
      const result = await withTokenConsumption('user-1', 'chat_query', operation);

      expect(result.success).toBe(false);
      expect(operation).not.toHaveBeenCalled();
    });
  });
});
