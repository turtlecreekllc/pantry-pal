import type { RecipePreview } from './recipe';
import type { PantryItem } from './pantry';

// Chat types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  actions?: ChatAction[];
  recipes?: RecipePreview[];
  items?: PantryItem[];
}

export interface ChatAction {
  type: 'view_recipe' | 'add_to_grocery' | 'update_item' | 'view_item';
  label: string;
  data: any;
}
