import { supabase } from './supabase';
import { ItemClaim } from './types';

/**
 * Gets all claims for a pantry item
 */
export async function getItemClaims(pantryItemId: string): Promise<ItemClaim[]> {
  const { data, error } = await supabase.rpc('get_item_claims_with_email', {
    p_pantry_item_id: pantryItemId,
  });
  if (error) {
    console.warn('Failed to get claims with email, falling back:', error.message);
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('item_claims')
      .select('*')
      .eq('pantry_item_id', pantryItemId);
    if (fallbackError) throw new Error(fallbackError.message);
    return fallbackData || [];
  }
  return data || [];
}

/**
 * Creates a claim on a pantry item
 */
export async function createItemClaim({
  pantryItemId,
  userId,
  note,
}: {
  pantryItemId: string;
  userId: string;
  note?: string;
}): Promise<ItemClaim> {
  const { data, error } = await supabase
    .from('item_claims')
    .insert({
      pantry_item_id: pantryItemId,
      user_id: userId,
      note,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Updates a claim's note
 */
export async function updateItemClaim({
  claimId,
  note,
}: {
  claimId: string;
  note?: string;
}): Promise<ItemClaim> {
  const { data, error } = await supabase
    .from('item_claims')
    .update({ note })
    .eq('id', claimId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Removes a claim from an item
 */
export async function removeItemClaim(claimId: string): Promise<void> {
  const { error } = await supabase.from('item_claims').delete().eq('id', claimId);
  if (error) throw new Error(error.message);
}

/**
 * Checks if user has claimed an item
 */
export async function getUserClaimForItem({
  pantryItemId,
  userId,
}: {
  pantryItemId: string;
  userId: string;
}): Promise<ItemClaim | null> {
  const { data, error } = await supabase
    .from('item_claims')
    .select('*')
    .eq('pantry_item_id', pantryItemId)
    .eq('user_id', userId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(error.message);
  }
  return data;
}

