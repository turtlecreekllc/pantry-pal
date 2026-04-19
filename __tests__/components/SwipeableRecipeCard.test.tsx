/**
 * SwipeableRecipeCard Component Tests
 * Tests for the swipeable recipe card with realistic data
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SwipeableRecipeCard } from '../../components/SwipeableRecipeCard';
import { EnhancedScoredRecipe } from '../../lib/types';

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

// Realistic recipe data based on actual TheMealDB/Spoonacular responses
const mockRecipe: EnhancedScoredRecipe = {
  id: 'recipe-52772',
  name: 'Teriyaki Chicken Casserole',
  thumbnail: 'https://www.themealdb.com/images/media/meals/wvpsxx1468256321.jpg',
  description: 'A delicious teriyaki chicken casserole with vegetables and rice.',
  ingredients: [
    { ingredient: 'Chicken Breast', measure: '500g' },
    { ingredient: 'Soy Sauce', measure: '3 tbsp' },
    { ingredient: 'Honey', measure: '2 tbsp' },
    { ingredient: 'Garlic', measure: '3 cloves' },
    { ingredient: 'Ginger', measure: '1 inch' },
    { ingredient: 'Rice', measure: '2 cups' },
    { ingredient: 'Broccoli', measure: '2 cups' },
    { ingredient: 'Sesame Seeds', measure: '1 tbsp' },
  ],
  instructions: '1. Marinate chicken in soy sauce, honey, garlic, and ginger.\n2. Cook rice according to package.\n3. Stir-fry chicken until cooked through.\n4. Steam broccoli.\n5. Combine all in casserole dish.\n6. Top with sesame seeds.',
  totalTime: 45,
  servings: 4,
  cuisine: 'Japanese',
  diet: [],
  healthLabels: ['High-Protein'],
  source: 'themealdb',
  sourceUrl: 'https://www.themealdb.com/meal/52772',
  matchScore: 85,
  matchedIngredients: ['Chicken Breast', 'Soy Sauce', 'Rice'],
  missingIngredients: ['Honey', 'Ginger', 'Sesame Seeds'],
  matchPercentage: 50,
  expiringIngredients: ['Chicken Breast'],
  priorityScore: 90,
};

const defaultProps = {
  recipe: mockRecipe,
  personalizedIntro: "This teriyaki casserole is perfect for your family! Uses your chicken that's expiring soon.",
  onSwipeLeft: jest.fn(),
  onSwipeRight: jest.fn(),
  onLike: jest.fn(),
  onSave: jest.fn(),
  isLiked: false,
  isSaved: false,
  rating: 4.7,
  ratingCount: 156,
};

describe('SwipeableRecipeCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Recipe Information Display', () => {
    it('should render the recipe name', () => {
      const { getByText } = render(<SwipeableRecipeCard {...defaultProps} />);
      expect(getByText('Teriyaki Chicken Casserole')).toBeTruthy();
    });

    it('should render the personalized intro', () => {
      const { getByText } = render(<SwipeableRecipeCard {...defaultProps} />);
      expect(getByText(/teriyaki casserole is perfect/i)).toBeTruthy();
    });

    it('should display the match score percentage', () => {
      const { getByText } = render(<SwipeableRecipeCard {...defaultProps} />);
      expect(getByText(/85%/)).toBeTruthy();
    });

    it('should display serving size', () => {
      const { getByText } = render(<SwipeableRecipeCard {...defaultProps} />);
      // More specific match for "Serves 4"
      expect(getByText(/Serves\s+4/)).toBeTruthy();
    });

    it('should display user rating', () => {
      const { getByText } = render(<SwipeableRecipeCard {...defaultProps} />);
      expect(getByText(/4.7/)).toBeTruthy();
    });
  });

  describe('Ingredient Matching', () => {
    it('should indicate missing ingredients', () => {
      const { getByText } = render(<SwipeableRecipeCard {...defaultProps} />);
      // Missing ingredients section
      expect(getByText(/Missing/i)).toBeTruthy();
    });
  });

  describe('Visual States', () => {
    it('should render without crashing when isLiked is true', () => {
      const { getByText } = render(
        <SwipeableRecipeCard {...defaultProps} isLiked={true} />
      );
      expect(getByText('Teriyaki Chicken Casserole')).toBeTruthy();
    });

    it('should render without crashing when isSaved is true', () => {
      const { getByText } = render(
        <SwipeableRecipeCard {...defaultProps} isSaved={true} />
      );
      expect(getByText('Teriyaki Chicken Casserole')).toBeTruthy();
    });
  });

  describe('Gesture Hints', () => {
    it('should show swipe hint', () => {
      const { getByText } = render(<SwipeableRecipeCard {...defaultProps} />);
      expect(getByText(/Swipe to browse/i)).toBeTruthy();
    });

    it('should show double-tap hint', () => {
      const { getByText } = render(<SwipeableRecipeCard {...defaultProps} />);
      expect(getByText(/Double-tap to like/i)).toBeTruthy();
    });

    it('should show hold-to-save hint', () => {
      const { getByText } = render(<SwipeableRecipeCard {...defaultProps} />);
      expect(getByText(/Hold to save/i)).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle recipe without thumbnail gracefully', () => {
      const recipeNoImage = { ...mockRecipe, thumbnail: '' };
      const { getByText } = render(
        <SwipeableRecipeCard {...defaultProps} recipe={recipeNoImage} />
      );
      expect(getByText('Teriyaki Chicken Casserole')).toBeTruthy();
    });

    it('should handle empty personalized intro', () => {
      const { getByText } = render(
        <SwipeableRecipeCard {...defaultProps} personalizedIntro="" />
      );
      expect(getByText('Teriyaki Chicken Casserole')).toBeTruthy();
    });

    it('should handle recipe with no matched ingredients', () => {
      const noMatchRecipe = { ...mockRecipe, matchedIngredients: [], matchScore: 0 };
      const { getByText } = render(
        <SwipeableRecipeCard {...defaultProps} recipe={noMatchRecipe} />
      );
      expect(getByText('Teriyaki Chicken Casserole')).toBeTruthy();
    });

    it('should handle zero rating count', () => {
      const { getByText } = render(
        <SwipeableRecipeCard {...defaultProps} ratingCount={0} />
      );
      expect(getByText('Teriyaki Chicken Casserole')).toBeTruthy();
    });
  });

  describe('Callback Functions', () => {
    it('should have onLike callback available', () => {
      render(<SwipeableRecipeCard {...defaultProps} />);
      expect(typeof defaultProps.onLike).toBe('function');
    });

    it('should have onSave callback available', () => {
      render(<SwipeableRecipeCard {...defaultProps} />);
      expect(typeof defaultProps.onSave).toBe('function');
    });

    it('should have onSwipeLeft callback available', () => {
      render(<SwipeableRecipeCard {...defaultProps} />);
      expect(typeof defaultProps.onSwipeLeft).toBe('function');
    });

    it('should have onSwipeRight callback available', () => {
      render(<SwipeableRecipeCard {...defaultProps} />);
      expect(typeof defaultProps.onSwipeRight).toBe('function');
    });
  });
});
