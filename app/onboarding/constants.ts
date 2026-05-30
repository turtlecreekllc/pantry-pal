import type { HouseholdSize, DietaryNeed } from './types';

export const HOUSEHOLD_OPTIONS: { id: HouseholdSize; emoji: string; label: string; servings: number }[] = [
  { id: 'just-me', emoji: '👤', label: 'Just Me', servings: 1 },
  { id: 'couple', emoji: '👫', label: 'Couple', servings: 2 },
  { id: 'family-small', emoji: '👨‍👩‍👧', label: 'Family (3-4)', servings: 4 },
  { id: 'family-large', emoji: '👨‍👩‍👧‍👦', label: 'Big Family', servings: 6 },
];

export const DIETARY_OPTIONS: { id: DietaryNeed; label: string }[] = [
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'gluten-free', label: 'Gluten-free' },
  { id: 'dairy-free', label: 'Dairy-free' },
  { id: 'low-carb', label: 'Low-carb' },
  { id: 'nut-allergy', label: 'Nut allergy' },
  { id: 'none', label: 'None' },
];

export const COMMON_INGREDIENTS = {
  proteins: ['Chicken', 'Ground Beef', 'Pork', 'Fish', 'Eggs', 'Tofu', 'Shrimp'],
  produce: ['Onions', 'Garlic', 'Tomatoes', 'Potatoes', 'Carrots', 'Broccoli', 'Bell Peppers'],
  dairy: ['Milk', 'Butter', 'Cheese', 'Eggs', 'Yogurt', 'Cream'],
  pantry: ['Pasta', 'Rice', 'Olive Oil', 'Flour', 'Canned Tomatoes', 'Chicken Broth'],
};
