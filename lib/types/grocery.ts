import type { Aisle } from './pantry';

// Grocery list (container for grocery items)
export interface GroceryList {
  id: string;
  user_id: string;
  household_id: string | null;
  name: string;
  description: string | null;
  status: 'active' | 'completed' | 'archived';
  source: 'manual' | 'meal_plan' | 'pantry' | 'recipe';
  source_date_range_start: string | null;
  source_date_range_end: string | null;
  item_count: number;
  checked_count: number;
  total_estimated_cost: number | null;
  created_at: string;
  updated_at: string;
}

// Grocery list item
export interface GroceryItem {
  id: string;
  user_id: string;
  household_id?: string | null;
  list_id?: string | null;
  name: string;
  quantity: number;
  unit: string;
  recipe_id: string | null;
  recipe_name: string | null;
  is_checked: boolean;
  aisle: Aisle | null;
  meal_plan_id: string | null;
  estimated_price?: number | null;
  notes?: string | null;
  priority?: number;
  created_at: string;
  updated_at: string;
}
