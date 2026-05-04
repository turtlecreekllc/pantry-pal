import {
  convertMeasurement,
  convertIngredient,
  convertRecipeIngredients,
  convertInstructionsTemperature,
} from '../../lib/measurementConverter';

describe('measurementConverter', () => {
  describe('convertMeasurement', () => {
    it('returns original when measure is empty', () => {
      expect(convertMeasurement('')).toBe('');
    });

    it('returns original when targetSystem is metric', () => {
      expect(convertMeasurement('250 g', 'metric')).toBe('250 g');
      expect(convertMeasurement('500 ml', 'metric')).toBe('500 ml');
    });

    it('converts grams to imperial equivalent', () => {
      // 100g → 4 oz range
      const result = convertMeasurement('100 grams');
      expect(result).toMatch(/oz|lb/i);
    });

    it('converts kilograms to imperial', () => {
      const result = convertMeasurement('1 kg');
      expect(result).toMatch(/oz|lb/i);
    });

    it('converts milliliters to imperial', () => {
      // 240 ml → 1 cup
      const result = convertMeasurement('240 ml');
      expect(result).toMatch(/cup|tsp|tbsp|oz|qt/i);
    });

    it('converts liters to imperial', () => {
      const result = convertMeasurement('1 liter');
      expect(result).toMatch(/cup|qt/i);
    });

    it('converts centiliters to imperial', () => {
      const result = convertMeasurement('20 cl');
      expect(result).toMatch(/cup|tsp|tbsp|oz/i);
    });

    it('converts Celsius to Fahrenheit', () => {
      const result = convertMeasurement('180°C');
      expect(result).toMatch(/°F/);
    });

    it('converts Celsius with space', () => {
      const result = convertMeasurement('200 C');
      expect(result).toMatch(/°F/);
    });

    it('converts multiple metrics in one string', () => {
      const result = convertMeasurement('Add 250 ml water and 100 grams flour');
      expect(result).not.toMatch(/ml|grams/);
    });

    it('handles decimal values in metric', () => {
      const result = convertMeasurement('0.5 kg');
      expect(result).toMatch(/oz|lb/i);
    });

    it('leaves non-metric strings unchanged', () => {
      expect(convertMeasurement('1 cup flour')).toBe('1 cup flour');
      expect(convertMeasurement('2 tbsp butter')).toBe('2 tbsp butter');
    });

    it('converts large grams to pounds', () => {
      // 1500 g → should give lb
      const result = convertMeasurement('1500 g');
      expect(result).toMatch(/lb/);
    });

    it('converts very large ml to quarts', () => {
      const result = convertMeasurement('2500 ml');
      expect(result).toMatch(/qt/i);
    });

    it('handles celsius keyword', () => {
      const result = convertMeasurement('350 celsius');
      expect(result).toMatch(/°F/);
    });
  });

  describe('convertIngredient', () => {
    it('returns original when targetSystem is metric', () => {
      const ing = { ingredient: 'flour', measure: '250 g' };
      expect(convertIngredient(ing, 'metric')).toEqual(ing);
    });

    it('converts measure to imperial', () => {
      const ing = { ingredient: 'flour', measure: '250 g' };
      const result = convertIngredient(ing, 'imperial');
      expect(result.ingredient).toBe('flour');
      expect(result.measure).not.toBe('250 g');
    });

    it('handles ingredient without measure', () => {
      const ing = { ingredient: 'salt' };
      const result = convertIngredient(ing, 'imperial');
      expect(result.ingredient).toBe('salt');
      expect(result.measure).toBeUndefined();
    });

    it('defaults to imperial conversion', () => {
      const ing = { ingredient: 'butter', measure: '100 g' };
      const result = convertIngredient(ing);
      expect(result.measure).not.toBe('100 g');
    });
  });

  describe('convertRecipeIngredients', () => {
    const ingredients = [
      { ingredient: 'flour', measure: '200 g' },
      { ingredient: 'milk', measure: '250 ml' },
      { ingredient: 'salt', measure: 'to taste' },
    ];

    it('returns original when targetSystem is metric', () => {
      expect(convertRecipeIngredients(ingredients, 'metric')).toEqual(ingredients);
    });

    it('converts all metric measures to imperial', () => {
      const results = convertRecipeIngredients(ingredients, 'imperial');
      expect(results[0].measure).not.toBe('200 g');
      expect(results[1].measure).not.toBe('250 ml');
    });

    it('preserves non-metric measures unchanged', () => {
      const results = convertRecipeIngredients(ingredients, 'imperial');
      expect(results[2].measure).toBe('to taste');
    });

    it('preserves other ingredient fields', () => {
      const extendedIngredients = [
        { ingredient: 'flour', measure: '200 g', id: 'abc', notes: 'sifted' },
      ];
      const results = convertRecipeIngredients(extendedIngredients, 'imperial');
      expect(results[0].id).toBe('abc');
      expect(results[0].notes).toBe('sifted');
    });

    it('handles empty array', () => {
      expect(convertRecipeIngredients([], 'imperial')).toEqual([]);
    });
  });

  describe('convertInstructionsTemperature', () => {
    it('returns original when targetSystem is metric', () => {
      const instr = 'Bake at 180°C for 30 minutes';
      expect(convertInstructionsTemperature(instr, 'metric')).toBe(instr);
    });

    it('converts Celsius temperatures in instructions', () => {
      const instr = 'Preheat oven to 180°C';
      const result = convertInstructionsTemperature(instr, 'imperial');
      expect(result).toMatch(/°F/);
      expect(result).not.toMatch(/180°C/);
    });

    it('converts multiple temperatures in instructions', () => {
      const instr = 'Heat oil to 160°C, then bake at 180°C';
      const result = convertInstructionsTemperature(instr, 'imperial');
      expect(result.match(/°F/g)?.length).toBe(2);
    });

    it('defaults to imperial conversion', () => {
      const instr = 'Bake at 200°C';
      const result = convertInstructionsTemperature(instr);
      expect(result).toMatch(/°F/);
    });

    it('leaves non-temperature text unchanged', () => {
      const instr = 'Mix all ingredients together';
      expect(convertInstructionsTemperature(instr)).toBe(instr);
    });
  });
});
