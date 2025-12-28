# Calorie Counter Integration

## Product Requirements Document

| Field | Value |
|-------|-------|
| **Version** | 1.0 |
| **Date** | December 27, 2025 |
| **Author** | Pantry Pal Development Team |
| **Status** | Draft |

---

## 1. Executive Summary

This PRD outlines the integration strategy for connecting Pantry Pal with the top three calorie counting applications: MyFitnessPal, Lose It!, and Cronometer. Due to API access limitations across all three platforms, the recommended approach leverages Apple HealthKit (iOS) and Google Health Connect (Android) as intermediary bridges, enabling users to sync their meal nutrition data with their preferred calorie tracking apps.

---

## 2. Problem Statement

Users who track calories and macros often use dedicated apps like MyFitnessPal, Lose It!, or Cronometer. Currently, when they log meals in Pantry Pal, they must manually re-enter nutrition information into their calorie tracker, creating friction and reducing adherence to both meal planning and calorie tracking goals.

---

## 3. Market Research: Top Calorie Counters

### 3.1 MyFitnessPal

| Attribute | Details |
|-----------|---------|
| **User Base** | 200+ million users worldwide |
| **API Status** | Private API (invitation-only partner program) |
| **Database** | 14+ million foods, largest in the industry |
| **Health Integration** | Syncs with Apple HealthKit and Google Health Connect |
| **Key Features** | Barcode scanning, meal logging, macro tracking, exercise integration |

### 3.2 Lose It!

| Attribute | Details |
|-----------|---------|
| **User Base** | 50+ million downloads |
| **API Status** | Limited partner API (requires business relationship) |
| **Database** | 33+ million foods with AI-powered Snap It photo recognition |
| **Health Integration** | Syncs with Apple HealthKit and Google Health Connect |
| **Key Features** | Food recognition AI, meal planning, challenges, premium coaching |

### 3.3 Cronometer

| Attribute | Details |
|-----------|---------|
| **User Base** | 6+ million users |
| **API Status** | No public API available |
| **Database** | Curated database tracking 84 micronutrients |
| **Health Integration** | Syncs with Apple HealthKit and Google Health Connect |
| **Key Features** | Detailed micronutrient tracking, professional/clinical versions |

---

## 4. Integration Strategy

### 4.1 Primary Approach: Health Platform Bridge

Since all three target calorie counters sync with native health platforms, Pantry Pal will write nutrition data to Apple HealthKit (iOS) and Google Health Connect (Android). Users can then enable their calorie tracking app to read from these health platforms.

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Pantry Pal │ ──► │  HealthKit /    │ ──► │  MyFitnessPal   │
│   (Meal)    │     │  Health Connect │     │  Lose It!       │
│             │     │                 │     │  Cronometer     │
└─────────────┘     └─────────────────┘     └─────────────────┘
```

### 4.2 Technology Stack

| Platform | Library | Package |
|----------|---------|---------|
| **iOS** | Apple HealthKit | `react-native-health` |
| **Android** | Google Health Connect | `react-native-health-connect` |
| **Optional** | Terra API | `@tryterra/terra-react` |

### 4.3 Data Mapping

Pantry Pal meal nutrition data maps to health platform types:

| Pantry Pal Field | HealthKit Type | Health Connect Type |
|------------------|----------------|---------------------|
| Calories | HKQuantityTypeIdentifierDietaryEnergyConsumed | NutritionRecord.energy |
| Protein (g) | HKQuantityTypeIdentifierDietaryProtein | NutritionRecord.protein |
| Carbohydrates (g) | HKQuantityTypeIdentifierDietaryCarbohydrates | NutritionRecord.totalCarbohydrate |
| Fat (g) | HKQuantityTypeIdentifierDietaryFatTotal | NutritionRecord.totalFat |
| Fiber (g) | HKQuantityTypeIdentifierDietaryFiber | NutritionRecord.fiber |
| Sodium (mg) | HKQuantityTypeIdentifierDietarySodium | NutritionRecord.sodium |

---

## 5. Functional Requirements

### 5.1 Core Sync Features

1. Users can connect Pantry Pal to Apple HealthKit or Google Health Connect
2. When a meal is marked as "consumed," nutrition data automatically syncs to health platform
3. Manual "Log to Health" button available for users who want explicit control
4. Meal type tagging (breakfast, lunch, dinner, snack) preserved in sync
5. Historical meal data can be batch-synced for past entries

### 5.2 User Configuration

1. Toggle to enable/disable automatic health sync
2. Select which nutrients to sync (e.g., calories only vs. full macros)
3. Choose meal types to sync (e.g., only planned meals vs. all consumed items)
4. View sync history and status for recent meals

### 5.3 Sync Conflict Handling

1. Duplicate detection based on meal name + timestamp
2. Option to overwrite or skip existing entries
3. Sync queue for offline scenarios with retry logic
4. Clear error messaging when sync fails

---

## 6. Technical Architecture

### 6.1 iOS Implementation (HealthKit)

```typescript
import AppleHealthKit, { HealthKitPermissions } from 'react-native-health';

const permissions: HealthKitPermissions = {
  permissions: {
    read: [],
    write: [
      AppleHealthKit.Constants.Permissions.DietaryEnergyConsumed,
      AppleHealthKit.Constants.Permissions.DietaryProtein,
      AppleHealthKit.Constants.Permissions.DietaryCarbohydrates,
      AppleHealthKit.Constants.Permissions.DietaryFatTotal,
      AppleHealthKit.Constants.Permissions.DietaryFiber,
      AppleHealthKit.Constants.Permissions.DietarySodium,
    ],
  },
};

// Initialize and request permissions
AppleHealthKit.initHealthKit(permissions, (error) => {
  if (error) {
    console.error('HealthKit initialization failed:', error);
  }
});

// Write meal nutrition data
const syncMealToHealthKit = (meal: Meal) => {
  AppleHealthKit.saveFood({
    foodName: meal.name,
    mealType: meal.type, // 1=breakfast, 2=lunch, 3=dinner, 4=snack
    date: meal.consumedAt.toISOString(),
    energy: meal.calories,
    protein: meal.protein,
    carbohydrates: meal.carbs,
    fatTotal: meal.fat,
    fiber: meal.fiber,
    sodium: meal.sodium,
  }, (err, result) => {
    if (err) console.error('Failed to save meal:', err);
  });
};
```

### 6.2 Android Implementation (Health Connect)

```typescript
import { initialize, requestPermission, insertRecords } from 'react-native-health-connect';

// Initialize Health Connect
await initialize();

// Request write permissions
await requestPermission([
  { accessType: 'write', recordType: 'NutritionRecord' },
]);

// Write meal nutrition data
const syncMealToHealthConnect = async (meal: Meal) => {
  await insertRecords([{
    recordType: 'NutritionRecord',
    startTime: meal.consumedAt.toISOString(),
    endTime: meal.consumedAt.toISOString(),
    mealType: getMealType(meal.type),
    name: meal.name,
    energy: { value: meal.calories, unit: 'kilocalories' },
    protein: { value: meal.protein, unit: 'grams' },
    totalCarbohydrate: { value: meal.carbs, unit: 'grams' },
    totalFat: { value: meal.fat, unit: 'grams' },
    fiber: { value: meal.fiber, unit: 'grams' },
    sodium: { value: meal.sodium, unit: 'milligrams' },
  }]);
};
```

### 6.3 Sync Queue Schema

```sql
CREATE TABLE nutrition_sync_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  meal_id UUID REFERENCES meals(id),
  platform VARCHAR(20) CHECK (platform IN ('healthkit', 'health_connect')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'syncing', 'completed', 'failed')),
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);
```

---

## 7. User Experience

### 7.1 Setup Flow

1. Navigate to Settings → Health Integration
2. Tap "Connect to Apple Health" or "Connect to Health Connect"
3. System permission dialog appears - user grants write access
4. Success confirmation with explanation of how sync works
5. Prompt to enable sync in their calorie tracking app

### 7.2 Daily Usage

1. User plans and consumes meals as normal in Pantry Pal
2. When marking meal as "eaten," nutrition data silently syncs
3. Small sync indicator shows status (syncing/synced/error)
4. Data appears in user's calorie tracker automatically

### 7.3 Error Handling UI

- Toast notification for sync failures with retry button
- Sync history screen showing all attempts and statuses
- "Retry All Failed" button for batch recovery
- Link to troubleshooting guide for permission issues

---

## 8. Privacy & Security

1. **Explicit Consent:** Users must opt-in to health sync; never enabled by default
2. **Minimal Permissions:** Request only write permissions, not read access to existing health data
3. **Transparent Data Flow:** Clear explanation that data flows to Apple/Google, not to Pantry Pal servers
4. **Easy Disconnect:** One-tap option to revoke access and stop syncing
5. **No Data Storage:** Health sync happens on-device; Pantry Pal servers never see health data

---

## 9. Implementation Plan

### 9.1 Phase 1: Health Platform Integration (Week 1)

1. Integrate react-native-health for iOS
2. Integrate react-native-health-connect for Android
3. Implement permission request flows
4. Build basic sync function for meal data

### 9.2 Phase 2: Sync Engine (Week 2)

5. Create sync queue with offline support
6. Implement retry logic with exponential backoff
7. Add duplicate detection
8. Build sync status tracking

### 9.3 Phase 3: UI & Polish (Week 3-4)

9. Create Settings → Health Integration screen
10. Add sync indicators to meal cards
11. Build sync history and troubleshooting screens
12. Write user documentation and help articles

---

## 10. Optional Enhancement: Terra API

For premium users or future iterations, Terra API provides aggregated read access to calorie tracker data:

| Feature | Benefit |
|---------|---------|
| **Read Access** | Pull existing food logs from MyFitnessPal, etc. |
| **Bidirectional Sync** | See what user logged elsewhere, avoid duplicates |
| **Unified Dashboard** | Show combined nutrition from all sources |
| **Cost** | ~$0.50-2.00 per active user per month |

This would enable features like "Import today's breakfast from MyFitnessPal" or showing a unified daily nutrition total across all apps.

---

## 11. Success Metrics

- 30% of active users connect health integration within 60 days
- Average of 15+ meals synced per user per month
- Sync success rate > 90%
- NPS improvement of +10 for users with health integration enabled

---

## 12. Future Considerations

- **Bidirectional Sync:** Read from health platforms to show unified nutrition view
- **Wearable Integration:** Sync exercise data to adjust calorie goals
- **Recipe Nutrition:** Auto-calculate nutrition for custom recipes
- **Barcode-to-Health:** Scan product → get nutrition → log directly to health
- **Premium Terra Integration:** Enhanced read capabilities for power users