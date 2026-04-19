/**
 * Pepper Context Service
 * Manages the AI assistant's state and context awareness across the app.
 * Pepper is the friendly AI cooking companion.
 */

import { PantryItem, MealPlan, GroceryItem, EnhancedScoredRecipe } from './types';
import { getExpiringItems } from './tonightService';

/** Pepper's personality phrases */
const PEPPER_PHRASES = {
  expiring_warning: [
    "Ooh, that {item}'s looking lonely—want me to find it some friends?",
    "Hey! That {item} expires tomorrow. Let's use it up!",
    "Time is ticking on {item}—I've got recipe ideas!",
  ],
  empty_day: [
    "{day}'s wide open! I've got some ideas if you want 'em.",
    "Nothing planned for {day}? Let me suggest something delicious!",
    "How about we plan something tasty for {day}?",
  ],
  meal_complete: [
    "Nice! {meal}: crushed it. ✓",
    "Boom! Another meal down. How was {meal}?",
    "{meal}: done and dusted! 🎉",
  ],
  grocery_tip: [
    "Pro tip: tap 'Order on Instacart' and skip the store entirely!",
    "That's a solid list! Want me to organize it by aisle?",
    "Your future self will thank you for ordering delivery! 🛒",
  ],
  scan_complete: [
    "Boom! {count} items added. You're officially stocked!",
    "Nice haul! I added {count} items to your pantry.",
    "All {count} items are in. Ready to cook something amazing?",
  ],
  recipe_suggestion: [
    "Based on what you have, this looks perfect!",
    "You've got almost everything for this one!",
    "This would be great for tonight!",
  ],
  substitution: [
    "No {original}? Try {substitute}—works great!",
    "You can swap {original} for {substitute}, no problem!",
    "Pro tip: {substitute} is a perfect stand-in for {original}!",
  ],
} as const;

/** Screen context types */
export type ScreenContext = 
  | 'tonight'
  | 'plan'
  | 'pantry'
  | 'grocery'
  | 'recipe'
  | 'scan'
  | 'settings';

/** Pepper suggestion types */
export interface PepperSuggestion {
  id: string;
  type: 'recipe' | 'expiring' | 'plan' | 'grocery' | 'tip';
  message: string;
  actionLabel?: string;
  actionData?: unknown;
  priority: number; // 0-100, higher = more important
  expiresAt?: Date;
}

/** Quick action types for FAB long-press */
export interface PepperQuickAction {
  id: string;
  icon: string;
  label: string;
  action: () => void;
}

/** Pepper state for a screen */
export interface PepperState {
  context: ScreenContext;
  hasSuggestion: boolean;
  currentSuggestion: PepperSuggestion | null;
  quickActions: PepperQuickAction[];
}

/**
 * Picks a random phrase from a category
 */
function pickPhrase(
  category: keyof typeof PEPPER_PHRASES,
  replacements: Record<string, string> = {}
): string {
  const phrases = PEPPER_PHRASES[category];
  let phrase = phrases[Math.floor(Math.random() * phrases.length)];
  
  for (const [key, value] of Object.entries(replacements)) {
    phrase = phrase.replace(`{${key}}`, value);
  }
  
  return phrase;
}

/**
 * Generates context-aware suggestions based on current screen and data
 */
export function generateContextualSuggestions(
  context: ScreenContext,
  data: {
    pantryItems?: PantryItem[];
    mealPlans?: MealPlan[];
    groceryItems?: GroceryItem[];
    currentRecipe?: EnhancedScoredRecipe;
  }
): PepperSuggestion[] {
  const suggestions: PepperSuggestion[] = [];
  const now = new Date();
  
  switch (context) {
    case 'tonight':
      // Check for expiring items
      if (data.pantryItems) {
        const expiring = getExpiringItems(data.pantryItems, 2);
        if (expiring.length > 0) {
          suggestions.push({
            id: 'expiring-tonight',
            type: 'expiring',
            message: `🍅 ${expiring.length} item${expiring.length > 1 ? 's' : ''} expiring soon—tap for recipes that use them`,
            actionLabel: 'See recipes',
            priority: 90,
          });
        }
      }
      break;
      
    case 'plan':
      // Check for empty days
      if (data.mealPlans) {
        const weekDays = getWeekDays();
        const plannedDates = new Set(data.mealPlans.map((m) => m.date));
        const emptyDays = weekDays.filter((d) => !plannedDates.has(d.date));
        
        if (emptyDays.length > 0) {
          const dayName = emptyDays[0].dayName;
          suggestions.push({
            id: 'empty-day',
            type: 'plan',
            message: pickPhrase('empty_day', { day: dayName }),
            actionLabel: 'Fill it in',
            priority: 70,
          });
        }
      }
      break;
      
    case 'pantry':
      // Check for expiring items
      if (data.pantryItems) {
        const expiring = getExpiringItems(data.pantryItems, 3);
        if (expiring.length > 0) {
          const itemName = expiring[0].name;
          suggestions.push({
            id: 'expiring-pantry',
            type: 'expiring',
            message: pickPhrase('expiring_warning', { item: itemName }),
            actionLabel: 'Find recipes',
            priority: 85,
          });
        }
      }
      break;
      
    case 'grocery':
      if (data.groceryItems && data.groceryItems.length >= 5) {
        suggestions.push({
          id: 'grocery-tip',
          type: 'grocery',
          message: pickPhrase('grocery_tip'),
          actionLabel: 'Order on Instacart',
          priority: 60,
        });
      }
      break;
      
    case 'recipe':
      if (data.currentRecipe && data.currentRecipe.missingIngredients.length > 0) {
        const missing = data.currentRecipe.missingIngredients.slice(0, 2).join(', ');
        suggestions.push({
          id: 'missing-ingredients',
          type: 'recipe',
          message: `Missing ${missing}? I can suggest substitutions!`,
          actionLabel: 'See substitutions',
          priority: 75,
        });
      }
      break;
  }
  
  // Sort by priority
  return suggestions.sort((a, b) => b.priority - a.priority);
}

/**
 * Gets quick actions for the Pepper FAB based on context
 */
export function getQuickActions(context: ScreenContext): PepperQuickAction[] {
  const commonActions: PepperQuickAction[] = [
    {
      id: 'surprise',
      icon: 'dice-outline',
      label: 'Surprise me with dinner',
      action: () => {},
    },
    {
      id: 'expiring',
      icon: 'warning-outline',
      label: "What's expiring?",
      action: () => {},
    },
  ];
  
  switch (context) {
    case 'tonight':
    case 'plan':
      return [
        ...commonActions,
        {
          id: 'plan-week',
          icon: 'calendar-outline',
          label: 'Plan my week',
          action: () => {},
        },
      ];
      
    case 'pantry':
      return [
        ...commonActions,
        {
          id: 'voice-add',
          icon: 'mic-outline',
          label: 'Voice add items',
          action: () => {},
        },
      ];
      
    case 'grocery':
      return [
        {
          id: 'add-list',
          icon: 'add-outline',
          label: 'Add to grocery list',
          action: () => {},
        },
        {
          id: 'generate-list',
          icon: 'list-outline',
          label: 'Generate from meal plan',
          action: () => {},
        },
      ];
      
    default:
      return commonActions;
  }
}

/**
 * Generates a greeting message from Pepper
 */
export function getPepperGreeting(): string {
  const hour = new Date().getHours();
  const greetings = {
    morning: [
      "Good morning! Ready to plan something delicious?",
      "Morning! Let's figure out today's meals together.",
    ],
    afternoon: [
      "Hey there! Need help with dinner plans?",
      "Afternoon! What are we cooking today?",
    ],
    evening: [
      "Good evening! Let's make dinner happen.",
      "Dinnertime! What sounds good tonight?",
    ],
  };
  
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const options = greetings[timeOfDay];
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Gets the current week's days with their dates
 */
function getWeekDays(): { date: string; dayName: string }[] {
  const days = [];
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayOfWeek + 1);
  
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    days.push({
      date: date.toISOString().split('T')[0],
      dayName: dayNames[i],
    });
  }
  
  return days;
}

/**
 * Formats a scan complete message
 */
export function getScanCompleteMessage(itemCount: number): string {
  return pickPhrase('scan_complete', { count: itemCount.toString() });
}

/**
 * Formats a meal complete message
 */
export function getMealCompleteMessage(mealName: string): string {
  return pickPhrase('meal_complete', { meal: mealName });
}

export default {
  generateContextualSuggestions,
  getQuickActions,
  getPepperGreeting,
  getScanCompleteMessage,
  getMealCompleteMessage,
};

