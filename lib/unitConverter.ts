/**
 * Unit conversion utilities for cooking measurements
 */

export type MeasurementSystem = 'metric' | 'imperial';

interface ConversionFactor {
  toMetric: number;
  metricUnit: string;
  imperialUnit: string;
}

// Volume conversions (base: milliliters)
const VOLUME_CONVERSIONS: Record<string, ConversionFactor> = {
  // Imperial
  tsp: { toMetric: 4.929, metricUnit: 'ml', imperialUnit: 'tsp' },
  teaspoon: { toMetric: 4.929, metricUnit: 'ml', imperialUnit: 'tsp' },
  teaspoons: { toMetric: 4.929, metricUnit: 'ml', imperialUnit: 'tsp' },
  tbsp: { toMetric: 14.787, metricUnit: 'ml', imperialUnit: 'tbsp' },
  tablespoon: { toMetric: 14.787, metricUnit: 'ml', imperialUnit: 'tbsp' },
  tablespoons: { toMetric: 14.787, metricUnit: 'ml', imperialUnit: 'tbsp' },
  'fl oz': { toMetric: 29.574, metricUnit: 'ml', imperialUnit: 'fl oz' },
  'fluid ounce': { toMetric: 29.574, metricUnit: 'ml', imperialUnit: 'fl oz' },
  'fluid ounces': { toMetric: 29.574, metricUnit: 'ml', imperialUnit: 'fl oz' },
  cup: { toMetric: 236.588, metricUnit: 'ml', imperialUnit: 'cup' },
  cups: { toMetric: 236.588, metricUnit: 'ml', imperialUnit: 'cup' },
  c: { toMetric: 236.588, metricUnit: 'ml', imperialUnit: 'cup' },
  pint: { toMetric: 473.176, metricUnit: 'ml', imperialUnit: 'pint' },
  pints: { toMetric: 473.176, metricUnit: 'ml', imperialUnit: 'pint' },
  pt: { toMetric: 473.176, metricUnit: 'ml', imperialUnit: 'pint' },
  quart: { toMetric: 946.353, metricUnit: 'ml', imperialUnit: 'quart' },
  quarts: { toMetric: 946.353, metricUnit: 'ml', imperialUnit: 'quart' },
  qt: { toMetric: 946.353, metricUnit: 'ml', imperialUnit: 'quart' },
  gallon: { toMetric: 3785.41, metricUnit: 'L', imperialUnit: 'gallon' },
  gallons: { toMetric: 3785.41, metricUnit: 'L', imperialUnit: 'gallon' },
  gal: { toMetric: 3785.41, metricUnit: 'L', imperialUnit: 'gallon' },
  // Metric
  ml: { toMetric: 1, metricUnit: 'ml', imperialUnit: 'fl oz' },
  milliliter: { toMetric: 1, metricUnit: 'ml', imperialUnit: 'fl oz' },
  milliliters: { toMetric: 1, metricUnit: 'ml', imperialUnit: 'fl oz' },
  l: { toMetric: 1000, metricUnit: 'L', imperialUnit: 'quart' },
  liter: { toMetric: 1000, metricUnit: 'L', imperialUnit: 'quart' },
  liters: { toMetric: 1000, metricUnit: 'L', imperialUnit: 'quart' },
  L: { toMetric: 1000, metricUnit: 'L', imperialUnit: 'quart' },
};

// Weight conversions (base: grams)
const WEIGHT_CONVERSIONS: Record<string, ConversionFactor> = {
  // Imperial
  oz: { toMetric: 28.3495, metricUnit: 'g', imperialUnit: 'oz' },
  ounce: { toMetric: 28.3495, metricUnit: 'g', imperialUnit: 'oz' },
  ounces: { toMetric: 28.3495, metricUnit: 'g', imperialUnit: 'oz' },
  lb: { toMetric: 453.592, metricUnit: 'g', imperialUnit: 'lb' },
  lbs: { toMetric: 453.592, metricUnit: 'g', imperialUnit: 'lb' },
  pound: { toMetric: 453.592, metricUnit: 'g', imperialUnit: 'lb' },
  pounds: { toMetric: 453.592, metricUnit: 'g', imperialUnit: 'lb' },
  // Metric
  g: { toMetric: 1, metricUnit: 'g', imperialUnit: 'oz' },
  gram: { toMetric: 1, metricUnit: 'g', imperialUnit: 'oz' },
  grams: { toMetric: 1, metricUnit: 'g', imperialUnit: 'oz' },
  kg: { toMetric: 1000, metricUnit: 'kg', imperialUnit: 'lb' },
  kilogram: { toMetric: 1000, metricUnit: 'kg', imperialUnit: 'lb' },
  kilograms: { toMetric: 1000, metricUnit: 'kg', imperialUnit: 'lb' },
};

// Temperature conversion
export function convertTemperature(
  value: number,
  from: 'F' | 'C',
  to: 'F' | 'C'
): number {
  if (from === to) return value;

  if (from === 'F' && to === 'C') {
    return Math.round((value - 32) * (5 / 9));
  } else {
    return Math.round(value * (9 / 5) + 32);
  }
}

/**
 * Parse a measure string to extract value and unit
 */
function parseMeasure(measure: string): { value: number; unit: string } | null {
  if (!measure) return null;

  const normalized = measure.trim();

  // Handle fractions
  const fractionMatch = normalized.match(/^(\d+)?\s*(\d+)\/(\d+)\s*(.*)$/);
  if (fractionMatch) {
    const whole = fractionMatch[1] ? parseInt(fractionMatch[1]) : 0;
    const numerator = parseInt(fractionMatch[2]);
    const denominator = parseInt(fractionMatch[3]);
    const unit = fractionMatch[4]?.trim() || '';
    const value = whole + numerator / denominator;
    return { value, unit };
  }

  // Handle decimals
  const decimalMatch = normalized.match(/^(\d+\.?\d*)\s*(.*)$/);
  if (decimalMatch) {
    const value = parseFloat(decimalMatch[1]);
    const unit = decimalMatch[2]?.trim() || '';
    return { value, unit };
  }

  return null;
}

/**
 * Check if a unit is metric
 */
function isMetricUnit(unit: string): boolean {
  const metricUnits = ['ml', 'milliliter', 'milliliters', 'l', 'liter', 'liters', 'L',
    'g', 'gram', 'grams', 'kg', 'kilogram', 'kilograms'];
  return metricUnits.includes(unit.toLowerCase());
}

/**
 * Round to practical cooking measurements
 */
function roundMeasurement(value: number, unit: string): number {
  const lowerUnit = unit.toLowerCase();

  // For metric volume
  if (['ml', 'milliliter', 'milliliters'].includes(lowerUnit)) {
    if (value < 15) return Math.round(value);
    if (value < 100) return Math.round(value / 5) * 5;
    return Math.round(value / 10) * 10;
  }

  // For metric weight
  if (['g', 'gram', 'grams'].includes(lowerUnit)) {
    if (value < 10) return Math.round(value);
    if (value < 100) return Math.round(value / 5) * 5;
    return Math.round(value / 10) * 10;
  }

  // For imperial, keep more precision
  if (['oz', 'ounce', 'ounces'].includes(lowerUnit)) {
    return Math.round(value * 4) / 4;
  }

  if (['lb', 'lbs', 'pound', 'pounds'].includes(lowerUnit)) {
    return Math.round(value * 4) / 4;
  }

  return Math.round(value * 10) / 10;
}

/**
 * Format a number for display
 */
function formatNumber(value: number): string {
  if (Number.isInteger(value)) {
    return value.toString();
  }

  // Convert common decimals to fractions
  const remainder = value % 1;
  const whole = Math.floor(value);

  const fractionMap: [number, string][] = [
    [0.25, '1/4'],
    [0.333, '1/3'],
    [0.5, '1/2'],
    [0.667, '2/3'],
    [0.75, '3/4'],
  ];

  for (const [decimal, fraction] of fractionMap) {
    if (Math.abs(remainder - decimal) < 0.05) {
      return whole > 0 ? `${whole} ${fraction}` : fraction;
    }
  }

  return value.toFixed(1).replace(/\.0$/, '');
}

/**
 * Convert a measurement to a different system
 */
export function convertMeasure(
  measure: string,
  targetSystem: MeasurementSystem
): string {
  const parsed = parseMeasure(measure);
  if (!parsed) return measure;

  const { value, unit } = parsed;
  const lowerUnit = unit.toLowerCase();

  // Check if conversion is needed
  const currentIsMetric = isMetricUnit(unit);
  if ((currentIsMetric && targetSystem === 'metric') ||
    (!currentIsMetric && targetSystem === 'imperial')) {
    return measure;
  }

  // Try volume conversion
  if (VOLUME_CONVERSIONS[lowerUnit]) {
    const conv = VOLUME_CONVERSIONS[lowerUnit];

    if (targetSystem === 'metric') {
      // Convert to metric
      const metricValue = value * conv.toMetric;
      const roundedValue = roundMeasurement(metricValue, conv.metricUnit);

      // Use liters for large volumes
      if (conv.metricUnit === 'ml' && roundedValue >= 1000) {
        return `${formatNumber(roundedValue / 1000)} L`;
      }

      return `${formatNumber(roundedValue)} ${conv.metricUnit}`;
    } else {
      // Convert from metric to imperial
      // First convert to ml
      const mlValue = value * conv.toMetric;

      // Find best imperial unit
      if (mlValue >= 946) {
        const quarts = mlValue / 946.353;
        return `${formatNumber(roundMeasurement(quarts, 'quart'))} quart${quarts !== 1 ? 's' : ''}`;
      } else if (mlValue >= 237) {
        const cups = mlValue / 236.588;
        return `${formatNumber(roundMeasurement(cups, 'cup'))} cup${cups !== 1 ? 's' : ''}`;
      } else if (mlValue >= 15) {
        const tbsp = mlValue / 14.787;
        return `${formatNumber(roundMeasurement(tbsp, 'tbsp'))} tbsp`;
      } else {
        const tsp = mlValue / 4.929;
        return `${formatNumber(roundMeasurement(tsp, 'tsp'))} tsp`;
      }
    }
  }

  // Try weight conversion
  if (WEIGHT_CONVERSIONS[lowerUnit]) {
    const conv = WEIGHT_CONVERSIONS[lowerUnit];

    if (targetSystem === 'metric') {
      const metricValue = value * conv.toMetric;
      const roundedValue = roundMeasurement(metricValue, conv.metricUnit);

      // Use kg for large weights
      if (conv.metricUnit === 'g' && roundedValue >= 1000) {
        return `${formatNumber(roundedValue / 1000)} kg`;
      }

      return `${formatNumber(roundedValue)} ${conv.metricUnit}`;
    } else {
      // Convert from metric to imperial
      const gramValue = value * conv.toMetric;

      if (gramValue >= 453.592) {
        const lbs = gramValue / 453.592;
        return `${formatNumber(roundMeasurement(lbs, 'lb'))} lb`;
      } else {
        const oz = gramValue / 28.3495;
        return `${formatNumber(roundMeasurement(oz, 'oz'))} oz`;
      }
    }
  }

  // No conversion available
  return measure;
}

/**
 * Detect the measurement system from a list of measures
 */
export function detectMeasurementSystem(measures: string[]): MeasurementSystem {
  let metricCount = 0;
  let imperialCount = 0;

  for (const measure of measures) {
    const parsed = parseMeasure(measure);
    if (!parsed) continue;

    if (isMetricUnit(parsed.unit)) {
      metricCount++;
    } else if (VOLUME_CONVERSIONS[parsed.unit.toLowerCase()] ||
      WEIGHT_CONVERSIONS[parsed.unit.toLowerCase()]) {
      imperialCount++;
    }
  }

  return metricCount > imperialCount ? 'metric' : 'imperial';
}

/**
 * Convert all measures in a recipe to a target system
 */
export function convertAllMeasures(
  measures: string[],
  targetSystem: MeasurementSystem
): string[] {
  return measures.map((measure) => convertMeasure(measure, targetSystem));
}
