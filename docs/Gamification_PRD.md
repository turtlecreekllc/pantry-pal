# PRD-004: Food Waste Gamification Strategy

**Product:** DinnerPlans  
**Feature:** Gamification & Impact Tracking System  
**Priority:** P1 - Key Differentiator  
**Target Release:** V1.0 (Core) → V2.0 (Full)  
**Owner:** Product Team  
**Last Updated:** December 2024

---

## 1. Overview

### 1.1 Problem Statement

Users need motivation to consistently track their pantry and reduce food waste. However, heavy-handed gamification feels gimmicky, creates guilt rather than motivation, and can lead to app fatigue. Traditional gamification (points, leaderboards, daily streaks) often backfires in wellness/sustainability apps by:

- Creating anxiety around maintaining streaks
- Inducing guilt when users "fail"
- Feeling manipulative rather than genuinely helpful
- Prioritizing engagement metrics over actual behavior change

### 1.2 Solution

Implement a **"Quiet Progress, Visible Impact"** gamification philosophy that:

- Makes users feel good about their choices without nagging
- Translates actions into tangible, meaningful impact metrics
- Uses positive framing ("rescued") instead of negative ("wasted")
- Provides opt-in deeper engagement for power users
- Celebrates wins without punishing misses

### 1.3 Design Philosophy

| Principle | Implementation |
|-----------|----------------|
| **Celebrate, don't shame** | "You rescued 8 items!" not "You wasted 2 items" |
| **Compare to self, not others** | "20% better than last month" not "You're #847 on leaderboard" |
| **Weekly, not daily** | Weekly summaries prevent streak anxiety |
| **Opt-in depth** | Casual users see basics; power users unlock more |
| **Tangible impact** | Translate to $, lbs, environmental equivalents |

### 1.4 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Feature Adoption | 70%+ users view impact dashboard weekly | Analytics |
| Behavior Change | 15% reduction in expired items (user cohort) | Before/after tracking |
| Engagement Lift | 25% higher 30-day retention for engaged users | Cohort analysis |
| Sentiment | <5% negative feedback on gamification | In-app feedback |
| NPS Impact | +10 NPS for users who engage with gamification | Survey |

---

## 2. User Stories

### 2.1 Core Stories

**US-401: Impact Awareness**
> *As a* user who cares about food waste, *I want to* see the tangible impact of my actions *so that* I feel motivated to continue tracking my pantry.

**US-402: Gentle Motivation**
> *As a* busy user, *I want to* receive encouraging nudges about expiring items *so that* I remember to use them without feeling nagged.

**US-403: Progress Tracking**
> *As a* long-term user, *I want to* see my cumulative impact over time *so that* I feel a sense of accomplishment.

**US-404: Achievement Recognition**
> *As an* engaged user, *I want to* unlock achievements for positive behaviors *so that* I have goals to work toward.

### 2.2 Anti-Stories (What We're Avoiding)

**Anti-US-01: Guilt Induction**
> We will NOT show "You wasted X items this week" or shame-based messaging.

**Anti-US-02: Competitive Pressure**
> We will NOT show public leaderboards comparing users to strangers.

**Anti-US-03: Streak Anxiety**
> We will NOT implement daily streaks that create anxiety about breaking them.

**Anti-US-04: Dark Patterns**
> We will NOT use manipulative notifications to drive engagement over user wellbeing.

---

## 3. Gamification Tiers

The system is structured in four tiers, each progressively more engaging. Users naturally encounter higher tiers as they engage more deeply.

### Tier 1: Passive Awareness (Always On, Never Intrusive)

**Target:** All users  
**Visibility:** Subtle, non-disruptive  
**Opt-out:** Cannot disable (core value prop)

#### 3.1.1 Impact Dashboard

A simple, glanceable view of the user's positive impact.

**Location:** Home screen card (collapsible) + dedicated "Impact" tab

**Metrics Displayed:**

| Metric | Calculation | Display Example |
|--------|-------------|-----------------|
| Items Rescued | Items used before expiration | "12 items rescued this week" |
| Money Saved | Avg item cost × rescued items | "$24.50 saved this week" |
| Weight Saved | Estimated weight of rescued items | "4.2 lbs rescued" |
| Environmental Impact | CO2/water equivalents | "= 12 miles not driven" |

**Design Specifications:**
- Clean, minimal card design
- Primary color: Green (positive reinforcement)
- Subtle celebration animation on milestone views
- "This week" as default timeframe, tap to see "All time"

#### 3.1.2 Lifetime Impact Counter

**Location:** Profile/Settings screen

**Display:**
```
🌱 Your Impact Since Joining
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Items Rescued:        247
Money Saved:       $412.50
Food Saved:         62 lbs
Member Since:    Oct 2024
━━━━━━━━━━━━━━━━━━━━━━━━━━━
        [Share My Impact]
```

**Share Feature:**
- Generates shareable image card
- Pre-written copy: "I've saved 62 lbs of food from going to waste with DinnerPlans! 🌱"
- Social share to Instagram Stories, Twitter, Facebook

---

### Tier 2: Gentle Motivation (Opt-In Nudges)

**Target:** Users who enable notifications  
**Visibility:** Weekly touchpoints  
**Opt-out:** Notification settings

#### 3.2.1 Weekly Summary

**Timing:** Sunday evening (configurable)  
**Format:** Push notification → In-app summary card

**Notification:**
> "📊 Your week in review: You rescued 8 items and saved $18! Tap to see details."

**In-App Summary Card:**

```
┌─────────────────────────────────────┐
│  🎉 Great Week!                     │
│                                     │
│  Items Rescued: 8/10                │
│  ████████░░ 80%                     │
│                                     │
│  💰 $18.40 saved                    │
│  📦 2.1 lbs rescued                 │
│                                     │
│  vs Last Week: +15% 📈              │
│                                     │
│  [See What's Expiring This Week →]  │
└─────────────────────────────────────┘
```

**Key Design Decisions:**
- Compare to USER'S own history, never to others
- Show percentage complete, not items "failed"
- Positive framing even for imperfect weeks
- Clear CTA to actionable next step

#### 3.2.2 Rescue Missions

**Concept:** Frame expiring items as "rescue opportunities" rather than failures waiting to happen.

**Trigger:** Items 2-3 days from expiration

**Home Screen Card:**
```
┌─────────────────────────────────────┐
│  🦸 3 Rescue Missions This Week     │
│                                     │
│  🥛 Milk (expires Tue)              │
│  🍌 Bananas (expires Wed)           │
│  🥬 Spinach (expires Thu)           │
│                                     │
│  [See Recipes Using These →]        │
└─────────────────────────────────────┘
```

**Notification (if enabled):**
> "🦸 Rescue mission: Your yogurt expires tomorrow! Here's a smoothie idea..."

**Tone Guidelines:**
- "Rescue" not "use before it goes bad"
- Always suggest a solution (recipe, freezing tip)
- Maximum 3 notifications per week
- Never guilt-trip for "failed" rescues

#### 3.2.3 Monthly Report Card

**Timing:** First of each month  
**Format:** In-app modal + optional email

**Content:**
```
┌─────────────────────────────────────┐
│  📅 December Recap                  │
│                                     │
│  Rescue Rate: 85%                   │
│  ████████░░                         │
│  (34 of 40 items)                   │
│                                     │
│  That's 12% better than November!   │
│                                     │
│  💰 $72 saved  │  📦 9.4 lbs        │
│                                     │
│  🏆 Achievement Unlocked:           │
│     "December Champion"             │
│                                     │
│  [Share] [View Details] [Dismiss]   │
└─────────────────────────────────────┘
```

---

### Tier 3: Engaged Gamification (For Power Users)

**Target:** Users who opt into "Goals & Achievements"  
**Visibility:** Dedicated section in app  
**Opt-out:** Toggle in settings (default: OFF for first 2 weeks)

#### 3.3.1 Achievement System

**Philosophy:** Achievements should feel meaningful and earned, not arbitrary.

**Achievement Categories:**

| Category | Purpose | Example Badges |
|----------|---------|----------------|
| **Getting Started** | Onboarding encouragement | First Scan, Pantry Pioneer |
| **Consistency** | Reward regular use | Weekly Warrior, Month Master |
| **Impact** | Celebrate cumulative impact | 10 lb Club, $100 Saver |
| **Rescue** | Reward saves | Last Minute Hero, Zero Waste Week |
| **Exploration** | Encourage feature use | Recipe Explorer, Chat Champion |

**Badge Design Principles:**
- Simple, recognizable icons
- 3 tiers per badge: Bronze → Silver → Gold
- Unlockable, not "locked" (avoid showing what they DON'T have)
- Subtle animation on unlock

**Core Achievements:**

```
GETTING STARTED
━━━━━━━━━━━━━━━
🥇 First Scan        - Scan your first receipt or shelf
🏠 Pantry Pioneer    - Add 20 items to your pantry
📸 Snapshot Pro      - Use photo scanner 3 times

CONSISTENCY
━━━━━━━━━━━━━━━
📅 Weekly Warrior    - Log activity 4 weeks in a row
🗓️ Month Master      - Active for 30 days
⭐ Dedicated         - Active for 90 days

IMPACT MILESTONES
━━━━━━━━━━━━━━━
🌱 Seedling Saver    - Rescue 10 items
🌿 Growing Green     - Rescue 50 items
🌳 Waste Warrior     - Rescue 100 items
💰 $50 Saved         - Save $50 in food costs
💰 $100 Saved        - Save $100 in food costs
📦 10 lb Club        - Rescue 10 lbs of food

RESCUE HEROES
━━━━━━━━━━━━━━━
⏰ Last Minute Hero  - Use item on expiration day
🎯 Perfect Week      - Rescue all expiring items in a week
❄️ Freezer Saver     - Freeze 5 items before expiration
🍌 Banana Bread Win  - Make recipe with overripe produce

EXPLORATION
━━━━━━━━━━━━━━━
🍳 Recipe Explorer   - Try 10 suggested recipes
💬 Chat Champion     - Have 20 conversations with DinnerPlans
📋 List Master       - Complete shopping list 5 times
```

#### 3.3.2 Impact Levels (Progression System)

**Concept:** Long-term progression based on cumulative positive impact.

**Levels:**

| Level | Name | Threshold | Unlock |
|-------|------|-----------|--------|
| 1 | 🌱 Seedling | 0 lbs | Default |
| 2 | 🌿 Sprout | 10 lbs | Profile badge |
| 3 | 🪴 Sapling | 25 lbs | Custom theme option |
| 4 | 🌲 Tree | 50 lbs | Priority support |
| 5 | 🌳 Grove | 100 lbs | Beta feature access |
| 6 | 🌲🌳🌲 Forest | 250 lbs | Founding member status |

**Display:**
- Level badge on profile
- Subtle progress bar toward next level
- Celebration modal on level-up

#### 3.3.3 Optional Challenges

**Concept:** Time-limited goals users can opt into.

**Types:**

| Challenge Type | Duration | Example |
|----------------|----------|---------|
| Weekly Sprint | 7 days | "Rescue 90% of expiring items" |
| Monthly Goal | 30 days | "Save $50 in food this month" |
| Seasonal | 3 months | "Summer of Savings" |

**Key Rules:**
- **Always opt-in** - Never auto-enrolled
- **Forgiving** - Can abandon without penalty
- **Achievable** - Based on user's own baseline
- **No FOMO** - Challenges recur; missing one isn't permanent

**Challenge Card:**
```
┌─────────────────────────────────────┐
│  🎯 Weekly Challenge Available      │
│                                     │
│  "Zero Waste Week"                  │
│  Use everything before it expires   │
│                                     │
│  Reward: 🏆 Perfect Week Badge      │
│                                     │
│  Based on your history, you have    │
│  an 78% chance of completing this!  │
│                                     │
│  [Accept Challenge]  [Not Now]      │
└─────────────────────────────────────┘
```

---

### Tier 4: Social & Community (Future)

**Target:** V3.0+ release  
**Status:** Future consideration, not in initial scope

#### 3.4.1 Household Features

- Household leaderboard (family members only)
- "Dad rescued the most items this week!"
- Shared household goals

#### 3.4.2 Community Impact

- Aggregate community stats
- "DinnerPlans users have saved 1M lbs of food!"
- Local community goals (opt-in)
- "Birmingham households saved X this month"

#### 3.4.3 Social Sharing

- Shareable achievement cards
- Impact milestones for social
- Integration with sustainability communities

---

## 4. Functional Requirements

### 4.1 Impact Tracking Engine

| ID | Requirement |
|----|-------------|
| FR-G001 | System tracks each item's outcome: Used, Expired, Removed, Donated |
| FR-G002 | "Rescued" = Item marked as used/cooked before expiration date |
| FR-G003 | System calculates estimated weight based on product category database |
| FR-G004 | System calculates estimated cost based on category averages or user-provided prices |
| FR-G005 | Environmental impact calculated using standard food waste CO2 factors |
| FR-G006 | All metrics available via API for dashboard rendering |

### 4.2 Dashboard & Display

| ID | Requirement |
|----|-------------|
| FR-G101 | Impact dashboard renders on home screen as collapsible card |
| FR-G102 | Dashboard shows: Items rescued, Money saved, Weight saved (minimum) |
| FR-G103 | Timeframe toggle: This week / This month / All time |
| FR-G104 | Lifetime counter displayed in Profile section |
| FR-G105 | Share button generates image card for social sharing |
| FR-G106 | Dashboard data refreshes on app open and item updates |

### 4.3 Notifications & Nudges

| ID | Requirement |
|----|-------------|
| FR-G201 | Weekly summary notification sent Sunday evening (configurable) |
| FR-G202 | Maximum 3 "rescue mission" notifications per week |
| FR-G203 | Rescue notifications include actionable suggestion (recipe, tip) |
| FR-G204 | All gamification notifications respect user's notification preferences |
| FR-G205 | Monthly report generated on 1st of each month |
| FR-G206 | Users can disable gamification notifications independently of other notifications |

### 4.4 Achievement System

| ID | Requirement |
|----|-------------|
| FR-G301 | Achievement system disabled by default for first 14 days |
| FR-G302 | Achievement unlock triggers subtle celebration animation |
| FR-G303 | Achievement progress viewable in dedicated "Achievements" screen |
| FR-G304 | Achievements are never "locked" visually - show earned only |
| FR-G305 | Badge earned triggers optional push notification |
| FR-G306 | Badges display on user profile (toggleable) |

### 4.5 Challenges

| ID | Requirement |
|----|-------------|
| FR-G401 | Challenges are always opt-in via explicit acceptance |
| FR-G402 | User can abandon challenge without penalty or negative messaging |
| FR-G403 | Challenge difficulty personalized to user's historical performance |
| FR-G404 | Challenge completion triggers celebration and badge award |
| FR-G405 | Active challenges displayed on home screen when enrolled |

---

## 5. UX Specifications

### 5.1 Visual Language

**Color Palette:**
| Purpose | Color | Usage |
|---------|-------|-------|
| Success/Positive | `#22c55e` (Green 500) | Rescued items, achievements |
| Progress | `#3b82f6` (Blue 500) | Progress bars, streaks |
| Celebration | `#f59e0b` (Amber 500) | Badges, milestones |
| Neutral | `#6b7280` (Gray 500) | Secondary text |

**Never use red for:**
- Failed goals
- Expired items (use amber/warning instead)
- Negative comparisons

### 5.2 Animation Guidelines

| Event | Animation | Duration |
|-------|-----------|----------|
| Achievement unlock | Confetti burst + badge reveal | 2s |
| Level up | Glow effect + transition | 1.5s |
| Item rescued | Subtle checkmark pulse | 0.5s |
| Progress increase | Bar fill with ease-out | 0.8s |

### 5.3 Copy Guidelines

**Do Use:**
- "Rescued" / "Saved"
- "Great progress!"
- "You're on track"
- "Nice work this week"
- "Every item counts"

**Don't Use:**
- "Wasted" / "Lost" / "Failed"
- "Don't break your streak!"
- "You're falling behind"
- "X items expired"
- "You missed your goal"

**Handling "Failure" States:**

Instead of: *"You wasted 3 items this week"*
Use: *"You rescued 7 items this week! See what's expiring next?"*

Instead of: *"You broke your streak"*
Use: *"Start fresh this week!"*

Instead of: *"Goal not met"*
Use: *"You saved $12 this month. Set a new goal?"*

---

## 6. Data Model

### 6.1 Impact Tracking

```typescript
interface ImpactRecord {
  id: string;
  userId: string;
  itemId: string;
  outcome: 'rescued' | 'expired' | 'removed' | 'donated';
  estimatedWeight: number; // grams
  estimatedCost: number; // cents
  recordedAt: Date;
}

interface UserImpactSummary {
  userId: string;
  period: 'week' | 'month' | 'all_time';
  periodStart: Date;
  itemsRescued: number;
  itemsExpired: number;
  weightSaved: number; // grams
  moneySaved: number; // cents
  co2Avoided: number; // grams
}
```

### 6.2 Achievements

```typescript
interface Achievement {
  id: string;
  key: string; // e.g., 'first_scan', 'rescue_10'
  name: string;
  description: string;
  iconUrl: string;
  tier: 'bronze' | 'silver' | 'gold';
  category: 'getting_started' | 'consistency' | 'impact' | 'rescue' | 'exploration';
  threshold: number;
  thresholdType: 'count' | 'streak' | 'cumulative';
}

interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: Date;
  progress: number; // for partial progress tracking
}
```

### 6.3 Challenges

```typescript
interface Challenge {
  id: string;
  name: string;
  description: string;
  type: 'weekly' | 'monthly' | 'seasonal';
  goal: number;
  goalType: 'rescue_count' | 'rescue_percent' | 'money_saved';
  startDate: Date;
  endDate: Date;
  rewardBadgeId: string;
}

interface UserChallenge {
  id: string;
  userId: string;
  challengeId: string;
  enrolledAt: Date;
  status: 'active' | 'completed' | 'abandoned' | 'failed';
  progress: number;
  completedAt?: Date;
}
```

---

## 7. Implementation Phases

### Phase 1: MVP (V1.0 Launch)

**Scope:**
- ✅ Impact dashboard (items rescued, money saved, weight saved)
- ✅ Lifetime impact counter
- ✅ Weekly summary notification
- ✅ "Rescue missions" framing for expiring items

**Timeline:** Launch

### Phase 2: Engagement (V1.5)

**Scope:**
- Achievement system (15 core badges)
- Monthly report card
- Share functionality for impact/achievements
- Optional challenges (weekly only)

**Timeline:** 6-8 weeks post-launch

### Phase 3: Progression (V2.0)

**Scope:**
- Impact levels (Seedling → Forest)
- Extended achievement library
- Monthly and seasonal challenges
- Profile customization unlocks

**Timeline:** 3-4 months post-launch

### Phase 4: Social (V3.0+)

**Scope:**
- Household features
- Community impact aggregation
- Local leaderboards (opt-in)

**Timeline:** 6+ months post-launch

---

## 8. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Users feel guilt from tracking | Positive-only framing; never show "failed" metrics |
| Notification fatigue | Strict limits (3/week rescue, 1/week summary) |
| Gamification feels childish | Clean, minimal design; opt-in for badges |
| Inaccurate impact estimates | Clear "estimated" labeling; user can input actual costs |
| Manipulation concerns | Transparent about estimates; no dark patterns |
| Feature bloat | Phased rollout; measure engagement before expanding |

---

## 9. Success Criteria

### Launch Criteria (Phase 1)
- [ ] Impact dashboard renders correctly for 99%+ of users
- [ ] Weekly notifications delivered within 1 hour of scheduled time
- [ ] Impact calculations accurate within 10% of manual verification
- [ ] <1% negative feedback on gamification in first 30 days

### Growth Criteria (Phase 2+)
- [ ] 50%+ of users view impact dashboard weekly
- [ ] 30%+ of users unlock at least 3 achievements
- [ ] 20%+ of users opt into at least one challenge
- [ ] Net positive sentiment in app store reviews mentioning gamification

---

## 10. Appendix

### A. Environmental Impact Calculations

| Food Category | CO2 per kg | Water per kg |
|---------------|------------|--------------|
| Beef | 27.0 kg | 15,400 L |
| Cheese | 13.5 kg | 5,060 L |
| Poultry | 6.9 kg | 4,325 L |
| Eggs | 4.8 kg | 3,265 L |
| Rice | 2.7 kg | 2,497 L |
| Vegetables | 2.0 kg | 322 L |
| Fruits | 1.1 kg | 962 L |
| Bread | 1.4 kg | 1,608 L |

*Source: FAO, WRI Food Emissions Database*

### B. Competitive Analysis

| App | Gamification Approach | Strengths | Weaknesses |
|-----|----------------------|-----------|------------|
| **NoWaste** | Basic stats only | Non-intrusive | Limited motivation |
| **Too Good To Go** | Impact counter | Clear metrics | No personalization |
| **Olio** | Community karma | Social proof | Can feel competitive |
| **Duolingo** | Heavy gamification | Engaging | Anxiety-inducing streaks |

**Our Differentiation:** Balanced approach that motivates without manipulating.

---

*End of Document*