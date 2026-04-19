# Paywall Integration PRD

| Field | Value |
|-------|-------|
| **Document Version** | 1.0 |
| **Last Updated** | January 2025 |
| **Product** | DinnerPlans.ai |
| **Status** | Ready for Implementation |

---

## 1. Executive Summary

This PRD defines the integration of DinnerPlans.ai's three-tier subscription model into the mobile app. The pricing structure introduces a clear progression from Free → Individual → Family, with each tier unlocking meaningful capabilities for different user segments.

### 1.1 Pricing Overview

| Tier | Price | Target User | Key Differentiator |
|------|-------|-------------|-------------------|
| **Free** | $0/forever | Curious users trying the app | Limited but functional |
| **Individual** | $9.99/month | Singles, couples, light users | AI features + unlimited basics |
| **Family** | $14.99/month | Households with 2+ people | Multi-user + advanced planning |

### 1.2 Strategic Rationale

- **Individual at $9.99**: Positions AI features as premium value; higher than competitors but justified by AI capabilities
- **Family at $14.99**: 50% premium over Individual matches AnyList's household pricing strategy
- **Clear feature gates**: Each tier has exclusive features that create natural upgrade moments

---

## 2. Tier Feature Matrix

### 2.1 Complete Feature Breakdown

| Feature | Free | Individual | Family |
|---------|------|------------|--------|
| **Pantry Management** |
| Pantry items | Up to 50 | Unlimited | Unlimited |
| Barcode scanning | 10/month | Unlimited | Unlimited |
| Expiration tracking & alerts | ❌ | ✅ | ✅ |
| **Recipes** |
| Saved recipes | Up to 25 | Unlimited | Unlimited |
| Recipe scaling | ❌ | ❌ | ✅ |
| **AI Features** |
| AI recipe suggestions | ❌ | ✅ | ✅ |
| Weekly AI meal planning | ❌ | ❌ | ✅ |
| AI tokens/month | 0 | 100 | 150 |
| **Grocery Lists** |
| Basic grocery lists | ✅ (1 list) | ✅ (unlimited) | ✅ (unlimited) |
| Smart grocery lists (AI-generated) | ❌ | ✅ | ✅ |
| **Family Features** |
| Household members | 1 (self only) | 1 (self only) | Up to 6 |
| Per-person preferences | ❌ | ❌ | ✅ |
| Shared pantry & lists | ❌ | ❌ | ✅ |
| Family calendar sync | ❌ | ❌ | ✅ |
| **Support** |
| Email support | ✅ | Priority | Priority |
| In-app chat | ❌ | ✅ | ✅ |
| **Experience** |
| Ads | Shown | None | None |

### 2.2 Annual Pricing

| Tier | Monthly | Annual | Annual Savings |
|------|---------|--------|----------------|
| Free | $0 | $0 | — |
| Individual | $9.99 | $99/year ($8.25/mo) | 17% off |
| Family | $14.99 | $149/year ($12.42/mo) | 17% off |

---

## 3. Paywall UI Specifications

### 3.1 Paywall Screen Layout

**Screen Structure:**

```
┌─────────────────────────────────────────────────────────────┐
│  [X Close]                                                  │
│                                                             │
│              Choose Your Plan                               │
│         Save time. Waste less. Eat better.                  │
│                                                             │
│  ┌─────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Free   │  │ Individual  │  │   Family    │             │
│  │         │  │Most Popular │  │             │             │
│  │   $0    │  │   $9.99     │  │  $14.99     │             │
│  │/forever │  │   /month    │  │  /month     │             │
│  │         │  │             │  │             │             │
│  │[Get     │  │[Start 14-Day│  │[Start 14-Day│             │
│  │Started] │  │ Free Trial] │  │ Free Trial] │             │
│  │         │  │             │  │             │             │
│  │ • 50    │  │ • Unlimited │  │ • Everything│             │
│  │   items │  │   pantry    │  │   in Indiv. │             │
│  │ • 25    │  │ • Unlimited │  │ • Up to 6   │             │
│  │   recipes│ │   recipes   │  │   members   │             │
│  │ • 10    │  │ • Unlimited │  │ • Weekly AI │             │
│  │   scans │  │   scans     │  │   planning  │             │
│  │ • Basic │  │ • AI recipe │  │ • Per-person│             │
│  │   lists │  │   suggest.  │  │   prefs     │             │
│  │ • Email │  │ • Expiration│  │ • Shared    │             │
│  │   support│ │   tracking  │  │   pantry    │             │
│  │         │  │ • Smart     │  │ • Recipe    │             │
│  │         │  │   lists     │  │   scaling   │             │
│  │         │  │ • Priority  │  │ • Calendar  │             │
│  │         │  │   support   │  │   sync      │             │
│  └─────────┘  └─────────────┘  └─────────────┘             │
│                                                             │
│           [Toggle: Monthly | Annual (Save 17%)]             │
│                                                             │
│  ────────────────────────────────────────────────────────── │
│  🔒 Cancel anytime · Secure payment · 14-day free trial     │
│                                                             │
│              [Restore Purchases]                            │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Visual Design Requirements

| Element | Specification |
|---------|---------------|
| **Card highlight** | Individual card has "Most Popular" badge in orange (#F97316) |
| **Card elevation** | Individual card slightly raised (shadow/border emphasis) |
| **CTA buttons** | Individual = filled orange; Free/Family = outlined |
| **Checkmarks** | Orange (#F97316) for paid tiers; Gray for Free tier |
| **Price display** | Large, bold price; smaller "/month" or "/forever" |
| **Annual toggle** | Pill toggle; "Save 17%" badge when annual selected |
| **Trust badges** | Lock icon, "Cancel anytime", "14-day free trial" |

### 3.3 Annual Toggle Behavior

When user toggles to Annual:

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│     Free        │  │   Individual    │  │     Family      │
│                 │  │  Most Popular   │  │                 │
│      $0         │  │    $99          │  │    $149         │
│   /forever      │  │    /year        │  │    /year        │
│                 │  │  ($8.25/mo)     │  │  ($12.42/mo)    │
│                 │  │  Save $20.88    │  │  Save $30.88    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

**Toggle states:**
- Monthly (default): Shows monthly prices
- Annual: Shows annual prices with monthly equivalent and dollar savings

---

## 4. Paywall Trigger Points

### 4.1 Trigger Matrix

| Trigger | User State | Paywall Behavior |
|---------|------------|------------------|
| **First app open** | New user | Show paywall after onboarding (skippable) |
| **51st pantry item** | Free | Block action, show paywall with Individual highlighted |
| **26th recipe save** | Free | Block action, show paywall with Individual highlighted |
| **11th barcode scan** | Free | Block action, show paywall with Individual highlighted |
| **Tap "AI Suggestions"** | Free | Show paywall with Individual highlighted |
| **Tap "Meal Plan"** | Free | Show paywall with Family highlighted |
| **Tap "Add Family Member"** | Free/Individual | Show paywall with Family highlighted |
| **Tap "Recipe Scaling"** | Free/Individual | Show paywall with Family highlighted |
| **Tap "Calendar Sync"** | Free/Individual | Show paywall with Family highlighted |
| **Settings > Subscription** | Any | Show paywall (upgrade path) |
| **Trial expiring (3 days)** | Trial | Show paywall with current trial tier highlighted |

### 4.2 Contextual Paywall Variations

**Variation A: Feature-Specific (when user taps locked feature)**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🔒 AI Recipe Suggestions                                   │
│                                                             │
│  Get personalized recipe ideas based on what's              │
│  actually in your pantry.                                   │
│                                                             │
│  This feature is available with Individual or Family.       │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │   Individual    │  │     Family      │                  │
│  │   $9.99/mo      │  │   $14.99/mo     │                  │
│  │                 │  │                 │                  │
│  │ [Start Trial]   │  │ [Start Trial]   │                  │
│  └─────────────────┘  └─────────────────┘                  │
│                                                             │
│              [Maybe Later]                                  │
└─────────────────────────────────────────────────────────────┘
```

**Variation B: Limit-Hit (when user exceeds free tier limit)**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📦 Pantry Full                                             │
│                                                             │
│  You've reached 50 items — the free tier limit.             │
│                                                             │
│  Upgrade to Individual for unlimited pantry space           │
│  plus AI features that actually use what you track.         │
│                                                             │
│  ┌─────────────────────────────────────────────────┐       │
│  │   Individual — $9.99/month                      │       │
│  │   ✓ Unlimited pantry items                      │       │
│  │   ✓ AI recipe suggestions                       │       │
│  │   ✓ Expiration tracking                         │       │
│  │                                                 │       │
│  │   [Start 14-Day Free Trial]                     │       │
│  └─────────────────────────────────────────────────┘       │
│                                                             │
│  Need family features? [See Family Plan]                    │
│                                                             │
│              [Manage Pantry Instead]                        │
└─────────────────────────────────────────────────────────────┘
```

**Variation C: Family Upsell (Individual user taps Family feature)**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  👨‍👩‍👧‍👦 Family Features                                        │
│                                                             │
│  Meal planning works better together.                       │
│                                                             │
│  Upgrade to Family to add household members,                │
│  sync calendars, and plan meals everyone will love.         │
│                                                             │
│  You're currently on: Individual ($9.99/mo)                 │
│                                                             │
│  ┌─────────────────────────────────────────────────┐       │
│  │   Family — $14.99/month                         │       │
│  │   Everything you have now, plus:                │       │
│  │   ✓ Up to 6 family members                      │       │
│  │   ✓ Weekly AI meal planning                     │       │
│  │   ✓ Per-person dietary preferences              │       │
│  │   ✓ Shared pantry & grocery lists               │       │
│  │   ✓ Family calendar sync                        │       │
│  │                                                 │       │
│  │   [Upgrade to Family — +$5/mo]                  │       │
│  └─────────────────────────────────────────────────┘       │
│                                                             │
│              [Not Now]                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Trial Flow

### 5.1 Trial Configuration

| Parameter | Value |
|-----------|-------|
| Trial duration | 14 days |
| Credit card required | No |
| Trial available for | Individual, Family |
| Trial limit per user | 1 trial total (either tier) |

### 5.2 Trial Start Flow

```
User taps "Start 14-Day Free Trial" on Individual or Family
                    │
                    ▼
        ┌───────────────────────┐
        │  Create Account       │
        │  (if not logged in)   │
        │                       │
        │  Email: [          ]  │
        │  Password: [       ]  │
        │                       │
        │  [Continue]           │
        └───────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  Trial Started! 🎉    │
        │                       │
        │  You have 14 days of  │
        │  [Individual/Family]  │
        │  access.              │
        │                       │
        │  We'll remind you     │
        │  before it ends.      │
        │                       │
        │  [Start Exploring]    │
        └───────────────────────┘
```

### 5.3 Trial-to-Paid Conversion

3 days before trial ends:
- In-app modal with subscription options
- Email reminder with personalized usage stats
- Push notification (if enabled)

On trial expiration:
- If no payment method: Downgrade to Free, show conversion paywall
- If payment method added: Begin billing, send confirmation

---

## 6. Subscription Management

### 6.1 Settings > Subscription Screen

**For Free Users:**

```
┌─────────────────────────────────────────────────────────────┐
│  Subscription                                               │
│                                                             │
│  Current Plan: Free                                         │
│                                                             │
│  ┌─────────────────────────────────────────────────┐       │
│  │  Upgrade to unlock:                             │       │
│  │  • Unlimited pantry & recipes                   │       │
│  │  • AI-powered meal suggestions                  │       │
│  │  • Family sharing & calendar sync               │       │
│  │                                                 │       │
│  │  [View Plans]                                   │       │
│  └─────────────────────────────────────────────────┘       │
│                                                             │
│  Usage This Month                                           │
│  Pantry items: 34/50                                        │
│  Saved recipes: 12/25                                       │
│  Barcode scans: 7/10                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**For Individual Subscribers:**

```
┌─────────────────────────────────────────────────────────────┐
│  Subscription                                               │
│                                                             │
│  Current Plan: Individual                                   │
│  $9.99/month · Renews [Date]                               │
│                                                             │
│  AI Tokens: 67/100 remaining                                │
│  [████████░░] Resets [Date]                                │
│                                                             │
│  ┌─────────────────────────────────────────────────┐       │
│  │  👨‍👩‍👧‍👦 Upgrade to Family                            │       │
│  │  Add family members, weekly meal planning,      │       │
│  │  and calendar sync for just $5 more/month.      │       │
│  │                                                 │       │
│  │  [Upgrade to Family]                            │       │
│  └─────────────────────────────────────────────────┘       │
│                                                             │
│  [Switch to Annual — Save 17%]                              │
│  [Manage Payment Method]                                    │
│  [Cancel Subscription]                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**For Family Subscribers:**

```
┌─────────────────────────────────────────────────────────────┐
│  Subscription                                               │
│                                                             │
│  Current Plan: Family                                       │
│  $14.99/month · Renews [Date]                              │
│                                                             │
│  AI Tokens: 112/150 remaining                               │
│  [███████░░░] Resets [Date]                                │
│                                                             │
│  Household Members: 4/6                                     │
│  [Manage Members]                                           │
│                                                             │
│  [Switch to Annual — Save 17%]                              │
│  [Manage Payment Method]                                    │
│  [Cancel Subscription]                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Plan Change Handling

| Change | Behavior |
|--------|----------|
| Free → Individual | Immediate access; billing starts (or trial starts) |
| Free → Family | Immediate access; billing starts (or trial starts) |
| Individual → Family | Immediate upgrade; prorated charge |
| Family → Individual | Downgrade at period end; family features removed |
| Individual → Free | Downgrade at period end; data preserved (over-limit = view-only) |
| Family → Free | Downgrade at period end; family members removed; data preserved |
| Monthly → Annual | Immediate switch; prorated credit applied |
| Annual → Monthly | Switch at period end |

---

## 7. Stripe Product Configuration

### 7.1 Products to Create

| Product Name | Product ID | Description |
|--------------|------------|-------------|
| Individual Monthly | `prod_individual_monthly` | DinnerPlans Individual - Monthly |
| Individual Annual | `prod_individual_annual` | DinnerPlans Individual - Annual |
| Family Monthly | `prod_family_monthly` | DinnerPlans Family - Monthly |
| Family Annual | `prod_family_annual` | DinnerPlans Family - Annual |
| Token Bucket - 50 | `prod_tokens_50` | 50 AI Tokens (one-time) |
| Token Bucket - 150 | `prod_tokens_150` | 150 AI Tokens (one-time) |
| Token Bucket - 400 | `prod_tokens_400` | 400 AI Tokens (one-time) |

### 7.2 Prices to Create

| Product | Price ID | Amount | Interval |
|---------|----------|--------|----------|
| Individual Monthly | `price_individual_monthly` | $9.99 | month |
| Individual Annual | `price_individual_annual` | $99.00 | year |
| Family Monthly | `price_family_monthly` | $14.99 | month |
| Family Annual | `price_family_annual` | $149.00 | year |
| Token Bucket - 50 | `price_tokens_50` | $1.99 | one-time |
| Token Bucket - 150 | `price_tokens_150` | $4.99 | one-time |
| Token Bucket - 400 | `price_tokens_400` | $9.99 | one-time |

### 7.3 Subscription Metadata

Store with each subscription:

```json
{
  "tier": "individual" | "family",
  "billing_cycle": "monthly" | "annual",
  "trial_used": true | false,
  "original_signup_date": "2025-01-08T00:00:00Z",
  "tokens_monthly_allocation": 100 | 150
}
```

---

## 8. Database Schema Updates

### 8.1 Updated Subscriptions Table

```sql
-- Updated tier enum
ALTER TYPE subscription_tier ADD VALUE 'individual_monthly';
ALTER TYPE subscription_tier ADD VALUE 'individual_annual';
ALTER TYPE subscription_tier ADD VALUE 'family_monthly';
ALTER TYPE subscription_tier ADD VALUE 'family_annual';

-- Or create new enum
CREATE TYPE subscription_tier AS ENUM (
  'free',
  'individual_monthly',
  'individual_annual', 
  'family_monthly',
  'family_annual',
  'trial_individual',
  'trial_family'
);
```

### 8.2 Token Allocation by Tier

| Tier | Monthly Tokens | Rollover (Annual Only) |
|------|----------------|------------------------|
| Free | 0 | N/A |
| Individual Monthly | 100 | No rollover |
| Individual Annual | 100 | Up to 50 |
| Family Monthly | 150 | No rollover |
| Family Annual | 150 | Up to 75 |

### 8.3 Household Members Table (New)

```sql
CREATE TABLE household_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id),
  user_id uuid REFERENCES auth.users(id),
  role text NOT NULL DEFAULT 'member', -- 'owner' | 'member'
  display_name text,
  dietary_preferences jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(household_id, user_id)
);

-- RLS: Members can view their household; only owner can modify
```

---

## 9. Feature Gating Implementation

### 9.1 Feature Flag Logic

```typescript
// Feature access by tier
const FEATURE_ACCESS = {
  free: {
    pantryLimit: 50,
    recipeLimit: 25,
    scanLimit: 10,
    groceryLists: 1,
    aiSuggestions: false,
    aiMealPlanning: false,
    expirationTracking: false,
    smartGroceryLists: false,
    householdMembers: 1,
    perPersonPreferences: false,
    sharedPantry: false,
    recipeScaling: false,
    calendarSync: false,
    tokensMonthly: 0,
    adsEnabled: true,
  },
  individual: {
    pantryLimit: Infinity,
    recipeLimit: Infinity,
    scanLimit: Infinity,
    groceryLists: Infinity,
    aiSuggestions: true,
    aiMealPlanning: false,  // Family only
    expirationTracking: true,
    smartGroceryLists: true,
    householdMembers: 1,
    perPersonPreferences: false,
    sharedPantry: false,
    recipeScaling: false,
    calendarSync: false,
    tokensMonthly: 100,
    adsEnabled: false,
  },
  family: {
    pantryLimit: Infinity,
    recipeLimit: Infinity,
    scanLimit: Infinity,
    groceryLists: Infinity,
    aiSuggestions: true,
    aiMealPlanning: true,
    expirationTracking: true,
    smartGroceryLists: true,
    householdMembers: 6,
    perPersonPreferences: true,
    sharedPantry: true,
    recipeScaling: true,
    calendarSync: true,
    tokensMonthly: 150,
    adsEnabled: false,
  },
};
```

### 9.2 Gating UI Patterns

**Locked Feature Indicator:**

```
┌─────────────────────────────────────────┐
│  🔒 Weekly Meal Planning                │
│                                         │
│  Plan your family's meals for the       │
│  entire week with AI.                   │
│                                         │
│  [Upgrade to Family]                    │
└─────────────────────────────────────────┘
```

**Limit Approaching Warning:**

```
┌─────────────────────────────────────────┐
│  📦 Pantry: 47/50 items                 │
│  ━━━━━━━━━━━━━━━━━━━━░░░                │
│  3 items until limit · [Go Unlimited]   │
└─────────────────────────────────────────┘
```

---

## 10. Analytics Events

### 10.1 Paywall Events

```typescript
// Paywall viewed
analytics.track('paywall_viewed', {
  trigger: 'feature_gate' | 'limit_hit' | 'settings' | 'onboarding',
  feature_attempted: 'ai_suggestions' | 'meal_planning' | etc,
  current_tier: 'free' | 'individual' | 'family',
});

// Plan selected
analytics.track('plan_selected', {
  plan: 'individual_monthly' | 'individual_annual' | 'family_monthly' | 'family_annual',
  from_paywall: true | false,
  trigger: string,
});

// Trial started
analytics.track('trial_started', {
  plan: 'individual' | 'family',
  trigger: string,
});

// Subscription started
analytics.track('subscription_started', {
  plan: string,
  billing_cycle: 'monthly' | 'annual',
  from_trial: true | false,
  trial_days_used: number,
});

// Upgrade completed
analytics.track('upgrade_completed', {
  from_plan: string,
  to_plan: string,
  trigger: string,
});
```

---

## 11. Implementation Phases

### Phase 1: Stripe Setup (Day 1)
- [ ] Create products in Stripe
- [ ] Create prices for each product
- [ ] Configure Customer Portal
- [ ] Test webhook handling

### Phase 2: Paywall UI (Days 2-4)
- [ ] Build main paywall component
- [ ] Build contextual paywall variants
- [ ] Implement annual/monthly toggle
- [ ] Style to match design system

### Phase 3: Feature Gating (Days 4-6)
- [ ] Implement feature access logic
- [ ] Add limit checking throughout app
- [ ] Build locked feature UI states
- [ ] Wire up paywall triggers

### Phase 4: Subscription Management (Days 6-8)
- [ ] Build subscription settings screen
- [ ] Implement plan change flows
- [ ] Handle proration logic
- [ ] Add cancellation flow

### Phase 5: Trial System (Days 8-10)
- [ ] Implement trial start flow
- [ ] Build trial status UI
- [ ] Set up trial expiration handling
- [ ] Create trial-to-paid conversion flow

### Phase 6: Testing & Launch (Days 10-12)
- [ ] Test all subscription flows
- [ ] Test upgrade/downgrade paths
- [ ] Test trial expiration
- [ ] Gradual rollout

---

## Appendix A: Paywall Copy Bank

### Headlines

| Context | Headline |
|---------|----------|
| General | "Choose Your Plan" |
| Feature gate | "Unlock [Feature Name]" |
| Limit hit | "You've reached the free limit" |
| Trial ending | "Keep your premium features" |
| Upgrade | "Ready for more?" |

### Subheadlines

| Context | Subheadline |
|---------|-------------|
| General | "Save time. Waste less. Eat better." |
| Individual | "For individuals and couples" |
| Family | "Best for families with diverse tastes" |
| Annual | "Save 17% with annual billing" |

### CTAs

| Tier | CTA Text |
|------|----------|
| Free | "Get Started Free" |
| Individual/Family (trial available) | "Start 14-Day Free Trial" |
| Individual/Family (no trial) | "Subscribe Now" |
| Upgrade | "Upgrade to [Tier]" |
| Annual switch | "Switch to Annual — Save 17%" |

---

## Appendix B: Error States

| Error | User Message |
|-------|--------------|
| Payment failed | "Payment couldn't be processed. Please check your card details or try another method." |
| Trial already used | "You've already used your free trial. Subscribe to access premium features." |
| Downgrade with over-limit data | "You have [X] items over the free limit. They'll become view-only on the free plan." |
| Family member limit | "Your household has reached the 6-member limit." |

---

**End of Document**
