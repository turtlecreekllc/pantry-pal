import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { PantryItem, UsageHistoryEntry } from '../lib/types';
import { useAuth } from '../context/AuthContext';

interface UseItemOptions {
  note?: string;
  recipe_id?: string;
  recipe_name?: string;
  meal_plan_id?: string;
}

interface UsePantryReturn {
  pantryItems: PantryItem[];
  loading: boolean;
  error: string | null;
  addItem: (item: Omit<PantryItem, 'id' | 'user_id' | 'added_at' | 'updated_at'>) => Promise<void>;
  updateItem: (id: string, updates: Partial<PantryItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  useItem: (id: string, amount: number, options?: UseItemOptions) => Promise<void>;
  restoreItem: (id: string, amount: number, mealPlanId: string) => Promise<void>;
  refreshPantry: () => Promise<void>;
}

export function usePantry(): UsePantryReturn {
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchPantryItems = useCallback(async () => {
    if (!user) {
      setPantryItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('pantry_items')
        .select('*')
        .eq('user_id', user.id)
        .order('added_at', { ascending: false });

      if (fetchError) throw fetchError;
      setPantryItems(data || []);
    } catch (err) {
      console.error('Error fetching pantry items:', err);
      setError('Failed to load pantry items');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPantryItems();
  }, [fetchPantryItems]);

  const addItem = async (item: Omit<PantryItem, 'id' | 'user_id' | 'added_at' | 'updated_at'>) => {
    if (!user) {
      const error = new Error('You must be logged in to add items');
      setError(error.message);
      throw error;
    }

    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from('pantry_items')
        .insert({
          ...item,
          user_id: user.id,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Supabase insert error:', insertError);
        throw new Error(insertError.message || 'Database error');
      }
      if (data) {
        setPantryItems((prev) => [data, ...prev]);
      }
    } catch (err: any) {
      console.error('Error adding item:', err);
      const message = err?.message || 'Failed to add item';
      setError(message);
      throw err;
    }
  };

  const updateItem = async (id: string, updates: Partial<PantryItem>) => {
    if (!user) {
      setError('You must be logged in to update items');
      return;
    }

    setError(null);

    try {
      const { data, error: updateError } = await supabase
        .from('pantry_items')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;
      if (data) {
        setPantryItems((prev) =>
          prev.map((item) => (item.id === id ? data : item))
        );
      }
    } catch (err) {
      console.error('Error updating item:', err);
      setError('Failed to update item');
      throw err;
    }
  };

  const deleteItem = async (id: string) => {
    if (!user) {
      setError('You must be logged in to delete items');
      return;
    }

    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('pantry_items')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;
      setPantryItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Error deleting item:', err);
      setError('Failed to delete item');
      throw err;
    }
  };

  const refreshPantry = async () => {
    await fetchPantryItems();
  };

  const useItem = async (id: string, amount: number, options?: UseItemOptions) => {
    if (!user) {
      setError('You must be logged in to use items');
      return;
    }

    setError(null);

    try {
      // Get current item
      const currentItem = pantryItems.find((item) => item.id === id);
      if (!currentItem) {
        throw new Error('Item not found');
      }

      // Calculate new quantity
      const newQuantity = Math.max(0, currentItem.quantity - amount);

      // Create usage history entry
      const usageEntry: UsageHistoryEntry = {
        amount,
        timestamp: new Date().toISOString(),
        note: options?.note,
        recipe_id: options?.recipe_id,
        recipe_name: options?.recipe_name,
        meal_plan_id: options?.meal_plan_id,
      };

      // Get existing usage history
      const existingHistory = currentItem.usage_history || [];
      const newHistory = [...existingHistory, usageEntry];

      // Update in database
      const { data, error: updateError } = await supabase
        .from('pantry_items')
        .update({
          quantity: newQuantity,
          usage_history: newHistory,
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Update local state
      if (data) {
        setPantryItems((prev) =>
          prev.map((item) => (item.id === id ? data : item))
        );
      }
    } catch (err) {
      console.error('Error using item:', err);
      setError('Failed to use item');
      throw err;
    }
  };

  const restoreItem = async (id: string, amount: number, mealPlanId: string) => {
    if (!user) {
      setError('You must be logged in to restore items');
      return;
    }

    setError(null);

    try {
      // Get current item
      const currentItem = pantryItems.find((item) => item.id === id);
      if (!currentItem) {
        // Item may have been deleted, nothing to restore
        return;
      }

      // Calculate restored quantity (don't exceed original if set)
      const originalQuantity = currentItem.original_quantity || currentItem.quantity + amount;
      const newQuantity = Math.min(originalQuantity, currentItem.quantity + amount);

      // Remove usage history entries for this meal plan
      const existingHistory = currentItem.usage_history || [];
      const newHistory = existingHistory.filter((entry) => entry.meal_plan_id !== mealPlanId);

      // Update in database
      const { data, error: updateError } = await supabase
        .from('pantry_items')
        .update({
          quantity: newQuantity,
          usage_history: newHistory,
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Update local state
      if (data) {
        setPantryItems((prev) =>
          prev.map((item) => (item.id === id ? data : item))
        );
      }
    } catch (err) {
      console.error('Error restoring item:', err);
      setError('Failed to restore item');
      throw err;
    }
  };

  return {
    pantryItems,
    loading,
    error,
    addItem,
    updateItem,
    deleteItem,
    useItem,
    restoreItem,
    refreshPantry,
  };
}
