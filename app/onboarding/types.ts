export type OnboardingStep =
  | 'welcome'
  | 'personalize'
  | 'first-suggestion'
  | 'pantry-seed'
  | 'pantry-checklist'
  | 'personalized-result'
  | 'subscription';

export type HouseholdSize = 'just-me' | 'couple' | 'family-small' | 'family-large';

export type DietaryNeed = 'vegetarian' | 'gluten-free' | 'dairy-free' | 'low-carb' | 'nut-allergy' | 'none';

export type PantrySeedOption = 'photo' | 'voice' | 'checklist' | 'skip';
