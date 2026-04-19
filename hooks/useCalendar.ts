import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CalendarService, CalendarCreationNotSupportedError, WritableCalendar } from '../lib/calendarService';
import { MealPlan } from '../lib/types';
import { Alert, Linking, Platform } from 'react-native';

const CALENDAR_SETTINGS_KEY = 'dinner_plans_calendar_settings';
const EVENT_MAPPING_KEY = 'dinner_plans_calendar_events';

export interface CalendarSettings {
  enabled: boolean;
  calendarId: string | null;
  calendarName: string | null;
  reminders: boolean;
  reminderMinutes: number;
}

const DEFAULT_SETTINGS: CalendarSettings = {
  enabled: false,
  calendarId: null,
  calendarName: null,
  reminders: true,
  reminderMinutes: 60,
};

export function useCalendar() {
  const [settings, setSettings] = useState<CalendarSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [eventMapping, setEventMapping] = useState<Record<string, string>>({}); // mealId -> eventId
  const [needsCalendarSelection, setNeedsCalendarSelection] = useState(false);
  const [availableCalendars, setAvailableCalendars] = useState<WritableCalendar[]>([]);

  useEffect(() => {
    loadSettings();
    loadEventMapping();
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const granted = await CalendarService.checkPermissions();
    setHasPermissions(granted);
    return granted;
  };

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(CALENDAR_SETTINGS_KEY);
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load calendar settings', e);
    } finally {
      setLoading(false);
    }
  };

  const loadEventMapping = async () => {
    try {
      const stored = await AsyncStorage.getItem(EVENT_MAPPING_KEY);
      if (stored) {
        setEventMapping(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load event mapping', e);
    }
  };

  const saveSettings = async (newSettings: CalendarSettings) => {
    try {
      await AsyncStorage.setItem(CALENDAR_SETTINGS_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (e) {
      console.error('Failed to save calendar settings', e);
    }
  };

  const saveEventMapping = async (newMapping: Record<string, string>) => {
    try {
      await AsyncStorage.setItem(EVENT_MAPPING_KEY, JSON.stringify(newMapping));
      setEventMapping(newMapping);
    } catch (e) {
      console.error('Failed to save event mapping', e);
    }
  };

  const loadAvailableCalendars = async (): Promise<WritableCalendar[]> => {
    try {
      const calendars = await CalendarService.getWritableCalendars();
      setAvailableCalendars(calendars);
      return calendars;
    } catch (e) {
      console.error('Failed to load available calendars', e);
      return [];
    }
  };

  const enableCalendar = async (): Promise<boolean | 'needs_selection'> => {
    try {
      const granted = await CalendarService.requestPermissions();
      if (!granted) {
        Alert.alert(
          'Permissions Required',
          'Please enable calendar and reminder permissions in your device settings to use this feature.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return false;
      }
      setHasPermissions(true);
      try {
        const calendarId = await CalendarService.createDinnerPlansCalendar();
        await saveSettings({
          ...settings,
          enabled: true,
          calendarId,
          calendarName: 'Dinner Plans Meals',
        });
        return true;
      } catch (error) {
        if (error instanceof CalendarCreationNotSupportedError) {
          const calendars = await loadAvailableCalendars();
          if (calendars.length === 0) {
            Alert.alert(
              'No Calendars Available',
              'No writable calendars found on your device. Please add a calendar in your device settings first.'
            );
            return false;
          }
          setNeedsCalendarSelection(true);
          return 'needs_selection';
        }
        throw error;
      }
    } catch (e) {
      console.error('Error enabling calendar', e);
      Alert.alert('Error', 'Failed to enable calendar sync.');
      return false;
    }
  };

  const selectCalendar = async (calendar: WritableCalendar): Promise<boolean> => {
    try {
      await saveSettings({
        ...settings,
        enabled: true,
        calendarId: calendar.id,
        calendarName: calendar.title,
      });
      setNeedsCalendarSelection(false);
      return true;
    } catch (e) {
      console.error('Error selecting calendar', e);
      Alert.alert('Error', 'Failed to select calendar.');
      return false;
    }
  };

  const cancelCalendarSelection = () => {
    setNeedsCalendarSelection(false);
  };

  const disableCalendar = async () => {
    await saveSettings({
      ...settings,
      enabled: false,
    });
    setNeedsCalendarSelection(false);
  };

  const ensureCalendarExists = async (): Promise<string | null> => {
    try {
      // Try to create/get existing
      const calendarId = await CalendarService.createDinnerPlansCalendar();
      if (calendarId !== settings.calendarId) {
        await saveSettings({ ...settings, calendarId });
      }
      return calendarId;
    } catch (e) {
      console.error('Failed to recreate calendar', e);
      return null;
    }
  };

  const syncMeal = async (meal: MealPlan) => {
    if (!settings.enabled) return;
    
    // verify permissions again in case they were revoked
    const perm = await CalendarService.checkPermissions();
    if (!perm) {
        setHasPermissions(false);
        return; // Fail silently or warn?
    }
    setHasPermissions(true);

    let calendarId = settings.calendarId;
    if (!calendarId) {
        calendarId = await ensureCalendarExists();
        if (!calendarId) return;
    }

    try {
      const existingEventId = eventMapping[meal.id];

      if (existingEventId) {
        // Update existing event
        try {
            await CalendarService.updateEvent(
              calendarId,
              existingEventId,
              meal,
              settings.reminders ? settings.reminderMinutes : 0
            );
        } catch (e: any) {
            // Check if error is due to calendar missing or event missing
            if (e.message?.includes('Calendar not found')) {
                 // Recreate calendar and try again (create new event)
                 const newCalendarId = await ensureCalendarExists();
                 if (newCalendarId) {
                     // Can't update, must create new
                     const eventId = await CalendarService.createEvent(
                        newCalendarId,
                        meal,
                        settings.reminders ? settings.reminderMinutes : 0
                      );
                      const newMapping = { ...eventMapping, [meal.id]: eventId };
                      await saveEventMapping(newMapping);
                 }
            } else {
                // Assume event missing, try create
                console.warn('Update failed, trying to create new event', e);
                const eventId = await CalendarService.createEvent(
                    calendarId,
                    meal,
                    settings.reminders ? settings.reminderMinutes : 0
                );
                const newMapping = { ...eventMapping, [meal.id]: eventId };
                await saveEventMapping(newMapping);
            }
        }
      } else {
        // Create new event
        try {
            const eventId = await CalendarService.createEvent(
              calendarId,
              meal,
              settings.reminders ? settings.reminderMinutes : 0
            );
            
            if (eventId) {
                const newMapping = { ...eventMapping, [meal.id]: eventId };
                await saveEventMapping(newMapping);
            }
        } catch (e: any) {
             if (e.message?.includes('Calendar not found')) {
                 const newCalendarId = await ensureCalendarExists();
                 if (newCalendarId) {
                     const eventId = await CalendarService.createEvent(
                        newCalendarId,
                        meal,
                        settings.reminders ? settings.reminderMinutes : 0
                      );
                      const newMapping = { ...eventMapping, [meal.id]: eventId };
                      await saveEventMapping(newMapping);
                 }
             } else {
                 throw e;
             }
        }
      }
    } catch (e) {
      console.error('Error syncing meal', e);
    }
  };

  const removeMealEvent = async (mealId: string) => {
      if (!settings.enabled) return;
      const perm = await CalendarService.checkPermissions();
      if (!perm) return;
      
      const eventId = eventMapping[mealId];
      if (eventId) {
          try {
              await CalendarService.deleteEvent(eventId);
              const newMapping = { ...eventMapping };
              delete newMapping[mealId];
              await saveEventMapping(newMapping);
          } catch (e) {
              console.error('Error removing meal event', e);
              // Clean up mapping anyway
              const newMapping = { ...eventMapping };
              delete newMapping[mealId];
              await saveEventMapping(newMapping);
          }
      }
  };

  return {
    settings,
    loading,
    hasPermissions,
    needsCalendarSelection,
    availableCalendars,
    enableCalendar,
    disableCalendar,
    selectCalendar,
    cancelCalendarSelection,
    loadAvailableCalendars,
    syncMeal,
    removeMealEvent,
    checkPermissions,
  };
}
