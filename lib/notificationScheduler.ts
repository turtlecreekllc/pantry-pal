import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import {
  scheduleExpiryReminder,
  scheduleMealReminder,
  cancelNotification,
} from './notificationService';

const NOTIFICATION_IDS_KEY = 'scheduled_notification_ids';

interface NotificationPreferences {
  expiryReminders: boolean;
  mealReminders: boolean;
  householdActivity: boolean;
  expiryDaysBefore: number;
  mealHoursBefore: number;
}

interface ScheduledNotificationMap {
  expiry: Record<string, string>; // itemId -> notificationId
  meal: Record<string, string>; // mealPlanId -> notificationId
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  expiryReminders: true,
  mealReminders: true,
  householdActivity: true,
  expiryDaysBefore: 3,
  mealHoursBefore: 2,
};

/**
 * Loads scheduled notification IDs from storage
 */
async function loadNotificationMap(): Promise<ScheduledNotificationMap> {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATION_IDS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('[NotificationScheduler] Failed to load notification map:', e);
  }
  return { expiry: {}, meal: {} };
}

/**
 * Saves scheduled notification IDs to storage
 */
async function saveNotificationMap(map: ScheduledNotificationMap): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATION_IDS_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn('[NotificationScheduler] Failed to save notification map:', e);
  }
}

/**
 * Fetches user notification preferences from Supabase
 */
async function getUserPreferences(userId: string): Promise<NotificationPreferences> {
  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error && error.code !== 'PGRST116') {
      console.warn('[NotificationScheduler] Failed to fetch preferences:', error.message);
      return DEFAULT_PREFERENCES;
    }
    if (data) {
      return {
        expiryReminders: data.expiry_reminders ?? true,
        mealReminders: data.meal_reminders ?? true,
        householdActivity: data.household_activity ?? true,
        expiryDaysBefore: data.expiry_days_before ?? 3,
        mealHoursBefore: data.meal_hours_before ?? 2,
      };
    }
  } catch (e) {
    console.warn('[NotificationScheduler] Error fetching preferences:', e);
  }
  return DEFAULT_PREFERENCES;
}

/**
 * Checks if push notifications are enabled for the user
 */
async function isPushEnabled(userId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', userId)
      .single();
    return Boolean(data?.token);
  } catch {
    return false;
  }
}

/**
 * Schedules an expiry reminder for a pantry item if user preferences allow
 */
export async function scheduleItemExpiryNotification({
  userId,
  itemId,
  itemName,
  expiryDate,
}: {
  userId: string;
  itemId: string;
  itemName: string;
  expiryDate: string | Date | null;
}): Promise<void> {
  if (!expiryDate) return;
  try {
    const enabled = await isPushEnabled(userId);
    if (!enabled) return;
    const prefs = await getUserPreferences(userId);
    if (!prefs.expiryReminders) return;
    const notificationMap = await loadNotificationMap();
    const existingId = notificationMap.expiry[itemId];
    if (existingId) {
      await cancelNotification(existingId);
      delete notificationMap.expiry[itemId];
    }
    const expiryDateObj = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
    const notificationId = await scheduleExpiryReminder({
      itemId,
      itemName,
      expiryDate: expiryDateObj,
      daysBeforeExpiry: prefs.expiryDaysBefore,
    });
    if (notificationId) {
      notificationMap.expiry[itemId] = notificationId;
      await saveNotificationMap(notificationMap);
    }
  } catch (e) {
    console.warn('[NotificationScheduler] Failed to schedule expiry notification:', e);
  }
}

/**
 * Cancels an expiry reminder for a pantry item
 */
export async function cancelItemExpiryNotification(itemId: string): Promise<void> {
  try {
    const notificationMap = await loadNotificationMap();
    const existingId = notificationMap.expiry[itemId];
    if (existingId) {
      await cancelNotification(existingId);
      delete notificationMap.expiry[itemId];
      await saveNotificationMap(notificationMap);
    }
  } catch (e) {
    console.warn('[NotificationScheduler] Failed to cancel expiry notification:', e);
  }
}

/**
 * Schedules a meal reminder if user preferences allow
 */
export async function scheduleMealNotification({
  userId,
  mealPlanId,
  recipeName,
  mealDate,
  mealType,
}: {
  userId: string;
  mealPlanId: string;
  recipeName: string;
  mealDate: string;
  mealType: string;
}): Promise<void> {
  try {
    const enabled = await isPushEnabled(userId);
    if (!enabled) return;
    const prefs = await getUserPreferences(userId);
    if (!prefs.mealReminders) return;
    const notificationMap = await loadNotificationMap();
    const existingId = notificationMap.meal[mealPlanId];
    if (existingId) {
      await cancelNotification(existingId);
      delete notificationMap.meal[mealPlanId];
    }
    const mealDateTime = parseMealDateTime(mealDate, mealType);
    const notificationId = await scheduleMealReminder({
      mealPlanId,
      recipeName,
      mealDate: mealDateTime,
      mealType: mealType.charAt(0).toUpperCase() + mealType.slice(1),
      hoursBeforeMeal: prefs.mealHoursBefore,
    });
    if (notificationId) {
      notificationMap.meal[mealPlanId] = notificationId;
      await saveNotificationMap(notificationMap);
    }
  } catch (e) {
    console.warn('[NotificationScheduler] Failed to schedule meal notification:', e);
  }
}

/**
 * Cancels a meal reminder
 */
export async function cancelMealNotification(mealPlanId: string): Promise<void> {
  try {
    const notificationMap = await loadNotificationMap();
    const existingId = notificationMap.meal[mealPlanId];
    if (existingId) {
      await cancelNotification(existingId);
      delete notificationMap.meal[mealPlanId];
      await saveNotificationMap(notificationMap);
    }
  } catch (e) {
    console.warn('[NotificationScheduler] Failed to cancel meal notification:', e);
  }
}

/**
 * Parses meal date and adds appropriate time based on meal type
 */
function parseMealDateTime(dateString: string, mealType: string): Date {
  const date = new Date(dateString);
  if (dateString.length === 10) {
    const timeMap: Record<string, number> = {
      breakfast: 8,
      lunch: 12,
      dinner: 19,
      snack: 15,
    };
    const hour = timeMap[mealType.toLowerCase()] || 12;
    date.setHours(hour, 0, 0, 0);
  }
  return date;
}

