import { Platform } from 'react-native';
import { NutritionInfo, MealType } from './types';

// Type definitions for lazy-loaded modules
type AppleHealthKitModule = {
  initHealthKit: (permissions: unknown, callback: (error: string) => void) => void;
  saveFood: (options: unknown, callback: (error: string) => void) => void;
  Constants: {
    Permissions: Record<string, string>;
  };
};

type HealthConnectModule = {
  initialize: () => Promise<boolean>;
  requestPermission: (permissions: Array<{ accessType: string; recordType: string }>) => Promise<void>;
  insertRecords: (records: unknown[]) => Promise<void>;
};

// Lazy-loaded modules to prevent crash on import
let AppleHealthKit: AppleHealthKitModule | null = null;
let healthConnectModule: HealthConnectModule | null = null;

// Health Connect MealType
const HC_MEAL_TYPE: Record<MealType | 'unknown', number> = {
  breakfast: 1,
  lunch: 2,
  dinner: 3,
  snack: 4,
  unknown: 0,
};

/**
 * Safely loads the react-native-health module for iOS
 * @returns True if module loaded successfully
 */
const loadAppleHealthKit = (): boolean => {
  if (AppleHealthKit !== null) return true;
  if (Platform.OS !== 'ios') return false;
  try {
    // @ts-ignore
    const healthModule = require('react-native-health');
    AppleHealthKit = healthModule.default || healthModule;
    // Verify the module structure matches expectations
    if (!AppleHealthKit?.Constants?.Permissions) {
        console.warn('[HealthKit] Module structure invalid:', AppleHealthKit);
        AppleHealthKit = null;
        return false;
    }
    return AppleHealthKit !== null;
  } catch (error) {
    console.warn('[HealthKit] Module not available:', error);
    return false;
  }
};

/**
 * Safely loads the react-native-health-connect module for Android
 * @returns True if module loaded successfully
 */
const loadHealthConnect = (): boolean => {
  if (healthConnectModule !== null) return true;
  if (Platform.OS !== 'android') return false;
  try {
    healthConnectModule = require('react-native-health-connect');
    return healthConnectModule !== null;
  } catch (error) {
    console.warn('[HealthConnect] Module not available:', error);
    return false;
  }
};

/**
 * Initializes the health service and requests necessary permissions
 * @returns Promise resolving to true if initialization succeeded
 */
export const initHealthService = async (): Promise<boolean> => {
  if (Platform.OS === 'ios') {
    if (!loadAppleHealthKit() || !AppleHealthKit) {
      console.warn('[HealthKit] Module not loaded, health features disabled');
      return false;
    }
    const permissions = {
      permissions: {
        read: [] as string[],
        write: [
          AppleHealthKit.Constants.Permissions.EnergyConsumed,
          AppleHealthKit.Constants.Permissions.Protein,
          AppleHealthKit.Constants.Permissions.Carbohydrates,
          AppleHealthKit.Constants.Permissions.FatTotal,
          AppleHealthKit.Constants.Permissions.Fiber,
          AppleHealthKit.Constants.Permissions.Sodium,
          AppleHealthKit.Constants.Permissions.Sugar,
        ].filter(Boolean),
      },
    };
    return new Promise((resolve) => {
      AppleHealthKit!.initHealthKit(permissions, (error: string) => {
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
    if (!loadHealthConnect() || !healthConnectModule) {
      console.warn('[HealthConnect] Module not loaded, health features disabled');
      return false;
    }
    try {
      const isInitialized = await healthConnectModule.initialize();
      if (!isInitialized) {
        console.log('[HealthConnect] Not initialized');
        return false;
      }
      await healthConnectModule.requestPermission([
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

/**
 * Saves nutrition data to the platform's health service
 * @param nutrition - Nutrition information to save
 * @param date - Date of the meal
 * @param mealType - Type of meal (breakfast, lunch, dinner, snack)
 * @param foodName - Name of the food item
 * @returns Promise resolving to true if save succeeded
 */
export const saveNutritionToHealth = async (
  nutrition: NutritionInfo,
  date: Date,
  mealType: MealType,
  foodName: string
): Promise<boolean> => {
  try {
    if (Platform.OS === 'ios') {
      if (!loadAppleHealthKit() || !AppleHealthKit) {
        console.warn('[HealthKit] Module not available for saving');
        return false;
      }
      return new Promise((resolve) => {
        AppleHealthKit!.saveFood(
          {
            foodName,
            date: date.toISOString(),
            calories: nutrition.energy_kcal || 0,
            protein: nutrition.proteins || 0,
            carbohydrates: nutrition.carbohydrates || 0,
            fat: nutrition.fat || 0,
            fiber: nutrition.fiber || 0,
            sodium: (nutrition.sodium || 0) / 1000,
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
      if (!loadHealthConnect() || !healthConnectModule) {
        console.warn('[HealthConnect] Module not available for saving');
        return false;
      }
      const hcMealType = HC_MEAL_TYPE[mealType] || HC_MEAL_TYPE.unknown;
      const sodiumGrams = (nutrition.sodium || 0) / 1000;
      await healthConnectModule.insertRecords([
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
