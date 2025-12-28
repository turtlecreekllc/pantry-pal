import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  registerForPushNotifications,
  removePushToken,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  clearBadge,
} from '../lib/notificationService';
import { supabase } from '../lib/supabase';
import * as Notifications from 'expo-notifications';

interface NotificationPreferences {
  expiryReminders: boolean;
  mealReminders: boolean;
  householdActivity: boolean;
  expiryDaysBefore: number;
  mealHoursBefore: number;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

interface UseNotificationsReturn {
  /** Whether push notifications are enabled */
  isEnabled: boolean;
  /** Push token */
  pushToken: string | null;
  /** Notification preferences */
  preferences: NotificationPreferences | null;
  /** Loading state */
  loading: boolean;
  /** Register for push notifications */
  register: () => Promise<void>;
  /** Unregister from push notifications */
  unregister: () => Promise<void>;
  /** Update notification preferences */
  updatePreferences: (updates: Partial<NotificationPreferences>) => Promise<void>;
  /** Last received notification */
  lastNotification: Notifications.Notification | null;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  expiryReminders: true,
  mealReminders: true,
  householdActivity: true,
  expiryDaysBefore: 3,
  mealHoursBefore: 2,
  quietHoursStart: null,
  quietHoursEnd: null,
};

/**
 * Hook for managing push notifications
 */
export function useNotifications(): UseNotificationsReturn {
  const { user } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastNotification, setLastNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  const loadPreferences = useCallback(async () => {
    if (!user) {
      setPreferences(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error && error.code !== 'PGRST116') {
        console.warn('Failed to load preferences:', error.message);
      }
      if (data) {
        setPreferences({
          expiryReminders: data.expiry_reminders,
          mealReminders: data.meal_reminders,
          householdActivity: data.household_activity,
          expiryDaysBefore: data.expiry_days_before,
          mealHoursBefore: data.meal_hours_before,
          quietHoursStart: data.quiet_hours_start,
          quietHoursEnd: data.quiet_hours_end,
        });
      } else {
        setPreferences(DEFAULT_PREFERENCES);
      }
    } catch (err) {
      console.error('Error loading notification preferences:', err);
      setPreferences(DEFAULT_PREFERENCES);
    }
  }, [user]);

  const checkTokenStatus = useCallback(async () => {
    if (!user) {
      setIsEnabled(false);
      setPushToken(null);
      return;
    }
    try {
      const { data } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('user_id', user.id)
        .single();
      if (data?.token) {
        setIsEnabled(true);
        setPushToken(data.token);
      } else {
        setIsEnabled(false);
        setPushToken(null);
      }
    } catch (err) {
      setIsEnabled(false);
      setPushToken(null);
    }
  }, [user]);

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await Promise.all([checkTokenStatus(), loadPreferences()]);
      setLoading(false);
    };
    initialize();
  }, [checkTokenStatus, loadPreferences]);

  useEffect(() => {
    notificationListener.current = addNotificationReceivedListener((notification) => {
      setLastNotification(notification);
    });
    responseListener.current = addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      handleNotificationResponse(data);
    });
    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  const handleNotificationResponse = (data: Record<string, unknown>) => {
    // Handle navigation based on notification type
    // This can be expanded based on app needs
    console.log('Notification tapped:', data);
  };

  const register = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await registerForPushNotifications(user.id);
      if (token) {
        setPushToken(token);
        setIsEnabled(true);
      }
    } catch (err) {
      console.error('Failed to register for push notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const unregister = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      await removePushToken(user.id);
      setPushToken(null);
      setIsEnabled(false);
      await clearBadge();
    } catch (err) {
      console.error('Failed to unregister from push notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updatePreferences = useCallback(
    async (updates: Partial<NotificationPreferences>) => {
      if (!user || !preferences) return;
      const newPreferences = { ...preferences, ...updates };
      setPreferences(newPreferences);
      try {
        const { error } = await supabase.from('notification_preferences').upsert(
          {
            user_id: user.id,
            expiry_reminders: newPreferences.expiryReminders,
            meal_reminders: newPreferences.mealReminders,
            household_activity: newPreferences.householdActivity,
            expiry_days_before: newPreferences.expiryDaysBefore,
            meal_hours_before: newPreferences.mealHoursBefore,
            quiet_hours_start: newPreferences.quietHoursStart,
            quiet_hours_end: newPreferences.quietHoursEnd,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
        if (error) {
          console.error('Failed to save preferences:', error.message);
          setPreferences(preferences);
        }
      } catch (err) {
        console.error('Error updating preferences:', err);
        setPreferences(preferences);
      }
    },
    [user, preferences]
  );

  return {
    isEnabled,
    pushToken,
    preferences,
    loading,
    register,
    unregister,
    updatePreferences,
    lastNotification,
  };
}

