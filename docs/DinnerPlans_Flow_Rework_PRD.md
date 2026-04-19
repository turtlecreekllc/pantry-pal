# DinnerPlans.ai
## User Experience Flow Rework — Product Requirements Document

---

| Field | Value |
|-------|-------|
| **Document Version** | 2.0 |
| **Last Updated** | December 2024 |
| **Status** | Ready for Development |
| **Author** | Product Team |

---

## Executive Summary

This PRD defines a fundamental reorientation of DinnerPlans.ai from a **pantry-first** app to a **problem-first** app. The core insight driving this change: families don't wake up thinking "I need to manage my pantry"—they think **"What's for dinner tonight?"**

### The Strategic Shift

| Aspect | Current State | Future State |
|--------|---------------|--------------|
| **Home Screen** | Pantry inventory list | "What's for Dinner Tonight?" with instant suggestions |
| **Primary Action** | "Add item to pantry" | "Get dinner idea NOW" |
| **Pantry Role** | Prerequisite to value | Enhancement to suggestions |
| **Data Collection** | Upfront during onboarding | Progressive, passive, contextual |
| **AI Integration** | Separate chat tab | Woven throughout every interaction |
| **Time to Value** | Minutes (requires pantry setup) | Seconds (works with zero data) |

### Key Objectives

1. **Deliver value in under 30 seconds** — Answer "what's for dinner?" before asking for any data
2. **Make pantry management invisible** — Passive inventory updates through meal completion and smart deductions
3. **Integrate AI as a companion, not a feature** — "Pepper" (our AI assistant) guides users contextually throughout
4. **Create daily engagement rituals** — The 5pm "what's for dinner" moment becomes a habit trigger
5. **Enable viral family sharing** — Social features drive organic acquisition
6. **Monetize through grocery delivery** — Instacart integration creates new revenue stream

---

## Part 1: Core Philosophy & Design Principles

### 1.1 The "What's for Dinner?" Problem

Research shows the daily dinner decision causes significant stress for families:

- **Decision fatigue peaks at 5pm** — After a full day of decisions, choosing dinner feels overwhelming
- **The blank slate problem** — Empty meal planners create anxiety, not inspiration
- **Pantry apps fail at engagement** — High functionality scores but low sustained usage
- **Parents want inspiration, not tools** — They need answers, not organizational systems

### 1.2 Design Principles

**Principle 1: Answer First, Ask Later**
> Provide a dinner suggestion within 30 seconds of app open—even with zero pantry data. Use popular recipes, seasonal suggestions, or "families like you are making..." as defaults.

**Principle 2: Progressive Disclosure**
> Show only essential features initially. Reveal advanced capabilities as users demonstrate need. Never overwhelm with options.

**Principle 3: Passive Data Collection**
> Build pantry inventory through natural actions: marking meals complete, scanning grocery receipts, confirming AI suggestions. Never require manual inventory management.

**Principle 4: AI as Companion**
> "Pepper" isn't a chatbot hidden in a tab—it's a friendly presence throughout the app, offering contextual help, suggestions, and encouragement.

**Principle 5: Daily Ritual Integration**
> Design for the 5pm moment. Push notifications, widgets, and Siri integration all answer the same question: "What's for dinner tonight?"

**Principle 6: Social by Default**
> Families cook together. Sharing grocery lists, voting on meals, and assigning cooking duties should feel natural, not like "features."

---

## Part 2: Information Architecture Rework

### 2.1 Current Navigation Structure

```
/(tabs)/
├── index.tsx        → Pantry (HOME)
├── recipes.tsx      → Recipe Search
├── calendar.tsx     → Meal Calendar
├── grocery.tsx      → Grocery List
├── chat.tsx         → AI Chat
└── scan.tsx         → Barcode Scanner
```

### 2.2 New Navigation Structure

```
/(tabs)/
├── tonight.tsx      → "What's for Dinner?" (NEW HOME)
├── plan.tsx         → Weekly Meal Plan (renamed calendar)
├── pantry.tsx       → Pantry Management (demoted from home)
├── grocery.tsx      → Smart Grocery List
└── more.tsx         → Settings, Saved Recipes, AI Chat, Profile

/modals/
├── pepper-chat.tsx  → Full AI conversation (accessible from anywhere)
├── quick-scan.tsx   → Rapid multi-item scanning
├── family-vote.tsx  → Meal voting for households
└── share-recipe.tsx → Social sharing flow
```

### 2.3 Navigation Bar Design

| Position | Icon | Label | Primary Action |
|----------|------|-------|----------------|
| 1 (Home) | 🍽️ | Tonight | Get instant dinner suggestion |
| 2 | 📅 | Plan | View/edit weekly meal calendar |
| 3 | 🥫 | Pantry | Browse/manage inventory |
| 4 | 🛒 | Grocery | View shopping list |
| 5 | ☰ | More | Settings, saved, chat, profile |

### 2.4 Persistent Elements

**Pepper FAB (Floating Action Button)**
- Appears on every screen (bottom-right, above tab bar)
- Coral color with sparkle icon ✨
- Tap to ask Pepper anything
- Shows subtle pulse animation when Pepper has a suggestion
- Long-press for quick actions: "Surprise me", "What's expiring?", "Add to list"

**Smart Banner (Contextual)**
- Appears at top of relevant screens
- Examples:
  - Tonight screen: "🍅 3 items expiring soon—tap for recipes that use them"
  - Grocery screen: "📦 Order on Instacart and get it in 2 hours"
  - Pantry screen: "🎤 Say 'Hey Siri, add milk' to update your pantry"

---

## Part 3: Screen-by-Screen Specifications

### 3.1 Tonight Screen (New Home)

**Purpose:** Answer "What's for dinner tonight?" immediately, with zero friction.

#### Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│  [Greeting Banner]                                      │
│  "Good evening, Sarah! 👋"                              │
│  "Here's what I'm thinking for tonight..."              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  🎯 TONIGHT'S TOP PICK                          │   │
│  │  ┌─────────────────────────────────────────┐    │   │
│  │  │                                         │    │   │
│  │  │         [Hero Recipe Image]             │    │   │
│  │  │                                         │    │   │
│  │  └─────────────────────────────────────────┘    │   │
│  │  Honey Garlic Chicken                           │   │
│  │  ⏱️ 35 min  👨‍👩‍👧 Serves 4  ⭐ 4.8             │   │
│  │                                                 │   │
│  │  "You have 8 of 10 ingredients!"               │   │
│  │  [Missing: soy sauce, sesame oil]              │   │
│  │                                                 │   │
│  │  [🍳 Let's Make This]  [🔄 Show Me Another]    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ─── More Ideas ───                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                   │
│  │ Recipe  │ │ Recipe  │ │ Recipe  │  → scroll         │
│  │ 92% ✓   │ │ 85% ✓   │ │ 78% ✓   │                   │
│  └─────────┘ └─────────┘ └─────────┘                   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ─── Use It Up (expiring soon) ───                      │
│  🍅 Tomatoes (2d) • 🥛 Milk (3d) • 🥬 Spinach (4d)     │
│  [See recipes using these →]                            │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ─── This Week's Plan ───                               │
│  Mon: Tacos ✅ | Tue: ??? | Wed: Pasta | Thu: ???      │
│  [View full week →]                                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
                                            [✨ Pepper FAB]
```

#### Interaction Behaviors

**On App Open:**
1. Check time of day → personalized greeting
2. Check pantry inventory → calculate recipe match scores
3. Check expiring items → prioritize recipes using them
4. If pantry empty → show popular/seasonal recipes with "Add ingredients to pantry for personalized suggestions"

**"Let's Make This" Button:**
1. Add recipe to tonight's meal plan
2. Show ingredient checklist with pantry matches highlighted
3. Offer to add missing items to grocery list
4. Option to "Order missing items on Instacart"

**"Show Me Another" Button:**
- Carousel animation to next suggestion
- Track rejections to improve future recommendations
- After 5 rejections: "Having trouble deciding? Tell Pepper what you're in the mood for"

**Pepper Integration on Tonight Screen:**
- Pepper chip appears below hero recipe: "Why this recipe?"
- Tap to expand: "I picked this because you have chicken expiring tomorrow, and your family loved it last time you made it!"
- If no pantry data: "I'm showing you popular family favorites. Add some ingredients and I'll personalize your suggestions!"

#### Empty State (New User, No Pantry)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  "What sounds good tonight?"                            │
│                                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│  │ 🍝      │ │ 🌮      │ │ 🍗      │ │ 🥗      │      │
│  │ Pasta   │ │ Mexican │ │ Chicken │ │ Light   │      │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘      │
│                                                         │
│  [🎲 Surprise Me]                                       │
│                                                         │
│  ───────────────────────────────────────────────────── │
│                                                         │
│  💡 "Want better suggestions?"                          │
│  Tell me what's in your kitchen and I'll find          │
│  recipes that match!                                    │
│                                                         │
│  [📸 Snap Your Pantry]  [🎤 Tell Pepper]  [Later]     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

### 3.2 Plan Screen (Weekly Calendar)

**Purpose:** Visual weekly meal planning with drag-and-drop simplicity.

#### Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│  December 2024                          [< Week >]      │
│  ───────────────────────────────────────────────────── │
│                                                         │
│  MON 23    TUE 24     WED 25    THU 26    FRI 27  →    │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐     │
│  │Tacos │  │      │  │Roast │  │      │  │Pizza │     │
│  │  ✅  │  │ + Add│  │Turkey│  │ + Add│  │Night │     │
│  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘     │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  📊 This Week's Overview                                │
│  Meals planned: 4/7 • Est. grocery cost: $85           │
│  Nutritional balance: Good ✓                           │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ✨ Pepper's Suggestions                                │
│  "Tuesday and Thursday are empty. Want me to           │
│   suggest meals using what you have?"                   │
│                                                         │
│  [Yes, fill them in]  [I'll do it myself]              │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  🛒 Generate Grocery List                               │
│  Based on this week's meals, you need 12 items         │
│  [Create List]  [Order on Instacart]                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Interaction Behaviors

**Add Meal (+ button):**
1. Quick options: "Pepper Suggest", "Browse Recipes", "Recent Favorites", "Saved Recipes"
2. Recipe selection → confirms date/meal type → adds to calendar
3. Option to auto-add ingredients to grocery list

**Meal Card Tap:**
1. Expand to show recipe preview
2. Actions: "View Recipe", "Mark Complete", "Swap", "Remove"

**Mark Complete Flow:**
1. Show ingredient checklist from recipe
2. Pre-checked items = deducted from pantry
3. User can uncheck items they didn't use
4. "Did you substitute anything?" → Updates future suggestions
5. Optional: Log to HealthKit (if enabled)

**Drag and Drop:**
- Long-press meal card to pick up
- Drag to different day to reschedule
- Drag to trash zone to remove

**Family Voting (Household Feature):**
- Empty slot shows "🗳️ Vote" button
- Household members see 3 options, vote on favorite
- Winning recipe auto-added when voting closes

---

### 3.3 Pantry Screen (Inventory Management)

**Purpose:** Browse and manage pantry inventory—but never as a required first step.

#### Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│  Your Pantry                    [🔍 Search] [+ Add]    │
│  ───────────────────────────────────────────────────── │
│                                                         │
│  [All] [Expiring ⚠️] [Proteins] [Produce] [Dairy] →   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ⚠️ EXPIRING SOON                                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 🍅 Tomatoes      2 lbs     Expires in 2 days     │  │
│  │ 🥛 Milk          1 gal     Expires in 3 days     │  │
│  │ 🥬 Spinach       1 bag     Expires in 4 days     │  │
│  └──────────────────────────────────────────────────┘  │
│  [🍳 Find recipes using these]                         │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  🥫 ALL ITEMS (47)                                      │
│                                                         │
│  Chicken Breast        2 lbs      Fresh     Dec 28    │
│  Pasta, Penne          1 box      Pantry    —         │
│  Olive Oil             750ml      Pantry    —         │
│  Garlic                1 head     Fresh     Dec 30    │
│  Parmesan              8 oz       Dairy     Jan 5     │
│  ...                                                   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  💡 Quick Add                                           │
│  [📷 Scan Barcode]  [🎤 Voice Add]  [📝 Manual]        │
│                                                         │
│  "Tip: Say 'Hey Siri, add eggs to DinnerPlans'        │
│   to add items hands-free while cooking!"              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Quick Add Methods

**1. Barcode Scan (Single Item)**
- Current flow: Scan → Lookup → Review → Add
- Enhanced: Auto-focus camera on screen open for instant scanning

**2. Multi-Scan "Grocery Haul" Mode**
- Scan → *beep* → item added → Scan next → *beep* → ...
- Running count shown: "12 items scanned"
- End session → Review all → Confirm batch
- Perfect for after grocery shopping

**3. Voice Add**
- Tap microphone: "Add milk, eggs, butter, and bread"
- Pepper parses: Shows parsed list for confirmation
- One-tap confirm all

**4. Receipt Scan**
- Photo of grocery receipt
- OCR + AI extracts items
- Review → Confirm → Batch add

**5. Siri Integration**
- "Hey Siri, add chicken breast to DinnerPlans"
- "Hey Siri, I just bought milk and eggs"
- Works from anywhere, hands-free

---

### 3.4 Grocery Screen (Smart Shopping List)

**Purpose:** Unified shopping list with store organization and delivery integration.

#### Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│  Grocery List                   [Edit] [Clear Checked] │
│  12 items • Est. $47                                    │
│  ───────────────────────────────────────────────────── │
│                                                         │
│  [List View] [By Aisle 🏪]                             │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🥬 PRODUCE (3)                                         │
│  ☐ Tomatoes         2 lbs      for: Pasta Sauce       │
│  ☐ Onions           3 medium   for: Multiple recipes  │
│  ☑ Garlic           1 head     ✓ checked              │
│                                                         │
│  🥛 DAIRY (2)                                           │
│  ☐ Parmesan         8 oz       for: Pasta             │
│  ☐ Heavy Cream      1 pint     for: Alfredo           │
│                                                         │
│  🥫 PANTRY (4)                                          │
│  ☐ Penne Pasta      1 lb       for: Pasta Night       │
│  ☐ Olive Oil        1 bottle   Running low            │
│  ...                                                   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐  │
│  │  🚚 ORDER ON INSTACART                           │  │
│  │  Get these items delivered in as fast as 2 hrs  │  │
│  │                                                  │  │
│  │  [Order Now — Est. $52 with delivery]           │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [+ Add Item]                          [Share List 📤] │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Instacart Integration

**Implementation via Instacart Developer Platform (IDP):**

1. **Public API Integration**
   - Generate shopping list link with ingredient-to-product matching
   - User redirected to Instacart-hosted page to complete order
   - Items pre-populated in Instacart cart

2. **Affiliate Revenue**
   - Join Impact.com affiliate program after integration approval
   - Earn commission on completed orders originating from app
   - Track conversions via UTM parameters

3. **User Flow**
   - User taps "Order on Instacart"
   - Deep link opens Instacart app (or web if not installed)
   - Cart pre-populated with grocery list items
   - User selects store, completes checkout in Instacart
   - Commission tracked via Impact

**Sharing Features:**

- **Share to Household:** Real-time sync with family members
- **Share Externally:** Send list via Messages/WhatsApp with branded preview
- **Collaborative Editing:** Multiple household members can add/check items

---

### 3.5 More Screen (Settings & Secondary Features)

**Purpose:** House settings, saved content, full AI chat, and profile management.

#### Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│  More                                                   │
│  ───────────────────────────────────────────────────── │
│                                                         │
│  👤 Sarah's Kitchen                                     │
│  Premium Member • Household: The Johnsons (4)          │
│  [Manage Account →]                                     │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ❤️ Saved Recipes (23)                           →     │
│  📖 Imported Recipes (8)                         →     │
│  📊 Meal History                                 →     │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ✨ Chat with Pepper                             →     │
│     Your AI cooking companion                          │
│                                                         │
│  🗣️ Siri & Voice                                →     │
│     Set up voice commands                              │
│                                                         │
│  🏠 Household Settings                           →     │
│     Manage members, sharing preferences                │
│                                                         │
│  🔗 Connected Services                           →     │
│     Instacart, Apple Health, Calendar                  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ⚙️ App Settings                                 →     │
│  📱 Notifications                                →     │
│  💳 Subscription                                 →     │
│  ❓ Help & Support                               →     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Part 4: AI Integration — "Pepper" Throughout the App

### 4.1 Pepper's Personality

**Name:** Pepper
**Visual:** Friendly cartoon pepper character (coral/orange color matching brand)
**Tone:** Warm, helpful, occasionally witty—like a knowledgeable friend in the kitchen
**Voice:** Encouraging but not patronizing; practical but fun

**Example Phrases:**
- "Ooh, that chicken's looking lonely—want me to find it some friends?" (expiring item)
- "Tuesday's wide open! I've got some ideas if you want 'em."
- "Nice haul! I added everything to your pantry. You're all set for taco night!"
- "Looks like you're out of olive oil again. Add it to the list?"

### 4.2 Pepper Touchpoints

| Location | Trigger | Pepper Action |
|----------|---------|---------------|
| Tonight Screen | App open | Explains top pick reasoning |
| Tonight Screen | Multiple rejections | Offers to help narrow preferences |
| Plan Screen | Empty days | Suggests meals to fill gaps |
| Plan Screen | Meal completed | Celebrates, asks about substitutions |
| Pantry Screen | Items expiring | Highlights urgency, offers recipes |
| Pantry Screen | After scan batch | Confirms additions, suggests organization |
| Grocery Screen | List generated | Summarizes, offers Instacart |
| Recipe Detail | Missing ingredients | Suggests substitutions |
| Any Screen | FAB tap | Opens contextual chat |

### 4.3 Pepper Chat Interface

**Accessed via:**
1. Pepper FAB (available on all screens)
2. "Chat with Pepper" in More menu
3. Contextual prompts throughout app

**Chat Capabilities:**

| Query Type | Example | Response |
|------------|---------|----------|
| Recipe Discovery | "What can I make with chicken and broccoli?" | Recipe suggestions with match scores |
| Meal Planning | "Plan my dinners for next week" | Generates 7-day plan based on pantry |
| Substitutions | "I don't have soy sauce" | Suggests alternatives with ratios |
| Cooking Help | "How do I know when chicken is done?" | Cooking tips and temperatures |
| Pantry Management | "Add milk and eggs to my pantry" | Confirms additions |
| Grocery | "What do I need to buy this week?" | Generates list from planned meals |
| General | "Why did you suggest this recipe?" | Explains recommendation reasoning |

**Quick Action Chips:**
Below chat input, show contextual suggestions:
- "What's expiring soon?"
- "Plan this week"
- "Surprise dinner idea"
- "Add to grocery list"

### 4.4 Pepper FAB Behavior

**Default State:**
- Coral circle with sparkle icon
- Subtle hover animation

**"Has Suggestion" State:**
- Gentle pulse animation
- Small badge indicator
- Tap shows: "Pepper has an idea! [View]"

**Long-Press Quick Actions:**
1. 🎲 "Surprise me with dinner"
2. ⚠️ "What's expiring?"
3. 🛒 "Add to grocery list"
4. 🎤 "Voice input"

---

## Part 5: Siri Integration

### 5.1 Supported Siri Commands

**Pantry Management:**
| Command | Action |
|---------|--------|
| "Hey Siri, add [item] to DinnerPlans" | Adds item to pantry |
| "Hey Siri, add [item] to my grocery list in DinnerPlans" | Adds to grocery list |
| "Hey Siri, I bought [items] at the store" | Batch add to pantry |
| "Hey Siri, I'm out of [item]" | Removes from pantry, optionally adds to grocery |

**Meal Planning:**
| Command | Action |
|---------|--------|
| "Hey Siri, what's for dinner tonight?" | Reads tonight's planned meal or top suggestion |
| "Hey Siri, ask DinnerPlans for a dinner idea" | Speaks Pepper's top recommendation |
| "Hey Siri, plan [recipe] for [day]" | Adds recipe to meal calendar |

**Information:**
| Command | Action |
|---------|--------|
| "Hey Siri, what's expiring in DinnerPlans?" | Lists items expiring within 3 days |
| "Hey Siri, what's on my grocery list?" | Reads grocery list items |
| "Hey Siri, do I have [item]?" | Checks pantry for item |

### 5.2 Siri Shortcuts Integration

**Pre-built Shortcuts:**
1. **"Dinner Tonight"** — Opens app to tonight screen with suggestion
2. **"Quick Scan"** — Opens directly to barcode scanner
3. **"Weekly Plan"** — Opens meal calendar for current week
4. **"Grocery Run"** — Opens grocery list

**Custom Shortcut Support:**
- Expose app actions to Shortcuts app
- Users can build custom automations
- Example: "When I arrive home, show dinner suggestion notification"

### 5.3 Implementation Requirements

**SiriKit Intents to Implement:**
- `INAddTasksIntent` — For adding pantry/grocery items
- `INSearchForNotebookItemsIntent` — For querying pantry/lists
- `INCreateNoteIntent` — For meal planning
- Custom intents for app-specific actions

**Voice Feedback:**
- Siri confirms actions with spoken response
- "Got it! I added chicken breast to your pantry."
- "Tonight you're having Honey Garlic Chicken. Sounds delicious!"

---

## Part 6: Onboarding Flow Rework

### 6.1 Philosophy: Value Before Commitment

**Current Flow Problems:**
1. Pricing/subscription shown before value demonstrated
2. Pantry setup required before any utility
3. Too many steps before "aha moment"

**New Flow Principles:**
1. Show value in first 30 seconds
2. Delay subscription pitch until after engagement
3. Collect data progressively, not upfront
4. Make every step optional but beneficial

### 6.2 New Onboarding Sequence

#### Screen 1: Welcome (5 seconds)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│              [Pepper Character Animation]               │
│                                                         │
│           "Hi! I'm Pepper! 👋"                         │
│                                                         │
│     "I'm here to end the 'what's for dinner?'          │
│      question forever."                                 │
│                                                         │
│                                                         │
│              [Let's Go! →]                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Screen 2: Quick Personalization (15 seconds)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  "Quick question—who am I cooking for?"                │
│                                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│  │  👤     │ │  👫     │ │ 👨‍👩‍👧   │ │ 👨‍👩‍👧‍👦  │      │
│  │ Just Me │ │ Couple  │ │ Family  │ │ Big     │      │
│  │         │ │         │ │ (3-4)   │ │ Family  │      │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘      │
│                                                         │
│  "Any dietary needs?"                                   │
│  [ ] Vegetarian  [ ] Gluten-free  [ ] Dairy-free      │
│  [ ] Low-carb    [ ] Nut allergy  [ ] None            │
│                                                         │
│              [Continue →]              [Skip for now]  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Screen 3: Instant Value — First Suggestion (30 seconds)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  "Perfect! Here's what families like yours             │
│   are loving this week..."                              │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                                 │   │
│  │           [Beautiful Recipe Image]              │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  One-Pan Lemon Herb Chicken                            │
│  ⏱️ 40 min  👨‍👩‍👧 Serves 4  ⭐ 4.9 (2.3k reviews)      │
│                                                         │
│  "Simple, healthy, and a crowd pleaser!"               │
│                                                         │
│  [😍 Save This]  [🔄 Show Another]  [🍳 Let's Cook]   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│  💡 "Want suggestions based on what's in YOUR kitchen?" │
│                                                         │
│  [Yes, let's do it!]                    [Maybe later]  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Screen 4A: Quick Pantry Seed (if user opts in)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  "Awesome! Pick the fastest way to tell me             │
│   what's in your kitchen:"                              │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  📸 SNAP YOUR FRIDGE                            │   │
│  │  Take a quick photo—I'll identify what I see    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  🎤 TELL ME OUT LOUD                            │   │
│  │  "I have chicken, rice, broccoli, and cheese"   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  📋 PICK FROM COMMON ITEMS                      │   │
│  │  Quick checklist of typical ingredients         │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│                                         [Skip for now] │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Screen 4B: Common Items Checklist (if selected)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  "Tap what you usually have on hand:"                  │
│                                                         │
│  🥩 PROTEINS                                            │
│  [Chicken ✓] [Ground Beef ✓] [Pork] [Fish]            │
│  [Eggs ✓] [Tofu] [Shrimp]                              │
│                                                         │
│  🥬 PRODUCE                                             │
│  [Onions ✓] [Garlic ✓] [Tomatoes] [Potatoes ✓]        │
│  [Carrots] [Broccoli] [Bell Peppers]                   │
│                                                         │
│  🧀 DAIRY                                               │
│  [Milk ✓] [Butter ✓] [Cheese ✓] [Eggs ✓]              │
│  [Yogurt] [Cream]                                      │
│                                                         │
│  🥫 PANTRY STAPLES                                      │
│  [Pasta ✓] [Rice ✓] [Olive Oil ✓] [Flour]             │
│  [Canned Tomatoes] [Chicken Broth]                     │
│                                                         │
│  Selected: 12 items                    [Done →]        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Screen 5: Personalized Result

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ✨ "Now we're cooking!"                                │
│                                                         │
│  Based on what you have, here's tonight's              │
│  perfect dinner:                                        │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                                 │   │
│  │           [Recipe Image]                        │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Creamy Garlic Chicken Pasta                           │
│  ⏱️ 30 min  |  You have 9/10 ingredients!             │
│                                                         │
│  "You're only missing: heavy cream"                    │
│                                                         │
│  [🍳 Let's Make This]                                  │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│              [→ Enter DinnerPlans]                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Screen 6: Subscription (After Value Demonstrated)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  "You're all set! One more thing..."                   │
│                                                         │
│  🎁 TRY PREMIUM FREE FOR 14 DAYS                       │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ✓ Unlimited AI meal suggestions                │   │
│  │  ✓ Household sharing (up to 6 people)          │   │
│  │  ✓ Full nutrition tracking                      │   │
│  │  ✓ Unlimited pantry & saved recipes            │   │
│  │  ✓ Priority Pepper support                      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  💰 Families save $100+/month on groceries             │
│  Your subscription: $6.99/month (pays for itself!)     │
│                                                         │
│  [Start Free Trial — No Card Required]                 │
│                                                         │
│                                                         │
│         "I'll stick with free for now" ↓              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 6.3 Onboarding Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to first suggestion | < 30 seconds | From app open to recipe shown |
| Pantry seed completion | > 60% | Users who add at least 5 items |
| Trial start rate | > 40% | Users starting free trial |
| Onboarding completion | > 85% | Users reaching main app |

---

## Part 7: Engagement & Social Features

### 7.1 Household Sharing

**Setup Flow:**
1. User creates household (named: "The Johnson Kitchen")
2. Invites family members via text/email
3. Invitees download app, join household
4. Shared: Pantry, Grocery List, Meal Plan
5. Individual: Saved Recipes, Preferences

**Shared Features:**

| Feature | Behavior |
|---------|----------|
| Pantry | Single shared inventory; any member can add/edit |
| Grocery List | Real-time sync; shows who added each item |
| Meal Plan | Shared calendar; members can add/edit meals |
| Notifications | "Dad added Taco Tuesday to the plan!" |

**Meal Voting:**
- Any member can propose a meal for an empty slot
- Household gets notification to vote
- Options: 👍 Yes, 😐 Maybe, 👎 Not this time
- Winning meal auto-added to plan

### 7.2 External Sharing (Viral Loops)

**Share Recipe:**
1. User taps share on any recipe
2. Options: Messages, WhatsApp, Copy Link, More...
3. Recipient sees branded preview with recipe image
4. CTA: "Get this recipe in DinnerPlans (free)"
5. Link deep-links to recipe in app (or App Store if not installed)

**Share Grocery List:**
1. User taps share on grocery screen
2. Non-app-users receive formatted text list
3. Footer: "Created with DinnerPlans — try it free!"

**Referral Program:**
- "Invite 3 friends → Get 1 month Premium free"
- Tracked via unique referral codes
- Both referrer and referee get bonus

### 7.3 Daily Engagement Triggers

**Push Notifications:**

| Time | Notification | Trigger |
|------|--------------|---------|
| 10:00 AM | "Plan your dinners for the week? 📅" | Sunday only, if week not planned |
| 4:00 PM | "Dinner reminder: You're making [Recipe] tonight!" | If meal planned |
| 4:30 PM | "Still deciding on dinner? Pepper has ideas 🌶️" | If no meal planned |
| 9:00 PM | "How was dinner? Mark it complete to update your pantry" | If meal planned but not completed |

**Widget Support:**
- iOS Home Screen Widget: "Tonight's Dinner" with recipe image
- Tap opens app to tonight screen
- Updates automatically based on meal plan

**Apple Watch:**
- Complication: Tonight's meal name
- Notification: Dinner reminder
- Quick action: "Mark meal complete"

---

## Part 8: Feature Preservation Matrix

All existing functionality is preserved and enhanced:

| Current Feature | Location (Old) | Location (New) | Enhancement |
|-----------------|----------------|----------------|-------------|
| Pantry List | Home tab | Pantry tab | Demoted but enhanced with multi-scan |
| Barcode Scan | Scan tab | Pantry tab + Quick Actions | Multi-scan "haul mode" added |
| Recipe Search | Recipes tab | Tonight + Plan screens | Integrated into primary flows |
| Meal Calendar | Calendar tab | Plan tab | Enhanced with voting, Pepper suggestions |
| Grocery List | Grocery tab | Grocery tab | Instacart integration added |
| AI Chat | Chat tab | Pepper FAB (everywhere) | Contextual, always accessible |
| Recipe Import | Import screen | More > Imported Recipes | Same functionality |
| Saved Recipes | Within Recipes | More > Saved Recipes | Centralized |
| Health Sync | Settings | More > Connected Services | Same functionality |
| Calendar Sync | Settings | More > Connected Services | Same functionality |
| Household | Settings | More > Household Settings | Enhanced with voting |
| Subscription | Onboarding/Settings | More > Subscription | Delayed in onboarding |

---

## Part 9: Technical Implementation Notes

### 9.1 New Screens to Create

| Screen | Priority | Complexity | Dependencies |
|--------|----------|------------|--------------|
| `tonight.tsx` | P0 | High | Recipe scoring, pantry hook, expiration logic |
| `pepper-fab.tsx` | P0 | Medium | Chat service, context awareness |
| `multi-scan.tsx` | P1 | Medium | Camera, batch state management |
| `family-vote.tsx` | P1 | Medium | Real-time sync, household context |
| `instacart-checkout.tsx` | P1 | Low | Deep linking, affiliate tracking |

### 9.2 Services to Create/Modify

| Service | Purpose | New/Modify |
|---------|---------|------------|
| `tonightService.ts` | Generate personalized dinner suggestions | New |
| `pepperContext.ts` | Manage Pepper state across app | New |
| `instacartService.ts` | Handle Instacart API integration | New |
| `votingService.ts` | Real-time meal voting | New |
| `chatService.ts` | Add context awareness | Modify |
| `siriIntents.ts` | Siri command handling | New |

### 9.3 Database Schema Additions

```sql
-- Meal voting
CREATE TABLE meal_votes (
  id UUID PRIMARY KEY,
  household_id UUID REFERENCES households(id),
  proposed_by UUID REFERENCES auth.users(id),
  recipe_id TEXT NOT NULL,
  proposed_date DATE NOT NULL,
  status TEXT DEFAULT 'voting', -- voting, accepted, rejected
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vote_responses (
  id UUID PRIMARY KEY,
  vote_id UUID REFERENCES meal_votes(id),
  user_id UUID REFERENCES auth.users(id),
  response TEXT NOT NULL, -- yes, maybe, no
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Instacart orders (for tracking)
CREATE TABLE instacart_orders (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  grocery_list_id UUID REFERENCES grocery_lists(id),
  instacart_link TEXT NOT NULL,
  status TEXT DEFAULT 'created',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pepper conversation context
CREATE TABLE pepper_contexts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  context_type TEXT NOT NULL, -- tonight, plan, pantry, grocery
  context_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 9.4 Third-Party Integrations

| Integration | Purpose | API/SDK |
|-------------|---------|---------|
| Instacart | Grocery delivery | Instacart Developer Platform API |
| Impact.com | Affiliate tracking | Impact Radius SDK |
| Siri | Voice commands | SiriKit / App Intents |
| Shortcuts | Automation | Shortcuts API |
| Apple Watch | Wrist notifications | WatchKit |

---

## Part 10: Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

**Goal:** Core navigation restructure and Tonight screen

- [ ] Create new tab navigation structure
- [ ] Build `tonight.tsx` home screen
- [ ] Implement recipe scoring algorithm for suggestions
- [ ] Create Pepper FAB component
- [ ] Update routing and deep links

### Phase 2: AI Integration (Weeks 3-4)

**Goal:** Pepper throughout the app

- [ ] Build Pepper context awareness system
- [ ] Add Pepper touchpoints to all screens
- [ ] Enhance chat service with contextual suggestions
- [ ] Implement quick action chips
- [ ] Create "Has Suggestion" notification system

### Phase 3: Data Entry Enhancements (Weeks 5-6)

**Goal:** Reduce friction for pantry management

- [ ] Multi-scan "grocery haul" mode
- [ ] Voice input for pantry additions
- [ ] Receipt scanning (photo → items)
- [ ] Siri integration for voice commands

### Phase 4: Social & Sharing (Weeks 7-8)

**Goal:** Viral loops and household features

- [ ] Meal voting system for households
- [ ] Enhanced recipe sharing with previews
- [ ] Referral program implementation
- [ ] Real-time household sync improvements

### Phase 5: Monetization (Weeks 9-10)

**Goal:** New revenue streams

- [ ] Instacart API integration
- [ ] Impact.com affiliate setup
- [ ] Conversion tracking
- [ ] Order attribution

### Phase 6: Onboarding Rework (Weeks 11-12)

**Goal:** Value-first user experience

- [ ] New onboarding flow screens
- [ ] Quick pantry seed options
- [ ] A/B test subscription timing
- [ ] Optimize for trial conversion

---

## Part 11: Success Metrics

### Primary KPIs

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Daily Active Users (DAU) | Baseline | +50% | 3 months |
| Time to First Value | Unknown | < 30 seconds | Launch |
| 7-Day Retention | Baseline | +30% | 3 months |
| Trial Conversion | ~15% | 25% | 6 months |
| Instacart Revenue | $0 | $2 ARPU | 6 months |

### Feature-Specific Metrics

| Feature | Metric | Target |
|---------|--------|--------|
| Tonight Screen | Daily opens | 80% of DAU |
| Pepper FAB | Tap rate | 20% of sessions |
| Multi-Scan | Completion rate | 70% |
| Meal Voting | Participation rate | 60% of households |
| Instacart | Conversion rate | 5% of grocery lists |
| Siri Commands | Monthly active users | 15% of MAU |

---

## Appendix A: User Research Backing

### Pain Points Validated

1. **"What's for dinner?" is the #1 daily stress point** — Multiple studies confirm decision fatigue peaks at dinner time
2. **Pantry apps fail at engagement** — High functionality, low retention across category
3. **Parents want inspiration, not tools** — Users prefer answers over organizational systems
4. **Social cooking increases engagement** — Shared meal planning drives daily usage

### Competitive Validation

- **Jow** (Instacart partner): Proves recipe → delivery flow works
- **Mealime**: Simplified meal planning drives high engagement
- **Yummly shutdown**: Creates market opportunity for personality-driven alternatives

---

## Appendix B: Pepper Dialogue Examples

### Tonight Screen

**User opens app at 5:30 PM, has chicken expiring:**
> "Hey! That chicken breast is feeling neglected—expires tomorrow. I found 3 easy recipes that'll save the day. Want to see?"

**User rejects 3 suggestions:**
> "Picky, picky! 😄 Tell me—what ARE you in the mood for? Type anything: 'something quick', 'comfort food', 'surprise me'..."

### Plan Screen

**User has empty Thursday:**
> "Thursday's looking lonely! Based on your week, I'd suggest something light after Wednesday's pasta feast. How about grilled fish tacos?"

**After completing a meal:**
> "Nice! Honey Garlic Chicken: crushed it. ✓ I updated your pantry—you used the chicken and most of the garlic. Sound right?"

### Pantry Screen

**After multi-scan session:**
> "Boom! 14 items added. You're officially stocked for the week. I see taco night potential with that ground beef... just saying. 🌮"

### Grocery Screen

**User has 15+ items on list:**
> "That's a solid list! Pro tip: tap 'Order on Instacart' and skip the store entirely. Your future self will thank you."

---

## Appendix C: Siri Phrase Examples

### Adding Items
- "Hey Siri, add milk to DinnerPlans" → "Got it—milk added to your pantry."
- "Hey Siri, I need eggs" → "Added eggs to your grocery list."
- "Hey Siri, I just bought chicken, broccoli, and rice" → "Nice haul! All three added to your pantry."

### Checking Information
- "Hey Siri, what's for dinner tonight?" → "Tonight you're having Lemon Herb Chicken. Looks delicious!"
- "Hey Siri, do I have any eggs?" → "Yep! You have a dozen eggs, added 3 days ago."
- "Hey Siri, what's expiring soon?" → "Heads up: Milk expires tomorrow, and spinach in 2 days."

### Planning
- "Hey Siri, plan tacos for Tuesday" → "Tacos locked in for Tuesday. Want me to add ingredients to your list?"
- "Hey Siri, what should I make this week?" → "Opening DinnerPlans with suggestions based on your pantry..."

---

*End of Document*
