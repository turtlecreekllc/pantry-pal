import type { EnhancedScoredRecipe } from './recipe';

/**
 * Tonight preferences stored in user profile
 */
export interface TonightPreferences {
  preferred_cuisines?: string[];
  avoided_cuisines?: string[];
  max_cook_time?: number;
  default_servings?: number;
  prioritize_expiring?: boolean;
}

/**
 * Tonight suggestion with match reasoning
 */
export interface TonightSuggestion {
  recipe: EnhancedScoredRecipe;
  reason: string;
  isTopPick: boolean;
  pepperExplanation?: string;
}

/**
 * Quick category for empty state
 */
export interface QuickCategory {
  id: string;
  emoji: string;
  label: string;
  query?: string;
}
