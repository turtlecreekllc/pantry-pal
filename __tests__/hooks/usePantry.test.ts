/**
 * usePantry Hook Tests
 * Tests for pantry inventory management with realistic data
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { usePantry } from '../../hooks/usePantry';

// Realistic pantry item data
const MOCK_PANTRY_ITEMS = [
  {
    id: 'item-1',
    name: 'Milk',
    category: 'dairy',
    quantity: 1,
    unit: 'gallon',
    household_id: 'household-123',
    expiration_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'item-2',
    name: 'Eggs',
    category: 'dairy',
    quantity: 12,
    unit: 'count',
    household_id: 'household-123',
    expiration_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'item-3',
    name: 'Chicken Breast',
    category: 'meat',
    quantity: 2,
    unit: 'lb',
    household_id: 'household-123',
    expiration_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days - expiring soon
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'item-4',
    name: 'Pasta',
    category: 'pantry',
    quantity: 1,
    unit: 'box',
    household_id: 'household-123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'item-5',
    name: 'Olive Oil',
    category: 'pantry',
    quantity: 1,
    unit: 'bottle',
    household_id: 'household-123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Create fully chainable mock for Supabase
// This creates a self-referencing builder that supports any order of method calls
const createChainableBuilder = (mockData: unknown[] = [], mockError: unknown = null) => {
  const builder: Record<string, jest.Mock | ((...args: unknown[]) => Promise<unknown>)> = {};
  
  // All chainable methods return the builder itself
  const chainMethods = ['select', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 
    'like', 'ilike', 'is', 'in', 'order', 'limit', 'range', 'filter', 'not'];
  
  chainMethods.forEach(method => {
    builder[method] = jest.fn(() => builder);
  });
  
  // Terminal methods
  builder.single = jest.fn(() => Promise.resolve({ 
    data: mockData[0] || null, 
    error: mockError 
  }));
  
  // Make it thenable for await
  builder.then = function(resolve: (value: unknown) => unknown) {
    return Promise.resolve({ data: mockData, error: mockError }).then(resolve);
  };
  
  return builder;
};

const createMutationBuilder = (mockData: unknown = { id: 'new-item' }) => {
  const builder: Record<string, jest.Mock | ((...args: unknown[]) => Promise<unknown>)> = {};
  
  ['select', 'eq'].forEach(method => {
    builder[method] = jest.fn(() => builder);
  });
  
  builder.single = jest.fn(() => Promise.resolve({ data: mockData, error: null }));
  builder.then = function(resolve: (value: unknown) => unknown) {
    return Promise.resolve({ data: mockData, error: null }).then(resolve);
  };
  
  return builder;
};

// Mock the supabase module
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => createChainableBuilder(MOCK_PANTRY_ITEMS)),
      insert: jest.fn(() => createMutationBuilder({ id: 'new-item', name: 'New Item' })),
      update: jest.fn(() => createMutationBuilder({ id: 'item-1' })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    channel: jest.fn(() => ({
      on: jest.fn(function(this: unknown) { return this; }),
      subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
    })),
    removeChannel: jest.fn(),
  },
}));

// Mock HouseholdContext
jest.mock('../../context/HouseholdContext', () => ({
  useHouseholdContext: () => ({
    currentHousehold: { id: 'household-123', name: 'Smith Family' },
    households: [{ id: 'household-123', name: 'Smith Family' }],
    members: [
      { id: 'user-1', name: 'John Smith', role: 'owner' },
      { id: 'user-2', name: 'Jane Smith', role: 'member' },
    ],
    loading: false,
    error: null,
    refreshHousehold: jest.fn(),
    switchHousehold: jest.fn(),
    createHousehold: jest.fn(),
    updateHousehold: jest.fn(),
    deleteHousehold: jest.fn(),
    inviteMember: jest.fn(),
    removeMember: jest.fn(),
    updateMemberRole: jest.fn(),
  }),
  HouseholdProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock AuthContext
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'john@example.com', user_metadata: { full_name: 'John Smith' } },
    session: { access_token: 'mock-token' },
    loading: false,
  }),
}));

describe('usePantry Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with pantry items from household', async () => {
      const { result } = renderHook(() => usePantry({ householdId: 'household-123' }));
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      // Should have items
      expect(result.current.pantryItems).toBeDefined();
    });

    it('should set loading to false after fetch', async () => {
      const { result } = renderHook(() => usePantry({ householdId: 'household-123' }));
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('pantry CRUD operations', () => {
    it('should expose addItem function', async () => {
      const { result } = renderHook(() => usePantry({ householdId: 'household-123' }));
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(typeof result.current.addItem).toBe('function');
    });

    it('should expose updateItem function', async () => {
      const { result } = renderHook(() => usePantry({ householdId: 'household-123' }));
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(typeof result.current.updateItem).toBe('function');
    });

    it('should expose deleteItem function', async () => {
      const { result } = renderHook(() => usePantry({ householdId: 'household-123' }));
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(typeof result.current.deleteItem).toBe('function');
    });

    it('should expose refreshPantry function', async () => {
      const { result } = renderHook(() => usePantry({ householdId: 'household-123' }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(typeof result.current.refreshPantry).toBe('function');
    });

    it('should expose useItem function', async () => {
      const { result } = renderHook(() => usePantry({ householdId: 'household-123' }));
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(typeof result.current.useItem).toBe('function');
    });

    it('should expose restoreItem function', async () => {
      const { result } = renderHook(() => usePantry({ householdId: 'household-123' }));
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(typeof result.current.restoreItem).toBe('function');
    });
  });

  describe('pantry data', () => {
    it('should return pantryItems array', async () => {
      const { result } = renderHook(() => usePantry({ householdId: 'household-123' }));
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(Array.isArray(result.current.pantryItems)).toBe(true);
    });

    it('should have error property', async () => {
      const { result } = renderHook(() => usePantry({ householdId: 'household-123' }));
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      // Error should be null when successful
      expect(result.current.error).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle missing householdId', async () => {
      const { result } = renderHook(() => usePantry({}));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should not crash without householdId
      expect(result.current.pantryItems).toBeDefined();
    });
  });

});
