/**
 * useUserPreferences Hook
 * Manages user preferences including onboarding status
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { UserPreferences } from '../lib/types';
import { gamificationService } from '../lib/gamificationService';

type MeasurementSystem = 'imperial' | 'metric';

// Available cooking equipment options
export const COOKING_EQUIPMENT_OPTIONS = [
  { id: 'stovetop', label: 'Stovetop', icon: 'flame-outline' },
  { id: 'oven', label: 'Oven', icon: 'cube-outline' },
  { id: 'microwave', label: 'Microwave', icon: 'radio-outline' },
  { id: 'air_fryer', label: 'Air Fryer', icon: 'thunderstorm-outline' },
  { id: 'grill', label: 'Grill / BBQ', icon: 'bonfire-outline' },
  { id: 'smoker', label: 'Smoker / Pit', icon: 'cloud-outline' },
  { id: 'instant_pot', label: 'Instant Pot', icon: 'timer-outline' },
  { id: 'slow_cooker', label: 'Slow Cooker', icon: 'time-outline' },
] as const;

interface UseUserPreferencesReturn {
  preferences: UserPreferences | null;
  loading: boolean;
  error: string | null;
  // Onboarding
  onboardingCompleted: boolean;
  onboardingStep: number;
  // Measurement System
  measurementSystem: MeasurementSystem;
  setMeasurementSystem: (system: MeasurementSystem) => Promise<boolean>;
  // Cooking Preferences
  highAltitudeCooking: boolean;
  setHighAltitudeCooking: (enabled: boolean) => Promise<boolean>;
  cookingEquipment: string[];
  setCookingEquipment: (equipment: string[]) => Promise<boolean>;
  toggleCookingEquipment: (equipmentId: string) => Promise<boolean>;
  // Actions
  refresh: () => Promise<void>;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<boolean>;
  completeOnboarding: () => Promise<boolean>;
  setOnboardingStep: (step: number) => Promise<boolean>;
}

export function useUserPreferences(): UseUserPreferencesReturn {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch user preferences from database
   */
  const refresh = useCallback(async () => {
    if (!user?.id) {
      setPreferences(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        // If no preferences exist, create them
        if (fetchError.code === 'PGRST116') {
          const { data: newData, error: insertError } = await supabase
            .from('user_preferences')
            .insert({ user_id: user.id })
            .select()
            .single();

          if (insertError) {
            throw insertError;
          }
          setPreferences(newData as UserPreferences);
        } else {
          throw fetchError;
        }
      } else {
        setPreferences(data as UserPreferences);
      }
    } catch (err) {
      console.error('[UserPreferences] Error fetching preferences:', err);
      setError(err instanceof Error ? err.message : 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  /**
   * Update user preferences
   */
  const updatePreferences = useCallback(
    async (updates: Partial<UserPreferences>): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        const { error: updateError } = await supabase
          .from('user_preferences')
          .update(updates)
          .eq('user_id', user.id);

        if (updateError) throw updateError;

        // Update local state
        setPreferences((prev) => (prev ? { ...prev, ...updates } : null));
        return true;
      } catch (err) {
        console.error('[UserPreferences] Error updating preferences:', err);
        return false;
      }
    },
    [user?.id]
  );

  /**
   * Mark onboarding as completed and award achievement
   */
  const completeOnboarding = useCallback(async (): Promise<boolean> => {
    const success = await updatePreferences({
      onboarding_completed: true,
      onboarding_step: 999, // Mark as fully completed
    });
    
    // Award onboarding achievement and bonus tokens
    if (success && user?.id) {
      try {
        const result = await gamificationService.awardOnboardingComplete(user.id);
        if (result.tokensAwarded && result.tokensAwarded > 0) {
          console.log(`[Onboarding] Awarded ${result.tokensAwarded} bonus tokens!`);
        }
      } catch (error) {
        // Don't fail onboarding if achievement fails
        console.warn('[Onboarding] Failed to award achievement:', error);
      }
    }
    
    return success;
  }, [updatePreferences, user?.id]);

  /**
   * Update onboarding step
   */
  const setOnboardingStep = useCallback(
    async (step: number): Promise<boolean> => {
      return updatePreferences({ onboarding_step: step });
    },
    [updatePreferences]
  );

  /**
   * Update measurement system preference
   */
  const setMeasurementSystem = useCallback(
    async (system: MeasurementSystem): Promise<boolean> => {
      return updatePreferences({ measurement_system: system });
    },
    [updatePreferences]
  );

  /**
   * Update high altitude cooking preference
   */
  const setHighAltitudeCooking = useCallback(
    async (enabled: boolean): Promise<boolean> => {
      return updatePreferences({ high_altitude_cooking: enabled });
    },
    [updatePreferences]
  );

  /**
   * Update cooking equipment preference
   */
  const setCookingEquipment = useCallback(
    async (equipment: string[]): Promise<boolean> => {
      return updatePreferences({ cooking_equipment: equipment });
    },
    [updatePreferences]
  );

  /**
   * Toggle a single cooking equipment item
   */
  const toggleCookingEquipment = useCallback(
    async (equipmentId: string): Promise<boolean> => {
      const current = preferences?.cooking_equipment ?? [];
      const updated = current.includes(equipmentId)
        ? current.filter((id) => id !== equipmentId)
        : [...current, equipmentId];
      return updatePreferences({ cooking_equipment: updated });
    },
    [updatePreferences, preferences?.cooking_equipment]
  );

  // Derived values
  const onboardingCompleted = preferences?.onboarding_completed ?? false;
  const onboardingStep = preferences?.onboarding_step ?? 0;
  const measurementSystem: MeasurementSystem = preferences?.measurement_system ?? 'imperial';
  const highAltitudeCooking = preferences?.high_altitude_cooking ?? false;
  const cookingEquipment = preferences?.cooking_equipment ?? ['stovetop', 'oven', 'microwave'];

  return {
    preferences,
    loading,
    error,
    onboardingCompleted,
    onboardingStep,
    measurementSystem,
    setMeasurementSystem,
    highAltitudeCooking,
    setHighAltitudeCooking,
    cookingEquipment,
    setCookingEquipment,
    toggleCookingEquipment,
    refresh,
    updatePreferences,
    completeOnboarding,
    setOnboardingStep,
  };
}

