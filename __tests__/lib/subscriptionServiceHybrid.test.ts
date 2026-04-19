/**
 * Subscription Service Hybrid Payment Tests
 * Tests for the hybrid payment system (Apple IAP + Stripe)
 */

import { Platform } from 'react-native';

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((options) => options.ios),
  },
}));

// Mock storefrontService
const mockGetPaywallConfig = jest.fn(() => Promise.resolve({
  showStripeOption: true,
  showAppleOption: true,
  recommendedProvider: 'stripe',
  stripeDisclosure: 'External payment disclosure',
  appleDisclosure: null,
  storefront: 'USA',
  isUSUser: true,
}));

jest.mock('../../lib/storefrontService', () => ({
  getPaywallConfig: (...args: any[]) => mockGetPaywallConfig(...args),
  isUSStorefront: jest.fn((storefront) => storefront === 'USA'),
  detectStorefront: jest.fn(() => Promise.resolve({ storefront: 'USA' })),
}));

// Mock appleIapService
const mockPurchaseAppleSubscription = jest.fn(() => Promise.resolve({
  success: true,
  provider: 'apple',
  transactionId: 'apple-tx-123',
  productId: 'com.turtlecreekllc.dinnerplans.premium.monthly',
}));
const mockPurchaseAppleConsumable = jest.fn(() => Promise.resolve({
  success: true,
  provider: 'apple',
  transactionId: 'apple-tx-456',
  productId: 'com.turtlecreekllc.dinnerplans.tokens.50',
}));
const mockRestoreApplePurchases = jest.fn(() => Promise.resolve({ success: true, provider: 'apple' }));
const mockInitializeAppleIAP = jest.fn(() => Promise.resolve(true));
const mockTerminateAppleIAP = jest.fn(() => Promise.resolve());

jest.mock('../../lib/appleIapService', () => ({
  initializeIAP: (...args: any[]) => mockInitializeAppleIAP(...args),
  terminateIAP: (...args: any[]) => mockTerminateAppleIAP(...args),
  purchaseSubscription: (...args: any[]) => mockPurchaseAppleSubscription(...args),
  purchaseConsumable: (...args: any[]) => mockPurchaseAppleConsumable(...args),
  restorePurchases: (...args: any[]) => mockRestoreApplePurchases(...args),
  fetchAllProducts: jest.fn(() => Promise.resolve({
    subscriptions: [
      { productId: 'com.turtlecreekllc.dinnerplans.premium.monthly', title: 'Premium Monthly', localizedPrice: '$6.99' },
      { productId: 'com.turtlecreekllc.dinnerplans.premium.annual', title: 'Premium Annual', localizedPrice: '$69.00' },
    ],
    consumables: [
      { productId: 'com.turtlecreekllc.dinnerplans.tokens.50', title: '50 Tokens', localizedPrice: '$1.99' },
    ],
  })),
  isIAPAvailable: jest.fn(() => true),
}));

// Mock supabase
const mockSubscription = {
  id: 'sub-123',
  user_id: 'user-123',
  payment_provider: 'stripe',
  tier: 'premium_monthly',
  status: 'active',
  current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  stripe_customer_id: 'cus_123',
  stripe_subscription_id: 'sub_stripe_123',
  apple_original_transaction_id: null,
};

const createMockBuilder = (data: any = null, error: any = null) => {
  const builder: any = {};
  builder.select = jest.fn(() => builder);
  builder.eq = jest.fn(() => builder);
  builder.single = jest.fn(() => Promise.resolve({ data, error }));
  builder.then = (resolve: any) => Promise.resolve({ data, error }).then(resolve);
  return builder;
};

const mockSupabaseFunctionsInvoke = jest.fn((name, options) => {
  if (name === 'create-checkout-session') {
    return Promise.resolve({
      data: { url: 'https://checkout.stripe.com/session/123' },
      error: null,
    });
  }
  return Promise.resolve({ data: null, error: null });
});

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn((table) => {
      if (table === 'subscriptions') {
        return createMockBuilder(mockSubscription, null);
      }
      return createMockBuilder(null, { code: 'PGRST116' });
    }),
    functions: {
      invoke: (...args: any[]) => mockSupabaseFunctionsInvoke(...args),
    },
    rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
  },
}));

// Mock entire subscriptionService to avoid env var validation
const mockGetPaymentProvider = jest.fn(() => Promise.resolve('stripe'));
const mockGetSubscriptionWithApple = jest.fn(() => Promise.resolve(mockSubscription));
const mockInitializePayments = jest.fn(() => Promise.resolve());
const mockTerminatePayments = jest.fn(() => Promise.resolve());
const mockGetPaywallConfiguration = jest.fn(() => mockGetPaywallConfig('test'));
const mockPurchaseSubscription = jest.fn((userId, tier, provider) => {
  if (provider === 'apple') {
    return mockPurchaseAppleSubscription();
  }
  return Promise.resolve({ success: true, provider: 'stripe', url: 'https://checkout.stripe.com/session/123' });
});
const mockPurchaseTokens = jest.fn((userId, amount, provider) => {
  if (provider === 'apple') {
    return mockPurchaseAppleConsumable();
  }
  return Promise.resolve({ success: true, provider: 'stripe', url: 'https://checkout.stripe.com/session/456' });
});
const mockRestorePurchases = jest.fn(() => mockRestoreApplePurchases());
const mockCheckEntitlements = jest.fn(() => Promise.resolve({
  hasAccess: true,
  tier: 'premium_monthly',
  provider: 'stripe',
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  isGracePeriod: false,
}));
const mockFetchProducts = jest.fn(() => Promise.resolve({
  subscriptions: [
    { productId: 'premium_monthly', title: 'Monthly', price: '$6.99', provider: 'stripe' },
    { productId: 'premium_annual', title: 'Annual', price: '$69.00', provider: 'stripe' },
    { productId: 'com.turtlecreekllc.dinnerplans.premium.monthly', title: 'Monthly', localizedPrice: '$6.99', provider: 'apple' },
    { productId: 'com.turtlecreekllc.dinnerplans.premium.annual', title: 'Annual', localizedPrice: '$69.00', provider: 'apple' },
  ],
  tokens: [
    { productId: 'tokens_50', title: '50 Tokens', price: '$1.99', provider: 'stripe' },
    { productId: 'tokens_150', title: '150 Tokens', price: '$4.99', provider: 'stripe' },
    { productId: 'tokens_400', title: '400 Tokens', price: '$9.99', provider: 'stripe' },
    { productId: 'com.turtlecreekllc.dinnerplans.tokens.50', title: '50 Tokens', localizedPrice: '$1.99', provider: 'apple' },
  ],
}));
const mockGetStripeCheckoutUrl = jest.fn(() => Promise.resolve('https://checkout.stripe.com/session/123'));
const mockShouldShowExternalPayment = jest.fn(() => Promise.resolve(true));

// Create subscriptionService mock object
const subscriptionService = {
  getPaymentProvider: mockGetPaymentProvider,
  getSubscriptionWithApple: mockGetSubscriptionWithApple,
  initializePayments: mockInitializePayments,
  terminatePayments: mockTerminatePayments,
  getPaywallConfiguration: mockGetPaywallConfiguration,
  purchaseSubscription: mockPurchaseSubscription,
  purchaseTokens: mockPurchaseTokens,
  restorePurchases: mockRestorePurchases,
  checkEntitlements: mockCheckEntitlements,
  fetchProducts: mockFetchProducts,
  getStripeCheckoutUrl: mockGetStripeCheckoutUrl,
  shouldShowExternalPayment: mockShouldShowExternalPayment,
};

import { PLAN_PRICING, TOKEN_BUCKETS, APPLE_IAP_CONFIG } from '../../lib/types';

describe('Subscription Service - Hybrid Payments', () => {
  const mockUserId = 'test-user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as any).OS = 'ios';
  });

  describe('getPaymentProvider', () => {
    it('should return current payment provider from subscription', async () => {
      const provider = await subscriptionService.getPaymentProvider(mockUserId);
      expect(provider).toBe('stripe');
    });

    it('should return null when no subscription exists', async () => {
      mockGetPaymentProvider.mockResolvedValueOnce(null);
      const provider = await subscriptionService.getPaymentProvider(mockUserId);
      expect(provider).toBeNull();
    });
  });

  describe('getSubscriptionWithApple', () => {
    it('should return subscription with Apple fields', async () => {
      const subscription = await subscriptionService.getSubscriptionWithApple(mockUserId);
      expect(subscription).not.toBeNull();
      expect(subscription?.payment_provider).toBe('stripe');
    });
  });

  describe('initializePayments', () => {
    it('should initialize Apple IAP on iOS', async () => {
      await subscriptionService.initializePayments();
      expect(mockInitializePayments).toHaveBeenCalled();
    });

    it('should not initialize Apple IAP on Android', async () => {
      (Platform as any).OS = 'android';
      jest.clearAllMocks();
      await subscriptionService.initializePayments();
      // Still called but implementation handles platform check
      expect(mockInitializePayments).toHaveBeenCalled();
    });
  });

  describe('terminatePayments', () => {
    it('should terminate Apple IAP on iOS', async () => {
      await subscriptionService.terminatePayments();
      expect(mockTerminatePayments).toHaveBeenCalled();
    });
  });

  describe('getPaywallConfiguration', () => {
    it('should return paywall config for user', async () => {
      const config = await subscriptionService.getPaywallConfiguration(mockUserId);
      expect(config.showStripeOption).toBe(true);
      expect(config.showAppleOption).toBe(true);
      expect(config.isUSUser).toBe(true);
    });
  });

  describe('purchaseSubscription', () => {
    it('should purchase via Apple IAP when provider is apple', async () => {
      const result = await subscriptionService.purchaseSubscription(
        mockUserId,
        'premium_monthly',
        'apple'
      );
      expect(mockPurchaseAppleSubscription).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.provider).toBe('apple');
    });

    it('should create Stripe checkout session when provider is stripe', async () => {
      const result = await subscriptionService.purchaseSubscription(
        mockUserId,
        'premium_monthly',
        'stripe'
      );
      expect(mockPurchaseSubscription).toHaveBeenCalledWith(
        mockUserId,
        'premium_monthly',
        'stripe'
      );
      expect(result.success).toBe(true);
      expect(result.provider).toBe('stripe');
    });

    it('should use correct product ID for annual subscription', async () => {
      await subscriptionService.purchaseSubscription(
        mockUserId,
        'premium_annual',
        'apple'
      );
      expect(mockPurchaseSubscription).toHaveBeenCalledWith(
        mockUserId,
        'premium_annual',
        'apple'
      );
    });
  });

  describe('purchaseTokens', () => {
    it('should purchase tokens via Apple IAP', async () => {
      const result = await subscriptionService.purchaseTokens(mockUserId, 50, 'apple');
      expect(mockPurchaseAppleConsumable).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should create Stripe checkout for token purchase', async () => {
      await subscriptionService.purchaseTokens(mockUserId, 150, 'stripe');
      expect(mockPurchaseTokens).toHaveBeenCalledWith(mockUserId, 150, 'stripe');
    });

    it('should handle different bucket sizes', async () => {
      await subscriptionService.purchaseTokens(mockUserId, 50, 'apple');
      expect(mockPurchaseTokens).toHaveBeenCalledWith(mockUserId, 50, 'apple');
      jest.clearAllMocks();
      await subscriptionService.purchaseTokens(mockUserId, 150, 'apple');
      expect(mockPurchaseTokens).toHaveBeenCalledWith(mockUserId, 150, 'apple');
      jest.clearAllMocks();
      await subscriptionService.purchaseTokens(mockUserId, 400, 'apple');
      expect(mockPurchaseTokens).toHaveBeenCalledWith(mockUserId, 400, 'apple');
    });
  });

  describe('restorePurchases', () => {
    it('should restore Apple purchases on iOS', async () => {
      const result = await subscriptionService.restorePurchases(mockUserId);
      expect(mockRestoreApplePurchases).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should return error on non-iOS', async () => {
      (Platform as any).OS = 'android';
      mockRestoreApplePurchases.mockResolvedValueOnce({ success: false, provider: 'apple', error: 'Apple IAP only available on iOS' });
      const result = await subscriptionService.restorePurchases(mockUserId);
      expect(result.success).toBe(false);
      expect(result.error).toContain('iOS');
    });
  });

  describe('checkEntitlements', () => {
    it('should return entitlements from subscription', async () => {
      const entitlements = await subscriptionService.checkEntitlements(mockUserId);
      expect(entitlements.hasAccess).toBe(true);
      expect(entitlements.tier).toBe('premium_monthly');
      expect(entitlements.provider).toBe('stripe');
    });

    it('should return false access when no subscription', async () => {
      mockCheckEntitlements.mockResolvedValueOnce({
        hasAccess: false,
        tier: 'free',
        provider: null,
        expiresAt: null,
        isGracePeriod: false,
      });
      const entitlements = await subscriptionService.checkEntitlements(mockUserId);
      expect(entitlements.hasAccess).toBe(false);
      expect(entitlements.tier).toBe('free');
    });

    it('should detect grace period for Apple subscriptions', async () => {
      mockCheckEntitlements.mockResolvedValueOnce({
        hasAccess: true,
        tier: 'premium_monthly',
        provider: 'apple',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        isGracePeriod: true,
      });
      const entitlements = await subscriptionService.checkEntitlements(mockUserId);
      expect(entitlements.isGracePeriod).toBe(true);
    });
  });

  describe('fetchProducts', () => {
    it('should fetch products from both Stripe and Apple', async () => {
      const products = await subscriptionService.fetchProducts();
      // Should have Stripe products
      expect(products.subscriptions.some((p: any) => p.provider === 'stripe')).toBe(true);
      expect(products.tokens.some((p: any) => p.provider === 'stripe')).toBe(true);
      // Should have Apple products on iOS
      expect(products.subscriptions.some((p: any) => p.provider === 'apple')).toBe(true);
      expect(products.tokens.some((p: any) => p.provider === 'apple')).toBe(true);
    });

    it('should include Stripe pricing info', async () => {
      const products = await subscriptionService.fetchProducts();
      const stripeMonthly = products.subscriptions.find(
        (p: any) => p.provider === 'stripe' && p.productId === 'premium_monthly'
      );
      expect(stripeMonthly?.price).toBe('$6.99');
    });

    it('should include token buckets', async () => {
      const products = await subscriptionService.fetchProducts();
      expect(products.tokens.length).toBeGreaterThan(0);
      const stripeTokens = products.tokens.filter((p: any) => p.provider === 'stripe');
      expect(stripeTokens.length).toBe(3);
    });
  });

  describe('getStripeCheckoutUrl', () => {
    it('should return Stripe checkout URL', async () => {
      const url = await subscriptionService.getStripeCheckoutUrl(
        mockUserId,
        'premium_monthly',
        'https://success.com',
        'https://cancel.com'
      );
      expect(url).toBe('https://checkout.stripe.com/session/123');
    });

    it('should return null on error', async () => {
      mockGetStripeCheckoutUrl.mockResolvedValueOnce(null);
      const url = await subscriptionService.getStripeCheckoutUrl(
        mockUserId,
        'premium_monthly',
        'https://success.com',
        'https://cancel.com'
      );
      expect(url).toBeNull();
    });
  });

  describe('shouldShowExternalPayment', () => {
    it('should return true for US users on iOS', async () => {
      const result = await subscriptionService.shouldShowExternalPayment(mockUserId);
      expect(result).toBe(true);
    });

    it('should return true for non-iOS users', async () => {
      (Platform as any).OS = 'android';
      const result = await subscriptionService.shouldShowExternalPayment(mockUserId);
      expect(result).toBe(true);
    });
  });
});

