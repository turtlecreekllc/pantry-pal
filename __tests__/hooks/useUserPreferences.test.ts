/**
 * useUserPreferences Hook Tests
 * Tests for user preferences including onboarding status
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useUserPreferences } from '../../hooks/useUserPreferences';

// Realistic user preferences data
const MOCK_USER_PREFERENCES = {
  id: 'pref-123',
  user_id: 'user-123',
  household_size: 4,
  has_children: true,
  dietary_preferences: ['gluten-free'],
  cuisine_preferences: ['Italian', 'Mexican', 'Asian'],
  cooking_skill: 'intermediate',
  time_preference: '30-45min',
  onboarding_completed: false,
  onboarding_step: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Create chainable Supabase mock
const createSupabaseMock = (overrides = {}) => {
  const defaultData = { ...MOCK_USER_PREFERENCES, ...overrides };
  
  return {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: defaultData,
            error: null,
          })),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: defaultData,
            error: null,
          })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: { ...defaultData, ...overrides },
              error: null,
            })),
          })),
        })),
      })),
    })),
  };
};

// Mock Supabase
jest.mock('../../lib/supabase', () => ({
  supabase: createSupabaseMock(),
}));

// Mock AuthContext
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'test@example.com' },
    session: { access_token: 'mock-token' },
    loading: false,
  }),
}));

describe('useUserPreferences Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should fetch preferences on mount', async () => {
      const { result } = renderHook(() => useUserPreferences());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.preferences).toBeDefined();
    });

    it('should return loading false after initial load', async () => {
      const { result } = renderHook(() => useUserPreferences());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should have no error on successful fetch', async () => {
      const { result } = renderHook(() => useUserPreferences());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.error).toBeNull();
    });
  });

  describe('onboarding status', () => {
    it('should return onboardingCompleted as boolean', async () => {
      const { result } = renderHook(() => useUserPreferences());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(typeof result.current.onboardingCompleted).toBe('boolean');
    });

    it('should return onboardingStep as number', async () => {
      const { result } = renderHook(() => useUserPreferences());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(typeof result.current.onboardingStep).toBe('number');
    });
  });

  describe('updatePreferences', () => {
    it('should expose updatePreferences function', async () => {
      const { result } = renderHook(() => useUserPreferences());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(typeof result.current.updatePreferences).toBe('function');
    });
  });

  describe('completeOnboarding', () => {
    it('should expose completeOnboarding function', async () => {
      const { result } = renderHook(() => useUserPreferences());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(typeof result.current.completeOnboarding).toBe('function');
    });
  });

  describe('setOnboardingStep', () => {
    it('should expose setOnboardingStep function', async () => {
      const { result } = renderHook(() => useUserPreferences());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(typeof result.current.setOnboardingStep).toBe('function');
    });
  });

  describe('refresh', () => {
    it('should expose refresh function', async () => {
      const { result } = renderHook(() => useUserPreferences());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(typeof result.current.refresh).toBe('function');
    });
  });
});
