import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { GroceryItem } from '../lib/types';
import { useAuth } from '../context/AuthContext';

interface UseGroceryListReturn {
  groceryItems: GroceryItem[];
  loading: boolean;
  error: string | null;
  addGroceryItem: (item: Omit<GroceryItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateGroceryItem: (id: string, updates: Partial<GroceryItem>) => Promise<void>;
  deleteGroceryItem: (id: string) => Promise<void>;
  toggleChecked: (id: string) => Promise<void>;
  clearCheckedItems: () => Promise<void>;
  refreshGroceryList: () => Promise<void>;
}

export function useGroceryList(): UseGroceryListReturn {
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchGroceryItems = useCallback(async () => {
    if (!user) {
      setGroceryItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('grocery_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setGroceryItems(data || []);
    } catch (err) {
      console.error('Error fetching grocery items:', err);
      setError('Failed to load grocery list');
    } finally {
      setLoading(false);
    }
  }, [user]);

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
      // Check if item already exists
      const existing = groceryItems.find(
        (g) => g.name.toLowerCase() === item.name.toLowerCase() && g.unit === item.unit
      );

      if (existing) {
        // Update existing item quantity
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
        const { data, error: insertError } = await supabase
          .from('grocery_items')
          .insert({
            ...item,
            user_id: user.id,
          })
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
      const { error: updateError } = await supabase
        .from('grocery_items')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);

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
      const { error: deleteError } = await supabase
        .from('grocery_items')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

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

      const { error: deleteError } = await supabase
        .from('grocery_items')
        .delete()
        .in('id', checkedIds)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      setGroceryItems((prev) => prev.filter((g) => !g.is_checked));
    } catch (err) {
      console.error('Error clearing checked items:', err);
      throw err;
    }
  };

  return {
    groceryItems,
    loading,
    error,
    addGroceryItem,
    updateGroceryItem,
    deleteGroceryItem,
    toggleChecked,
    clearCheckedItems,
    refreshGroceryList: fetchGroceryItems,
  };
}
