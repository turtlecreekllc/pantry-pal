/**
 * Custom hook for Siri Shortcuts integration
 *
 * NOTE: Siri Shortcuts integration is currently DISABLED because
 * react-native-siri-shortcut causes Metro bundling errors on non-iOS.
 * This will be re-enabled when building specifically for iOS with native modules.
 *
 * @module useSiriShortcuts
 */

import { Platform } from 'react-native';

/**
 * Hook to initialize and manage Siri Shortcuts
 * Call this in your app's root layout component
 * 
 * NOTE: Currently disabled - no-op on all platforms
 */
export function useSiriShortcuts(): void {
  // Siri Shortcuts completely disabled to prevent Metro bundling errors
  // TODO: Re-enable when building for iOS with native modules
}

/**
 * Hook to donate a shortcut after user performs an action
 * This makes the action appear in Siri suggestions
 * 
 * NOTE: Currently disabled - no-op on all platforms
 */
export async function donateShortcutToSiri(
  _shortcutKey: string,
  _additionalInfo?: Record<string, unknown>
): Promise<void> {
  // Siri Shortcuts completely disabled to prevent Metro bundling errors
  // TODO: Re-enable when building for iOS with native modules
  if (Platform.OS === 'ios') {
    console.log('[SiriShortcuts] Donation disabled - iOS native build required');
  }
}

