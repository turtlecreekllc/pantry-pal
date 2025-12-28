import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import { MealPlan } from './types';

const PANTRY_PAL_CALENDAR_NAME = 'Pantry Pal Meals';
const PANTRY_PAL_CALENDAR_COLOR = '#4CAF50';

export interface CalendarConfig {
  calendarId: string | null;
  syncEnabled: boolean;
  remindersEnabled: boolean;
  reminderMinutes: number;
}

export const CalendarService = {
  async requestPermissions(): Promise<boolean> {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status === 'granted') {
      const remindersStatus = await Calendar.requestRemindersPermissionsAsync();
      return remindersStatus.status === 'granted';
    }
    return false;
  },

  async checkPermissions(): Promise<boolean> {
    const { status } = await Calendar.getCalendarPermissionsAsync();
    const { status: remindersStatus } = await Calendar.getRemindersPermissionsAsync();
    return status === 'granted' && remindersStatus === 'granted';
  },

  async getCalendars() {
    return await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  },

  async getDefaultCalendarSource() {
    const defaultCalendar = await Calendar.getDefaultCalendarAsync();
    return defaultCalendar.source;
  },

  async getCalendar(calendarId: string) {
    try {
      const calendar = await Calendar.getCalendarAsync(calendarId);
      return calendar;
    } catch (e) {
      return null;
    }
  },

  async createPantryPalCalendar(): Promise<string> {
    const calendars = await this.getCalendars();
    const existingCalendar = calendars.find(
      (c) => c.title === PANTRY_PAL_CALENDAR_NAME && c.allowsModifications
    );

    if (existingCalendar) {
      return existingCalendar.id;
    }

    const defaultSource =
      Platform.OS === 'ios'
        ? await this.getDefaultCalendarSource()
        : { isLocalAccount: true, name: 'Pantry Pal', type: Calendar.SourceType.LOCAL };

    const newCalendarId = await Calendar.createCalendarAsync({
      title: PANTRY_PAL_CALENDAR_NAME,
      color: PANTRY_PAL_CALENDAR_COLOR,
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: defaultSource.id,
      source: defaultSource,
      name: PANTRY_PAL_CALENDAR_NAME,
      ownerAccount: 'personal',
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });

    return newCalendarId;
  },

  async createEvent(calendarId: string, meal: MealPlan, reminderMinutes: number = 60): Promise<string> {
    // Verify calendar exists first
    const calendar = await this.getCalendar(calendarId);
    if (!calendar) {
      throw new Error('Calendar not found');
    }

    const startDate = new Date(meal.date);
    // Parsing date:
    // If date includes time, use it. If not, set based on mealType.
    let eventDate = new Date(meal.date);
    if (meal.date.length === 10) { // YYYY-MM-DD
       // Set default times
       const timeMap: Record<string, number> = {
         'breakfast': 8,
         'lunch': 12,
         'dinner': 19,
         'snack': 15
       };
       const hour = timeMap[meal.meal_type] || 12;
       eventDate.setHours(hour, 0, 0, 0);
    }

    const endDate = new Date(eventDate.getTime() + 30 * 60000); // 30 mins later

    const eventId = await Calendar.createEventAsync(calendarId, {
      title: `🍽️ ${meal.meal_type.charAt(0).toUpperCase() + meal.meal_type.slice(1)}: ${meal.recipe_name}`,
      startDate: eventDate,
      endDate: endDate,
      timeZone: 'UTC', 
      notes: `Recipe: ${meal.recipe_name}\n\nPrepared with Pantry Pal`,
      alarms: reminderMinutes > 0 ? [{ relativeOffset: -reminderMinutes }] : [],
    });

    return eventId;
  },

  async updateEvent(calendarId: string, eventId: string, meal: MealPlan, reminderMinutes: number = 60) {
    // Verify calendar exists
    const calendar = await this.getCalendar(calendarId);
    if (!calendar) {
      throw new Error('Calendar not found');
    }

    let eventDate = new Date(meal.date);
    if (meal.date.length === 10) { 
       const timeMap: Record<string, number> = {
         'breakfast': 8,
         'lunch': 12,
         'dinner': 19,
         'snack': 15
       };
       const hour = timeMap[meal.meal_type] || 12;
       eventDate.setHours(hour, 0, 0, 0);
    }
    const endDate = new Date(eventDate.getTime() + 30 * 60000);

    await Calendar.updateEventAsync(eventId, {
        title: `🍽️ ${meal.meal_type.charAt(0).toUpperCase() + meal.meal_type.slice(1)}: ${meal.recipe_name}`,
        startDate: eventDate,
        endDate: endDate,
        notes: `Recipe: ${meal.recipe_name}\n\nPrepared with Pantry Pal`,
        alarms: reminderMinutes > 0 ? [{ relativeOffset: -reminderMinutes }] : [],
    });
  },

  async deleteEvent(eventId: string) {
    try {
        await Calendar.deleteEventAsync(eventId);
    } catch (e) {
        console.log('Event already deleted or not found', e);
    }
  }
};
