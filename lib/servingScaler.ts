import { RecipeIngredient } from './types';

export interface ScaledIngredient extends RecipeIngredient {
  originalMeasure: string;
  scaleFactor: number;
}

/**
 * Parse a measure string into numeric value and unit
 */
function parseMeasure(measure: string): { value: number; unit: string; fraction?: string } | null {
  if (!measure) return null;

  const normalized = measure.trim().toLowerCase();

  // Handle fractions like "1/2", "3/4"
  const fractionMatch = normalized.match(/^(\d+)?\s*(\d+)\/(\d+)\s*(.*)$/);
  if (fractionMatch) {
    const whole = fractionMatch[1] ? parseInt(fractionMatch[1]) : 0;
    const numerator = parseInt(fractionMatch[2]);
    const denominator = parseInt(fractionMatch[3]);
    const unit = fractionMatch[4]?.trim() || '';
    const value = whole + numerator / denominator;
    return { value, unit, fraction: `${numerator}/${denominator}` };
  }

  // Handle decimal numbers
  const decimalMatch = normalized.match(/^(\d+\.?\d*)\s*(.*)$/);
  if (decimalMatch) {
    const value = parseFloat(decimalMatch[1]);
    const unit = decimalMatch[2]?.trim() || '';
    return { value, unit };
  }

  // Handle text-only measures like "pinch of salt"
  return null;
}

/**
 * Convert a decimal to a user-friendly fraction string
 */
function decimalToFraction(decimal: number): string {
  const tolerance = 0.01;
  const whole = Math.floor(decimal);
  const remainder = decimal - whole;

  // Common fractions in cooking
  const fractions: [number, string][] = [
    [0, ''],
    [0.125, '1/8'],
    [0.25, '1/4'],
    [0.333, '1/3'],
    [0.375, '3/8'],
    [0.5, '1/2'],
    [0.625, '5/8'],
    [0.667, '2/3'],
    [0.75, '3/4'],
    [0.875, '7/8'],
    [1, ''],
  ];

  let closestFraction = '';
  let closestDiff = 1;

  for (const [value, fraction] of fractions) {
    const diff = Math.abs(remainder - value);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestFraction = fraction;
      if (diff < tolerance) break;
    }
  }

  if (closestDiff > tolerance) {
    // No close fraction match, use decimal
    return decimal.toFixed(1).replace(/\.0$/, '');
  }

  if (closestFraction === '' && remainder > 0.9) {
    return String(whole + 1);
  }

  if (whole === 0) {
    return closestFraction || '0';
  }

  return closestFraction ? `${whole} ${closestFraction}` : String(whole);
}

/**
 * Round to practical cooking measurements
 */
function roundToKitchenFriendly(value: number, unit: string): number {
  // For very small amounts, keep precision
  if (value < 0.1) return value;

  // For tablespoons/teaspoons, round to nearest 1/4
  if (['tsp', 'teaspoon', 'teaspoons', 'tbsp', 'tablespoon', 'tablespoons'].includes(unit)) {
    return Math.round(value * 4) / 4;
  }

  // For cups, round to nearest 1/4
  if (['cup', 'cups', 'c'].includes(unit)) {
    return Math.round(value * 4) / 4;
  }

  // For ounces, round to nearest 0.5
  if (['oz', 'ounce', 'ounces'].includes(unit)) {
    return Math.round(value * 2) / 2;
  }

  // For pounds, round to nearest 0.25
  if (['lb', 'lbs', 'pound', 'pounds'].includes(unit)) {
    return Math.round(value * 4) / 4;
  }

  // For grams, round to nearest 5
  if (['g', 'gram', 'grams'].includes(unit)) {
    return Math.round(value / 5) * 5;
  }

  // For ml/liters, round to nearest 5
  if (['ml', 'milliliter', 'milliliters', 'l', 'liter', 'liters'].includes(unit)) {
    return Math.round(value / 5) * 5;
  }

  // For whole items, round to nearest 1
  if (['', 'piece', 'pieces', 'clove', 'cloves', 'slice', 'slices'].includes(unit)) {
    return Math.round(value);
  }

  // Default: round to 1 decimal place
  return Math.round(value * 10) / 10;
}

/**
 * Scale ingredients based on serving adjustment
 */
export function scaleIngredients(
  ingredients: RecipeIngredient[],
  originalServings: number,
  newServings: number
): ScaledIngredient[] {
  const scaleFactor = newServings / originalServings;

  return ingredients.map((ingredient) => {
    const parsed = parseMeasure(ingredient.measure);

    if (!parsed) {
      // Can't parse, return as-is with note
      return {
        ...ingredient,
        originalMeasure: ingredient.measure,
        scaleFactor,
      };
    }

    const scaledValue = parsed.value * scaleFactor;
    const roundedValue = roundToKitchenFriendly(scaledValue, parsed.unit);
    const formattedValue = decimalToFraction(roundedValue);

    return {
      ...ingredient,
      measure: `${formattedValue} ${parsed.unit}`.trim(),
      originalMeasure: ingredient.measure,
      scaleFactor,
    };
  });
}

/**
 * Calculate suggested serving sizes
 */
export function getSuggestedServings(originalServings: number): number[] {
  const suggestions = new Set<number>();

  // Always include 1, 2, and the original
  suggestions.add(1);
  suggestions.add(2);
  suggestions.add(originalServings);

  // Add half and double
  if (originalServings >= 2) {
    suggestions.add(Math.floor(originalServings / 2));
  }
  suggestions.add(originalServings * 2);

  // Add some common serving sizes
  [4, 6, 8, 12].forEach((s) => {
    if (s !== originalServings) {
      suggestions.add(s);
    }
  });

  return Array.from(suggestions).sort((a, b) => a - b);
}
