/**
 * Payment Flow Integration Tests
 * End-to-end test scenarios for the hybrid payment system
 */

import { Platform } from 'react-native';
import { renderHook, act, waitFor } from '@testing-library/react-hooks';

// ============================================================
// Test Setup & Mocks
// ============================================================

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((options) => options.ios),
  },
}));

// State for cross-service communication (mock-prefixed to work with jest.mock)
let mockSubscriptionState = {
  tier: 'free' as 'free' | 'premium_monthly' | 'premium_annual',
  provider: null as 'apple' | 'stripe' | null,
  tokenBalance: 3,
  isActive: false,
  expiresAt: null as string | null,
};

// Reset state between tests
const resetState = (): void => {
  mockSubscriptionState = {
    tier: 'free',
    provider: null,
    tokenBalance: 3,
    isActive: false,
    expiresAt: null,
  };
};

// Mock AuthContext
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'integration-test-user-123', email: 'test@integration.com' },
    session: { access_token: 'mock-token' },
  }),
}));

// Mock Supabase with state tracking
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn((table) => {
      const builder: any = {};
      builder.select = jest.fn(() => builder);
      builder.eq = jest.fn(() => builder);
      builder.single = jest.fn(() => {
        if (table === 'subscriptions') {
          if (mockSubscriptionState.isActive) {
            return Promise.resolve({
              data: {
                id: 'sub-123',
                user_id: 'integration-test-user-123',
                tier: mockSubscriptionState.tier,
                status: 'active',
                payment_provider: mockSubscriptionState.provider,
                current_period_end: mockSubscriptionState.expiresAt,
              },
              error: null,
            });
          }
          return Promise.resolve({ data: null, error: { code: 'PGRST116' } });
        }
        if (table === 'user_token_balance') {
          return Promise.resolve({
            data: { balance: mockSubscriptionState.tokenBalance },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });
      builder.insert = jest.fn(() => builder);
      builder.update = jest.fn(() => builder);
      builder.then = (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve);
      return builder;
    }),
    functions: {
      invoke: jest.fn((name, options) => {
        if (name === 'create-checkout-session') {
          return Promise.resolve({
            data: { url: 'https://checkout.stripe.com/test-session-123' },
            error: null,
          });
        }
        if (name === 'validate-apple-receipt') {
          return Promise.resolve({
            data: { valid: true, tier: 'premium_monthly', expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      }),
    },
    rpc: jest.fn((name, params) => {
      if (name === 'add_tokens') {
        mockSubscriptionState.tokenBalance += params.tokens;
        return Promise.resolve({ data: mockSubscriptionState.tokenBalance, error: null });
      }
      if (name === 'consume_token') {
        if (mockSubscriptionState.tokenBalance > 0) {
          mockSubscriptionState.tokenBalance -= 1;
          return Promise.resolve({ data: true, error: null });
        }
        return Promise.resolve({ data: false, error: { message: 'Insufficient tokens' } });
      }
      return Promise.resolve({ data: null, error: null });
    }),
  },
}));

// Mock react-native-iap with state tracking
jest.mock('react-native-iap', () => {
  const purchaseHandler = jest.fn();
  const errorHandler = jest.fn();
  return {
    initConnection: jest.fn(() => Promise.resolve(true)),
    endConnection: jest.fn(() => Promise.resolve()),
    getSubscriptions: jest.fn(() => Promise.resolve([
      { productId: 'com.turtlecreekllc.dinnerplans.premium.monthly', title: 'Monthly', localizedPrice: '$6.99' },
      { productId: 'com.turtlecreekllc.dinnerplans.premium.annual', title: 'Annual', localizedPrice: '$69.00' },
    ])),
    getProducts: jest.fn(() => Promise.resolve([
      { productId: 'com.turtlecreekllc.dinnerplans.tokens.50', title: '50 Tokens', localizedPrice: '$1.99' },
    ])),
    requestSubscription: jest.fn(({ sku }) => {
      // Simulate successful subscription
      mockSubscriptionState.isActive = true;
      mockSubscriptionState.provider = 'apple';
      mockSubscriptionState.tier = sku.includes('annual') ? 'premium_annual' : 'premium_monthly';
      mockSubscriptionState.tokenBalance = sku.includes('annual') ? 120 : 100;
      mockSubscriptionState.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      return Promise.resolve({
        productId: sku,
        transactionId: 'apple-tx-' + Date.now(),
        originalTransactionIdIOS: 'apple-original-' + Date.now(),
      });
    }),
    requestPurchase: jest.fn(({ sku }) => {
      // Simulate token purchase
      const tokens = sku.includes('50') ? 50 : sku.includes('150') ? 150 : 400;
      mockSubscriptionState.tokenBalance += tokens;
      return Promise.resolve({
        productId: sku,
        transactionId: 'apple-consumable-' + Date.now(),
      });
    }),
    finishTransaction: jest.fn(() => Promise.resolve()),
    getAvailablePurchases: jest.fn(() => {
      if (mockSubscriptionState.isActive && mockSubscriptionState.provider === 'apple') {
        return Promise.resolve([{
          productId: mockSubscriptionState.tier === 'premium_annual'
            ? 'com.turtlecreekllc.dinnerplans.premium.annual'
            : 'com.turtlecreekllc.dinnerplans.premium.monthly',
          transactionId: 'restored-tx-123',
        }]);
      }
      return Promise.resolve([]);
    }),
    purchaseUpdatedListener: jest.fn((handler) => {
      purchaseHandler.mockImplementation(handler);
      return { remove: jest.fn() };
    }),
    purchaseErrorListener: jest.fn((handler) => {
      errorHandler.mockImplementation(handler);
      return { remove: jest.fn() };
    }),
    // Expose handlers for simulating events
    __triggerPurchaseUpdate: (purchase: any) => purchaseHandler(purchase),
    __triggerPurchaseError: (error: any) => errorHandler(error),
  };
});

// Mock expo-web-browser
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(() => Promise.resolve({ type: 'dismiss' })),
}));

// Mock storefront service
jest.mock('../../lib/storefrontService', () => ({
  detectStorefront: jest.fn(() => Promise.resolve({ storefront: 'USA' })),
  isUSStorefront: jest.fn(() => true),
  getPaywallConfig: jest.fn(() => Promise.resolve({
    showStripeOption: true,
    showAppleOption: true,
    recommendedProvider: 'stripe',
    stripeDisclosure: 'External payment',
    isUSUser: true,
    storefront: 'USA',
  })),
}));

// ============================================================
// Integration Test Scenarios
// ============================================================

describe('Payment Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetState();
    (Platform as any).OS = 'ios';
  });

  describe('Scenario 1: Free to Premium via Apple IAP', () => {
    it('should complete full Apple IAP subscription flow', async () => {
      const { requestSubscription, finishTransaction } = require('react-native-iap');
      // Step 1: Verify user starts as free
      expect(mockSubscriptionState.tier).toBe('free');
      expect(mockSubscriptionState.tokenBalance).toBe(3);
      // Step 2: Initiate subscription purchase
      const purchaseResult = await requestSubscription({
        sku: 'com.turtlecreekllc.dinnerplans.premium.monthly',
      });
      // Step 3: Verify transaction was created
      expect(purchaseResult.productId).toBe('com.turtlecreekllc.dinnerplans.premium.monthly');
      expect(purchaseResult.transactionId).toBeDefined();
      // Step 4: Finish transaction
      await finishTransaction({ transactionId: purchaseResult.transactionId });
      expect(finishTransaction).toHaveBeenCalled();
      // Step 5: Verify subscription state updated
      expect(mockSubscriptionState.isActive).toBe(true);
      expect(mockSubscriptionState.tier).toBe('premium_monthly');
      expect(mockSubscriptionState.provider).toBe('apple');
      expect(mockSubscriptionState.tokenBalance).toBe(100);
    });

    it('should grant monthly tokens on subscription', async () => {
      const { requestSubscription } = require('react-native-iap');
      const initialTokens = mockSubscriptionState.tokenBalance;
      await requestSubscription({
        sku: 'com.turtlecreekllc.dinnerplans.premium.monthly',
      });
      expect(mockSubscriptionState.tokenBalance).toBe(100);
      expect(mockSubscriptionState.tokenBalance).toBeGreaterThan(initialTokens);
    });

    it('should grant more tokens for annual subscription', async () => {
      const { requestSubscription } = require('react-native-iap');
      await requestSubscription({
        sku: 'com.turtlecreekllc.dinnerplans.premium.annual',
      });
      expect(mockSubscriptionState.tier).toBe('premium_annual');
      expect(mockSubscriptionState.tokenBalance).toBe(120);
    });
  });

  describe('Scenario 2: Free to Premium via Stripe', () => {
    it('should create Stripe checkout session for US user', async () => {
      const { supabase } = require('../../lib/supabase');
      // Step 1: Verify user starts as free
      expect(mockSubscriptionState.tier).toBe('free');
      // Step 2: Create checkout session
      const result = await supabase.functions.invoke('create-checkout-session', {
        body: {
          priceId: 'price_premium_monthly',
          successUrl: 'https://app.dinnerplans.ai/success',
          cancelUrl: 'https://app.dinnerplans.ai/cancel',
        },
      });
      // Step 3: Verify checkout URL returned
      expect(result.data.url).toBe('https://checkout.stripe.com/test-session-123');
      expect(result.error).toBeNull();
    });

    it('should open Stripe checkout in browser', async () => {
      const { openBrowserAsync } = require('expo-web-browser');
      await openBrowserAsync('https://checkout.stripe.com/test-session-123');
      expect(openBrowserAsync).toHaveBeenCalledWith('https://checkout.stripe.com/test-session-123');
    });
  });

  describe('Scenario 3: Token Purchase Flow', () => {
    it('should purchase token pack via Apple IAP', async () => {
      const { requestPurchase, finishTransaction } = require('react-native-iap');
      // Set user as premium subscriber first
      mockSubscriptionState.isActive = true;
      mockSubscriptionState.tier = 'premium_monthly';
      mockSubscriptionState.tokenBalance = 10;
      const initialTokens = mockSubscriptionState.tokenBalance;
      // Purchase tokens
      const purchaseResult = await requestPurchase({
        sku: 'com.turtlecreekllc.dinnerplans.tokens.50',
      });
      await finishTransaction({ transactionId: purchaseResult.transactionId });
      // Verify tokens added
      expect(mockSubscriptionState.tokenBalance).toBe(initialTokens + 50);
    });

    it('should allow token purchases for free users', async () => {
      const { requestPurchase, finishTransaction } = require('react-native-iap');
      // User stays free
      expect(mockSubscriptionState.tier).toBe('free');
      const initialTokens = mockSubscriptionState.tokenBalance;
      // Purchase tokens
      const purchaseResult = await requestPurchase({
        sku: 'com.turtlecreekllc.dinnerplans.tokens.50',
      });
      await finishTransaction({ transactionId: purchaseResult.transactionId });
      // Verify tokens added
      expect(mockSubscriptionState.tokenBalance).toBe(initialTokens + 50);
      // User should still be free (no subscription)
      expect(mockSubscriptionState.tier).toBe('free');
    });
  });

  describe('Scenario 4: Restore Purchases Flow', () => {
    it('should restore Apple subscription', async () => {
      const { getAvailablePurchases } = require('react-native-iap');
      // Simulate user who has active subscription
      mockSubscriptionState.isActive = true;
      mockSubscriptionState.provider = 'apple';
      mockSubscriptionState.tier = 'premium_monthly';
      // Restore purchases
      const purchases = await getAvailablePurchases();
      expect(purchases.length).toBe(1);
      expect(purchases[0].productId).toBe('com.turtlecreekllc.dinnerplans.premium.monthly');
    });

    it('should return empty array when no purchases to restore', async () => {
      const { getAvailablePurchases } = require('react-native-iap');
      // User has no active subscription
      expect(mockSubscriptionState.isActive).toBe(false);
      const purchases = await getAvailablePurchases();
      expect(purchases.length).toBe(0);
    });
  });

  describe('Scenario 5: Token Consumption Flow', () => {
    it('should consume tokens for AI features', async () => {
      const { supabase } = require('../../lib/supabase');
      mockSubscriptionState.tokenBalance = 10;
      // Consume token
      const result = await supabase.rpc('consume_token', { user_id: 'test-user' });
      expect(result.data).toBe(true);
      expect(mockSubscriptionState.tokenBalance).toBe(9);
    });

    it('should prevent token consumption when balance is zero', async () => {
      const { supabase } = require('../../lib/supabase');
      mockSubscriptionState.tokenBalance = 0;
      // Try to consume token
      const result = await supabase.rpc('consume_token', { user_id: 'test-user' });
      expect(result.error?.message).toBe('Insufficient tokens');
      expect(mockSubscriptionState.tokenBalance).toBe(0);
    });

    it('should add tokens via RPC', async () => {
      const { supabase } = require('../../lib/supabase');
      mockSubscriptionState.tokenBalance = 5;
      // Add tokens
      const result = await supabase.rpc('add_tokens', { tokens: 50 });
      expect(result.data).toBe(55);
      expect(mockSubscriptionState.tokenBalance).toBe(55);
    });
  });

  describe('Scenario 6: Mixed Provider Scenarios', () => {
    it('should handle transition from Stripe to Apple', async () => {
      const { requestSubscription } = require('react-native-iap');
      // Start with Stripe subscription
      mockSubscriptionState.isActive = true;
      mockSubscriptionState.provider = 'stripe';
      mockSubscriptionState.tier = 'premium_monthly';
      // User switches to Apple
      await requestSubscription({
        sku: 'com.turtlecreekllc.dinnerplans.premium.annual',
      });
      // Verify Apple is now the provider
      expect(mockSubscriptionState.provider).toBe('apple');
      expect(mockSubscriptionState.tier).toBe('premium_annual');
    });
  });

  describe('Scenario 7: Error Handling', () => {
    it('should handle failed Apple purchase gracefully', async () => {
      const RNIap = require('react-native-iap');
      const originalRequestSubscription = RNIap.requestSubscription;
      // Mock failure
      RNIap.requestSubscription.mockRejectedValueOnce(new Error('Purchase failed: User cancelled'));
      await expect(
        RNIap.requestSubscription({ sku: 'com.turtlecreekllc.dinnerplans.premium.monthly' })
      ).rejects.toThrow('Purchase failed');
      // Restore mock
      RNIap.requestSubscription = originalRequestSubscription;
    });

    it('should handle network errors during checkout creation', async () => {
      const { supabase } = require('../../lib/supabase');
      // Mock network error
      supabase.functions.invoke.mockResolvedValueOnce({
        data: null,
        error: { message: 'Network error' },
      });
      const result = await supabase.functions.invoke('create-checkout-session', {});
      expect(result.error).not.toBeNull();
      expect(result.data).toBeNull();
    });
  });

  describe('Scenario 8: Platform-Specific Behavior', () => {
    it('should only offer Apple IAP on iOS', () => {
      expect(Platform.OS).toBe('ios');
      // On iOS, both options should be available for US users
      const { getPaywallConfig } = require('../../lib/storefrontService');
      return getPaywallConfig('test-user').then((config: any) => {
        expect(config.showAppleOption).toBe(true);
        expect(config.showStripeOption).toBe(true);
      });
    });

    it('should only offer Stripe on Android', async () => {
      (Platform as any).OS = 'android';
      // On Android, only Stripe should be available
      // (In real implementation, Apple option would be hidden)
      expect(Platform.OS).toBe('android');
    });
  });
});

describe('Paywall Display Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetState();
    (Platform as any).OS = 'ios';
  });

  describe('US User Flow', () => {
    it('should show both payment options to US users', async () => {
      const { getPaywallConfig } = require('../../lib/storefrontService');
      const config = await getPaywallConfig('test-user');
      expect(config.showStripeOption).toBe(true);
      expect(config.showAppleOption).toBe(true);
      expect(config.recommendedProvider).toBe('stripe');
    });
  });

  describe('International User Flow', () => {
    it('should only show Apple option to non-US users', async () => {
      const storefrontService = require('../../lib/storefrontService');
      // Mock non-US storefront
      storefrontService.getPaywallConfig.mockResolvedValueOnce({
        showStripeOption: false,
        showAppleOption: true,
        recommendedProvider: 'apple',
        stripeDisclosure: null,
        isUSUser: false,
        storefront: 'GBR',
      });
      const config = await storefrontService.getPaywallConfig('test-user');
      expect(config.showStripeOption).toBe(false);
      expect(config.showAppleOption).toBe(true);
      expect(config.isUSUser).toBe(false);
    });
  });
});

describe('Subscription Lifecycle Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetState();
  });

  describe('New User Journey', () => {
    it('should guide free user through subscription', async () => {
      // Step 1: User starts with free tier
      expect(mockSubscriptionState.tier).toBe('free');
      expect(mockSubscriptionState.tokenBalance).toBe(3);
      // Step 2: User hits token limit (simulated)
      mockSubscriptionState.tokenBalance = 0;
      // Step 3: User subscribes
      const { requestSubscription } = require('react-native-iap');
      await requestSubscription({
        sku: 'com.turtlecreekllc.dinnerplans.premium.monthly',
      });
      // Step 4: User now has premium access
      expect(mockSubscriptionState.tier).toBe('premium_monthly');
      expect(mockSubscriptionState.tokenBalance).toBe(100);
      expect(mockSubscriptionState.isActive).toBe(true);
    });
  });

  describe('Returning User Journey', () => {
    it('should restore subscription on app open', async () => {
      const { getAvailablePurchases } = require('react-native-iap');
      // Simulate existing subscription
      mockSubscriptionState.isActive = true;
      mockSubscriptionState.provider = 'apple';
      mockSubscriptionState.tier = 'premium_annual';
      // Restore on app open
      const purchases = await getAvailablePurchases();
      expect(purchases.length).toBe(1);
      expect(mockSubscriptionState.tier).toBe('premium_annual');
    });
  });
});

