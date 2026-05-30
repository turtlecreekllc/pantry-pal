import type { RecipeSource } from './recipe';

// Meal Plan
export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

// Ingredient deduction for meal completion
export interface IngredientDeduction {
  pantry_item_id: string;
  pantry_item_name: string;
  amount_to_deduct: number;
  unit: string;
  confirmed: boolean;
}

export interface MealPlan {
  id: string;
  user_id: string;
  date: string;
  meal_type: MealType;
  recipe_id: string | null;
  recipe_source: RecipeSource | null;
  recipe_name: string;
  recipe_thumbnail: string | null;
  servings: number;
  notes: string | null;
  is_completed: boolean;
  completed_at: string | null;
  ingredient_deductions: IngredientDeduction[] | null;
  created_at: string;
  updated_at: string;
}

// Meal completion log
export interface MealCompletionLog {
  id: string;
  user_id: string;
  meal_plan_id: string;
  deductions: IngredientDeduction[];
  completed_at: string;
}
