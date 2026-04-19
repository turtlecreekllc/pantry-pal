/**
 * AI Feedback Service
 * Handles saving and retrieving user feedback on AI responses.
 */

import { supabase } from './supabase';
import { AIFeedback, AIFeedbackInput, AIFeedbackRating } from './types';

/**
 * Submit feedback for an AI response
 */
export async function submitAIFeedback(
  input: AIFeedbackInput,
  householdId?: string | null
): Promise<AIFeedback | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    console.error('[AIFeedback] No authenticated user');
    return null;
  }
  const { data, error } = await supabase
    .from('ai_feedback')
    .insert({
      user_id: userData.user.id,
      household_id: householdId || null,
      message_id: input.messageId,
      user_message: input.userMessage,
      ai_response: input.aiResponse,
      rating: input.rating,
      comment: input.comment || null,
      screen_context: input.screenContext || null,
    })
    .select()
    .single();
  if (error) {
    console.error('[AIFeedback] Error submitting feedback:', error);
    return null;
  }
  return data;
}

/**
 * Update existing feedback (e.g., add a comment)
 */
export async function updateAIFeedback(
  feedbackId: string,
  updates: { rating?: AIFeedbackRating; comment?: string }
): Promise<AIFeedback | null> {
  const { data, error } = await supabase
    .from('ai_feedback')
    .update(updates)
    .eq('id', feedbackId)
    .select()
    .single();
  if (error) {
    console.error('[AIFeedback] Error updating feedback:', error);
    return null;
  }
  return data;
}

/**
 * Delete feedback
 */
export async function deleteAIFeedback(feedbackId: string): Promise<boolean> {
  const { error } = await supabase
    .from('ai_feedback')
    .delete()
    .eq('id', feedbackId);
  if (error) {
    console.error('[AIFeedback] Error deleting feedback:', error);
    return false;
  }
  return true;
}

/**
 * Get all feedback for the current user
 */
export async function getMyFeedback(options?: {
  limit?: number;
  offset?: number;
  rating?: AIFeedbackRating;
}): Promise<AIFeedback[]> {
  let query = supabase
    .from('ai_feedback')
    .select('*')
    .order('created_at', { ascending: false });
  if (options?.rating) {
    query = query.eq('rating', options.rating);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }
  const { data, error } = await query;
  if (error) {
    console.error('[AIFeedback] Error fetching feedback:', error);
    return [];
  }
  return data || [];
}

/**
 * Get feedback statistics for the current user
 */
export async function getFeedbackStats(): Promise<{
  total: number;
  positive: number;
  negative: number;
}> {
  const { data, error } = await supabase
    .from('ai_feedback')
    .select('rating');
  if (error) {
    console.error('[AIFeedback] Error fetching stats:', error);
    return { total: 0, positive: 0, negative: 0 };
  }
  const total = data?.length || 0;
  const positive = data?.filter((f) => f.rating === 'positive').length || 0;
  const negative = data?.filter((f) => f.rating === 'negative').length || 0;
  return { total, positive, negative };
}

/**
 * Check if feedback exists for a specific message
 */
export async function getFeedbackForMessage(
  messageId: string
): Promise<AIFeedback | null> {
  const { data, error } = await supabase
    .from('ai_feedback')
    .select('*')
    .eq('message_id', messageId)
    .maybeSingle();
  if (error) {
    console.error('[AIFeedback] Error checking feedback:', error);
    return null;
  }
  return data;
}

export default {
  submitAIFeedback,
  updateAIFeedback,
  deleteAIFeedback,
  getMyFeedback,
  getFeedbackStats,
  getFeedbackForMessage,
};

