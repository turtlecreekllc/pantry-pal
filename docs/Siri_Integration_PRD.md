# Siri & Voice Assistant Integration
## Technical Implementation Guide

**Version:** 1.0  
**Date:** December 28, 2025  
**Status:** Implemented

---

## Overview

This document outlines how to integrate Dinner Plans with native device voice assistants (Siri on iOS, Google Assistant on Android) to enable hands-free interaction directly from the home screen without opening the app.

---

## Integration Options

### Option 1: Siri Shortcuts (iOS) - Recommended

**What it enables:**
- Users can say "Hey Siri, add milk to Dinner Plans" from anywhere
- Custom voice commands that trigger specific app actions
- Shortcuts appear in the Shortcuts app for customization
- Works even when app is in background

**Supported Actions:**
| Voice Command | Action |
|--------------|--------|
| "Add [item] to my pantry" | Opens add item screen with item pre-filled |
| "What's expiring soon?" | Shows expiring items list or reads them aloud |
| "Show my pantry" | Opens the pantry screen |
| "Scan my pantry" | Opens the photo scan camera |
| "What can I make for dinner?" | Opens recipe suggestions |
| "Add [item] to my grocery list" | Adds item to grocery list |
| "Review my pantry" | Starts voice-guided pantry review |

### Option 2: App Intents (iOS 16+) - Advanced

**What it enables:**
- Deeper Siri integration with natural language understanding
- Siri can perform actions without opening the app
- Results displayed directly in Siri interface
- More conversational interactions

### Option 3: Google Assistant Actions (Android) - Implemented

**What it enables:**
- "Hey Google, open Dinner Plans"
- "Hey Google, open pantry in Dinner Plans"
- App Actions for common tasks (requires server-side setup)
- Deep link handling for voice-triggered navigation

---

## Technical Implementation

### Required Packages

```bash
# Install Siri Shortcuts library
npx expo install react-native-siri-shortcut
```

### Expo Config Plugin Setup

The config plugin has been created at `plugins/withSiriShortcuts.js` and handles:
- Adding Siri capability entitlement
- Setting NSSiriUsageDescription in Info.plist
- Registering NSUserActivityTypes for all shortcut actions

**app.json integration:**

```json
{
  "expo": {
    "plugins": [
      "./plugins/withSiriShortcuts",
      // ... other plugins
    ],
    "ios": {
      "infoPlist": {
        "NSSiriUsageDescription": "Dinner Plans uses Siri to help you manage your pantry with voice commands."
      }
    }
  }
}
```

### React Native Implementation

**1. Define Shortcut Types:**

```typescript
// lib/siriShortcuts.ts
import { 
  SiriShortcutsEvent,
  donateShortcut,
  suggestShortcuts,
  clearAllShortcuts,
  getShortcuts,
  ShortcutOptions,
} from 'react-native-siri-shortcut';
import { Linking, Platform } from 'react-native';

/**
 * Shortcut activity types for Dinner Plans
 */
export const SHORTCUT_TYPES = {
  ADD_ITEM: 'com.turtlecreekllc.pantrypal.addItem',
  VIEW_PANTRY: 'com.turtlecreekllc.pantrypal.viewPantry',
  VIEW_EXPIRING: 'com.turtlecreekllc.pantrypal.viewExpiring',
  SCAN_PANTRY: 'com.turtlecreekllc.pantrypal.scanPantry',
  VIEW_RECIPES: 'com.turtlecreekllc.pantrypal.viewRecipes',
  ADD_GROCERY: 'com.turtlecreekllc.pantrypal.addGrocery',
  VOICE_REVIEW: 'com.turtlecreekllc.pantrypal.voiceReview',
} as const;

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

/**
 * Donate a shortcut to Siri after the user performs an action
 * This makes the shortcut appear in Siri suggestions
 */
export async function donateShortcutToSiri(
  shortcutKey: keyof typeof SHORTCUTS,
  additionalInfo?: Record<string, unknown>
): Promise<void> {
  if (Platform.OS !== 'ios') return;

  const shortcut = SHORTCUTS[shortcutKey];
  if (!shortcut) return;

  try {
    await donateShortcut({
      ...shortcut,
      userInfo: {
        ...shortcut.userInfo,
        ...additionalInfo,
      },
    });
  } catch (error) {
    console.error('Failed to donate shortcut to Siri:', error);
  }
}

/**
 * Suggest all predefined shortcuts to Siri
 * Call this on app first launch or from settings
 */
export async function suggestAllShortcuts(): Promise<void> {
  if (Platform.OS !== 'ios') return;

  try {
    const shortcuts = Object.values(SHORTCUTS);
    await suggestShortcuts(shortcuts);
  } catch (error) {
    console.error('Failed to suggest shortcuts:', error);
  }
}

/**
 * Handle incoming Siri shortcut activation
 */
export function handleSiriShortcut(
  activityType: string,
  userInfo: Record<string, unknown>,
  navigation: any
): void {
  switch (activityType) {
    case SHORTCUT_TYPES.ADD_ITEM:
      navigation.navigate('item/add');
      break;
    case SHORTCUT_TYPES.VIEW_PANTRY:
      navigation.navigate('(tabs)');
      break;
    case SHORTCUT_TYPES.VIEW_EXPIRING:
      navigation.navigate('(tabs)', { filter: 'expiring' });
      break;
    case SHORTCUT_TYPES.SCAN_PANTRY:
      navigation.navigate('scan/photo');
      break;
    case SHORTCUT_TYPES.VIEW_RECIPES:
      navigation.navigate('(tabs)/recipes');
      break;
    case SHORTCUT_TYPES.ADD_GROCERY:
      navigation.navigate('(tabs)/grocery');
      break;
    case SHORTCUT_TYPES.VOICE_REVIEW:
      navigation.navigate('scan/photo', { startVoiceReview: true });
      break;
    default:
      console.log('Unknown shortcut type:', activityType);
  }
}

/**
 * Generate deep link URL for a shortcut action
 */
export function getDeepLinkForAction(action: string, params?: Record<string, string>): string {
  let url = `pantry-pal://${action}`;
  if (params) {
    const queryString = new URLSearchParams(params).toString();
    url += `?${queryString}`;
  }
  return url;
}
```

**2. Add Siri Shortcut Listener in App Root:**

```typescript
// In app/_layout.tsx or a dedicated hook

import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { 
  addShortcutListener, 
  getInitialShortcut,
} from 'react-native-siri-shortcut';
import { handleSiriShortcut, suggestAllShortcuts } from '../lib/siriShortcuts';

export function useSiriShortcuts() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    // Suggest shortcuts on first launch
    suggestAllShortcuts();

    // Check if app was launched from a shortcut
    getInitialShortcut().then((shortcut) => {
      if (shortcut) {
        handleSiriShortcut(shortcut.activityType, shortcut.userInfo, router);
      }
    });

    // Listen for shortcut activations while app is running
    const subscription = addShortcutListener(({ activityType, userInfo }) => {
      handleSiriShortcut(activityType, userInfo, router);
    });

    return () => {
      subscription.remove();
    };
  }, [router]);
}
```

**3. Donate Shortcuts When User Performs Actions:**

```typescript
// Example: In the pantry hook after adding an item
import { donateShortcutToSiri } from '../lib/siriShortcuts';

// After successfully adding an item
await donateShortcutToSiri('addItem', { 
  lastItemName: itemName 
});

// After viewing expiring items
await donateShortcutToSiri('viewExpiring');

// After scanning pantry
await donateShortcutToSiri('scanPantry');
```

### Siri Shortcuts Settings Screen

Add a settings screen where users can manage their Siri shortcuts:

```typescript
// app/settings/siri.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Alert, Platform } from 'react-native';
import { presentShortcut } from 'react-native-siri-shortcut';
import { SHORTCUTS } from '../../lib/siriShortcuts';

export default function SiriSettingsScreen() {
  if (Platform.OS !== 'ios') {
    return (
      <View>
        <Text>Siri Shortcuts are only available on iOS</Text>
      </View>
    );
  }

  const handleAddShortcut = async (shortcutKey: string) => {
    const shortcut = SHORTCUTS[shortcutKey];
    try {
      await presentShortcut(shortcut, ({ status }) => {
        if (status === 'added') {
          Alert.alert('Success', 'Shortcut added to Siri!');
        } else if (status === 'cancelled') {
          // User cancelled
        }
      });
    } catch (error) {
      Alert.alert('Error', 'Could not add shortcut');
    }
  };

  return (
    <View>
      <Text>Add Siri Shortcuts</Text>
      <Text>
        Create voice commands to quickly access Dinner Plans features
      </Text>

      {Object.entries(SHORTCUTS).map(([key, shortcut]) => (
        <TouchableOpacity
          key={key}
          onPress={() => handleAddShortcut(key)}
        >
          <Text>{shortcut.title}</Text>
          <Text>"{shortcut.suggestedInvocationPhrase}"</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
```

---

## Deep Link Handling

Ensure the app handles deep links from Siri shortcuts:

```typescript
// lib/deepLinkHandler.ts
import { Linking } from 'react-native';
import * as Linking from 'expo-linking';

export function parseDeepLink(url: string): { action: string; params: Record<string, string> } | null {
  try {
    const parsed = Linking.parse(url);
    
    // Handle pantry-pal://addItem?name=milk
    if (parsed.path) {
      return {
        action: parsed.path,
        params: parsed.queryParams as Record<string, string>,
      };
    }
    return null;
  } catch {
    return null;
  }
}

// URL scheme patterns:
// pantry-pal://addItem?name=Milk
// pantry-pal://viewPantry
// pantry-pal://scanPantry
// pantry-pal://viewExpiring
// pantry-pal://recipes
// pantry-pal://grocery?add=Bread
```

---

## Google Assistant Integration (Android)

### App Actions

For Android, use App Actions to integrate with Google Assistant:

**1. Create actions.xml:**

```xml
<!-- android/app/src/main/res/xml/actions.xml -->
<?xml version="1.0" encoding="utf-8"?>
<actions>
    <action intentName="actions.intent.OPEN_APP_FEATURE">
        <fulfillment urlTemplate="pantry-pal://viewPantry">
            <parameter-mapping
                intentParameter="feature"
                urlParameter="feature" />
        </fulfillment>
    </action>
    
    <action intentName="actions.intent.CREATE_THING">
        <fulfillment urlTemplate="pantry-pal://addItem?name={name}">
            <parameter-mapping
                intentParameter="thing.name"
                urlParameter="name" />
        </fulfillment>
    </action>
</actions>
```

**2. Update AndroidManifest.xml:**

```xml
<meta-data
    android:name="com.google.android.actions"
    android:resource="@xml/actions" />
```

---

## User Experience

### Onboarding Flow

1. After first login, show Siri shortcuts onboarding card
2. Explain available voice commands
3. Prompt to add favorite shortcuts
4. Show in Settings for later customization

### Suggested Voice Commands

Display these in the app and documentation:

**iOS (Siri):**
- "Hey Siri, add milk to Dinner Plans"
- "Hey Siri, what's expiring in Dinner Plans"
- "Hey Siri, scan my pantry with Dinner Plans"
- "Hey Siri, show my pantry"
- "Hey Siri, what can I make for dinner in Dinner Plans"

**Android (Google Assistant):**
- "Hey Google, open Dinner Plans and add milk"
- "Hey Google, ask Dinner Plans what's expiring"
- "Hey Google, open pantry in Dinner Plans"

---

## Implementation Checklist

- [ ] Install `react-native-siri-shortcut` package
- [x] Create Expo config plugin for Siri entitlements (`plugins/withSiriShortcuts.js`)
- [x] Define shortcut types and metadata (`lib/siriShortcuts.ts`)
- [x] Implement shortcut donation after user actions
- [x] Add Siri shortcut listener in app root (`hooks/useSiriShortcuts.ts`, `app/_layout.tsx`)
- [x] Create Siri settings screen (`app/settings/siri.tsx`)
- [x] Handle deep links for all shortcut actions
- [x] Add Google Assistant support (Android) (`lib/googleAssistant.ts`, `app/settings/google-assistant.tsx`)
- [ ] Test all voice commands on device
- [ ] Add Siri shortcuts to onboarding flow
- [ ] Document voice commands in help section

---

## Future Enhancements

1. **Siri Intents Extension**: Create a dedicated Intents extension for more complex actions without opening the app
2. **Parameterized Shortcuts**: "Add 2 gallons of milk" with quantity parsing
3. **Query Responses**: Answer questions directly in Siri ("How much milk do I have?")
4. **Proactive Suggestions**: Suggest shortcuts based on time/location (morning: "Check what's expiring today")
5. **Shortcuts Automation**: Support running in Shortcuts app automations

---

## Privacy Considerations

- Siri sends voice data to Apple servers for processing
- User data (pantry items) stays on device unless explicitly shared
- Add privacy disclosures for Siri integration in App Store listing
- Include Siri usage in privacy policy

