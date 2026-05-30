import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSubscription } from '../../hooks/useSubscription';
import { useUserPreferences } from '../../hooks/useUserPreferences';
import { searchRecipes } from '../../lib/recipeService';
import type { RecipePreview } from '../../lib/types';
import { HOUSEHOLD_OPTIONS } from './constants';
import type {
  OnboardingStep,
  HouseholdSize,
  DietaryNeed,
  PantrySeedOption,
} from './types';

export interface OnboardingFlow {
  // State
  step: OnboardingStep;
  householdSize: HouseholdSize | null;
  dietaryNeeds: Set<DietaryNeed>;
  selectedIngredients: Set<string>;
  suggestedRecipe: RecipePreview | null;
  personalizedRecipe: RecipePreview | null;
  loading: boolean;
  preferencesLoading: boolean;
  // Actions
  setStep: (step: OnboardingStep) => void;
  setHouseholdSize: (size: HouseholdSize) => void;
  toggleDietaryNeed: (need: DietaryNeed) => void;
  toggleIngredient: (ingredient: string) => void;
  fetchPopularRecipe: () => Promise<void>;
  handleContinueFromPersonalize: () => Promise<void>;
  handlePantrySeedOption: (option: PantrySeedOption) => void;
  handleChecklistDone: () => void;
  handleStartTrial: () => Promise<void>;
  handleSkipToFree: () => Promise<void>;
  handleEnterApp: () => Promise<void>;
}

export function useOnboardingFlow(): OnboardingFlow {
  const router = useRouter();
  const { startTrial } = useSubscription();
  const {
    onboardingCompleted,
    loading: preferencesLoading,
    updatePreferences,
    completeOnboarding,
  } = useUserPreferences();

  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [householdSize, setHouseholdSize] = useState<HouseholdSize | null>(null);
  const [dietaryNeeds, setDietaryNeeds] = useState<Set<DietaryNeed>>(new Set());
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());
  const [suggestedRecipe, setSuggestedRecipe] = useState<RecipePreview | null>(null);
  const [personalizedRecipe, setPersonalizedRecipe] = useState<RecipePreview | null>(null);
  const [loading, setLoading] = useState(false);

  // Skip onboarding if already completed - wait for preferences to load first
  useEffect(() => {
    if (preferencesLoading) return;
    if (onboardingCompleted) {
      router.replace('/(tabs)/tonight');
    }
  }, [onboardingCompleted, preferencesLoading, router]);

  const fetchPopularRecipe = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const recipes = await searchRecipes('chicken', 'themealdb');
      if (recipes.length > 0) {
        setSuggestedRecipe(recipes[0]);
      }
    } catch (error) {
      console.error('Error fetching recipe:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPersonalizedRecipe = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const ingredientList = Array.from(selectedIngredients);
      const query = ingredientList.length > 0 ? ingredientList[0] : 'chicken';
      const recipes = await searchRecipes(query, 'themealdb');
      if (recipes.length > 0) {
        setPersonalizedRecipe(recipes[0]);
      }
    } catch (error) {
      console.error('Error fetching personalized recipe:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedIngredients]);

  const toggleDietaryNeed = useCallback((need: DietaryNeed): void => {
    setDietaryNeeds((prev) => {
      const next = new Set(prev);
      if (need === 'none') {
        next.clear();
        next.add('none');
      } else {
        next.delete('none');
        if (next.has(need)) {
          next.delete(need);
        } else {
          next.add(need);
        }
      }
      return next;
    });
  }, []);

  const toggleIngredient = useCallback((ingredient: string): void => {
    setSelectedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(ingredient)) {
        next.delete(ingredient);
      } else {
        next.add(ingredient);
      }
      return next;
    });
  }, []);

  const handleContinueFromPersonalize = useCallback(async (): Promise<void> => {
    const householdSizeValue = HOUSEHOLD_OPTIONS.find((h) => h.id === householdSize)?.servings || 2;
    const dietaryArray = Array.from(dietaryNeeds).filter((d) => d !== 'none');

    await updatePreferences({
      household_size: householdSizeValue,
      dietary_preferences: dietaryArray,
      onboarding_step: 1,
    });

    fetchPopularRecipe();
    setStep('first-suggestion');
  }, [householdSize, dietaryNeeds, updatePreferences, fetchPopularRecipe]);

  const handlePantrySeedOption = useCallback((option: PantrySeedOption): void => {
    switch (option) {
      case 'photo':
        Alert.alert('Coming soon', 'Photo scanning will be available in the next update!');
        break;
      case 'voice':
        Alert.alert('Coming soon', 'Voice input will be available in the next update!');
        break;
      case 'checklist':
        setStep('pantry-checklist');
        break;
      case 'skip':
        setStep('subscription');
        break;
    }
  }, []);

  const handleChecklistDone = useCallback((): void => {
    fetchPersonalizedRecipe();
    setStep('personalized-result');
  }, [fetchPersonalizedRecipe]);

  const handleStartTrial = useCallback(async (): Promise<void> => {
    await completeOnboarding();
    const result = await startTrial();
    // Navigate either way — onboarding is complete even if trial activation fails
    if (result.success) {
      router.replace('/(tabs)/tonight');
    } else {
      router.replace('/(tabs)/tonight');
    }
  }, [completeOnboarding, startTrial, router]);

  const handleSkipToFree = useCallback(async (): Promise<void> => {
    await completeOnboarding();
    router.replace('/(tabs)/tonight');
  }, [completeOnboarding, router]);

  const handleEnterApp = useCallback(async (): Promise<void> => {
    await completeOnboarding();
    router.replace('/(tabs)/tonight');
  }, [completeOnboarding, router]);

  return {
    step,
    householdSize,
    dietaryNeeds,
    selectedIngredients,
    suggestedRecipe,
    personalizedRecipe,
    loading,
    preferencesLoading,
    setStep,
    setHouseholdSize,
    toggleDietaryNeed,
    toggleIngredient,
    fetchPopularRecipe,
    handleContinueFromPersonalize,
    handlePantrySeedOption,
    handleChecklistDone,
    handleStartTrial,
    handleSkipToFree,
    handleEnterApp,
  };
}
