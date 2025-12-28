import { supabase } from './supabase';
import { MealRSVP, MealAssignment, RSVPStatus } from './types';

// =====================================================
// MEAL RSVP FUNCTIONS
// =====================================================

/**
 * Gets all RSVPs for a meal plan
 */
export async function getMealRSVPs(mealPlanId: string): Promise<MealRSVP[]> {
  const { data, error } = await supabase.rpc('get_meal_rsvps_with_email', {
    p_meal_plan_id: mealPlanId,
  });
  if (error) {
    console.warn('Failed to get RSVPs with email, falling back:', error.message);
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('meal_rsvps')
      .select('*')
      .eq('meal_plan_id', mealPlanId);
    if (fallbackError) throw new Error(fallbackError.message);
    return fallbackData || [];
  }
  return data || [];
}

/**
 * Gets user's RSVP for a meal
 */
export async function getUserRSVP({
  mealPlanId,
  userId,
}: {
  mealPlanId: string;
  userId: string;
}): Promise<MealRSVP | null> {
  const { data, error } = await supabase
    .from('meal_rsvps')
    .select('*')
    .eq('meal_plan_id', mealPlanId)
    .eq('user_id', userId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(error.message);
  }
  return data;
}

/**
 * Creates or updates an RSVP
 */
export async function upsertRSVP({
  mealPlanId,
  userId,
  status,
  servings,
  note,
}: {
  mealPlanId: string;
  userId: string;
  status: RSVPStatus;
  servings?: number;
  note?: string;
}): Promise<MealRSVP> {
  const { data, error } = await supabase
    .from('meal_rsvps')
    .upsert(
      {
        meal_plan_id: mealPlanId,
        user_id: userId,
        status,
        servings: servings || 1,
        note,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'meal_plan_id,user_id',
      }
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Deletes an RSVP
 */
export async function deleteRSVP(rsvpId: string): Promise<void> {
  const { error } = await supabase.from('meal_rsvps').delete().eq('id', rsvpId);
  if (error) throw new Error(error.message);
}

/**
 * Gets RSVP summary for a meal (counts by status)
 */
export async function getRSVPSummary(mealPlanId: string): Promise<{
  attending: number;
  notAttending: number;
  maybe: number;
  totalServings: number;
}> {
  const rsvps = await getMealRSVPs(mealPlanId);
  const attending = rsvps.filter((r) => r.status === 'attending');
  return {
    attending: attending.length,
    notAttending: rsvps.filter((r) => r.status === 'not_attending').length,
    maybe: rsvps.filter((r) => r.status === 'maybe').length,
    totalServings: attending.reduce((sum, r) => sum + (r.servings || 1), 0),
  };
}

// =====================================================
// MEAL ASSIGNMENT FUNCTIONS
// =====================================================

/**
 * Gets all assignments for a meal plan
 */
export async function getMealAssignments(mealPlanId: string): Promise<MealAssignment[]> {
  const { data, error } = await supabase.rpc('get_meal_assignments_with_email', {
    p_meal_plan_id: mealPlanId,
  });
  if (error) {
    console.warn('Failed to get assignments with email, falling back:', error.message);
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('meal_assignments')
      .select('*')
      .eq('meal_plan_id', mealPlanId);
    if (fallbackError) throw new Error(fallbackError.message);
    return fallbackData || [];
  }
  return data || [];
}

/**
 * Assigns a member to cook a meal
 */
export async function assignMealToCook({
  mealPlanId,
  userId,
  assignedBy,
}: {
  mealPlanId: string;
  userId: string;
  assignedBy: string;
}): Promise<MealAssignment> {
  const { data, error } = await supabase
    .from('meal_assignments')
    .insert({
      meal_plan_id: mealPlanId,
      user_id: userId,
      assigned_by: assignedBy,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Removes a cooking assignment
 */
export async function removeAssignment(assignmentId: string): Promise<void> {
  const { error } = await supabase.from('meal_assignments').delete().eq('id', assignmentId);
  if (error) throw new Error(error.message);
}

/**
 * Checks if user is assigned to a meal
 */
export async function isUserAssigned({
  mealPlanId,
  userId,
}: {
  mealPlanId: string;
  userId: string;
}): Promise<boolean> {
  const { data, error } = await supabase
    .from('meal_assignments')
    .select('id')
    .eq('meal_plan_id', mealPlanId)
    .eq('user_id', userId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return false;
    throw new Error(error.message);
  }
  return !!data;
}

