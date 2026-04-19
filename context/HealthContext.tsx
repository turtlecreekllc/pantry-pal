import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initHealthService } from '../lib/healthService';

interface HealthContextType {
  isHealthSyncEnabled: boolean;
  toggleHealthSync: () => Promise<void>;
  isInitialized: boolean;
}

const HealthContext = createContext<HealthContextType | undefined>(undefined);

export function HealthProvider({ children }: { children: React.ReactNode }) {
  const [isHealthSyncEnabled, setIsHealthSyncEnabled] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem('pantry_pal_health_sync_enabled');
      if (stored === 'true') {
        const success = await initHealthService();
        if (success) {
          setIsHealthSyncEnabled(true);
          setIsInitialized(true);
        } else {
            // Failed to init, maybe permissions denied
            setIsHealthSyncEnabled(false);
        }
      }
    } catch (e) {
      console.error('Error loading health settings:', e);
    }
  };

  const toggleHealthSync = async () => {
    try {
      if (!isHealthSyncEnabled) {
        // Turning ON
        const success = await initHealthService();
        if (success) {
          setIsHealthSyncEnabled(true);
          setIsInitialized(true);
          await AsyncStorage.setItem('pantry_pal_health_sync_enabled', 'true');
        } else {
          Alert.alert(
            'Health Access Denied',
            'Please enable Health permissions for Dinner Plans in your device Settings.',
            [{ text: 'OK' }]
          );
        }
      } else {
        // Turning OFF
        setIsHealthSyncEnabled(false);
        await AsyncStorage.setItem('pantry_pal_health_sync_enabled', 'false');
      }
    } catch (e) {
      console.error('Error toggling health sync:', e);
    }
  };

  return (
    <HealthContext.Provider value={{ isHealthSyncEnabled, toggleHealthSync, isInitialized }}>
      {children}
    </HealthContext.Provider>
  );
}

export function useHealth() {
  const context = useContext(HealthContext);
  if (context === undefined) {
    throw new Error('useHealth must be used within a HealthProvider');
  }
  return context;
}

