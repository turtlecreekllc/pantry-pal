import { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../context/AuthContext';
import { HealthProvider } from '../context/HealthContext';
import { HouseholdProvider } from '../context/HouseholdContext';
import { SubscriptionProvider } from '../context/SubscriptionContext';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import * as Font from 'expo-font';
import { useShareIntent, ShareIntent } from 'expo-share-intent';
import { handleSharedContent, subscribeToIncomingLinks, handleShareIntent } from '../lib/shareReceiver';
// Siri Shortcuts disabled - causes crash on non-iOS due to native module bundling
// import { useSiriShortcuts } from '../hooks/useSiriShortcuts';
import { colors } from '../lib/theme';
import {
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';
import {
  Quicksand_400Regular,
  Quicksand_500Medium,
  Quicksand_600SemiBold,
  Quicksand_700Bold,
} from '@expo-google-fonts/quicksand';

// Safely prevent auto-hide with error handling
try {
  SplashScreen.preventAutoHideAsync();
} catch (e) {
  console.warn('SplashScreen.preventAutoHideAsync error:', e);
}

/**
 * Component that handles share intent processing after app is ready
 * Separated to isolate TurboModule calls and add error handling
 */
function ShareIntentHandler({ 
  appIsReady,
  shareIntent,
  hasShareIntent,
  resetShareIntent,
}: {
  appIsReady: boolean;
  shareIntent: ShareIntent | null;
  hasShareIntent: boolean;
  resetShareIntent: () => void;
}): null {
  useEffect(() => {
    // Only process share intent after app is fully ready
    if (!appIsReady || !hasShareIntent || !shareIntent) return;
    // Add delay to ensure all native modules are initialized
    const timeoutId = setTimeout(() => {
      try {
        console.log('Share intent received:', shareIntent);
        handleShareIntent(shareIntent).then((handled) => {
          if (handled) {
            resetShareIntent();
          }
        }).catch((error) => {
          console.warn('[ShareIntent] Error handling intent:', error);
        });
      } catch (error) {
        console.warn('[ShareIntent] Error processing intent:', error);
      }
    }, 200);
    return () => clearTimeout(timeoutId);
  }, [hasShareIntent, shareIntent, appIsReady, resetShareIntent]);
  return null;
}

export default function RootLayout(): React.ReactElement | null {
  const [appIsReady, setAppIsReady] = useState(false);
  // Wrap useShareIntent in try-catch to prevent crashes
  let shareIntentResult: { shareIntent: ShareIntent | null; resetShareIntent: () => void; hasShareIntent: boolean };
  try {
    shareIntentResult = useShareIntent();
  } catch (error) {
    console.warn('[ShareIntent] Hook initialization error:', error);
    shareIntentResult = { shareIntent: null, resetShareIntent: () => {}, hasShareIntent: false };
  }
  const { shareIntent, resetShareIntent, hasShareIntent } = shareIntentResult;

  // Siri Shortcuts disabled - causes crash on non-iOS due to native module bundling
  // TODO: Re-enable when building for iOS only
  // useSiriShortcuts();

  // Handle incoming shared content from URL scheme
  const handleIncomingUrl = useCallback(async (url: string) => {
    console.log('Received URL:', url);
    await handleSharedContent(url);
  }, []);

  // Share intent is now handled by ShareIntentHandler component

  useEffect(() => {
    async function prepare(): Promise<void> {
      try {
        // Load brand fonts
        await Font.loadAsync({
          'Nunito-Regular': Nunito_400Regular,
          'Nunito-Medium': Nunito_500Medium,
          'Nunito-SemiBold': Nunito_600SemiBold,
          'Nunito-Bold': Nunito_700Bold,
          'Quicksand-Regular': Quicksand_400Regular,
          'Quicksand-Medium': Quicksand_500Medium,
          'Quicksand-SemiBold': Quicksand_600SemiBold,
          'Quicksand-Bold': Quicksand_700Bold,
        });
        // Perform any initial loading tasks here
        await new Promise(resolve => setTimeout(resolve, 500));
        // Check if app was opened with a shared URL - wrapped in try-catch
        try {
          const initialUrl = await Linking.getInitialURL();
          if (initialUrl) {
            // Delay handling to ensure navigation is ready
            setTimeout(() => handleIncomingUrl(initialUrl), 1000);
          }
        } catch (linkingError) {
          console.warn('Linking.getInitialURL error:', linkingError);
        }
      } catch (e) {
        console.warn('Prepare error:', e);
      } finally {
        setAppIsReady(true);
        try {
          await SplashScreen.hideAsync();
        } catch (splashError) {
          console.warn('SplashScreen.hideAsync error:', splashError);
        }
      }
    }
    prepare();
  }, [handleIncomingUrl]);

  // Subscribe to incoming links while app is running
  useEffect(() => {
    const unsubscribe = subscribeToIncomingLinks(handleIncomingUrl);
    return unsubscribe;
  }, [handleIncomingUrl]);

  if (!appIsReady) {
    return null;
  }

  return (
    <AuthProvider>
      <SubscriptionProvider>
        <HouseholdProvider>
          <HealthProvider>
            <View style={styles.container}>
              <StatusBar style="dark" />
              <ShareIntentHandler
                appIsReady={appIsReady}
                shareIntent={shareIntent}
                hasShareIntent={hasShareIntent}
                resetShareIntent={resetShareIntent}
              />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="item" options={{ headerShown: false }} />
                <Stack.Screen name="recipe" options={{ headerShown: false }} />
                <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                <Stack.Screen name="settings" options={{ headerShown: false }} />
                <Stack.Screen
                  name="share-receiver"
                  options={{
                    headerShown: true,
                    title: 'Import Recipe',
                    presentation: 'modal',
                  }}
                />
              </Stack>
            </View>
          </HealthProvider>
        </HouseholdProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
});
