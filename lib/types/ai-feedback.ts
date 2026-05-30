export const AI_FEEDBACK_RATINGS = ['positive', 'negative'] as const;
export type AIFeedbackRating = (typeof AI_FEEDBACK_RATINGS)[number];

/**
 * AI feedback record for tracking user satisfaction with AI responses
 */
export interface AIFeedback {
  id: string;
  user_id: string;
  household_id: string | null;
  message_id: string;
  user_message: string;
  ai_response: string;
  rating: AIFeedbackRating;
  comment: string | null;
  screen_context: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating AI feedback
 */
export interface AIFeedbackInput {
  messageId: string;
  userMessage: string;
  aiResponse: string;
  rating: AIFeedbackRating;
  comment?: string;
  screenContext?: string;
}
