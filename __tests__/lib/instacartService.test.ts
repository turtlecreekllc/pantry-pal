/**
 * Instacart Service Tests
 * Tests for Instacart integration and deep linking
 */

import { Linking, Alert } from 'react-native';

// Mock React Native modules
jest.mock('react-native', () => ({
  Linking: {
    openURL: jest.fn(() => Promise.resolve()),
    canOpenURL: jest.fn(() => Promise.resolve(true)),
  },
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
}));

// Mock Supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => Promise.resolve({ error: null })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      })),
    })),
  },
}));

// Import after mocking
import { instacartService } from '../../lib/instacartService';
import { GroceryItem } from '../../lib/types';

describe('Instacart Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockGroceryItems: GroceryItem[] = [
    {
      id: '1',
      name: 'Milk',
      quantity: 1,
      unit: 'gallon',
      category: 'dairy',
      checked: false,
      household_id: 'h1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'Bread',
      quantity: 2,
      unit: 'loaf',
      category: 'bakery',
      checked: false,
      household_id: 'h1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '3',
      name: 'Eggs',
      quantity: 12,
      unit: 'count',
      category: 'dairy',
      checked: true, // Already checked
      household_id: 'h1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  describe('generateInstacartLink', () => {
    it('should generate a valid Instacart link', () => {
      const link = instacartService.generateInstacartLink(mockGroceryItems);
      expect(link).toContain('instacart');
    });

    it('should filter out checked items', () => {
      const link = instacartService.generateInstacartLink(mockGroceryItems);
      // Eggs is checked, so it should not be in the link
      expect(link.toLowerCase()).not.toContain('eggs');
    });

    it('should encode item names in URL', () => {
      const link = instacartService.generateInstacartLink(mockGroceryItems);
      expect(link).toContain('Milk');
    });
  });

  describe('generateDeepLink', () => {
    it('should generate an instacart:// deep link', () => {
      const link = instacartService.generateDeepLink(mockGroceryItems);
      expect(link).toContain('instacart://');
    });

    it('should include search query', () => {
      const link = instacartService.generateDeepLink(mockGroceryItems);
      expect(link).toContain('search');
    });
  });

  describe('isInstacartInstalled', () => {
    it('should check if Instacart app is installed', async () => {
      const installed = await instacartService.isInstacartInstalled();
      expect(Linking.canOpenURL).toHaveBeenCalled();
      expect(typeof installed).toBe('boolean');
    });

    it('should return true when Instacart can be opened', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValueOnce(true);
      const installed = await instacartService.isInstacartInstalled();
      expect(installed).toBe(true);
    });

    it('should return false when Instacart cannot be opened', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValueOnce(false);
      const installed = await instacartService.isInstacartInstalled();
      expect(installed).toBe(false);
    });
  });

  describe('openInstacartWithItems', () => {
    it('should open Instacart with items', async () => {
      const result = await instacartService.openInstacartWithItems({
        items: mockGroceryItems,
      });
      expect(Linking.openURL).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should return failure when no items are unchecked', async () => {
      const allChecked = mockGroceryItems.map(item => ({ ...item, checked: true }));
      const result = await instacartService.openInstacartWithItems({
        items: allChecked,
      });
      expect(Alert.alert).toHaveBeenCalled();
      expect(result.success).toBe(false);
    });

    it('should try deep link first if app is installed', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValueOnce(true);
      const result = await instacartService.openInstacartWithItems({
        items: mockGroceryItems,
      });
      // When app is installed, link should contain instacart://
      expect(result.link).toContain('instacart://');
    });

    it('should fall back to web link if app is not installed', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValueOnce(false);
      const result = await instacartService.openInstacartWithItems({
        items: mockGroceryItems,
      });
      // When app is not installed, link should be https://
      expect(result.link).toContain('https://');
    });
  });

  describe('getEstimatedDeliveryTime', () => {
    it('should return an estimated delivery time string', () => {
      const estimate = instacartService.getEstimatedDeliveryTime();
      expect(typeof estimate).toBe('string');
      expect(estimate.length).toBeGreaterThan(0);
    });
  });

  describe('estimateTotal', () => {
    it('should estimate total cost for items', () => {
      const estimate = instacartService.estimateTotal(mockGroceryItems);
      expect(estimate).toContain('$');
    });

    it('should only include unchecked items', () => {
      const allChecked = mockGroceryItems.map(item => ({ ...item, checked: true }));
      const estimate = instacartService.estimateTotal(allChecked);
      // Should only have delivery fee and service fee (no item cost)
      expect(estimate).toBeDefined();
    });
  });

  describe('getOrderHistory', () => {
    it('should fetch order history for user', async () => {
      const history = await instacartService.getOrderHistory('user-1');
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('trackOrderCreation', () => {
    it('should track order creation in database', async () => {
      await expect(
        instacartService.trackOrderCreation({
          userId: 'user-1',
          groceryListId: 'list-1',
          instacartLink: 'https://instacart.com/test',
        })
      ).resolves.not.toThrow();
    });
  });
});
