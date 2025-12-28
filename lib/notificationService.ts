import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import Constants from 'expo-constants';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

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
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
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
}): Promise<string> {
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
}

/**
 * Cancels a scheduled notification
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Cancels all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
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
    trigger: { date: reminderDate },
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
    trigger: { date: reminderDate },
  });
  return id;
}

/**
 * Adds notification listener
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Adds response listener for when user interacts with notification
 */
export function addNotificationResponseReceivedListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Gets badge count
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Sets badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clears badge
 */
export async function clearBadge(): Promise<void> {
  await setBadgeCount(0);
}

