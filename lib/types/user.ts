// User type from Supabase
export interface User {
  id: string;
  email: string;
  created_at: string;
}

// User preferences
export interface UserPreferences {
  id: string;
  user_id: string;
  // Household & Family
  household_size: number;
  has_children: boolean;
  children_ages: number[];
  // Dietary Preferences
  dietary_preferences: string[];
  allergies: string[];
  disliked_ingredients: string[];
  favorite_cuisines: string[];
  // Cooking Preferences
  cooking_skill: 'beginner' | 'intermediate' | 'advanced';
  max_cook_time: number;
  preferred_meal_types: string[];
  cooking_equipment: string[]; // ['stovetop', 'oven', 'microwave', 'air_fryer', 'grill', 'smoker', 'instant_pot', 'slow_cooker']
  high_altitude_cooking: boolean; // Adjustments for 3,000+ feet elevation
  // Notifications
  notification_dinner_time: string;
  notifications_enabled: boolean;
  weekly_summary_enabled: boolean;
  // Onboarding & App State
  onboarding_completed: boolean;
  onboarding_step: number;
  has_seen_tutorial: boolean;
  // Theme & Display
  theme: 'light' | 'dark' | 'system';
  measurement_system: 'imperial' | 'metric';
  // Timestamps
  created_at: string;
  updated_at: string;
}
