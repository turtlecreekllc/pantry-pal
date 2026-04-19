import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import Constants from 'expo-constants';

// Flag to track if notification handler has been configured
let notificationHandlerConfigured = false;

/**
 * Configure notification handler - must be called before using notifications
 * This is deferred to avoid TurboModule crashes during app startup
 */
function ensureNotificationHandlerConfigured(): void {
  if (notificationHandlerConfigured) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    notificationHandlerConfigured = true;
  } catch (error) {
    console.warn('[Notifications] Failed to configure handler:', error);
  }
}

/**
 * Notification types for household activities
 */
export type NotificationType =
  | 'item_added'
  | 'item_expiring'
  | 'meal_reminder'
  | 'meal_assigned'
  | 'household_invite'
  | 'member_joined';

interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Registers for push notifications and stores the token
 * Wrapped in try-catch to prevent TurboModule crashes
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  try {
    ensureNotificationHandlerConfigured();
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied');
      return null;
    }
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4CAF50',
      });
      await Notifications.setNotificationChannelAsync('household', {
        name: 'Household Activity',
        importance: Notifications.AndroidImportance.HIGH,
        description: 'Notifications about household activity',
      });
      await Notifications.setNotificationChannelAsync('meals', {
        name: 'Meal Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        description: 'Reminders about upcoming meals',
      });
      await Notifications.setNotificationChannelAsync('expiry', {
        name: 'Expiry Alerts',
        importance: Notifications.AndroidImportance.DEFAULT,
        description: 'Alerts about expiring items',
      });
    }
    await savePushToken(userId, token);
    return token;
  } catch (error) {
    console.warn('[Notifications] Failed to register for push notifications:', error);
    return null;
  }
}

/**
 * Saves push token to database
 */
async function savePushToken(userId: string, token: string): Promise<void> {
  const { error } = await supabase.from('push_tokens').upsert(
    {
      user_id: userId,
      token,
      platform: Platform.OS,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'user_id',
    }
  );
  if (error) {
    console.warn('Failed to save push token:', error.message);
  }
}

/**
 * Removes push token when user logs out
 */
export async function removePushToken(userId: string): Promise<void> {
  const { error } = await supabase.from('push_tokens').delete().eq('user_id', userId);
  if (error) {
    console.warn('Failed to remove push token:', error.message);
  }
}

/**
 * Schedules a local notification
 * Returns null if scheduling fails to prevent crashes
 */
export async function scheduleLocalNotification({
  title,
  body,
  data,
  trigger,
}: {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  trigger?: Notifications.NotificationTriggerInput;
}): Promise<string | null> {
  try {
    ensureNotificationHandlerConfigured();
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: trigger || null,
    });
    return id;
  } catch (error) {
    console.warn('[Notifications] Failed to schedule notification:', error);
    return null;
  }
}

/**
 * Cancels a scheduled notification
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.warn('[Notifications] Failed to cancel notification:', error);
  }
}

/**
 * Cancels all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.warn('[Notifications] Failed to cancel all notifications:', error);
  }
}

/**
 * Schedules expiry reminders for pantry items
 */
export async function scheduleExpiryReminder({
  itemId,
  itemName,
  expiryDate,
  daysBeforeExpiry = 3,
}: {
  itemId: string;
  itemName: string;
  expiryDate: Date;
  daysBeforeExpiry?: number;
}): Promise<string | null> {
  const reminderDate = new Date(expiryDate);
  reminderDate.setDate(reminderDate.getDate() - daysBeforeExpiry);
  reminderDate.setHours(9, 0, 0, 0);
  if (reminderDate <= new Date()) {
    return null;
  }
  const id = await scheduleLocalNotification({
    title: 'Expiring Soon',
    body: `${itemName} expires in ${daysBeforeExpiry} days`,
    data: { type: 'item_expiring', itemId },
    trigger: { type: SchedulableTriggerInputTypes.DATE, date: reminderDate },
  });
  return id;
}

/**
 * Schedules a meal reminder
 */
export async function scheduleMealReminder({
  mealPlanId,
  recipeName,
  mealDate,
  mealType,
  hoursBeforeMeal = 2,
}: {
  mealPlanId: string;
  recipeName: string;
  mealDate: Date;
  mealType: string;
  hoursBeforeMeal?: number;
}): Promise<string | null> {
  const reminderDate = new Date(mealDate);
  reminderDate.setHours(reminderDate.getHours() - hoursBeforeMeal);
  if (reminderDate <= new Date()) {
    return null;
  }
  const id = await scheduleLocalNotification({
    title: `${mealType} Reminder`,
    body: `Time to start preparing ${recipeName}!`,
    data: { type: 'meal_reminder', mealPlanId },
    trigger: { type: SchedulableTriggerInputTypes.DATE, date: reminderDate },
  });
  return id;
}

/**
 * Adds notification listener with defensive error handling
 * Returns null if registration fails to prevent TurboModule crashes
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription | null {
  try {
    ensureNotificationHandlerConfigured();
    return Notifications.addNotificationReceivedListener(callback);
  } catch (error) {
    console.warn('[Notifications] Failed to add notification listener:', error);
    return null;
  }
}

/**
 * Adds response listener for when user interacts with notification
 * Returns null if registration fails to prevent TurboModule crashes
 */
export function addNotificationResponseReceivedListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription | null {
  try {
    ensureNotificationHandlerConfigured();
    return Notifications.addNotificationResponseReceivedListener(callback);
  } catch (error) {
    console.warn('[Notifications] Failed to add response listener:', error);
    return null;
  }
}

/**
 * Gets badge count
 */
export async function getBadgeCount(): Promise<number> {
  try {
    return await Notifications.getBadgeCountAsync();
  } catch (error) {
    console.warn('[Notifications] Failed to get badge count:', error);
    return 0;
  }
}

/**
 * Sets badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.warn('[Notifications] Failed to set badge count:', error);
  }
}

/**
 * Clears badge
 */
export async function clearBadge(): Promise<void> {
  try {
    await setBadgeCount(0);
  } catch (error) {
    console.warn('[Notifications] Failed to clear badge:', error);
  }
}

