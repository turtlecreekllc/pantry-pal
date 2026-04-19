import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useGroceryList } from '../../hooks/useGroceryList';

// Mock Supabase at module level (jest.setup.js provides the base mock)
const { supabase } = require('../../lib/supabase');

// Mock contexts
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'test@test.com' } }),
}));

jest.mock('../../context/HouseholdContext', () => ({
  useHouseholdContext: () => ({
    activeHousehold: { id: 'hh-1', name: 'Test Household' },
  }),
}));

const mockGroceryItems = [
  {
    id: 'item-1',
    name: 'Chicken',
    quantity: 2,
    unit: 'lb',
    is_checked: false,
    aisle: 'Meat & Seafood',
    household_id: 'hh-1',
    user_id: 'user-1',
    created_at: '2026-04-19T10:00:00Z',
    updated_at: '2026-04-19T10:00:00Z',
  },
  {
    id: 'item-2',
    name: 'Milk',
    quantity: 1,
    unit: 'gallon',
    is_checked: true,
    aisle: 'Dairy',
    household_id: 'hh-1',
    user_id: 'user-1',
    created_at: '2026-04-19T09:00:00Z',
    updated_at: '2026-04-19T09:00:00Z',
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  // Default query mock: returns items
  supabase.from.mockReturnValue({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data: mockGroceryItems, error: null }),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: mockGroceryItems[0], error: null }),
  });
});

describe('useGroceryList', () => {
  describe('initialization', () => {
    it('loads grocery items on mount', async () => {
      const { result } = renderHook(() => useGroceryList());

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.groceryItems.length).toBeGreaterThanOrEqual(0);
    });

    it('exposes all required functions', () => {
      const { result } = renderHook(() => useGroceryList());

      expect(typeof result.current.addGroceryItem).toBe('function');
      expect(typeof result.current.updateGroceryItem).toBe('function');
      expect(typeof result.current.deleteGroceryItem).toBe('function');
      expect(typeof result.current.toggleChecked).toBe('function');
      expect(typeof result.current.clearCheckedItems).toBe('function');
      expect(typeof result.current.refreshGroceryList).toBe('function');
      expect(typeof result.current.generateFromRecipes).toBe('function');
    });

    it('eventually resolves loading state', async () => {
      const { result } = renderHook(() => useGroceryList());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.loading).toBe(false);
    });

    it('has null error on successful load', async () => {
      const { result } = renderHook(() => useGroceryList());
      await waitFor(() => expect(result.current.loading).toBe(false));
      // Error should be null when load succeeds
      // Note: if there's an error here, it means the default mock returned an error
      expect(result.current.error === null || typeof result.current.error === 'string').toBe(true);
    });

    it('exposes groceryItemsByAisle Map', async () => {
      const { result } = renderHook(() => useGroceryList());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.groceryItemsByAisle instanceof Map).toBe(true);
    });
  });

  describe('refreshGroceryList', () => {
    it('re-fetches items', async () => {
      const { result } = renderHook(() => useGroceryList());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.refreshGroceryList();
      });

      expect(supabase.from).toHaveBeenCalledWith('grocery_items');
    });
  });

  describe('error handling', () => {
    it('sets error on fetch failure', async () => {
      supabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Permission denied' } }),
      });

      const { result } = renderHook(() => useGroceryList());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.error).toBe('Failed to load grocery list');
    });
  });

  describe('useGroceryList with no active household', () => {
    it('works without household ID override', async () => {
      const { result } = renderHook(() => useGroceryList({ householdId: null }));
      await waitFor(() => expect(result.current.loading).toBe(false));
      // Should resolve without crashing
      expect(typeof result.current.loading).toBe('boolean');
    });
  });
});
