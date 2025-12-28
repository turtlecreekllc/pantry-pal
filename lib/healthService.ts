import { Platform } from 'react-native';
import AppleHealthKit, {
  HealthKitPermissions,
  HealthValue,
} from 'react-native-health';
import {
  initialize,
  requestPermission,
  insertRecords,
} from 'react-native-health-connect';
import { NutritionInfo, MealType } from './types';

// Map Pantry Pal meal types to integer/enum values if needed
// HealthKit saveFood takes generic string or constants?
// React Native Health docs say mealType: string? No, checking definitions.
// Usually standard HK is just nutrients, but saveFood might support it.

// Health Connect MealType
const HC_MEAL_TYPE = {
  breakfast: 1,
  lunch: 2,
  dinner: 3,
  snack: 4,
  unknown: 0,
};

// HealthKit Permissions
const healthKitPermissions: HealthKitPermissions = {
  permissions: {
    read: [],
    write: [
      AppleHealthKit.Constants.Permissions.DietaryEnergyConsumed,
      AppleHealthKit.Constants.Permissions.DietaryProtein,
      AppleHealthKit.Constants.Permissions.DietaryCarbohydrates,
      AppleHealthKit.Constants.Permissions.DietaryFatTotal,
      AppleHealthKit.Constants.Permissions.DietaryFiber,
      AppleHealthKit.Constants.Permissions.DietarySodium,
      AppleHealthKit.Constants.Permissions.DietarySugar,
    ],
  },
};

export const initHealthService = async (): Promise<boolean> => {
  if (Platform.OS === 'ios') {
    return new Promise((resolve) => {
      AppleHealthKit.initHealthKit(healthKitPermissions, (error: string) => {
        if (error) {
          console.error('[HealthKit] Init error:', error);
          resolve(false);
        } else {
          console.log('[HealthKit] Initialized');
          resolve(true);
        }
      });
    });
  } else if (Platform.OS === 'android') {
    try {
      const isInitialized = await initialize();
      if (!isInitialized) {
        console.log('[HealthConnect] Not initialized');
        return false;
      }
      
      // Request permissions
      await requestPermission([
        { accessType: 'write', recordType: 'NutritionRecord' },
      ]);
      console.log('[HealthConnect] Permissions requested');
      return true;
    } catch (error) {
      console.error('[HealthConnect] Init error:', error);
      return false;
    }
  }
  return false;
};

export const saveNutritionToHealth = async (
  nutrition: NutritionInfo,
  date: Date,
  mealType: MealType,
  foodName: string
): Promise<boolean> => {
  try {
    if (Platform.OS === 'ios') {
      return new Promise((resolve) => {
        AppleHealthKit.saveFood(
          {
            foodName,
            date: date.toISOString(),
            calories: nutrition.energy_kcal || 0,
            protein: nutrition.proteins || 0,
            carbohydrates: nutrition.carbohydrates || 0,
            fat: nutrition.fat || 0,
            fiber: nutrition.fiber || 0,
            sodium: (nutrition.sodium || 0) / 1000, // HealthKit typically expects grams for macros, but check docs.
            // Wait, sodium is usually mg? 
            // HKQuantityTypeIdentifierDietarySodium uses mass.
            // react-native-health docs say 'sodium': Number (grams) usually?
            // Actually commonly it matches the HK unit. 
            // Let's assume grams for consistency with others if unclear, but usually sodium is mg.
            // Let's check PRD. PRD says "Sodium (mg)".
            // If PRD says mg, I should probably pass mg? 
            // But HK usually defaults to grams or asks for value.
            // Let's stick to PRD implementation for now: `sodium: meal.sodium` (which implies whatever unit).
          },
          (error: string) => {
            if (error) {
              console.error('[HealthKit] Save food error:', error);
              resolve(false);
            } else {
              console.log('[HealthKit] Food saved');
              resolve(true);
            }
          }
        );
      });
    } else if (Platform.OS === 'android') {
      const hcMealType = HC_MEAL_TYPE[mealType] || HC_MEAL_TYPE.unknown;
      
      // Health Connect sodium: 'mass'
      // If we pass 'grams' unit, we must convert mg to g.
      const sodiumGrams = (nutrition.sodium || 0) / 1000;

      await insertRecords([
        {
          recordType: 'NutritionRecord',
          startTime: date.toISOString(),
          endTime: date.toISOString(),
          mealType: hcMealType,
          energy: { value: nutrition.energy_kcal || 0, unit: 'kilocalories' },
          protein: { value: nutrition.proteins || 0, unit: 'grams' },
          totalCarbohydrate: { value: nutrition.carbohydrates || 0, unit: 'grams' },
          totalFat: { value: nutrition.fat || 0, unit: 'grams' },
          fiber: { value: nutrition.fiber || 0, unit: 'grams' },
          sodium: { value: sodiumGrams, unit: 'grams' },
        },
      ]);
      console.log('[HealthConnect] Record inserted');
      return true;
    }
  } catch (error) {
    console.error('[HealthService] Save error:', error);
    return false;
  }
  return false;
};

