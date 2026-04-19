import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import { MealPlan } from './types';

const DINNER_PLANS_CALENDAR_NAME = 'Dinner Plans Meals';
const DINNER_PLANS_CALENDAR_COLOR = '#4CAF50';

/** Thrown when no calendar source supports creating new calendars */
export class CalendarCreationNotSupportedError extends Error {
  constructor() {
    super('No calendar source supports creating new calendars. Please select an existing calendar.');
    this.name = 'CalendarCreationNotSupportedError';
  }
}

export interface CalendarConfig {
  calendarId: string | null;
  syncEnabled: boolean;
  remindersEnabled: boolean;
  reminderMinutes: number;
}

export interface WritableCalendar {
  id: string;
  title: string;
  color: string;
  source: string;
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

  /**
   * Gets all calendars that support modifications (for user selection)
   */
  async getWritableCalendars(): Promise<WritableCalendar[]> {
    const calendars = await this.getCalendars();
    return calendars
      .filter((c) => c.allowsModifications)
      .map((c) => ({
        id: c.id,
        title: c.title,
        color: c.color || '#4CAF50',
        source: c.source?.name || 'Unknown',
      }));
  },

  async getDefaultCalendarSource() {
    const defaultCalendar = await Calendar.getDefaultCalendarAsync();
    return defaultCalendar.source;
  },

  /**
   * Finds a calendar source that supports creating new calendars
   * Prioritizes: Local > iCloud > CalDAV > other sources
   */
  async findWritableCalendarSource(): Promise<Calendar.Source | null> {
    const calendars = await this.getCalendars();
    const sources = new Map<string, Calendar.Source>();
    for (const cal of calendars) {
      if (cal.source?.id && !sources.has(cal.source.id)) {
        sources.set(cal.source.id, cal.source);
      }
    }
    const sourceList = Array.from(sources.values());
    const priorityOrder = [
      Calendar.SourceType.LOCAL,
      Calendar.SourceType.CALDAV,
      Calendar.SourceType.SUBSCRIBED,
    ];
    for (const sourceType of priorityOrder) {
      const source = sourceList.find((s) => s.type === sourceType);
      if (source) {
        return source;
      }
    }
    const nonExchangeSource = sourceList.find(
      (s) => s.type !== Calendar.SourceType.EXCHANGE && s.type !== Calendar.SourceType.MOBILEME
    );
    if (nonExchangeSource) {
      return nonExchangeSource;
    }
    return null;
  },

  async getCalendar(calendarId: string) {
    try {
      const calendar = await Calendar.getCalendarsAsync(calendarId);
      return calendar;
    } catch (e) {
      return null;
    }
  },

  async createDinnerPlansCalendar(): Promise<string> {
    const calendars = await this.getCalendars();
    const existingCalendar = calendars.find(
      (c) => c.title === DINNER_PLANS_CALENDAR_NAME && c.allowsModifications
    );
    if (existingCalendar) {
      return existingCalendar.id;
    }
    let calendarSource: Calendar.Source | { isLocalAccount: boolean; name: string; type: Calendar.SourceType; id?: string };
    if (Platform.OS === 'ios') {
      const writableSource = await this.findWritableCalendarSource();
      if (!writableSource) {
        throw new CalendarCreationNotSupportedError();
      }
      calendarSource = writableSource;
    } else {
      calendarSource = { 
        isLocalAccount: true, 
        name: 'Dinner Plans', 
        type: Calendar.SourceType.LOCAL 
      };
    }
    try {
      const newCalendarId = await Calendar.createCalendarAsync({
        title: DINNER_PLANS_CALENDAR_NAME,
        color: DINNER_PLANS_CALENDAR_COLOR,
        entityType: Calendar.EntityTypes.EVENT,
        sourceId: calendarSource.id,
        source: calendarSource as Calendar.Source,
        name: DINNER_PLANS_CALENDAR_NAME,
        ownerAccount: 'personal',
        accessLevel: Calendar.CalendarAccessLevel.OWNER,
      });
      return newCalendarId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('calendars to be added or removed') || 
          errorMessage.includes('not allow')) {
        throw new CalendarCreationNotSupportedError();
      }
      throw error;
    }
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
      notes: `Recipe: ${meal.recipe_name}\n\nPrepared with Dinner Plans`,
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
        notes: `Recipe: ${meal.recipe_name}\n\nPrepared with Dinner Plans`,
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
