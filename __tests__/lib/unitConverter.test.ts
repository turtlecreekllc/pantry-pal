import {
  convertTemperature,
  convertMeasure,
  detectMeasurementSystem,
  convertAllMeasures,
} from '../../lib/unitConverter';

describe('unitConverter', () => {
  describe('convertTemperature', () => {
    it('returns same value when from === to (F to F)', () => {
      expect(convertTemperature(350, 'F', 'F')).toBe(350);
    });

    it('returns same value when from === to (C to C)', () => {
      expect(convertTemperature(180, 'C', 'C')).toBe(180);
    });

    it('converts Fahrenheit to Celsius', () => {
      expect(convertTemperature(32, 'F', 'C')).toBe(0);
      expect(convertTemperature(212, 'F', 'C')).toBe(100);
      expect(convertTemperature(350, 'F', 'C')).toBe(177);
    });

    it('converts Celsius to Fahrenheit', () => {
      expect(convertTemperature(0, 'C', 'F')).toBe(32);
      expect(convertTemperature(100, 'C', 'F')).toBe(212);
      expect(convertTemperature(180, 'C', 'F')).toBe(356);
    });
  });

  describe('convertMeasure', () => {
    it('returns original if measure cannot be parsed', () => {
      expect(convertMeasure('', 'metric')).toBe('');
      expect(convertMeasure('a pinch', 'metric')).toBe('a pinch');
    });

    it('returns original if already in target system (metric → metric)', () => {
      expect(convertMeasure('250 ml', 'metric')).toBe('250 ml');
      expect(convertMeasure('100 g', 'metric')).toBe('100 g');
    });

    it('returns original if already in target system (imperial → imperial)', () => {
      expect(convertMeasure('2 cups', 'imperial')).toBe('2 cups');
      expect(convertMeasure('1 lb', 'imperial')).toBe('1 lb');
    });

    it('converts cups to ml (imperial → metric)', () => {
      const result = convertMeasure('1 cup', 'metric');
      expect(result).toMatch(/ml/i);
    });

    it('converts tsp to ml', () => {
      const result = convertMeasure('1 tsp', 'metric');
      expect(result).toMatch(/ml/i);
    });

    it('converts tablespoons to ml', () => {
      const result = convertMeasure('2 tbsp', 'metric');
      expect(result).toMatch(/ml/i);
    });

    it('converts large volumes to liters', () => {
      const result = convertMeasure('1 gallon', 'metric');
      expect(result).toMatch(/L/);
    });

    it('converts oz to grams', () => {
      const result = convertMeasure('4 oz', 'metric');
      expect(result).toMatch(/g/);
    });

    it('converts pounds to grams/kg', () => {
      const result = convertMeasure('1 lb', 'metric');
      expect(result).toMatch(/g/);
    });

    it('converts large weight to kg', () => {
      const result = convertMeasure('3 lb', 'metric');
      // 3 lb ≈ 1361 g → should show as kg
      expect(result).toMatch(/kg/);
    });

    it('handles fractions (1/2 cup → metric)', () => {
      const result = convertMeasure('1/2 cup', 'metric');
      expect(result).toMatch(/ml/i);
    });

    it('handles mixed fractions (1 1/2 cups → metric)', () => {
      const result = convertMeasure('1 1/2 cups', 'metric');
      expect(result).toMatch(/ml/i);
    });

    it('converts ml to imperial (metric → imperial)', () => {
      const result = convertMeasure('240 ml', 'imperial');
      expect(result).toBeTruthy();
      // ~1 cup
      expect(result).toMatch(/cup|tbsp|tsp|quart/i);
    });

    it('converts grams to imperial (metric → imperial)', () => {
      const result = convertMeasure('500 g', 'imperial');
      expect(result).toMatch(/oz|lb/i);
    });

    it('returns original for unknown units', () => {
      expect(convertMeasure('2 pinches', 'metric')).toBe('2 pinches');
    });

    it('converts teaspoon (full name)', () => {
      const result = convertMeasure('1 teaspoon', 'metric');
      expect(result).toMatch(/ml/i);
    });

    it('converts milliliters to tsp for small amounts', () => {
      const result = convertMeasure('5 ml', 'imperial');
      expect(result).toMatch(/tsp|tbsp/i);
    });

    it('returns original when liter measure is already metric', () => {
      // 'liter' is already metric, no conversion needed
      const result = convertMeasure('1 liter', 'metric');
      expect(result).toBe('1 liter');
    });

    it('converts 1 L to imperial quart', () => {
      // 1 liter (metric) → convert to imperial
      const result = convertMeasure('1 liter', 'imperial');
      expect(result).toMatch(/cup|quart|qt/i);
    });
  });

  describe('detectMeasurementSystem', () => {
    it('detects imperial system', () => {
      expect(detectMeasurementSystem(['1 cup', '2 oz', '1/2 lb'])).toBe('imperial');
    });

    it('detects metric system', () => {
      expect(detectMeasurementSystem(['250 ml', '100 g', '1 liter'])).toBe('metric');
    });

    it('defaults to imperial when no recognizable measures', () => {
      expect(detectMeasurementSystem(['a pinch', 'to taste'])).toBe('imperial');
    });

    it('returns imperial when equal counts', () => {
      expect(detectMeasurementSystem(['1 cup', '100 g'])).toBe('imperial');
    });

    it('handles empty array', () => {
      expect(detectMeasurementSystem([])).toBe('imperial');
    });
  });

  describe('convertAllMeasures', () => {
    it('converts all measures in an array', () => {
      const results = convertAllMeasures(['1 cup', '2 oz'], 'metric');
      expect(results).toHaveLength(2);
      results.forEach((r) => expect(r).toMatch(/ml|g|L|kg/i));
    });

    it('leaves unparseable measures unchanged', () => {
      const results = convertAllMeasures(['to taste', '1 cup'], 'metric');
      expect(results[0]).toBe('to taste');
    });

    it('returns empty array for empty input', () => {
      expect(convertAllMeasures([], 'metric')).toEqual([]);
    });
  });
});
