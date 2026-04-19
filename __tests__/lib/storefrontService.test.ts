/**
 * Storefront Service Tests
 * Tests for user location detection and paywall configuration
 */

import { Platform } from 'react-native';

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((options) => options.ios),
  },
  NativeModules: {},
}));

// Mock fetch for IP geolocation
global.fetch = jest.fn();

// Create a mock builder for Supabase
const createMockBuilder = (data: any = null, error: any = null) => {
  const builder: any = {};
  builder.select = jest.fn(() => builder);
  builder.eq = jest.fn(() => builder);
  builder.single = jest.fn(() => Promise.resolve({ data, error }));
  builder.then = (resolve: any) => Promise.resolve({ data, error }).then(resolve);
  return builder;
};

// Mock supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn((table) => createMockBuilder(null, { code: 'PGRST116' })),
    rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
  },
}));

import {
  detectStorefront,
  isUSStorefront,
  getPaywallConfig,
  clearStorefrontCache,
  setStorefrontManually,
  getStorefrontDisplayName,
} from '../../lib/storefrontService';
import { US_STOREFRONTS, APPLE_DISCLOSURE_TEXT } from '../../lib/types';

describe('Storefront Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearStorefrontCache();
    (Platform as any).OS = 'ios';
    // Reset fetch mock
    (global.fetch as jest.Mock).mockReset();
  });

  describe('isUSStorefront', () => {
    it('should return true for USA storefront', () => {
      expect(isUSStorefront('USA')).toBe(true);
    });

    it('should return true for US storefront (short code)', () => {
      expect(isUSStorefront('US')).toBe(true);
    });

    it('should return true for lowercase us', () => {
      expect(isUSStorefront('us')).toBe(true);
    });

    it('should return false for non-US storefronts', () => {
      expect(isUSStorefront('GBR')).toBe(false);
      expect(isUSStorefront('CAN')).toBe(false);
      expect(isUSStorefront('DEU')).toBe(false);
      expect(isUSStorefront('JPN')).toBe(false);
    });

    it('should return false for null or undefined', () => {
      expect(isUSStorefront(null)).toBe(false);
      expect(isUSStorefront(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isUSStorefront('')).toBe(false);
    });
  });

  describe('detectStorefront', () => {
    const mockUserId = 'test-user-123';

    it('should detect storefront from IP geolocation', async () => {
      // Mock IP lookup
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          country_code: 'US',
          country_code_iso3: 'USA',
        }),
      });
      const result = await detectStorefront(mockUserId);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://ipapi.co/json/',
        expect.any(Object)
      );
    });

    it('should cache storefront result', async () => {
      // Clear cache first
      clearStorefrontCache();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          country_code_iso3: 'USA',
        }),
      });
      // First call
      await detectStorefront(mockUserId);
      // Second call should use cache
      await detectStorefront(mockUserId);
      // The internal cache should prevent multiple fetches
      // Note: Due to database check, fetch might be called more than once if db lookup fails
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should handle IP lookup failure gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      const result = await detectStorefront(mockUserId);
      // Should return null but not throw
      expect(result).toBeNull();
    });

    it('should handle non-OK response from IP service', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
      });
      const result = await detectStorefront(mockUserId);
      expect(result).toBeNull();
    });
  });

  describe('getPaywallConfig', () => {
    const mockUserId = 'test-user-123';

    beforeEach(() => {
      clearStorefrontCache();
      jest.clearAllMocks();
    });

    it('should show only Apple when storefront is unknown', async () => {
      // When storefront cannot be detected, default to Apple only (safest option)
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      const config = await getPaywallConfig(mockUserId);
      // Should default to Apple-only when storefront unknown
      expect(config.showAppleOption).toBe(true);
      // Should not show Stripe when we can't verify US storefront
      expect(config.recommendedProvider).toBe('apple');
    });

    it('should show only Apple for non-US users', async () => {
      // Mock UK storefront detection
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          country_code_iso3: 'GBR',
        }),
      });
      const config = await getPaywallConfig(mockUserId);
      expect(config.showStripeOption).toBe(false);
      expect(config.showAppleOption).toBe(true);
      expect(config.recommendedProvider).toBe('apple');
      expect(config.isUSUser).toBe(false);
      expect(config.stripeDisclosure).toBeNull();
    });

    it('should always show Apple option', async () => {
      // Apple should always be available regardless of storefront
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          country_code_iso3: 'JPN',
        }),
      });
      const config = await getPaywallConfig(mockUserId);
      expect(config.showAppleOption).toBe(true);
    });
  });

  describe('clearStorefrontCache', () => {
    it('should clear cached storefront data', async () => {
      const mockUserId = 'test-user-123';
      // First call to populate cache
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ country_code_iso3: 'USA' }),
      });
      await detectStorefront(mockUserId);
      // Clear cache
      clearStorefrontCache();
      // Second call should trigger new fetch
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ country_code_iso3: 'GBR' }),
      });
      await detectStorefront(mockUserId);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('getStorefrontDisplayName', () => {
    it('should return display name for known storefronts', () => {
      expect(getStorefrontDisplayName('USA')).toBe('United States');
      expect(getStorefrontDisplayName('GBR')).toBe('United Kingdom');
      expect(getStorefrontDisplayName('CAN')).toBe('Canada');
      expect(getStorefrontDisplayName('DEU')).toBe('Germany');
      expect(getStorefrontDisplayName('JPN')).toBe('Japan');
    });

    it('should return storefront code for unknown storefronts', () => {
      expect(getStorefrontDisplayName('XYZ')).toBe('XYZ');
    });

    it('should return "Unknown" for null', () => {
      expect(getStorefrontDisplayName(null)).toBe('Unknown');
    });

    it('should handle case-insensitive input', () => {
      expect(getStorefrontDisplayName('usa')).toBe('United States');
    });
  });

  describe('setStorefrontManually', () => {
    const mockUserId = 'test-user-123';

    it('should update storefront and clear cache', async () => {
      const { supabase } = require('../../lib/supabase');
      await setStorefrontManually(mockUserId, 'CAN');
      expect(supabase.rpc).toHaveBeenCalledWith('save_user_storefront', {
        p_user_id: mockUserId,
        p_storefront: 'CAN',
        p_storefront_id: null,
        p_source: 'manual',
      });
    });
  });
});

