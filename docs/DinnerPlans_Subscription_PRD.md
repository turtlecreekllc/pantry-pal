# Subscription Model & Stripe Integration PRD

| Field | Value |
|-------|-------|
| **Document Version** | 1.0 |
| **Last Updated** | December 2024 |
| **Product** | DinnerPlans.ai |
| **Status** | Ready for Implementation |

---

## 1. Executive Summary

This PRD defines the complete subscription model, pricing strategy, and Stripe integration requirements for DinnerPlans.ai. The model follows a Premium AI approach designed to maximize ARPU while capturing early market share through strategic positioning against competitors.

> **💰 Core Value Proposition**
> 
> Users save $100+/month on groceries by reducing food waste and planning smarter meals. Our $7-10/month subscription pays for itself 10x over.

### 1.1 Strategic Objectives

1. Establish premium positioning with AI-first feature differentiation
2. Achieve 2-4% free-to-paid conversion rate within 6 months
3. Maintain 55%+ gross margins while scaling AI features
4. Create clear ROI messaging: $100+ savings vs $7-10/month cost
5. Build sustainable token-based AI usage model with upsell opportunities

---

## 2. Subscription Tiers

DinnerPlans.ai offers a freemium model with two primary tiers plus add-on token buckets. All tiers include household sharing (up to 6 members) as a core differentiator.

### 2.1 Tier Overview

| Feature | Free Tier | Premium ($6.99/mo or $69/yr) |
|---------|-----------|------------------------------|
| **AI Recipe Generations** | 0 (No AI features) | 100 tokens/month included |
| **AI Meal Planning** | Not available | Full AI-powered weekly plans |
| **Pantry Management** | Up to 50 items | Unlimited items |
| **Barcode Scanning** | 10 scans/month | Unlimited scans |
| **Recipe Saving** | Up to 25 recipes | Unlimited recipes |
| **Grocery Lists** | 1 active list | Unlimited lists |
| **Household Sharing** | Not available | Up to 6 members |
| **Nutritional Info** | Basic only | Full macros + tracking |
| **Recipe Scaling** | Not available | Any serving size |
| **Dietary Filters** | 3 basic filters | All filters + custom |
| **Ad Experience** | Ads shown | Ad-free |
| **Priority Support** | Community only | Email + in-app chat |

### 2.2 Pricing Structure

| Plan | Price | Savings Message |
|------|-------|-----------------|
| Premium Monthly | $6.99/month | Cancel anytime |
| Premium Annual | $69/year ($5.75/mo) | Save 18% — Best Value! |
| 14-Day Trial | $0 (no CC required) | Full Premium access |

### 2.3 Free Tier Limitations (Conversion Triggers)

Free tier limitations are strategically designed to demonstrate value while creating natural upgrade moments:

- **Pantry limit (50 items)**: Show counter "48/50 items — Upgrade for unlimited"
- **Recipe limit (25)**: "You've saved 25 recipes! Upgrade to never lose a favorite"
- **No AI features**: Prominent "What can I make?" button leads to upgrade prompt
- **Scan limit**: After 10 scans, show "You've used your free scans. Upgrade for unlimited!"
- **Single grocery list**: "Need multiple lists? Premium lets you organize by store"

---

## 3. AI Token System

The token system enables sustainable AI feature delivery while creating upsell opportunities for power users.

### 3.1 Token Allocation

| User Type | Monthly Tokens | Rollover Policy |
|-----------|----------------|-----------------|
| Free Tier | 0 tokens | N/A |
| Premium (Monthly) | 100 tokens | No rollover |
| Premium (Annual) | 100 tokens/month | Up to 50 tokens rollover |

### 3.2 Token Costs by Feature

| AI Feature | Token Cost | Est. API Cost |
|------------|------------|---------------|
| Quick Recipe Suggestion (from pantry) | 1 token | $0.001 |
| Detailed Recipe Generation | 3 tokens | $0.003 |
| Weekly Meal Plan (7 days) | 10 tokens | $0.015 |
| Ingredient Substitution | 1 token | $0.001 |
| Nutritional Analysis | 2 tokens | $0.002 |
| Smart Grocery List Generation | 5 tokens | $0.005 |
| Recipe Modification (dietary needs) | 3 tokens | $0.003 |
| "Use It Up" Expiring Items Plan | 5 tokens | $0.008 |

### 3.3 Token Bucket Add-Ons

When users approach or exceed their monthly token allocation, offer one-time token bucket purchases:

| Bucket Size | Price | Per-Token Cost | Expiration |
|-------------|-------|----------------|------------|
| 50 tokens | $1.99 | $0.040 | Never expires |
| 150 tokens | $4.99 | $0.033 | Never expires |
| 400 tokens | $9.99 | $0.025 | Never expires |

> **💡 Token Bucket Best Practices**
> 
> 1) Purchased tokens never expire (subscription tokens do). 2) Use purchased tokens first, then subscription tokens. 3) Show clear usage breakdown in subscription dashboard. 4) Trigger upsell at 80% usage, not 100%.

### 3.4 Token Usage Tracking Requirements

The following data must be tracked and displayed to users:

- Current token balance (subscription + purchased separately)
- Tokens used this billing period
- Tokens remaining until reset
- Days until token reset
- Historical usage by feature type (chart)
- Usage trend (increasing/decreasing month-over-month)
- Projected depletion date based on current usage rate

---

## 4. Signup & Onboarding Flow

### 4.1 Flow Overview

The signup flow emphasizes ROI messaging while offering a low-friction trial path. The goal is to strongly encourage paid conversion while providing a subtle free option.

### 4.2 Screen-by-Screen Specification

#### Screen 1: Welcome & Value Proposition

- **Hero**: "Stop wasting food. Start saving money."
- **Subhead**: "Families save $100+ per month with smarter meal planning"
- **Visual**: Animated illustration of food waste → savings
- **Primary CTA**: "Start Saving Today" (leads to plan selection)
- **Social proof**: "Join 10,000+ families who've cut their grocery bills"

#### Screen 2: Plan Selection (Decision Point)

**Layout**: Two cards side-by-side, Premium card visually emphasized

**Premium Card (LEFT, LARGER, with "RECOMMENDED" badge):**
- Price: "$6.99/month" with annual toggle showing "$5.75/mo billed annually"
- ROI callout: "Pays for itself after saving just ONE ingredient from the trash"
- Feature highlights with checkmarks (AI meal planning, unlimited pantry, household sharing)
- Savings calculator mini-widget: "Average family saves: $127/month"
- CTA Button: "Start Premium" (bright, prominent)

**Free Trial Option (RIGHT, SMALLER):**
- "Not sure? Try Premium free for 14 days"
- Smaller text: "No credit card required"
- Secondary CTA: "Start Free Trial" (outlined button, less prominent)

**Bottom of screen (subtle, text link):**
- "Or continue with limited free version" — links to free tier signup

#### Screen 3A: Premium Payment (if selected)

- Stripe Elements embedded payment form
- Plan summary with price and billing cycle
- ROI reminder: "Your subscription costs less than one meal out"
- Trust badges: Secure payment, Cancel anytime, Money-back guarantee
- Annual/Monthly toggle with savings callout

#### Screen 3B: Free Trial Setup (if selected)

- Email + password only (no payment info)
- Countdown visual: "14 days of Premium access"
- Reminder setting: "We'll notify you 3 days before trial ends"
- Feature preview: What they'll get to try

#### Screen 4: Account Creation

- Email, password, household name
- Optional: Add household members now or later
- Dietary preferences quick-select (used for AI personalization)

#### Screen 5: Onboarding Quick Start

- "Let's stock your pantry!" — guide to first barcode scan
- Progress indicator: 3 quick setup steps
- Skip option available but discouraged visually

### 4.3 ROI Messaging Requirements

ROI messaging must appear consistently throughout the app:

| Location | Message Example |
|----------|-----------------|
| Signup flow | "Families save $100+ per month" |
| Settings/Subscription page | "Your savings this month: $XX (estimated)" |
| Recipe suggestion | "Using ingredients worth $12 that would expire this week" |
| Weekly summary email | "This week you saved approximately $28 in food waste" |
| Upgrade prompts | "Premium users save 3x more — $127/mo average" |
| Cancellation flow | "You've saved $312 since joining. Sure you want to cancel?" |

---

## 5. Stripe Integration Requirements

### 5.1 Stripe Products to Create

| Product Name | Product ID | Price | Interval |
|--------------|------------|-------|----------|
| Premium Monthly | prod_premium_monthly | $6.99 | month |
| Premium Annual | prod_premium_annual | $69.00 | year |
| Token Bucket - 50 | prod_tokens_50 | $1.99 | one-time |
| Token Bucket - 150 | prod_tokens_150 | $4.99 | one-time |
| Token Bucket - 400 | prod_tokens_400 | $9.99 | one-time |

### 5.2 Webhook Events to Handle

| Webhook Event | Action Required |
|---------------|-----------------|
| checkout.session.completed | Provision subscription, add tokens, update user tier |
| customer.subscription.created | Set subscription start date, allocate initial tokens |
| customer.subscription.updated | Handle plan changes (upgrade/downgrade) |
| customer.subscription.deleted | Downgrade to free tier, preserve data |
| invoice.paid | Reset monthly tokens, record payment |
| invoice.payment_failed | Notify user, enter grace period (7 days) |
| customer.subscription.trial_will_end | Send 3-day warning email |

### 5.3 Stripe Customer Portal Configuration

Enable Stripe Customer Portal for self-service management:

- Allow plan switching (monthly ↔ annual)
- Allow cancellation with feedback survey
- Show invoice history
- Update payment method
- Disable pause subscription (not supported in our model)

### 5.4 Implementation Approach

1. Use Stripe Checkout for initial payment flow (hosted, PCI-compliant)
2. Store Stripe customer_id and subscription_id in Supabase users table
3. Create Supabase Edge Function for webhook handler
4. Use Stripe Elements for in-app payment method updates
5. Implement idempotency keys for all Stripe API calls

---

## 6. Database Schema Requirements

### 6.1 New Tables

#### subscriptions

Primary subscription tracking table:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Primary key |
| user_id | uuid (FK) | References auth.users |
| stripe_customer_id | text | Stripe customer ID (cus_xxx) |
| stripe_subscription_id | text | Stripe subscription ID (sub_xxx) |
| tier | enum | 'free', 'premium_monthly', 'premium_annual', 'trial' |
| status | enum | 'active', 'canceled', 'past_due', 'trialing' |
| current_period_start | timestamptz | Current billing period start |
| current_period_end | timestamptz | Current billing period end |
| trial_end | timestamptz | Trial end date (null if not trialing) |
| cancel_at_period_end | boolean | True if subscription won't renew |
| created_at | timestamptz | Record creation timestamp |
| updated_at | timestamptz | Last update timestamp |

#### token_balances

User token balance tracking:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Primary key |
| user_id | uuid (FK) | References auth.users |
| subscription_tokens | integer | Tokens from subscription (resets monthly) |
| purchased_tokens | integer | Tokens from bucket purchases (never expire) |
| rollover_tokens | integer | Rolled over tokens (annual plans only, max 50) |
| tokens_used_this_period | integer | Tokens consumed in current billing period |
| last_reset_at | timestamptz | Last token reset timestamp |
| updated_at | timestamptz | Last update timestamp |

#### token_transactions

Detailed token usage history:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Primary key |
| user_id | uuid (FK) | References auth.users |
| transaction_type | enum | 'usage', 'subscription_grant', 'purchase', 'rollover', 'reset' |
| amount | integer | Positive for grants, negative for usage |
| feature_type | text | AI feature used (for usage transactions) |
| token_source | enum | 'subscription', 'purchased', 'rollover' |
| balance_after | integer | Total balance after transaction |
| metadata | jsonb | Additional context (recipe_id, etc.) |
| created_at | timestamptz | Transaction timestamp |

#### subscription_events

Audit log for subscription changes:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Primary key |
| user_id | uuid (FK) | References auth.users |
| event_type | text | Stripe webhook event type |
| stripe_event_id | text | Stripe event ID for idempotency |
| previous_tier | text | Tier before event |
| new_tier | text | Tier after event |
| metadata | jsonb | Full Stripe event payload |
| created_at | timestamptz | Event timestamp |

### 6.2 Row Level Security Policies

Apply RLS to all subscription tables:

- Users can only read their own subscription data
- Users can only read their own token balance and transactions
- Service role required for all writes (via Edge Functions)
- Household members can view (not modify) household subscription status

---

## 7. UI/UX Requirements

### 7.1 Subscription Dashboard

**Location**: Settings > Subscription

Dashboard must display:

1. Current plan name and status
2. Price and billing cycle
3. Next billing date or trial end date
4. Token balance breakdown (visual):
   - Subscription tokens: XX remaining
   - Purchased tokens: XX available
   - Rollover tokens: XX (annual only)
   - Total available: XX tokens
5. Usage meter showing percentage used
6. "Buy More Tokens" button (when < 30% remaining)
7. "Upgrade Plan" button (for free users / monthly users)
8. "Manage Subscription" link to Stripe Portal

### 7.2 Token Usage History

**Location**: Settings > Subscription > Usage History

- Date-range selector (last 7 days, 30 days, 90 days, all time)
- List view of transactions with: Date/time, Feature used, Tokens consumed, Balance after
- Chart showing daily/weekly usage over time
- Filter by feature type
- Export to CSV option

### 7.3 Upgrade Prompts

Strategic upgrade prompt locations:

- **Feature gate**: When free user attempts AI feature
- **Limit reached**: When free user hits pantry/recipe/scan limit
- **Token depleted**: When premium user runs out of tokens
- **Post-value**: After first successful AI recipe generation ("Upgrade to unlock more")
- **Time-based**: Day 10 of trial ("4 days left!")

### 7.4 Visual Design Requirements

- Premium tier should use gold/amber accent color
- Token meter should be prominent but not alarming until < 20%
- ROI messaging should feel celebratory, not salesy
- Clear visual hierarchy: Plan > Status > Tokens > Actions

---

## 8. Analytics & Success Metrics

### 8.1 Key Metrics to Track

| Metric | Target | Notes |
|--------|--------|-------|
| Free-to-paid conversion | 2-4% | Premium AI approach expectation |
| Trial-to-paid conversion | 15-25% | Higher due to intent filtering |
| Monthly churn rate | < 8% | Industry average is 12%+ |
| ARPU (Avg Revenue Per User) | $6-8/mo | Blended across tiers |
| Token bucket attach rate | 5-10% | % of premium users buying extra |
| Annual plan adoption | 40%+ | Higher margin, lower churn |
| Gross margin | 55%+ | Critical floor for AI sustainability |

### 8.2 Events to Track (Analytics)

- `subscription_started`: tier, price, annual_or_monthly
- `subscription_canceled`: tier, reason (if collected), tenure_days
- `trial_started`: source_screen
- `trial_converted`: days_used, features_tried
- `trial_expired`: days_used, features_tried, last_active
- `tokens_depleted`: tier, days_since_reset, features_used
- `tokens_purchased`: bucket_size, tier, tokens_remaining
- `upgrade_prompt_shown`: location, tier, tokens_remaining
- `upgrade_prompt_converted`: location, new_tier
- `feature_gated`: feature_name, current_tier

---

## 9. Security Requirements

### 9.1 Stripe Security

1. Never store full credit card numbers — use Stripe tokens only
2. Validate webhook signatures using stripe-signature header
3. Use HTTPS for all Stripe API communications
4. Store API keys in environment variables, never in code
5. Implement idempotency keys for payment operations

### 9.2 Token Security

1. All token operations must go through Edge Functions (not direct DB)
2. Validate token availability before processing AI requests
3. Log all token transactions for audit trail
4. Implement rate limiting on AI endpoints (prevent abuse)

### 9.3 Subscription Security

1. Verify subscription status on every premium feature request
2. Cache subscription status with short TTL (5 minutes max)
3. Handle webhook replay attacks via event ID deduplication

---

## 10. Testing Requirements

### 10.1 Stripe Test Mode

All development and staging must use Stripe test mode:

- Test API keys (pk_test_xxx, sk_test_xxx)
- Test card numbers: 4242424242424242 (success), 4000000000000002 (decline)
- Test webhook endpoints with Stripe CLI

### 10.2 Test Scenarios

1. New user signup → Premium monthly → successful payment
2. New user signup → 14-day trial → conversion to paid
3. New user signup → 14-day trial → expiration → free tier
4. Premium user → token depletion → bucket purchase
5. Premium monthly → upgrade to annual
6. Premium annual → downgrade to monthly
7. Payment failure → grace period → recovery
8. Payment failure → grace period → churn to free
9. Subscription cancellation → access until period end
10. Token rollover (annual) → correct calculation at renewal

---

## 11. Implementation Phases

### Phase 1: Foundation (Week 1-2)

- Create Stripe products and prices
- Implement database schema and migrations
- Build Stripe webhook handler Edge Function
- Create subscription service with basic operations

### Phase 2: Payment Flow (Week 2-3)

- Implement Stripe Checkout integration
- Build signup flow with plan selection
- Implement free trial flow
- Enable Stripe Customer Portal

### Phase 3: Token System (Week 3-4)

- Implement token balance tracking
- Build token consumption logic for AI features
- Create token bucket purchase flow
- Implement usage history tracking

### Phase 4: UI & Polish (Week 4-5)

- Build subscription dashboard
- Implement upgrade prompts throughout app
- Add ROI messaging components
- Create token usage visualization

### Phase 5: Testing & Launch (Week 5-6)

- Complete test scenario coverage
- Security audit
- Switch to production Stripe keys
- Gradual rollout to beta users

---

## Appendix A: Feature Flag Configuration

Use feature flags to control subscription features during rollout:

| Flag Name | Default | Description |
|-----------|---------|-------------|
| subscriptions_enabled | false | Master switch for subscription system |
| trial_enabled | true | Show 14-day trial option |
| token_buckets_enabled | true | Allow token bucket purchases |
| annual_plans_enabled | true | Show annual plan option |
| roi_messaging_enabled | true | Display savings estimates |

---

## Appendix B: Error Handling

| Error Scenario | User-Facing Message |
|----------------|---------------------|
| Payment declined | "Your payment couldn't be processed. Please check your card details or try a different payment method." |
| Subscription expired | "Your Premium subscription has ended. Renew now to keep your AI features and savings tracking." |
| Tokens depleted | "You've used all your AI tokens this month! Get more tokens to keep planning smart meals." |
| Webhook failure | (No user message — retry internally, alert engineering if persistent) |
| Trial expired | "Your free trial has ended. You saved an estimated $XX during your trial! Subscribe to keep saving." |

---

**End of Document**
