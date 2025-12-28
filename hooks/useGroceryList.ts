import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { GroceryItem, PantryItem, RecipeIngredient, Aisle } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import { useHouseholdContext } from '../context/HouseholdContext';
import { classifyAisle, sortByAisle, groupByAisle } from '../lib/aisleClassifier';

interface UseGroceryListOptions {
  /** Optional household ID override. If not provided, uses active household from context. */
  householdId?: string | null;
}

interface RecipeWithIngredients {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
  servings?: number;
}

interface GenerateFromRecipesOptions {
  recipes: RecipeWithIngredients[];
  pantryItems?: PantryItem[];
  excludePantryItems?: boolean;
}

interface UseGroceryListReturn {
  groceryItems: GroceryItem[];
  groceryItemsByAisle: Map<Aisle, GroceryItem[]>;
  loading: boolean;
  error: string | null;
  addGroceryItem: (item: Omit<GroceryItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  addGroceryItemWithAisle: (name: string, quantity: number, unit: string) => Promise<void>;
  updateGroceryItem: (id: string, updates: Partial<GroceryItem>) => Promise<void>;
  deleteGroceryItem: (id: string) => Promise<void>;
  toggleChecked: (id: string) => Promise<void>;
  clearCheckedItems: () => Promise<void>;
  refreshGroceryList: () => Promise<void>;
  generateFromRecipes: (options: GenerateFromRecipesOptions) => Promise<number>;
}

export function useGroceryList(options: UseGroceryListOptions = {}): UseGroceryListReturn {
  const { activeHousehold } = useHouseholdContext();
  const householdId = options.householdId !== undefined ? options.householdId : activeHousehold?.id;
  
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const isHouseholdMode = Boolean(householdId);

  const fetchGroceryItems = useCallback(async () => {
    if (!user) {
      setGroceryItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('grocery_items')
        .select('*')
        .order('created_at', { ascending: false });
      if (isHouseholdMode && householdId) {
        query = query.eq('household_id', householdId);
      } else {
        query = query.eq('user_id', user.id).is('household_id', null);
      }
      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setGroceryItems(data || []);
    } catch (err) {
      console.error('Error fetching grocery items:', err);
      setError('Failed to load grocery list');
    } finally {
      setLoading(false);
    }
  }, [user, householdId, isHouseholdMode]);

  useEffect(() => {
    fetchGroceryItems();
  }, [fetchGroceryItems]);

  const addGroceryItem = async (
    item: Omit<GroceryItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => {
    if (!user) {
      setError('Please sign in to add grocery items');
      return;
    }
    try {
      const existing = groceryItems.find(
        (g) => g.name.toLowerCase() === item.name.toLowerCase() && g.unit === item.unit
      );
      if (existing) {
        const { error: updateError } = await supabase
          .from('grocery_items')
          .update({
            quantity: existing.quantity + item.quantity,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        if (updateError) throw updateError;
        setGroceryItems((prev) =>
          prev.map((g) =>
            g.id === existing.id ? { ...g, quantity: g.quantity + item.quantity } : g
          )
        );
      } else {
        const insertData: Record<string, unknown> = {
          ...item,
          user_id: user.id,
        };
        if (isHouseholdMode && householdId) {
          insertData.household_id = householdId;
        }
        const { data, error: insertError } = await supabase
          .from('grocery_items')
          .insert(insertData)
          .select()
          .single();
        if (insertError) throw insertError;
        setGroceryItems((prev) => [data, ...prev]);
      }
    } catch (err) {
      console.error('Error adding grocery item:', err);
      setError('Failed to add grocery item');
      throw err;
    }
  };

  const updateGroceryItem = async (id: string, updates: Partial<GroceryItem>) => {
    if (!user) return;
    try {
      let query = supabase
        .from('grocery_items')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (isHouseholdMode && householdId) {
        query = query.eq('household_id', householdId);
      } else {
        query = query.eq('user_id', user.id);
      }
      const { error: updateError } = await query;
      if (updateError) throw updateError;
      setGroceryItems((prev) =>
        prev.map((g) => (g.id === id ? { ...g, ...updates } : g))
      );
    } catch (err) {
      console.error('Error updating grocery item:', err);
      throw err;
    }
  };

  const deleteGroceryItem = async (id: string) => {
    if (!user) return;
    try {
      let query = supabase.from('grocery_items').delete().eq('id', id);
      if (isHouseholdMode && householdId) {
        query = query.eq('household_id', householdId);
      } else {
        query = query.eq('user_id', user.id);
      }
      const { error: deleteError } = await query;
      if (deleteError) throw deleteError;
      setGroceryItems((prev) => prev.filter((g) => g.id !== id));
    } catch (err) {
      console.error('Error deleting grocery item:', err);
      throw err;
    }
  };

  const toggleChecked = async (id: string) => {
    const item = groceryItems.find((g) => g.id === id);
    if (!item) return;

    await updateGroceryItem(id, { is_checked: !item.is_checked });
  };

  const clearCheckedItems = async () => {
    if (!user) return;
    try {
      const checkedIds = groceryItems.filter((g) => g.is_checked).map((g) => g.id);
      if (checkedIds.length === 0) return;
      let query = supabase.from('grocery_items').delete().in('id', checkedIds);
      if (isHouseholdMode && householdId) {
        query = query.eq('household_id', householdId);
      } else {
        query = query.eq('user_id', user.id);
      }
      const { error: deleteError } = await query;
      if (deleteError) throw deleteError;
      setGroceryItems((prev) => prev.filter((g) => !g.is_checked));
    } catch (err) {
      console.error('Error clearing checked items:', err);
      throw err;
    }
  };

  /**
   * Add a grocery item with automatic aisle classification
   */
  const addGroceryItemWithAisle = async (name: string, quantity: number, unit: string) => {
    const aisle = classifyAisle(name);
    await addGroceryItem({
      name,
      quantity,
      unit,
      aisle,
      is_checked: false,
      recipe_id: null,
      recipe_name: null,
      meal_plan_id: null,
    });
  };

  /**
   * Generate grocery list from recipes, optionally excluding items already in pantry
   */
  const generateFromRecipes = async (options: GenerateFromRecipesOptions): Promise<number> => {
    const { recipes, pantryItems = [], excludePantryItems = true } = options;

    // Consolidate ingredients from all recipes
    const ingredientMap = new Map<string, { quantity: number; unit: string; aisle: Aisle }>();

    for (const recipe of recipes) {
      for (const ingredient of recipe.ingredients) {
        const name = ingredient.ingredient.toLowerCase().trim();
        const existing = ingredientMap.get(name);

        // Parse quantity from measure
        let quantity = 1;
        let unit = '';
        if (ingredient.measure) {
          const match = ingredient.measure.match(/^(\d+\.?\d*)\s*(.*)$/);
          if (match) {
            quantity = parseFloat(match[1]) || 1;
            unit = match[2]?.trim() || '';
          } else {
            unit = ingredient.measure;
          }
        }

        if (existing) {
          // Add to existing if same unit, otherwise keep higher quantity
          if (existing.unit.toLowerCase() === unit.toLowerCase()) {
            ingredientMap.set(name, {
              ...existing,
              quantity: existing.quantity + quantity,
            });
          } else if (quantity > existing.quantity) {
            ingredientMap.set(name, {
              quantity,
              unit,
              aisle: classifyAisle(name),
            });
          }
        } else {
          ingredientMap.set(name, {
            quantity,
            unit,
            aisle: classifyAisle(name),
          });
        }
      }
    }

    // Filter out items already in pantry if requested
    if (excludePantryItems && pantryItems.length > 0) {
      const pantryNames = new Set(
        pantryItems.map((item) => item.name.toLowerCase().trim())
      );

      for (const [name] of ingredientMap) {
        // Check if any pantry item name contains this ingredient or vice versa
        for (const pantryName of pantryNames) {
          if (pantryName.includes(name) || name.includes(pantryName)) {
            ingredientMap.delete(name);
            break;
          }
        }
      }
    }

    // Add items to grocery list
    let addedCount = 0;
    for (const [name, details] of ingredientMap) {
      try {
        await addGroceryItem({
          name: name.charAt(0).toUpperCase() + name.slice(1), // Capitalize
          quantity: details.quantity,
          unit: details.unit,
          aisle: details.aisle,
          is_checked: false,
          recipe_id: null,
          recipe_name: null,
          meal_plan_id: null,
        });
        addedCount++;
      } catch (error) {
        console.error(`Error adding ${name} to grocery list:`, error);
      }
    }

    return addedCount;
  };

  // Group items by aisle
  const groceryItemsByAisle = groupByAisle(groceryItems);

  return {
    groceryItems,
    groceryItemsByAisle,
    loading,
    error,
    addGroceryItem,
    addGroceryItemWithAisle,
    updateGroceryItem,
    deleteGroceryItem,
    toggleChecked,
    clearCheckedItems,
    refreshGroceryList: fetchGroceryItems,
    generateFromRecipes,
  };
}
