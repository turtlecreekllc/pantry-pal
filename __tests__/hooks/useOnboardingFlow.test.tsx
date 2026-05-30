/**
 * useOnboardingFlow Hook Tests
 *
 * Covers the onboarding state machine extracted in QUAL-005 from
 * app/onboarding/index.tsx. Tests verify step transitions, selection
 * toggles (with the "none" exclusivity rule), and that the terminal
 * actions invoke completeOnboarding + navigate.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react-native';

const mockRouterReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: mockRouterReplace,
    back: jest.fn(),
  }),
}));

const mockStartTrial = jest.fn(() => Promise.resolve({ success: true }));
jest.mock('../../hooks/useSubscription', () => ({
  useSubscription: () => ({
    isPremium: false,
    isTrial: false,
    loading: false,
    startTrial: mockStartTrial,
  }),
}));

const mockUpdatePreferences = jest.fn(() => Promise.resolve(true));
const mockCompleteOnboarding = jest.fn(() => Promise.resolve(true));
jest.mock('../../hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({
    preferences: {
      household_size: 4,
      dietary_preferences: [],
      onboarding_completed: false,
      onboarding_step: 0,
    },
    loading: false,
    error: null,
    onboardingCompleted: false,
    onboardingStep: 0,
    updatePreferences: mockUpdatePreferences,
    completeOnboarding: mockCompleteOnboarding,
    setOnboardingStep: jest.fn(),
    refresh: jest.fn(),
  }),
}));

const mockSearchRecipes = jest.fn(() =>
  Promise.resolve([
    { id: 'r1', name: 'Test Recipe', thumbnail: 'https://example.test/r1.jpg' },
  ]),
);
jest.mock('../../lib/recipeService', () => ({
  searchRecipes: (...args: unknown[]) => mockSearchRecipes(...args),
}));

import { useOnboardingFlow } from '../../app/onboarding/useOnboardingFlow';

describe('useOnboardingFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts on the welcome step', () => {
      const { result } = renderHook(() => useOnboardingFlow());
      expect(result.current.step).toBe('welcome');
    });

    it('initializes selections as empty', () => {
      const { result } = renderHook(() => useOnboardingFlow());
      expect(result.current.householdSize).toBeNull();
      expect(result.current.dietaryNeeds.size).toBe(0);
      expect(result.current.selectedIngredients.size).toBe(0);
    });
  });

  describe('step transitions', () => {
    it('moves from welcome to personalize via setStep', () => {
      const { result } = renderHook(() => useOnboardingFlow());
      act(() => result.current.setStep('personalize'));
      expect(result.current.step).toBe('personalize');
    });

    it('handleContinueFromPersonalize advances to first-suggestion and persists prefs', async () => {
      const { result } = renderHook(() => useOnboardingFlow());
      act(() => result.current.setHouseholdSize('family-small'));

      await act(async () => {
        await result.current.handleContinueFromPersonalize();
      });

      expect(mockUpdatePreferences).toHaveBeenCalledWith(
        expect.objectContaining({
          household_size: 4,
          dietary_preferences: [],
          onboarding_step: 1,
        }),
      );
      expect(result.current.step).toBe('first-suggestion');
    });

    it('handlePantrySeedOption=checklist routes to pantry-checklist', () => {
      const { result } = renderHook(() => useOnboardingFlow());
      act(() => result.current.handlePantrySeedOption('checklist'));
      expect(result.current.step).toBe('pantry-checklist');
    });

    it('handlePantrySeedOption=skip routes to subscription', () => {
      const { result } = renderHook(() => useOnboardingFlow());
      act(() => result.current.handlePantrySeedOption('skip'));
      expect(result.current.step).toBe('subscription');
    });

    it('handleChecklistDone routes to personalized-result', async () => {
      const { result } = renderHook(() => useOnboardingFlow());
      await act(async () => {
        result.current.handleChecklistDone();
        // Let the fetch-personalized-recipe promise settle to avoid a stray
        // act warning from the post-resolution setLoading(false).
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(result.current.step).toBe('personalized-result');
    });
  });

  describe('selection state', () => {
    it('toggleDietaryNeed adds a need then removes it on repeat tap', () => {
      const { result } = renderHook(() => useOnboardingFlow());
      act(() => result.current.toggleDietaryNeed('vegetarian'));
      expect(result.current.dietaryNeeds.has('vegetarian')).toBe(true);
      act(() => result.current.toggleDietaryNeed('vegetarian'));
      expect(result.current.dietaryNeeds.has('vegetarian')).toBe(false);
    });

    it('selecting "none" clears other dietary needs (exclusivity rule)', () => {
      const { result } = renderHook(() => useOnboardingFlow());
      act(() => result.current.toggleDietaryNeed('vegetarian'));
      act(() => result.current.toggleDietaryNeed('gluten-free'));
      expect(result.current.dietaryNeeds.size).toBe(2);

      act(() => result.current.toggleDietaryNeed('none'));
      expect(result.current.dietaryNeeds.size).toBe(1);
      expect(result.current.dietaryNeeds.has('none')).toBe(true);
    });

    it('selecting a real need after "none" removes "none"', () => {
      const { result } = renderHook(() => useOnboardingFlow());
      act(() => result.current.toggleDietaryNeed('none'));
      expect(result.current.dietaryNeeds.has('none')).toBe(true);
      act(() => result.current.toggleDietaryNeed('vegetarian'));
      expect(result.current.dietaryNeeds.has('none')).toBe(false);
      expect(result.current.dietaryNeeds.has('vegetarian')).toBe(true);
    });

    it('toggleIngredient is a symmetric toggle', () => {
      const { result } = renderHook(() => useOnboardingFlow());
      act(() => result.current.toggleIngredient('Chicken'));
      expect(result.current.selectedIngredients.has('Chicken')).toBe(true);
      act(() => result.current.toggleIngredient('Chicken'));
      expect(result.current.selectedIngredients.has('Chicken')).toBe(false);
    });
  });

  describe('terminal actions', () => {
    it('handleStartTrial completes onboarding and navigates', async () => {
      const { result } = renderHook(() => useOnboardingFlow());
      await act(async () => {
        await result.current.handleStartTrial();
      });
      expect(mockCompleteOnboarding).toHaveBeenCalled();
      expect(mockStartTrial).toHaveBeenCalled();
      expect(mockRouterReplace).toHaveBeenCalledWith('/(tabs)/tonight');
    });

    it('handleStartTrial still navigates when trial activation fails', async () => {
      mockStartTrial.mockResolvedValueOnce({ success: false });
      const { result } = renderHook(() => useOnboardingFlow());
      await act(async () => {
        await result.current.handleStartTrial();
      });
      expect(mockCompleteOnboarding).toHaveBeenCalled();
      expect(mockRouterReplace).toHaveBeenCalledWith('/(tabs)/tonight');
    });

    it('handleSkipToFree completes onboarding and navigates without starting trial', async () => {
      const { result } = renderHook(() => useOnboardingFlow());
      await act(async () => {
        await result.current.handleSkipToFree();
      });
      expect(mockCompleteOnboarding).toHaveBeenCalled();
      expect(mockStartTrial).not.toHaveBeenCalled();
      expect(mockRouterReplace).toHaveBeenCalledWith('/(tabs)/tonight');
    });
  });

  describe('side effects', () => {
    it('fetchPopularRecipe calls searchRecipes with the chicken seed query', async () => {
      const { result } = renderHook(() => useOnboardingFlow());
      await act(async () => {
        await result.current.fetchPopularRecipe();
      });
      expect(mockSearchRecipes).toHaveBeenCalledWith('chicken', 'themealdb');
      expect(result.current.suggestedRecipe).toEqual(
        expect.objectContaining({ id: 'r1' }),
      );
    });
  });
});
