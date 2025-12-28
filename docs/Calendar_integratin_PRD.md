# Calendar Integration

## Product Requirements Document

| Field | Value |
|-------|-------|
| **Version** | 1.0 |
| **Date** | December 27, 2025 |
| **Author** | Pantry Pal Development Team |
| **Status** | Draft |

---

## 1. Executive Summary

This PRD outlines the implementation of calendar integration for Pantry Pal, enabling users to sync their meal plans with Google Calendar, Apple Calendar, Microsoft Outlook, and Yahoo Calendar. The integration provides bidirectional awareness between meal planning and existing calendar commitments, helping users schedule meals around their daily activities.

---

## 2. Problem Statement

Users plan meals in Pantry Pal but manage their daily schedules in external calendar apps. This disconnect leads to meal plans that conflict with meetings, appointments, and events. Users need their meal schedule integrated with their primary calendar for a unified view of their day.

---

## 3. Market Research: Calendar Providers

### 3.1 Provider Comparison

| Provider | Market Share | API Type | Authentication | Best For |
|----------|--------------|----------|----------------|----------|
| **Google Calendar** | ~70% | REST API v3 | OAuth 2.0 | Most users, full features |
| **Apple Calendar** | ~25% (mobile) | EventKit Framework | Native permissions | iOS users, offline support |
| **Microsoft Outlook** | ~15% | Graph API | Azure AD OAuth | Enterprise, Microsoft 365 users |
| **Yahoo Calendar** | ~3% | CalDAV Protocol | App Password | Legacy users |

### 3.2 Feature Availability

| Feature | Google | Apple | Microsoft | Yahoo |
|---------|--------|-------|-----------|-------|
| Create Events | ✅ | ✅ | ✅ | ✅ |
| Update Events | ✅ | ✅ | ✅ | ✅ |
| Delete Events | ✅ | ✅ | ✅ | ✅ |
| Recurring Events | ✅ | ✅ | ✅ | ⚠️ Limited |
| Reminders | ✅ | ✅ | ✅ | ✅ |
| All-Day Events | ✅ | ✅ | ✅ | ✅ |
| Free/Busy Query | ✅ | ⚠️ Local only | ✅ | ❌ |
| Webhooks/Push | ✅ | ❌ | ✅ | ❌ |

---

## 4. Technical Architecture

### 4.1 Unified Calendar Service

```
┌─────────────────────────────────────────────────────────────┐
│                    CalendarService                          │
│   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│   │   Google    │ │    Apple    │ │  Microsoft  │ │ Yahoo │ │
│   │   Adapter   │ │   Adapter   │ │   Adapter   │ │Adapter│ │
│   └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └───┬───┘ │
│          │               │               │            │     │
│          ▼               ▼               ▼            ▼     │
│   ┌─────────────────────────────────────────────────────┐   │
│   │           Unified Event Interface                    │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Technology Stack

| Platform/Provider | Technology | Package/SDK |
|-------------------|------------|-------------|
| **Native iOS/Android** | react-native-calendar-events | Local calendar access |
| **Google Calendar** | REST API v3 | `@react-native-google-signin/google-signin` |
| **Microsoft Outlook** | Microsoft Graph API | `@azure/msal-react-native` |
| **Yahoo Calendar** | CalDAV Protocol | Custom implementation |

### 4.3 Database Schema

```sql
-- Connected calendar accounts
CREATE TABLE calendar_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  provider VARCHAR(20) CHECK (provider IN ('google', 'apple', 'microsoft', 'yahoo')),
  account_email VARCHAR(255),
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  calendar_id VARCHAR(255), -- Selected calendar
  sync_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Synced meal events
CREATE TABLE synced_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_plan_id UUID REFERENCES meal_plans(id) ON DELETE CASCADE,
  calendar_connection_id UUID REFERENCES calendar_connections(id) ON DELETE CASCADE,
  external_event_id VARCHAR(255), -- Provider's event ID
  last_synced_at TIMESTAMPTZ,
  sync_hash VARCHAR(64), -- Detect changes
  UNIQUE(meal_plan_id, calendar_connection_id)
);

-- Sync queue for reliable delivery
CREATE TABLE calendar_sync_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  operation VARCHAR(20) CHECK (operation IN ('create', 'update', 'delete')),
  meal_plan_id UUID REFERENCES meal_plans(id),
  provider VARCHAR(20),
  status VARCHAR(20) DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. Functional Requirements

### 5.1 Calendar Connection

1. Users can connect multiple calendar providers simultaneously
2. OAuth flow for Google and Microsoft accounts
3. Native permission request for Apple Calendar
4. Manual CalDAV setup for Yahoo with app password
5. Select specific calendar for meal sync (if user has multiple)
6. Test connection button to verify access

### 5.2 Meal Event Sync

1. Create calendar event when meal is planned
2. Update event when meal time or recipe changes
3. Delete event when meal is removed from plan
4. Bidirectional sync: changes in calendar reflect in Pantry Pal
5. Customizable event title format (e.g., "🍽️ Dinner: Pasta Carbonara")
6. Event description includes: ingredients needed, prep time, recipe link

### 5.3 Event Details

Default event structure:

| Field | Content |
|-------|---------|
| **Title** | 🍳 Breakfast: [Recipe Name] |
| **Time** | Meal time (default duration: 30 min) |
| **Description** | Ingredients list, prep time, deep link to recipe |
| **Reminders** | Configurable (default: 1 hour before, 15 min before) |
| **Color** | Meal-type specific (optional for supported providers) |

### 5.4 Conflict Detection

1. Show warning when planning meal during busy calendar time
2. Suggest alternative meal times based on free slots
3. Visual indicator on meal calendar showing external events
4. "Find Free Time" feature to auto-suggest meal slots

### 5.5 Sync Configuration

1. Toggle sync on/off per connected calendar
2. Choose which meal types to sync (breakfast, lunch, dinner, snacks)
3. Set default event duration per meal type
4. Configure reminder preferences
5. Choose to include or exclude prep time as separate event

---

## 6. Provider Implementation Details

### 6.1 Google Calendar

```typescript
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Configure with calendar scope
GoogleSignin.configure({
  scopes: ['https://www.googleapis.com/auth/calendar.events'],
  webClientId: 'YOUR_WEB_CLIENT_ID',
});

// Create meal event
const createGoogleEvent = async (meal: MealPlan) => {
  const tokens = await GoogleSignin.getTokens();
  
  const event = {
    summary: `🍽️ ${meal.mealType}: ${meal.recipe.name}`,
    description: formatMealDescription(meal),
    start: { dateTime: meal.plannedTime.toISOString() },
    end: { dateTime: addMinutes(meal.plannedTime, 30).toISOString() },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 60 },
        { method: 'popup', minutes: 15 },
      ],
    },
  };

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );
  
  return response.json();
};
```

### 6.2 Apple Calendar (Native)

```typescript
import RNCalendarEvents from 'react-native-calendar-events';

// Request permission
const status = await RNCalendarEvents.requestPermissions();

// Create meal event
const createAppleEvent = async (meal: MealPlan) => {
  const eventId = await RNCalendarEvents.saveEvent(
    `🍽️ ${meal.mealType}: ${meal.recipe.name}`,
    {
      startDate: meal.plannedTime.toISOString(),
      endDate: addMinutes(meal.plannedTime, 30).toISOString(),
      notes: formatMealDescription(meal),
      alarms: [
        { date: -60 }, // 60 minutes before
        { date: -15 }, // 15 minutes before
      ],
    }
  );
  
  return eventId;
};
```

### 6.3 Microsoft Outlook

```typescript
import { PublicClientApplication } from '@azure/msal-react-native';

const msalConfig = {
  auth: {
    clientId: 'YOUR_AZURE_CLIENT_ID',
    redirectUri: 'msauth.com.pantrypal://auth',
  },
};

const pca = new PublicClientApplication(msalConfig);

// Create meal event via Graph API
const createOutlookEvent = async (meal: MealPlan, accessToken: string) => {
  const event = {
    subject: `🍽️ ${meal.mealType}: ${meal.recipe.name}`,
    body: {
      contentType: 'HTML',
      content: formatMealDescriptionHTML(meal),
    },
    start: {
      dateTime: meal.plannedTime.toISOString(),
      timeZone: 'UTC',
    },
    end: {
      dateTime: addMinutes(meal.plannedTime, 30).toISOString(),
      timeZone: 'UTC',
    },
    reminderMinutesBeforeStart: 60,
  };

  const response = await fetch(
    'https://graph.microsoft.com/v1.0/me/calendar/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );
  
  return response.json();
};
```

### 6.4 Yahoo Calendar (CalDAV)

Yahoo requires CalDAV protocol with app-specific password:

1. User generates app password in Yahoo Account Security
2. Pantry Pal stores credentials securely (encrypted)
3. Events synced via CalDAV PUT/DELETE requests
4. Less reliable than other providers; recommend as fallback option

---

## 7. User Experience

### 7.1 Connection Flow

1. Settings → Calendar Integration
2. Select provider (Google, Apple, Microsoft, Yahoo)
3. Complete OAuth or permission flow
4. Choose which calendar to use (if multiple)
5. Configure sync preferences
6. Success confirmation with sync status

### 7.2 Meal Planning Integration

1. Calendar icon on meal planning screen shows sync status
2. Mini-calendar view shows external events alongside meals
3. Conflict warnings appear inline when scheduling
4. Quick actions: "Sync Now" / "Open in Calendar"

### 7.3 Unified Calendar View

1. New "Calendar" tab showing combined view
2. Meal events in Pantry Pal colors
3. External events in muted colors for context
4. Tap external event to see details (read-only)
5. Tap meal event to edit in Pantry Pal

---

## 8. Security Considerations

1. **OAuth Security:** Store tokens encrypted at rest using device keychain
2. **Token Refresh:** Automatic refresh before expiration
3. **Minimal Scopes:** Request only calendar event permissions, not full account access
4. **Secure CalDAV:** Yahoo credentials encrypted, transmitted over HTTPS only
5. **User Control:** Clear revoke access option for each connected calendar
6. **Audit Trail:** Log all sync operations for troubleshooting

---

## 9. Export Features

For users who prefer manual import:

### 9.1 ICS Export

1. Export meal plan as .ics file
2. User can import into any calendar app
3. Includes all meal details and reminders

### 9.2 iCal Feed URL

1. Generate unique iCal feed URL
2. Subscribe from any calendar app
3. Updates automatically as meal plan changes
4. Revokable at any time

---

## 10. Implementation Plan

### 10.1 Phase 1: Native Calendar (Week 1)

1. Integrate react-native-calendar-events
2. Implement Apple Calendar read/write
3. Build calendar connection management UI
4. Basic meal event sync

### 10.2 Phase 2: Google Calendar (Week 2)

5. Implement Google OAuth flow
6. Build Google Calendar adapter
7. Add bidirectional sync support
8. Implement conflict detection

### 10.3 Phase 3: Microsoft & Export (Week 3)

9. Implement Microsoft OAuth and Graph API
10. Build Microsoft Calendar adapter
11. Create .ics export functionality
12. Implement iCal feed generation

### 10.4 Phase 4: Polish & Yahoo (Week 4)

13. Implement Yahoo CalDAV support
14. Build unified calendar view
15. Add sync queue and retry logic
16. Comprehensive testing and documentation

---

## 11. Success Metrics

- 40% of active users connect at least one calendar within 30 days
- 25% increase in meal plan adherence for calendar-connected users
- Average of 10+ meals synced per week per connected user
- Sync reliability > 95% (successful syncs / attempted syncs)
- NPS improvement of +12 for users with calendar integration

---

## 12. Future Considerations

- **Smart Scheduling:** AI-powered meal time suggestions based on calendar patterns
- **Prep Time Events:** Separate calendar events for meal preparation
- **Shopping Trip Events:** Auto-schedule grocery shopping based on meal plan
- **Family Calendar Coordination:** Sync with household members' calendars
- **Voice Assistant Integration:** "Hey Siri, what's for dinner?" using calendar events
- **Recurring Meals:** Sync weekly meal plans as recurring calendar events