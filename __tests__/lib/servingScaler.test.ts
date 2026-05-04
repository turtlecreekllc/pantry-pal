import { scaleIngredients, getSuggestedServings } from '../../lib/servingScaler';
import { RecipeIngredient } from '../../lib/types';

const makeIngredient = (measure: string, ingredient = 'flour'): RecipeIngredient => ({
  ingredient,
  measure,
  strIngredient: ingredient,
  strMeasure: measure,
});

describe('servingScaler', () => {
  describe('scaleIngredients', () => {
    it('scales ingredients by a factor of 2', () => {
      const ingredients = [makeIngredient('1 cup')];
      const result = scaleIngredients(ingredients, 2, 4);
      expect(result[0].measure).toContain('2');
    });

    it('scales down by factor of 0.5', () => {
      const ingredients = [makeIngredient('2 cups')];
      const result = scaleIngredients(ingredients, 4, 2);
      expect(result[0].measure).toContain('1');
    });

    it('preserves originalMeasure', () => {
      const ingredients = [makeIngredient('1 cup')];
      const result = scaleIngredients(ingredients, 1, 2);
      expect(result[0].originalMeasure).toBe('1 cup');
    });

    it('includes scaleFactor in result', () => {
      const ingredients = [makeIngredient('1 cup')];
      const result = scaleIngredients(ingredients, 2, 6);
      expect(result[0].scaleFactor).toBe(3);
    });

    it('handles unparseable measures by returning as-is', () => {
      const ingredients = [makeIngredient('to taste')];
      const result = scaleIngredients(ingredients, 2, 4);
      expect(result[0].measure).toBe('to taste');
      expect(result[0].originalMeasure).toBe('to taste');
    });

    it('handles fraction measures (1/2 cup)', () => {
      const ingredients = [makeIngredient('1/2 cup')];
      const result = scaleIngredients(ingredients, 2, 4);
      // 1/2 * 2 = 1 cup
      expect(result[0].measure).toContain('1');
    });

    it('handles mixed fraction measures (1 1/2 cups)', () => {
      const ingredients = [makeIngredient('1 1/2 cups')];
      const result = scaleIngredients(ingredients, 2, 4);
      // 1.5 * 2 = 3 cups
      expect(result[0].measure).toContain('3');
    });

    it('scales tablespoon measure', () => {
      const ingredients = [makeIngredient('2 tbsp')];
      const result = scaleIngredients(ingredients, 2, 4);
      expect(result[0].measure).toContain('4');
    });

    it('scales oz measure', () => {
      const ingredients = [makeIngredient('4 oz')];
      const result = scaleIngredients(ingredients, 2, 4);
      expect(result[0].measure).toContain('8');
    });

    it('scales gram measure', () => {
      const ingredients = [makeIngredient('100 g')];
      const result = scaleIngredients(ingredients, 2, 4);
      expect(result[0].measure).toContain('200');
    });

    it('preserves ingredient name', () => {
      const ingredients = [makeIngredient('1 cup', 'butter')];
      const result = scaleIngredients(ingredients, 1, 2);
      expect(result[0].ingredient).toBe('butter');
    });

    it('returns empty array for empty input', () => {
      expect(scaleIngredients([], 2, 4)).toEqual([]);
    });

    it('handles scale factor of 1 (no change)', () => {
      const ingredients = [makeIngredient('3 cups')];
      const result = scaleIngredients(ingredients, 4, 4);
      expect(result[0].measure).toContain('3');
    });

    it('converts decimals to fractions when possible', () => {
      const ingredients = [makeIngredient('1 cup')];
      const result = scaleIngredients(ingredients, 4, 2);
      // 0.5 cups → should display as "1/2 cup"
      expect(result[0].measure).toContain('1/2');
    });

    it('rounds grams to nearest 5', () => {
      const ingredients = [makeIngredient('50 g')];
      const result = scaleIngredients(ingredients, 4, 3);
      // 50 * 0.75 = 37.5 → rounds to 40 (nearest 5)
      const val = parseInt(result[0].measure);
      expect(val % 5).toBe(0);
    });
  });

  describe('getSuggestedServings', () => {
    it('always includes 1 and 2', () => {
      const suggestions = getSuggestedServings(4);
      expect(suggestions).toContain(1);
      expect(suggestions).toContain(2);
    });

    it('always includes the original serving size', () => {
      const suggestions = getSuggestedServings(6);
      expect(suggestions).toContain(6);
    });

    it('includes double the original', () => {
      const suggestions = getSuggestedServings(4);
      expect(suggestions).toContain(8);
    });

    it('includes half the original when >= 2', () => {
      const suggestions = getSuggestedServings(6);
      expect(suggestions).toContain(3);
    });

    it('includes common serving sizes', () => {
      const suggestions = getSuggestedServings(3);
      expect(suggestions).toContain(4);
      expect(suggestions).toContain(6);
      expect(suggestions).toContain(8);
    });

    it('returns sorted array', () => {
      const suggestions = getSuggestedServings(5);
      const sorted = [...suggestions].sort((a, b) => a - b);
      expect(suggestions).toEqual(sorted);
    });

    it('does not have duplicates', () => {
      const suggestions = getSuggestedServings(4);
      const unique = new Set(suggestions);
      expect(suggestions.length).toBe(unique.size);
    });

    it('handles original of 1', () => {
      const suggestions = getSuggestedServings(1);
      expect(suggestions).toContain(1);
      expect(suggestions).toContain(2);
    });
  });
});
