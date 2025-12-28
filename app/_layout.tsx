import { useEffect, useState, useCallback } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../context/AuthContext';
import { HealthProvider } from '../context/HealthContext';
import { HouseholdProvider } from '../context/HouseholdContext';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { handleSharedContent, subscribeToIncomingLinks } from '../lib/shareReceiver';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);

  // Handle incoming shared content
  const handleIncomingUrl = useCallback(async (url: string) => {
    console.log('Received URL:', url);
    await handleSharedContent(url);
  }, []);

  useEffect(() => {
    async function prepare() {
      try {
        // Perform any initial loading tasks here
        await new Promise(resolve => setTimeout(resolve, 500));

        // Check if app was opened with a shared URL
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          // Delay handling to ensure navigation is ready
          setTimeout(() => handleIncomingUrl(initialUrl), 1000);
        }
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
        await SplashScreen.hideAsync();
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
      <HouseholdProvider>
        <HealthProvider>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="item" options={{ headerShown: false }} />
            <Stack.Screen name="recipe" options={{ headerShown: false }} />
          </Stack>
        </HealthProvider>
      </HouseholdProvider>
    </AuthProvider>
  );
}
