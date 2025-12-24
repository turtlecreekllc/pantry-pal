import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { PantryItem } from '../lib/types';
import { useAuth } from '../context/AuthContext';

interface UsePantryReturn {
  pantryItems: PantryItem[];
  loading: boolean;
  error: string | null;
  addItem: (item: Omit<PantryItem, 'id' | 'user_id' | 'added_at' | 'updated_at'>) => Promise<void>;
  updateItem: (id: string, updates: Partial<PantryItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
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
      setError('You must be logged in to add items');
      return;
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

      if (insertError) throw insertError;
      if (data) {
        setPantryItems((prev) => [data, ...prev]);
      }
    } catch (err) {
      console.error('Error adding item:', err);
      setError('Failed to add item');
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

  return {
    pantryItems,
    loading,
    error,
    addItem,
    updateItem,
    deleteItem,
    refreshPantry,
  };
}
