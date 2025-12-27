import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { MealPlan, MealType, IngredientDeduction, RecipeSource } from '../lib/types';
import { useAuth } from '../context/AuthContext';

interface AddMealPlanOptions {
  deductions?: IngredientDeduction[];
  onDeduct?: (itemId: string, amount: number, options: { recipe_id?: string; recipe_name?: string; meal_plan_id: string }) => Promise<void>;
}

interface DeleteMealPlanOptions {
  onRestore?: (itemId: string, amount: number, mealPlanId: string) => Promise<void>;
}

interface UseMealPlansReturn {
  mealPlans: MealPlan[];
  loading: boolean;
  error: string | null;
  getMealsForDate: (date: string) => MealPlan[];
  getMealsForMonth: (year: number, month: number) => MealPlan[];
  addMealPlan: (plan: Omit<MealPlan, 'id' | 'user_id' | 'created_at' | 'updated_at'>, options?: AddMealPlanOptions) => Promise<string | undefined>;
  updateMealPlan: (id: string, updates: Partial<MealPlan>) => Promise<void>;
  deleteMealPlan: (id: string, options?: DeleteMealPlanOptions) => Promise<void>;
  completeMeal: (id: string, deductions: IngredientDeduction[]) => Promise<void>;
  refreshMealPlans: () => Promise<void>;
}

export function useMealPlans(): UseMealPlansReturn {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchMealPlans = useCallback(async () => {
    if (!user) {
      setMealPlans([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch meal plans for current month and next month
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      const endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);

      const { data, error: fetchError } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (fetchError) throw fetchError;
      setMealPlans(data || []);
    } catch (err) {
      console.error('Error fetching meal plans:', err);
      setError('Failed to load meal plans');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMealPlans();
  }, [fetchMealPlans]);

  const getMealsForDate = useCallback(
    (date: string): MealPlan[] => {
      return mealPlans.filter((m) => m.date === date);
    },
    [mealPlans]
  );

  const getMealsForMonth = useCallback(
    (year: number, month: number): MealPlan[] => {
      return mealPlans.filter((m) => {
        const planDate = new Date(m.date);
        return planDate.getFullYear() === year && planDate.getMonth() === month;
      });
    },
    [mealPlans]
  );

  const addMealPlan = async (
    plan: Omit<MealPlan, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
    options?: AddMealPlanOptions
  ): Promise<string | undefined> => {
    if (!user) {
      setError('Please sign in to create meal plans');
      return;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('meal_plans')
        .insert({
          ...plan,
          user_id: user.id,
          ingredient_deductions: options?.deductions || null,
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          // Unique constraint - meal already exists for this slot
          setError('A meal is already planned for this time');
          return;
        }
        throw insertError;
      }

      // Apply deductions to pantry items
      if (options?.deductions && options?.onDeduct) {
        for (const deduction of options.deductions) {
          if (deduction.confirmed) {
            await options.onDeduct(
              deduction.pantry_item_id,
              deduction.amount_to_deduct,
              {
                recipe_id: plan.recipe_id || undefined,
                recipe_name: plan.recipe_name,
                meal_plan_id: data.id,
              }
            );
          }
        }
      }

      setMealPlans((prev) => [...prev, data].sort((a, b) => a.date.localeCompare(b.date)));
      return data.id;
    } catch (err) {
      console.error('Error adding meal plan:', err);
      setError('Failed to add meal plan');
      throw err;
    }
  };

  const updateMealPlan = async (id: string, updates: Partial<MealPlan>) => {
    if (!user) return;

    try {
      const { error: updateError } = await supabase
        .from('meal_plans')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setMealPlans((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
      );
    } catch (err) {
      console.error('Error updating meal plan:', err);
      throw err;
    }
  };

  const deleteMealPlan = async (id: string, options?: DeleteMealPlanOptions) => {
    if (!user) return;

    try {
      // Get the meal plan first to restore deductions
      const mealPlan = mealPlans.find((m) => m.id === id);

      // Restore pantry items if there were deductions
      if (mealPlan?.ingredient_deductions && options?.onRestore) {
        for (const deduction of mealPlan.ingredient_deductions) {
          if (deduction.confirmed) {
            await options.onRestore(
              deduction.pantry_item_id,
              deduction.amount_to_deduct,
              id
            );
          }
        }
      }

      const { error: deleteError } = await supabase
        .from('meal_plans')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      setMealPlans((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error('Error deleting meal plan:', err);
      throw err;
    }
  };

  const completeMeal = async (id: string, deductions: IngredientDeduction[]) => {
    if (!user) return;

    try {
      // Mark the meal as completed
      await supabase
        .from('meal_plans')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id);

      // Log the completion with deductions
      const confirmedDeductions = deductions.filter((d) => d.confirmed);
      if (confirmedDeductions.length > 0) {
        await supabase.from('meal_completion_logs').insert({
          user_id: user.id,
          meal_plan_id: id,
          deductions: confirmedDeductions,
        });

        // Apply deductions to pantry items
        for (const deduction of confirmedDeductions) {
          const { data: item } = await supabase
            .from('pantry_items')
            .select('quantity')
            .eq('id', deduction.pantry_item_id)
            .single();

          if (item) {
            const newQuantity = Math.max(0, item.quantity - deduction.amount_to_deduct);
            if (newQuantity <= 0) {
              await supabase
                .from('pantry_items')
                .delete()
                .eq('id', deduction.pantry_item_id);
            } else {
              await supabase
                .from('pantry_items')
                .update({ quantity: newQuantity })
                .eq('id', deduction.pantry_item_id);
            }
          }
        }
      }

      // Update local state
      setMealPlans((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...m, is_completed: true, completed_at: new Date().toISOString() }
            : m
        )
      );
    } catch (err) {
      console.error('Error completing meal:', err);
      throw err;
    }
  };

  return {
    mealPlans,
    loading,
    error,
    getMealsForDate,
    getMealsForMonth,
    addMealPlan,
    updateMealPlan,
    deleteMealPlan,
    completeMeal,
    refreshMealPlans: fetchMealPlans,
  };
}
