import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { PantryItem, UsageHistoryEntry } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import { useHouseholdContext } from '../context/HouseholdContext';
import { logActivity } from '../lib/householdService';
import { gamificationService } from '../lib/gamificationService';
import {
  scheduleItemExpiryNotification,
  cancelItemExpiryNotification,
} from '../lib/notificationScheduler';
import { invalidateTonightCache } from '../lib/tonightCacheService';

interface UseItemOptions {
  note?: string;
  recipe_id?: string;
  recipe_name?: string;
  meal_plan_id?: string;
}

interface UsePantryOptions {
  /** Optional household ID override. If not provided, uses active household from context. */
  householdId?: string | null;
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
  refreshPantry: (silent?: boolean) => Promise<void>;
}

export function usePantry(options: UsePantryOptions = {}): UsePantryReturn {
  const { activeHousehold } = useHouseholdContext();
  // specific ID > active household > null (personal)
  const householdId = options.householdId !== undefined ? options.householdId : activeHousehold?.id;
  
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const isHouseholdMode = Boolean(householdId);

  const fetchPantryItems = useCallback(async (silent = false) => {
    if (!user) {
      setPantryItems([]);
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('pantry_items')
        .select('*')
        .order('added_at', { ascending: false });
      if (isHouseholdMode && householdId) {
        query = query.eq('household_id', householdId);
      } else {
        query = query.eq('user_id', user.id).is('household_id', null);
      }
      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setPantryItems(data || []);
    } catch (err) {
      console.error('Error fetching pantry items:', err);
      setError('Failed to load pantry items');
    } finally {
      setLoading(false);
    }
  }, [user, householdId, isHouseholdMode]);

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
      const insertData: Record<string, unknown> = {
        ...item,
        user_id: user.id,
      };
      if (isHouseholdMode && householdId) {
        insertData.household_id = householdId;
      }
      const { data, error: insertError } = await supabase
        .from('pantry_items')
        .insert(insertData)
        .select()
        .single();
      if (insertError) {
        console.error('Supabase insert error:', insertError);
        throw new Error(insertError.message || 'Database error');
      }
      if (data) {
        setPantryItems((prev) => [data, ...prev]);
        if (isHouseholdMode && householdId) {
          logActivity({
            householdId,
            userId: user.id,
            actionType: 'item_added',
            actionData: { item_name: item.name, quantity: item.quantity },
          });
          // New pantry item → tonight's suggestions may change; invalidate cache
          invalidateTonightCache(householdId).catch(() => {});
        }
        if (item.expiration_date) {
          scheduleItemExpiryNotification({
            userId: user.id,
            itemId: data.id,
            itemName: item.name,
            expiryDate: item.expiration_date,
          });
        }
      }
    } catch (err: unknown) {
      console.error('Error adding item:', err);
      const message = err instanceof Error ? err.message : 'Failed to add item';
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
      let query = supabase.from('pantry_items').update(updates).eq('id', id);
      if (isHouseholdMode && householdId) {
        query = query.eq('household_id', householdId);
      } else {
        query = query.eq('user_id', user.id);
      }
      const { data, error: updateError } = await query.select().single();
      if (updateError) throw updateError;
      if (data) {
        setPantryItems((prev) =>
          prev.map((item) => (item.id === id ? data : item))
        );
        if (isHouseholdMode && householdId) {
          logActivity({
            householdId,
            userId: user.id,
            actionType: 'item_updated',
            actionData: { item_id: id, updates },
          });
        }
        if (updates.expiration_date !== undefined) {
          if (updates.expiration_date) {
            scheduleItemExpiryNotification({
              userId: user.id,
              itemId: id,
              itemName: data.name,
              expiryDate: updates.expiration_date,
            });
          } else {
            cancelItemExpiryNotification(id);
          }
        }
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
      const itemToDelete = pantryItems.find((item) => item.id === id);
      let query = supabase.from('pantry_items').delete().eq('id', id);
      if (isHouseholdMode && householdId) {
        query = query.eq('household_id', householdId);
      } else {
        query = query.eq('user_id', user.id);
      }
      const { error: deleteError } = await query;
      if (deleteError) throw deleteError;
      setPantryItems((prev) => prev.filter((item) => item.id !== id));
      cancelItemExpiryNotification(id);
      if (isHouseholdMode && householdId && itemToDelete) {
        logActivity({
          householdId,
          userId: user.id,
          actionType: 'item_deleted',
          actionData: { item_name: itemToDelete.name },
        });
        // Pantry item removed → tonight's suggestions may change; invalidate cache
        invalidateTonightCache(householdId).catch(() => {});
      }
    } catch (err) {
      console.error('Error deleting item:', err);
      setError('Failed to delete item');
      throw err;
    }
  };

  const refreshPantry = async (silent = false) => {
    await fetchPantryItems(silent);
  };

  const useItem = async (id: string, amount: number, options?: UseItemOptions) => {
    if (!user) {
      setError('You must be logged in to use items');
      return;
    }
    setError(null);
    try {
      const currentItem = pantryItems.find((item) => item.id === id);
      if (!currentItem) {
        throw new Error('Item not found');
      }
      const newQuantity = Math.max(0, currentItem.quantity - amount);
      const usageEntry: UsageHistoryEntry = {
        amount,
        timestamp: new Date().toISOString(),
        note: options?.note,
        recipe_id: options?.recipe_id,
        recipe_name: options?.recipe_name,
        meal_plan_id: options?.meal_plan_id,
      };
      const existingHistory = currentItem.usage_history || [];
      const newHistory = [...existingHistory, usageEntry];
      let query = supabase
        .from('pantry_items')
        .update({
          quantity: newQuantity,
          usage_history: newHistory,
        })
        .eq('id', id);
      if (isHouseholdMode && householdId) {
        query = query.eq('household_id', householdId);
      } else {
        query = query.eq('user_id', user.id);
      }
      const { data, error: updateError } = await query.select().single();
      if (updateError) throw updateError;
      if (data) {
        setPantryItems((prev) =>
          prev.map((item) => (item.id === id ? data : item))
        );
        
        // Record impact
        await gamificationService.recordImpact(
          user.id,
          currentItem,
          'rescued',
          amount,
          isHouseholdMode ? householdId : null
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
      const currentItem = pantryItems.find((item) => item.id === id);
      if (!currentItem) {
        return;
      }
      const originalQuantity = currentItem.original_quantity || currentItem.quantity + amount;
      const newQuantity = Math.min(originalQuantity, currentItem.quantity + amount);
      const existingHistory = currentItem.usage_history || [];
      const newHistory = existingHistory.filter((entry) => entry.meal_plan_id !== mealPlanId);
      let query = supabase
        .from('pantry_items')
        .update({
          quantity: newQuantity,
          usage_history: newHistory,
        })
        .eq('id', id);
      if (isHouseholdMode && householdId) {
        query = query.eq('household_id', householdId);
      } else {
        query = query.eq('user_id', user.id);
      }
      const { data, error: updateError } = await query.select().single();
      if (updateError) throw updateError;
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
