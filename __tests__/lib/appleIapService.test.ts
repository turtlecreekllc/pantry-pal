/**
 * Apple IAP Service Tests
 * Tests for Apple In-App Purchase operations using StoreKit 2
 */

import { Platform } from 'react-native';
import {
  initConnection,
  endConnection,
  getProducts,
  getSubscriptions,
  requestPurchase,
  requestSubscription,
  finishTransaction,
  getAvailablePurchases,
} from 'react-native-iap';

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((options) => options.ios),
  },
}));

// Mock supabase functions invoke
jest.mock('../../lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(() => Promise.resolve({
        data: { success: true, tier: 'premium_monthly', tokensGranted: 100 },
        error: null,
      })),
    },
    rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
  },
}));

import * as appleIapService from '../../lib/appleIapService';
import { APPLE_IAP_CONFIG } from '../../lib/types';

describe('Apple IAP Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Platform to iOS
    (Platform as any).OS = 'ios';
  });

  describe('initializeIAP', () => {
    it('should initialize connection on iOS', async () => {
      const result = await appleIapService.initializeIAP();
      expect(result).toBe(true);
      expect(initConnection).toHaveBeenCalled();
    });

    it('should return false on non-iOS platforms', async () => {
      (Platform as any).OS = 'android';
      const result = await appleIapService.initializeIAP();
      expect(result).toBe(false);
    });

    it('should handle connection errors gracefully', async () => {
      // Reset the cached initialized state by terminating first
      await appleIapService.terminateIAP();
      (initConnection as jest.Mock).mockRejectedValueOnce(new Error('Connection failed'));
      const result = await appleIapService.initializeIAP();
      expect(result).toBe(false);
    });
  });

  describe('terminateIAP', () => {
    it('should end connection', async () => {
      await appleIapService.initializeIAP();
      await appleIapService.terminateIAP();
      expect(endConnection).toHaveBeenCalled();
    });
  });

  describe('fetchSubscriptionProducts', () => {
    it('should fetch subscription products on iOS', async () => {
      const products = await appleIapService.fetchSubscriptionProducts();
      expect(getSubscriptions).toHaveBeenCalledWith({
        skus: [
          APPLE_IAP_CONFIG.products.premium_monthly,
          APPLE_IAP_CONFIG.products.premium_annual,
        ],
      });
      expect(products.length).toBe(2);
    });

    it('should return empty array on non-iOS', async () => {
      (Platform as any).OS = 'android';
      const products = await appleIapService.fetchSubscriptionProducts();
      expect(products).toEqual([]);
    });

    it('should map products to StoreKitProduct format', async () => {
      const products = await appleIapService.fetchSubscriptionProducts();
      expect(products[0]).toHaveProperty('productId');
      expect(products[0]).toHaveProperty('title');
      expect(products[0]).toHaveProperty('localizedPrice');
      expect(products[0]).toHaveProperty('type', 'subs');
    });

    it('should handle fetch errors gracefully', async () => {
      (getSubscriptions as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      const products = await appleIapService.fetchSubscriptionProducts();
      expect(products).toEqual([]);
    });
  });

  describe('fetchConsumableProducts', () => {
    it('should fetch consumable products (token packs)', async () => {
      const products = await appleIapService.fetchConsumableProducts();
      expect(getProducts).toHaveBeenCalledWith({
        skus: [
          APPLE_IAP_CONFIG.products.tokens_50,
          APPLE_IAP_CONFIG.products.tokens_150,
          APPLE_IAP_CONFIG.products.tokens_400,
        ],
      });
      expect(products.length).toBe(2);
    });

    it('should map products to StoreKitProduct format', async () => {
      const products = await appleIapService.fetchConsumableProducts();
      expect(products[0]).toHaveProperty('productId');
      expect(products[0]).toHaveProperty('title');
      expect(products[0]).toHaveProperty('type', 'inapp');
    });
  });

  describe('fetchAllProducts', () => {
    it('should fetch both subscriptions and consumables', async () => {
      const { subscriptions, consumables } = await appleIapService.fetchAllProducts();
      expect(subscriptions.length).toBeGreaterThan(0);
      expect(consumables.length).toBeGreaterThan(0);
    });
  });

  describe('purchaseSubscription', () => {
    const mockUserId = 'test-user-123';
    const mockProductId = APPLE_IAP_CONFIG.products.premium_monthly;

    it('should initiate subscription purchase on iOS', async () => {
      const result = await appleIapService.purchaseSubscription(mockProductId, mockUserId);
      expect(requestSubscription).toHaveBeenCalledWith({
        sku: mockProductId,
        andDangerouslyFinishTransactionAutomaticallyIOS: false,
        appAccountToken: mockUserId,
      });
      expect(result.success).toBe(true);
      expect(result.provider).toBe('apple');
    });

    it('should return error on non-iOS platforms', async () => {
      (Platform as any).OS = 'android';
      const result = await appleIapService.purchaseSubscription(mockProductId, mockUserId);
      expect(result.success).toBe(false);
      expect(result.error).toContain('iOS');
    });

    it('should handle purchase errors', async () => {
      (requestSubscription as jest.Mock).mockRejectedValueOnce(new Error('Purchase failed'));
      const result = await appleIapService.purchaseSubscription(mockProductId, mockUserId);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Purchase failed');
    });

    it('should handle user cancellation', async () => {
      (requestSubscription as jest.Mock).mockRejectedValueOnce(new Error('User cancelled'));
      const result = await appleIapService.purchaseSubscription(mockProductId, mockUserId);
      expect(result.success).toBe(false);
      expect(result.error).toContain('cancel');
    });

    it('should finish transaction after validation', async () => {
      await appleIapService.purchaseSubscription(mockProductId, mockUserId);
      expect(finishTransaction).toHaveBeenCalled();
    });
  });

  describe('purchaseConsumable', () => {
    const mockUserId = 'test-user-123';
    const mockProductId = APPLE_IAP_CONFIG.products.tokens_50;

    it('should initiate consumable purchase', async () => {
      const result = await appleIapService.purchaseConsumable(mockProductId, mockUserId);
      expect(requestPurchase).toHaveBeenCalledWith({
        sku: mockProductId,
        andDangerouslyFinishTransactionAutomaticallyIOS: false,
      });
      expect(result.success).toBe(true);
    });

    it('should handle purchase errors', async () => {
      (requestPurchase as jest.Mock).mockRejectedValueOnce(new Error('Insufficient funds'));
      const result = await appleIapService.purchaseConsumable(mockProductId, mockUserId);
      expect(result.success).toBe(false);
    });
  });

  describe('restorePurchases', () => {
    const mockUserId = 'test-user-123';

    it('should restore purchases on iOS', async () => {
      (getAvailablePurchases as jest.Mock).mockResolvedValueOnce([
        {
          productId: APPLE_IAP_CONFIG.products.premium_monthly,
          transactionId: 'restored-123',
          originalTransactionIdIOS: 'original-123',
        },
      ]);
      const result = await appleIapService.restorePurchases(mockUserId);
      expect(getAvailablePurchases).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should return error when no purchases to restore', async () => {
      (getAvailablePurchases as jest.Mock).mockResolvedValueOnce([]);
      const result = await appleIapService.restorePurchases(mockUserId);
      expect(result.success).toBe(false);
      expect(result.error).toContain('No purchases');
    });

    it('should return error on non-iOS', async () => {
      (Platform as any).OS = 'android';
      const result = await appleIapService.restorePurchases(mockUserId);
      expect(result.success).toBe(false);
    });
  });

  describe('getCurrentSubscription', () => {
    it('should return active subscription', async () => {
      (getAvailablePurchases as jest.Mock).mockResolvedValueOnce([
        {
          productId: APPLE_IAP_CONFIG.products.premium_annual,
          transactionId: 'active-123',
        },
      ]);
      const subscription = await appleIapService.getCurrentSubscription();
      expect(subscription).not.toBeNull();
      expect(subscription?.productId).toBe(APPLE_IAP_CONFIG.products.premium_annual);
    });

    it('should return null when no active subscription', async () => {
      (getAvailablePurchases as jest.Mock).mockResolvedValueOnce([]);
      const subscription = await appleIapService.getCurrentSubscription();
      expect(subscription).toBeNull();
    });

    it('should return null on non-iOS', async () => {
      (Platform as any).OS = 'android';
      const subscription = await appleIapService.getCurrentSubscription();
      expect(subscription).toBeNull();
    });
  });

  describe('isIAPAvailable', () => {
    it('should return true on iOS', () => {
      expect(appleIapService.isIAPAvailable()).toBe(true);
    });

    it('should return false on non-iOS', () => {
      (Platform as any).OS = 'android';
      expect(appleIapService.isIAPAvailable()).toBe(false);
    });
  });

  describe('setupPurchaseListeners', () => {
    it('should set up purchase update and error listeners', () => {
      const onUpdate = jest.fn();
      const onError = jest.fn();
      const cleanup = appleIapService.setupPurchaseListeners(onUpdate, onError);
      expect(typeof cleanup).toBe('function');
    });

    it('should return cleanup function that removes listeners', () => {
      const onUpdate = jest.fn();
      const onError = jest.fn();
      const cleanup = appleIapService.setupPurchaseListeners(onUpdate, onError);
      cleanup();
      // Should not throw
    });
  });
});

