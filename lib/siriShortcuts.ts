/**
 * Siri Shortcuts Integration for Dinner Plans
 *
 * This module provides integration with iOS Siri Shortcuts, allowing users
 * to interact with Dinner Plans using voice commands like:
 * - "Hey Siri, add milk to Dinner Plans"
 * - "Hey Siri, what's expiring in Dinner Plans"
 * - "Hey Siri, scan my pantry"
 *
 * @module siriShortcuts
 */

import { Platform, Linking } from 'react-native';
import type { Router } from 'expo-router';

/**
 * Shortcut activity type identifiers
 * These must match NSUserActivityTypes in Info.plist
 */
export const SHORTCUT_TYPES = {
  ADD_ITEM: 'com.turtlecreekllc.dinnerplans.addItem',
  VIEW_PANTRY: 'com.turtlecreekllc.dinnerplans.viewPantry',
  VIEW_EXPIRING: 'com.turtlecreekllc.dinnerplans.viewExpiring',
  SCAN_PANTRY: 'com.turtlecreekllc.dinnerplans.scanPantry',
  VIEW_RECIPES: 'com.turtlecreekllc.dinnerplans.viewRecipes',
  ADD_GROCERY: 'com.turtlecreekllc.dinnerplans.addGrocery',
  VOICE_REVIEW: 'com.turtlecreekllc.dinnerplans.voiceReview',
} as const;

export type ShortcutType = typeof SHORTCUT_TYPES[keyof typeof SHORTCUT_TYPES];

/**
 * Shortcut configuration options
 */
interface ShortcutOptions {
  activityType: ShortcutType;
  title: string;
  suggestedInvocationPhrase: string;
  isEligibleForSearch: boolean;
  isEligibleForPrediction: boolean;
  userInfo: Record<string, unknown>;
  keywords: string[];
}

/**
 * User info passed with shortcut activation
 */
interface ShortcutUserInfo {
  action: string;
  itemName?: string;
  filter?: string;
  startVoiceReview?: boolean;
}

/**
 * Predefined shortcuts for Dinner Plans
 */
export const SHORTCUTS: Record<string, ShortcutOptions> = {
  addItem: {
    activityType: SHORTCUT_TYPES.ADD_ITEM,
    title: 'Add Item to Pantry',
    suggestedInvocationPhrase: 'Add to my pantry',
    isEligibleForSearch: true,
    isEligibleForPrediction: true,
    userInfo: { action: 'addItem' },
    keywords: ['pantry', 'add', 'item', 'grocery', 'food'],
  },
  viewPantry: {
    activityType: SHORTCUT_TYPES.VIEW_PANTRY,
    title: 'View My Pantry',
    suggestedInvocationPhrase: 'Show my pantry',
    isEligibleForSearch: true,
    isEligibleForPrediction: true,
    userInfo: { action: 'viewPantry' },
    keywords: ['pantry', 'inventory', 'food', 'show'],
  },
  viewExpiring: {
    activityType: SHORTCUT_TYPES.VIEW_EXPIRING,
    title: 'Check Expiring Items',
    suggestedInvocationPhrase: "What's expiring soon",
    isEligibleForSearch: true,
    isEligibleForPrediction: true,
    userInfo: { action: 'viewExpiring' },
    keywords: ['expiring', 'soon', 'expiration', 'food waste'],
  },
  scanPantry: {
    activityType: SHORTCUT_TYPES.SCAN_PANTRY,
    title: 'Scan My Pantry',
    suggestedInvocationPhrase: 'Scan my pantry',
    isEligibleForSearch: true,
    isEligibleForPrediction: true,
    userInfo: { action: 'scanPantry' },
    keywords: ['scan', 'camera', 'photo', 'add items'],
  },
  viewRecipes: {
    activityType: SHORTCUT_TYPES.VIEW_RECIPES,
    title: 'Find Recipes',
    suggestedInvocationPhrase: 'What can I make for dinner',
    isEligibleForSearch: true,
    isEligibleForPrediction: true,
    userInfo: { action: 'viewRecipes' },
    keywords: ['recipes', 'dinner', 'cook', 'meal'],
  },
  addGrocery: {
    activityType: SHORTCUT_TYPES.ADD_GROCERY,
    title: 'Add to Grocery List',
    suggestedInvocationPhrase: 'Add to my grocery list',
    isEligibleForSearch: true,
    isEligibleForPrediction: true,
    userInfo: { action: 'addGrocery' },
    keywords: ['grocery', 'shopping', 'list', 'buy'],
  },
  voiceReview: {
    activityType: SHORTCUT_TYPES.VOICE_REVIEW,
    title: 'Voice Review Pantry',
    suggestedInvocationPhrase: 'Review my pantry',
    isEligibleForSearch: true,
    isEligibleForPrediction: true,
    userInfo: { action: 'voiceReview' },
    keywords: ['voice', 'review', 'pantry', 'hands-free'],
  },
};

// Type for the Siri Shortcut module
interface SiriShortcutModuleType {
  donateShortcut?: (shortcut: ShortcutOptions) => Promise<void>;
  suggestShortcuts?: (shortcuts: ShortcutOptions[]) => Promise<void>;
  clearAllShortcuts?: () => Promise<void>;
  getShortcuts?: () => Promise<ShortcutOptions[]>;
  presentShortcut?: (
    shortcut: ShortcutOptions,
    callback: (result: { status: string }) => void
  ) => Promise<void>;
  addShortcutListener?: (
    callback: (event: { activityType: string; userInfo: Record<string, unknown> }) => void
  ) => { remove: () => void };
  getInitialShortcut?: () => Promise<{
    activityType: string;
    userInfo: Record<string, unknown>;
  } | null>;
  default?: SiriShortcutModuleType;
}

// Module reference
let SiriShortcutModule: SiriShortcutModuleType | null = null;
let moduleInitialized = false;

/**
 * Initialize the Siri Shortcuts module
 * This safely attempts to load the native module
 * 
 * NOTE: Siri Shortcuts integration is currently DISABLED because
 * react-native-siri-shortcut causes Metro bundling errors on non-iOS.
 * The module will be re-enabled when building specifically for iOS.
 */
async function initializeSiriModule(): Promise<boolean> {
  // Siri Shortcuts completely disabled to prevent Metro bundling errors
  // TODO: Re-enable when building for iOS with native modules
  moduleInitialized = true;
  console.log('[SiriShortcuts] Module disabled - iOS native build required');
  return false;
}

/**
 * Donate a shortcut to Siri after the user performs an action
 * This makes the shortcut appear in Siri suggestions
 *
 * @param shortcutKey - Key of the shortcut from SHORTCUTS
 * @param additionalInfo - Additional user info to include
 */
export async function donateShortcutToSiri(
  shortcutKey: keyof typeof SHORTCUTS,
  additionalInfo?: Record<string, unknown>
): Promise<void> {
  const initialized = await initializeSiriModule();
  if (!initialized || !SiriShortcutModule?.donateShortcut) return;
  const shortcut = SHORTCUTS[shortcutKey];
  if (!shortcut) return;
  try {
    await SiriShortcutModule.donateShortcut({
      ...shortcut,
      userInfo: {
        ...shortcut.userInfo,
        ...additionalInfo,
      },
    });
  } catch (error) {
    console.warn('[SiriShortcuts] Failed to donate shortcut:', error);
  }
}

/**
 * Suggest all predefined shortcuts to Siri
 * Call this on app first launch or from settings
 */
export async function suggestAllShortcuts(): Promise<void> {
  const initialized = await initializeSiriModule();
  if (!initialized || !SiriShortcutModule?.suggestShortcuts) {
    console.log('[SiriShortcuts] suggestShortcuts not available');
    return;
  }
  try {
    const shortcuts = Object.values(SHORTCUTS);
    await SiriShortcutModule.suggestShortcuts(shortcuts);
  } catch (error) {
    console.warn('[SiriShortcuts] Failed to suggest shortcuts:', error);
  }
}

/**
 * Clear all donated shortcuts
 */
export async function clearAllShortcuts(): Promise<void> {
  const initialized = await initializeSiriModule();
  if (!initialized || !SiriShortcutModule?.clearAllShortcuts) return;
  try {
    await SiriShortcutModule.clearAllShortcuts();
  } catch (error) {
    console.warn('[SiriShortcuts] Failed to clear shortcuts:', error);
  }
}

/**
 * Present the Siri shortcut configuration UI for a specific shortcut
 * Allows user to customize the invocation phrase
 *
 * @param shortcutKey - Key of the shortcut to present
 * @returns Promise resolving to status ('added', 'cancelled', 'deleted')
 */
export async function presentShortcutUI(
  shortcutKey: keyof typeof SHORTCUTS
): Promise<string | null> {
  const initialized = await initializeSiriModule();
  if (!initialized || !SiriShortcutModule?.presentShortcut) return null;
  const shortcut = SHORTCUTS[shortcutKey];
  if (!shortcut) return null;
  return new Promise((resolve) => {
    SiriShortcutModule!.presentShortcut!(shortcut, ({ status }) => {
      resolve(status);
    });
  });
}

/**
 * Handle incoming Siri shortcut activation
 * Routes to the appropriate screen based on the shortcut type
 *
 * @param activityType - The activity type from the shortcut
 * @param userInfo - User info passed with the shortcut
 * @param router - Expo Router instance for navigation
 */
export function handleSiriShortcut(
  activityType: string,
  userInfo: Record<string, unknown>,
  router: Router
): void {
  const info = userInfo as ShortcutUserInfo;
  switch (activityType) {
    case SHORTCUT_TYPES.ADD_ITEM:
      if (info.itemName) {
        router.push(`/item/add?name=${encodeURIComponent(info.itemName)}`);
      } else {
        router.push('/item/add');
      }
      break;
    case SHORTCUT_TYPES.VIEW_PANTRY:
      router.push('/(tabs)');
      break;
    case SHORTCUT_TYPES.VIEW_EXPIRING:
      router.push('/(tabs)?filter=expiring');
      break;
    case SHORTCUT_TYPES.SCAN_PANTRY:
      router.push('/scan/photo');
      break;
    case SHORTCUT_TYPES.VIEW_RECIPES:
      router.push('/(tabs)/recipes');
      break;
    case SHORTCUT_TYPES.ADD_GROCERY:
      router.push('/(tabs)/grocery');
      break;
    case SHORTCUT_TYPES.VOICE_REVIEW:
      router.push('/scan/photo?startVoiceReview=true');
      break;
    default:
      console.log('Unknown shortcut type:', activityType);
  }
}

/**
 * Get the initial shortcut if app was launched from one
 *
 * @returns The initial shortcut or null
 */
export async function getInitialShortcut(): Promise<{
  activityType: string;
  userInfo: Record<string, unknown>;
} | null> {
  const initialized = await initializeSiriModule();
  if (!initialized || !SiriShortcutModule?.getInitialShortcut) return null;
  try {
    return await SiriShortcutModule.getInitialShortcut();
  } catch {
    return null;
  }
}

/**
 * Add a listener for shortcut activations while app is running
 * This function is async to ensure the module is initialized before adding listener
 *
 * @param callback - Function to call when shortcut is activated
 * @returns Promise resolving to subscription object with remove method
 */
export async function addShortcutListener(
  callback: (event: { activityType: string; userInfo: Record<string, unknown> }) => void
): Promise<{ remove: () => void } | null> {
  if (Platform.OS !== 'ios') {
    return null;
  }
  try {
    const initialized = await initializeSiriModule();
    if (!initialized || !SiriShortcutModule?.addShortcutListener) {
      return null;
    }
    return SiriShortcutModule.addShortcutListener(callback);
  } catch (error) {
    console.warn('[SiriShortcuts] Failed to add shortcut listener:', error);
    return null;
  }
}

/**
 * Generate a deep link URL for a shortcut action
 *
 * @param action - The action identifier
 * @param params - Optional parameters to include
 * @returns The deep link URL
 */
export function getDeepLinkForAction(
  action: string,
  params?: Record<string, string>
): string {
  let url = `dinner-plans://${action}`;
  if (params && Object.keys(params).length > 0) {
    const queryString = new URLSearchParams(params).toString();
    url += `?${queryString}`;
  }
  return url;
}

/**
 * Check if Siri Shortcuts are available on this device
 */
export function isSiriShortcutsAvailable(): boolean {
  return Platform.OS === 'ios';
}

/**
 * Get available shortcut options for the settings UI
 */
export function getAvailableShortcuts(): Array<{
  key: string;
  title: string;
  phrase: string;
  description: string;
}> {
  return [
    {
      key: 'addItem',
      title: 'Add Item',
      phrase: 'Add to my pantry',
      description: 'Quickly add items to your pantry inventory',
    },
    {
      key: 'viewPantry',
      title: 'View Pantry',
      phrase: 'Show my pantry',
      description: 'Open your pantry inventory',
    },
    {
      key: 'viewExpiring',
      title: 'Expiring Soon',
      phrase: "What's expiring soon",
      description: 'Check items that are about to expire',
    },
    {
      key: 'scanPantry',
      title: 'Scan Pantry',
      phrase: 'Scan my pantry',
      description: 'Take a photo to add multiple items at once',
    },
    {
      key: 'viewRecipes',
      title: 'Find Recipes',
      phrase: 'What can I make for dinner',
      description: 'Get recipe suggestions based on your pantry',
    },
    {
      key: 'addGrocery',
      title: 'Grocery List',
      phrase: 'Add to my grocery list',
      description: 'Add items to your shopping list',
    },
    {
      key: 'voiceReview',
      title: 'Voice Review',
      phrase: 'Review my pantry',
      description: 'Hands-free pantry review with voice commands',
    },
  ];
}

