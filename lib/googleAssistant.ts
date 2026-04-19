/**
 * Google Assistant Integration for Dinner Plans
 *
 * This module provides integration with Google Assistant on Android,
 * allowing users to interact with Dinner Plans using voice commands like:
 * - "Hey Google, open Dinner Plans"
 * - "Hey Google, add milk to Dinner Plans"
 *
 * Note: Full Google Assistant Actions require server-side configuration
 * through the Google Actions Console. This module handles the client-side
 * deep link handling and provides guidance for setup.
 *
 * @module googleAssistant
 */

import { Platform, Linking } from 'react-native';
import type { Router } from 'expo-router';

/**
 * App Action types that can be triggered via Google Assistant
 * These correspond to actions.xml definitions
 */
export const ASSISTANT_ACTIONS = {
  OPEN_APP: 'actions.intent.OPEN_APP_FEATURE',
  ADD_ITEM: 'actions.intent.CREATE_THING',
  VIEW_LIST: 'actions.intent.GET_THING',
} as const;

export type AssistantAction = typeof ASSISTANT_ACTIONS[keyof typeof ASSISTANT_ACTIONS];

/**
 * Deep link routes for Google Assistant actions
 */
export const DEEP_LINK_ROUTES = {
  pantry: '/(tabs)',
  addItem: '/item/add',
  expiring: '/(tabs)?filter=expiring',
  scan: '/scan/photo',
  recipes: '/(tabs)/recipes',
  grocery: '/(tabs)/grocery',
  voiceReview: '/scan/photo?startVoiceReview=true',
} as const;

/**
 * Available voice commands for Google Assistant
 */
interface VoiceCommand {
  phrase: string;
  description: string;
  route: string;
  requiresSetup: boolean;
}

/**
 * Get list of available voice commands for display
 */
export function getGoogleAssistantCommands(): VoiceCommand[] {
  return [
    {
      phrase: 'Hey Google, open Dinner Plans',
      description: 'Opens the app to your pantry',
      route: DEEP_LINK_ROUTES.pantry,
      requiresSetup: false,
    },
    {
      phrase: 'Hey Google, open pantry in Dinner Plans',
      description: 'Opens your pantry inventory',
      route: DEEP_LINK_ROUTES.pantry,
      requiresSetup: false,
    },
    {
      phrase: 'Hey Google, add item to Dinner Plans',
      description: 'Opens the add item screen',
      route: DEEP_LINK_ROUTES.addItem,
      requiresSetup: true,
    },
    {
      phrase: 'Hey Google, scan pantry in Dinner Plans',
      description: 'Opens the photo scanner',
      route: DEEP_LINK_ROUTES.scan,
      requiresSetup: true,
    },
    {
      phrase: 'Hey Google, find recipes in Dinner Plans',
      description: 'Opens recipe suggestions',
      route: DEEP_LINK_ROUTES.recipes,
      requiresSetup: true,
    },
    {
      phrase: 'Hey Google, open grocery list in Dinner Plans',
      description: 'Opens your grocery list',
      route: DEEP_LINK_ROUTES.grocery,
      requiresSetup: true,
    },
  ];
}

/**
 * Handle incoming deep link from Google Assistant
 *
 * @param url - The deep link URL
 * @param router - Expo Router instance
 * @returns Whether the link was handled
 */
export function handleAssistantDeepLink(url: string, router: Router): boolean {
  if (Platform.OS !== 'android') return false;
  try {
    const parsed = new URL(url);
    const path = parsed.pathname || parsed.hostname;
    // Handle dinner-plans:// scheme
    if (parsed.protocol === 'dinner-plans:') {
      switch (path) {
        case 'pantry':
        case 'viewPantry':
          router.push('/(tabs)');
          return true;
        case 'addItem':
        case 'add':
          const itemName = parsed.searchParams.get('name');
          if (itemName) {
            router.push(`/item/add?name=${encodeURIComponent(itemName)}`);
          } else {
            router.push('/item/add');
          }
          return true;
        case 'scan':
        case 'scanPantry':
          router.push('/scan/photo');
          return true;
        case 'recipes':
        case 'viewRecipes':
          router.push('/(tabs)/recipes');
          return true;
        case 'grocery':
        case 'addGrocery':
          router.push('/(tabs)/grocery');
          return true;
        case 'expiring':
        case 'viewExpiring':
          router.push('/(tabs)?filter=expiring');
          return true;
        case 'voiceReview':
          router.push('/scan/photo?startVoiceReview=true');
          return true;
        default:
          return false;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Check if Google Assistant is available on the device
 */
export function isGoogleAssistantAvailable(): boolean {
  return Platform.OS === 'android';
}

/**
 * Open Google Assistant settings
 */
export async function openGoogleAssistantSettings(): Promise<void> {
  try {
    await Linking.openURL('intent://settings#Intent;scheme=assistant;end');
  } catch {
    // Fallback to general Google settings
    try {
      await Linking.openURL('https://assistant.google.com/');
    } catch {
      console.log('Could not open Google Assistant settings');
    }
  }
}

/**
 * Open Google Play Store to Google Assistant
 */
export async function openGoogleAssistantInStore(): Promise<void> {
  try {
    await Linking.openURL('market://details?id=com.google.android.apps.googleassistant');
  } catch {
    await Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.apps.googleassistant');
  }
}

/**
 * Instructions for setting up Google Assistant App Actions
 * This is displayed in the settings screen
 */
export function getSetupInstructions(): string {
  return `Google Assistant App Actions require server-side configuration:

1. Create a project in Google Actions Console
2. Configure App Actions using actions.xml
3. Link your app with the Action
4. Test with the App Actions Test Tool

For basic functionality, try saying:
"Hey Google, open Dinner Plans"

This will open the app directly using Android's built-in app launch intent.`;
}

/**
 * Get the actions.xml content for Google Actions setup
 * This file goes in: android/app/src/main/res/xml/actions.xml
 */
export function getActionsXmlContent(): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<actions>
    <!-- Open app feature -->
    <action intentName="actions.intent.OPEN_APP_FEATURE">
        <fulfillment urlTemplate="dinner-plans://pantry">
            <parameter-mapping
                intentParameter="feature"
                urlParameter="feature" />
        </fulfillment>
    </action>
    
    <!-- Add item to pantry -->
    <action intentName="actions.intent.CREATE_THING">
        <fulfillment urlTemplate="dinner-plans://addItem{?name}">
            <parameter-mapping
                intentParameter="thing.name"
                urlParameter="name" />
        </fulfillment>
    </action>
    
    <!-- View list (pantry, grocery, etc.) -->
    <action intentName="actions.intent.GET_THING">
        <fulfillment urlTemplate="dinner-plans://pantry">
            <parameter-mapping
                intentParameter="thing.name"
                urlParameter="list" />
        </fulfillment>
    </action>
</actions>`;
}

/**
 * Get Android Manifest additions for App Actions
 */
export function getManifestAdditions(): string {
  return `<!-- Add inside <application> tag in AndroidManifest.xml -->
<meta-data
    android:name="com.google.android.actions"
    android:resource="@xml/actions" />`;
}

