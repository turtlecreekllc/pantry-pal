export const PEPPER_CONTEXT_TYPES = ['tonight', 'plan', 'pantry', 'grocery', 'recipe', 'general'] as const;
export type PepperContextType = (typeof PEPPER_CONTEXT_TYPES)[number];

/**
 * Pepper conversation context
 */
export interface PepperContext {
  id: string;
  user_id: string;
  context_type: PepperContextType;
  context_data: Record<string, unknown>;
  last_interaction_at: string;
  created_at: string;
}

/**
 * Pepper suggestion record
 */
export interface PepperSuggestionRecord {
  id: string;
  user_id: string;
  suggestion_type: string;
  suggestion_data: Record<string, unknown>;
  context_type: PepperContextType;
  shown_at: string;
  acted_upon: boolean;
  acted_at: string | null;
  dismissed: boolean;
  dismissed_at: string | null;
}

/**
 * Recipe rejection tracking
 */
export interface RecipeRejection {
  id: string;
  user_id: string;
  recipe_id: string;
  rejection_reason: string | null;
  context: string;
  created_at: string;
}
