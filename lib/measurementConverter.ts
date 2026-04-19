/**
 * Measurement Converter
 * Converts between metric and US imperial cooking measurements
 * Default: Imperial (US market)
 */

export type MeasurementSystem = 'imperial' | 'metric';

// Metric to Imperial conversion factors
const CONVERSIONS = {
  // Weight
  g: { unit: 'oz', factor: 0.03527396 },      // grams to ounces
  kg: { unit: 'lb', factor: 2.20462 },         // kilograms to pounds
  
  // Volume
  ml: { unit: 'fl oz', factor: 0.033814 },     // milliliters to fluid ounces
  l: { unit: 'cups', factor: 4.22675 },        // liters to cups
  cl: { unit: 'fl oz', factor: 0.33814 },      // centiliters to fluid ounces
  dl: { unit: 'fl oz', factor: 3.3814 },       // deciliters to fluid ounces
  
  // Temperature
  celsius: { unit: '°F', factor: (c: number) => (c * 9/5) + 32 },
} as const;

// Common cooking equivalents for cleaner conversions
const COOKING_EQUIVALENTS = {
  // Weight conversions to common US measurements
  weight: [
    { metricMin: 0, metricMax: 15, imperial: '1/2 oz' },
    { metricMin: 15, metricMax: 30, imperial: '1 oz' },
    { metricMin: 30, metricMax: 45, imperial: '1.5 oz' },
    { metricMin: 45, metricMax: 60, imperial: '2 oz' },
    { metricMin: 60, metricMax: 85, imperial: '3 oz' },
    { metricMin: 85, metricMax: 115, imperial: '4 oz (1/4 lb)' },
    { metricMin: 115, metricMax: 140, imperial: '5 oz' },
    { metricMin: 140, metricMax: 170, imperial: '6 oz' },
    { metricMin: 170, metricMax: 200, imperial: '7 oz' },
    { metricMin: 200, metricMax: 230, imperial: '8 oz (1/2 lb)' },
    { metricMin: 230, metricMax: 285, imperial: '10 oz' },
    { metricMin: 285, metricMax: 340, imperial: '12 oz (3/4 lb)' },
    { metricMin: 340, metricMax: 400, imperial: '14 oz' },
    { metricMin: 400, metricMax: 500, imperial: '1 lb' },
    { metricMin: 500, metricMax: 680, imperial: '1.5 lb' },
    { metricMin: 680, metricMax: 900, imperial: '2 lb' },
    { metricMin: 900, metricMax: 1150, imperial: '2.5 lb' },
    { metricMin: 1150, metricMax: 1400, imperial: '3 lb' },
  ],
  // Volume conversions to common US measurements
  volume: [
    { metricMin: 0, metricMax: 5, imperial: '1 tsp' },
    { metricMin: 5, metricMax: 10, imperial: '2 tsp' },
    { metricMin: 10, metricMax: 15, imperial: '1 tbsp' },
    { metricMin: 15, metricMax: 30, imperial: '2 tbsp' },
    { metricMin: 30, metricMax: 60, imperial: '1/4 cup' },
    { metricMin: 60, metricMax: 80, imperial: '1/3 cup' },
    { metricMin: 80, metricMax: 120, imperial: '1/2 cup' },
    { metricMin: 120, metricMax: 180, imperial: '3/4 cup' },
    { metricMin: 180, metricMax: 240, imperial: '1 cup' },
    { metricMin: 240, metricMax: 360, imperial: '1.5 cups' },
    { metricMin: 360, metricMax: 480, imperial: '2 cups' },
    { metricMin: 480, metricMax: 720, imperial: '3 cups' },
    { metricMin: 720, metricMax: 960, imperial: '4 cups (1 qt)' },
    { metricMin: 960, metricMax: 1500, imperial: '1.5 qt' },
    { metricMin: 1500, metricMax: 2000, imperial: '2 qt' },
  ],
};

// Regex patterns to detect metric measurements
const METRIC_PATTERNS = {
  grams: /(\d+(?:\.\d+)?)\s*(?:g|grams?|grammes?)\b/gi,
  kilograms: /(\d+(?:\.\d+)?)\s*(?:kg|kilograms?|kilos?)\b/gi,
  milliliters: /(\d+(?:\.\d+)?)\s*(?:ml|milliliters?|millilitres?)\b/gi,
  liters: /(\d+(?:\.\d+)?)\s*(?:l|liters?|litres?)\b/gi,
  centiliters: /(\d+(?:\.\d+)?)\s*(?:cl|centiliters?|centilitres?)\b/gi,
  celsius: /(\d+(?:\.\d+)?)\s*(?:°?C|celsius)\b/gi,
};

/**
 * Convert grams to a friendly US cooking measurement
 */
function gramsToImperial(grams: number): string {
  // Find the best cooking equivalent
  for (const equiv of COOKING_EQUIVALENTS.weight) {
    if (grams >= equiv.metricMin && grams < equiv.metricMax) {
      return equiv.imperial;
    }
  }
  
  // For larger amounts, calculate in pounds
  if (grams >= 1400) {
    const pounds = Math.round(grams / 453.592 * 2) / 2; // Round to nearest 0.5
    return `${pounds} lb`;
  }
  
  // Fallback to ounces
  const oz = Math.round(grams * 0.03527396 * 2) / 2; // Round to nearest 0.5
  return `${oz} oz`;
}

/**
 * Convert milliliters to a friendly US cooking measurement
 */
function mlToImperial(ml: number): string {
  // Find the best cooking equivalent
  for (const equiv of COOKING_EQUIVALENTS.volume) {
    if (ml >= equiv.metricMin && ml < equiv.metricMax) {
      return equiv.imperial;
    }
  }
  
  // For larger amounts, calculate in quarts/gallons
  if (ml >= 2000) {
    const quarts = Math.round(ml / 946.353 * 2) / 2; // Round to nearest 0.5
    return `${quarts} qt`;
  }
  
  // Fallback to cups
  const cups = Math.round(ml / 236.588 * 4) / 4; // Round to nearest 0.25
  return `${cups} cups`;
}

/**
 * Convert Celsius to Fahrenheit
 */
function celsiusToFahrenheit(celsius: number): string {
  const fahrenheit = Math.round((celsius * 9/5) + 32);
  // Round to nearest common oven temperature
  const commonTemps = [200, 225, 250, 275, 300, 325, 350, 375, 400, 425, 450, 475, 500];
  const closest = commonTemps.reduce((prev, curr) => 
    Math.abs(curr - fahrenheit) < Math.abs(prev - fahrenheit) ? curr : prev
  );
  return `${closest}°F`;
}

/**
 * Convert a measurement string from metric to imperial
 */
export function convertMeasurement(
  measure: string,
  targetSystem: MeasurementSystem = 'imperial'
): string {
  if (!measure || targetSystem === 'metric') {
    return measure;
  }

  let result = measure;

  // Convert grams
  result = result.replace(METRIC_PATTERNS.grams, (match, value) => {
    const grams = parseFloat(value);
    return gramsToImperial(grams);
  });

  // Convert kilograms
  result = result.replace(METRIC_PATTERNS.kilograms, (match, value) => {
    const kg = parseFloat(value);
    return gramsToImperial(kg * 1000);
  });

  // Convert milliliters
  result = result.replace(METRIC_PATTERNS.milliliters, (match, value) => {
    const ml = parseFloat(value);
    return mlToImperial(ml);
  });

  // Convert liters
  result = result.replace(METRIC_PATTERNS.liters, (match, value) => {
    const liters = parseFloat(value);
    return mlToImperial(liters * 1000);
  });

  // Convert centiliters
  result = result.replace(METRIC_PATTERNS.centiliters, (match, value) => {
    const cl = parseFloat(value);
    return mlToImperial(cl * 10);
  });

  // Convert Celsius
  result = result.replace(METRIC_PATTERNS.celsius, (match, value) => {
    const celsius = parseFloat(value);
    return celsiusToFahrenheit(celsius);
  });

  return result;
}

/**
 * Convert a recipe ingredient object
 */
export function convertIngredient(
  ingredient: { ingredient: string; measure?: string },
  targetSystem: MeasurementSystem = 'imperial'
): { ingredient: string; measure?: string } {
  if (targetSystem === 'metric') {
    return ingredient;
  }

  return {
    ingredient: ingredient.ingredient,
    measure: ingredient.measure ? convertMeasurement(ingredient.measure, targetSystem) : undefined,
  };
}

/**
 * Convert all ingredients in a recipe
 */
export function convertRecipeIngredients<T extends { ingredient: string; measure?: string }>(
  ingredients: T[],
  targetSystem: MeasurementSystem = 'imperial'
): T[] {
  if (targetSystem === 'metric') {
    return ingredients;
  }

  return ingredients.map(ing => ({
    ...ing,
    measure: ing.measure ? convertMeasurement(ing.measure, targetSystem) : ing.measure,
  }));
}

/**
 * Convert temperature in instructions text
 */
export function convertInstructionsTemperature(
  instructions: string,
  targetSystem: MeasurementSystem = 'imperial'
): string {
  if (targetSystem === 'metric') {
    return instructions;
  }

  return instructions.replace(METRIC_PATTERNS.celsius, (match, value) => {
    const celsius = parseFloat(value);
    return celsiusToFahrenheit(celsius);
  });
}

export default {
  convertMeasurement,
  convertIngredient,
  convertRecipeIngredients,
  convertInstructionsTemperature,
};

