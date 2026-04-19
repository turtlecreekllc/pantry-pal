# Behavioral Nudge & Upgrade Path Requirements

| Field | Value |
|-------|-------|
| **Document Version** | 1.0 |
| **Last Updated** | December 2024 |
| **Product** | DinnerPlans.ai |
| **Related PRD** | Subscription Model & Stripe Integration PRD |

---

## 1. Overview & Philosophy

This document defines the behavioral nudge system for DinnerPlans.ai, designed to guide users toward conversion decisions that genuinely benefit them while respecting their autonomy. 

### 1.1 Guiding Principles (from Thaler & Sunstein's Nudge)

> "A nudge is any aspect of the choice architecture that alters people's behavior in a predictable way **without forbidding any options** or significantly changing their economic incentives. To count as a mere nudge, the intervention must be **easy and cheap to avoid**."

**Our Ethical Framework:**

| ✅ Nudge (Do This) | ❌ Sludge (Never Do This) |
|-------------------|--------------------------|
| Make upgrading frictionless | Make cancellation difficult |
| Show value already received | Hide important information |
| Remind of expiring benefits | Create fake urgency |
| Personalize based on behavior | Manipulate with dark patterns |
| Frame losses honestly | Exaggerate consequences |
| Offer genuine value | Use guilt or shame |

### 1.2 Core Behavioral Economics Concepts Applied

| Concept | Definition | Our Application |
|---------|------------|-----------------|
| **Endowment Effect** | People value things more once they own them | Trial creates psychological ownership of premium features |
| **Loss Aversion** | Losses feel ~2x more painful than equivalent gains | Frame expiration as losing saved recipes, not missing features |
| **Status Quo Bias** | People prefer the current state | Make premium feel like the "normal" state during trial |
| **Social Proof** | People follow what others do | Show what similar families achieved |
| **Anchoring** | First number shapes perception | Annual savings message anchors value perception |
| **Progress Principle** | Invested effort increases commitment | Show pantry items added, recipes saved, money saved |
| **Variable Ratio Reinforcement** | Unpredictable rewards are most engaging | Celebrate milestones at unexpected moments |

---

## 2. Trial Period Nudge System

### 2.1 Trial Timeline Overview (14-Day Trial)

```
Day 0   Day 1   Day 3   Day 5   Day 7   Day 10   Day 12   Day 14   Day 15+
  │       │       │       │       │        │        │        │        │
  ▼       ▼       ▼       ▼       ▼        ▼        ▼        ▼        ▼
Welcome  Quick   Feature Value   Midpoint Urgency  Final    Expired  Win-back
         Win     Edu     Proof   Check-in Soft     Push     Grace    Sequence
```

### 2.2 In-App Nudges During Trial

#### 2.2.1 Persistent Trial Status Indicator

**Location:** App header/navigation area

**Display Logic:**
- Days 1-7: Subtle indicator — "Premium Trial · 7 days left"
- Days 8-11: Moderate prominence — "Premium Trial · 4 days left" (amber color)
- Days 12-14: High prominence — "Trial ends tomorrow" (red color, gentle pulse)

**Behavioral Principle:** Loss aversion increases as expiration approaches. Gradual escalation avoids alarm fatigue.

**Design Requirement:**
- Never block content or require dismissal
- Tapping opens upgrade modal with personalized stats
- Include small "Subscribe" button that doesn't dominate

---

#### 2.2.2 Progress Investment Displays

**Location:** Throughout app, contextually

**Purpose:** Leverage sunk cost psychology and endowment effect by showing what they've built.

| Trigger | Display | Behavioral Principle |
|---------|---------|---------------------|
| User adds 10th pantry item | "Nice! Your pantry is growing 🎉 You've added 10 items" | Progress celebration |
| User saves 5th recipe | "5 recipes saved! Your collection is taking shape" | Ownership feeling |
| First AI meal plan generated | "Your first personalized meal plan! Premium makes this possible" | Feature attribution |
| After using "expiring items" feature | "You just saved ~$8 in ingredients that would've gone bad" | Concrete value proof |

**End-of-Trial Synthesis:**
- Day 12+: Show consolidated "Your Trial in Numbers" card:
  - "You've added **47 pantry items**"
  - "Saved **12 recipes** to your collection"
  - "Generated **3 meal plans** with AI"
  - "Estimated savings: **$34** in reduced food waste"
  - "Losing Premium means losing access to all of this"

---

#### 2.2.3 Contextual Feature Attribution

**Purpose:** Connect positive moments to Premium features so users understand what they'd lose.

**Implementation:**

```
When: User completes an AI-powered action
Where: Toast notification or inline message
Duration: 3-5 seconds, dismissable

Examples:
┌─────────────────────────────────────────────────┐
│ 🎯 AI Recipe Generated                          │
│ "Chicken stir-fry with your pantry items"       │
│                                                 │
│ This is a Premium feature you're trying out.   │
│ [Keep Premium →]                                │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 📊 Nutritional Info                             │
│ 487 cal · 32g protein · 18g carbs              │
│                                                 │
│ Full nutrition tracking is Premium-only.        │
│ [Subscribe to keep it]                          │
└─────────────────────────────────────────────────┘
```

**Frequency Cap:** Maximum 2 feature attributions per session to avoid annoyance.

---

#### 2.2.4 Strategic Upgrade Modals

**Trigger Points (In-App):**

| Day | Trigger | Modal Content | Behavioral Angle |
|-----|---------|---------------|------------------|
| 3 | First value moment (AI generation, scan, etc.) | Celebration + soft mention of premium | Positive association |
| 7 | Open app for 4th+ time | "Halfway through your trial!" + usage stats | Progress + investment |
| 10 | Any app open | "4 days left" + personalized savings estimate | Soft urgency + loss aversion |
| 12-13 | Any app open (once per day) | "Your trial ends soon" + full value summary | Strong loss aversion |
| 14 | Any app open | "Last day" + one-tap subscribe | Final push |

**Modal Design Requirements:**

1. **Always dismissable** with clear X button
2. **Never block critical functions** (e.g., don't show during active cooking)
3. **Show personalized data** — "Your 47 pantry items" not "Your items"
4. **Include annual option prominently** — "Best value: $5.75/mo billed annually"
5. **One-tap upgrade** — Pre-fill payment if card on file

---

### 2.3 Email Nudge Sequence

#### 2.3.1 Email Timeline

| Email | Day | Subject Line | Primary Goal | Behavioral Principle |
|-------|-----|--------------|--------------|---------------------|
| 1 | 0 | Welcome to your Premium trial! | Onboarding + first value | Set expectations |
| 2 | 2 | Quick tip: Your first AI meal plan | Education + activation | Reduce friction |
| 3 | 5 | What families like yours are saving | Social proof + value | Social comparison |
| 4 | 10 | Your trial: 4 days left | Urgency + recap | Loss aversion (soft) |
| 5 | 13 | Tomorrow your trial ends | Final push | Loss aversion (strong) |
| 6 | 15 | We saved your stuff (for now) | Win-back | Endowment + scarcity |

---

#### 2.3.2 Email Content Specifications

**Email 1: Welcome (Day 0)**

```
Subject: Welcome to your Premium trial! 🎉

Hi [Name],

You just unlocked 14 days of DinnerPlans Premium — and I'm excited 
for you to see what's possible.

Here's what you can do right now:
✓ Scan anything in your pantry (unlimited)
✓ Ask AI "What can I make tonight?"
✓ Generate a full week's meal plan in seconds
✓ Track nutrition for your whole family

Your first mission: Scan 5 items in your pantry. It takes 30 seconds 
and sets you up for smarter meal suggestions.

[Open the App →]

Questions? Just reply to this email.

— The DinnerPlans Team

P.S. Your trial includes everything Premium members get. 
No credit card needed until you decide to stay.
```

**Behavioral notes:**
- Emphasizes ownership ("you just unlocked")
- Gives specific, achievable first action
- Removes anxiety ("no credit card needed")

---

**Email 4: Urgency (Day 10)**

```
Subject: Your trial: 4 days left

Hi [Name],

Just a heads up — your Premium trial ends in 4 days.

Here's what you've built so far:
• [X] pantry items tracked
• [X] recipes saved
• [X] AI meal plans generated
• Estimated savings: $[XX]

If you don't subscribe, here's what changes on [Date]:
• Your pantry shrinks to 50 items (you have [X])
• AI features go away completely
• Saved recipes beyond 25 become view-only

The good news? Keeping everything costs less than a coffee:

[Subscribe for $5.75/mo →] (billed annually)

Or pay monthly: $6.99/mo

Your data stays safe either way — but Premium is how 
you keep it all working for you.

— The DinnerPlans Team
```

**Behavioral notes:**
- Specific countdown creates urgency
- Personalized stats leverage endowment effect
- "What changes" frames as loss, not missing features
- Price anchored to familiar reference (coffee)

---

**Email 6: Win-back (Day 15, if not converted)**

```
Subject: We saved your stuff (for now)

Hi [Name],

Your trial ended, but we haven't deleted anything yet.

Your [X] pantry items, [X] saved recipes, and meal plan history 
are still here — just waiting for you to come back.

We'll keep them for 30 days. After that, we'll need to 
archive everything over the free tier limits.

If you meant to subscribe but life got busy, here's a 
quick link:

[Reactivate Premium →]

If DinnerPlans isn't for you, no worries — thanks for trying us out.

— The DinnerPlans Team

P.S. Families who subscribe save an average of $127/month 
on groceries. Just saying. 😉
```

**Behavioral notes:**
- "We saved your stuff" triggers endowment/loss aversion
- 30-day window creates scarcity without pressure
- Acknowledges life happens (respects autonomy)
- Ends with social proof

---

### 2.4 Push Notification Strategy

**Philosophy:** Push notifications are high-interruption. Use sparingly and only for genuine value or time-sensitivity.

| Day | Time | Message | Behavior Trigger |
|-----|------|---------|-----------------|
| 1 | Evening | "Your pantry is lonely 🥫 Add a few items to get started" | No pantry activity yet |
| 3 | After 1st AI use | "Nice! You just made your first AI meal plan 🎉" | Celebration |
| 7 | Afternoon | "Halfway there! See what you've saved so far →" | Progress reminder |
| 11 | Morning | "3 days left on your trial — here's what you'd lose" | Loss aversion |
| 14 | Morning | "Last day of Premium. Subscribe to keep everything →" | Final push |

**Opt-out respected:** If user disables push, don't circumvent via SMS or aggressive email.

---

## 3. Free-to-Paid Conversion Nudges (Post-Trial Free Users)

For users who didn't convert after trial and are now on the free tier.

### 3.1 Feature Gating Moments

When free users hit limits or attempt premium features, show upgrade prompts that:
1. Acknowledge the limit clearly
2. Show what they're missing
3. Offer immediate upgrade path
4. Allow dismissal without friction

**Examples:**

```
┌─────────────────────────────────────────────────┐
│ 🎯 Premium Feature                              │
│                                                 │
│ AI meal planning is a Premium feature.          │
│                                                 │
│ During your trial, you generated 3 meal plans.  │
│ Want to keep going?                             │
│                                                 │
│ [Unlock AI Features — $5.75/mo]                 │
│                                                 │
│ [Maybe Later]                                   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 📦 Pantry Full                                  │
│                                                 │
│ You've hit the 50-item limit for free accounts. │
│                                                 │
│ Premium = unlimited pantry, plus AI features    │
│ that actually use what you've tracked.          │
│                                                 │
│ [Go Premium — $5.75/mo]    [Manage Pantry]      │
└─────────────────────────────────────────────────┘
```

### 3.2 Periodic Re-engagement

**Monthly "What You're Missing" Email:**

```
Subject: What Premium members made this week

Hi [Name],

This week, Premium members generated 47,000+ AI meal plans 
and saved an estimated $2.3 million in food waste.

Meanwhile, your pantry has [X] items that could be working 
harder for you.

See what AI could do with your ingredients:

[Try Premium — 7-Day Trial]

— The DinnerPlans Team
```

**Frequency cap:** Maximum 1 promotional email per month to free users.

---

## 4. Monthly-to-Annual Upsell Nudges

### 4.1 Strategic Moments

| Trigger | Timing | Nudge Type |
|---------|--------|------------|
| After 2nd month payment | Invoice email | "You've paid $13.98. Annual would've been $11.50" |
| After 3rd month | In-app banner | "Switch to annual, save 18%" |
| After heavy usage month | End of billing period | "Power user discount: Switch to annual, get 1 month free" |
| Black Friday / New Year | Seasonal | "Annual plan: 25% off (today only)" |
| Before price increase | 30 days prior | "Lock in your rate: Switch to annual before prices go up" |

### 4.2 Annual Upgrade Modal

**Trigger:** After 2+ months as monthly subscriber, show once per month

```
┌─────────────────────────────────────────────────────────┐
│ 💡 Save 18% with Annual                                 │
│                                                         │
│ You've been with us [X] months — thanks for sticking   │
│ around!                                                 │
│                                                         │
│ Here's what you've paid so far: $[X]                    │
│ Annual plan for the same period: $[Y]                   │
│ You'd have saved: $[X-Y]                                │
│                                                         │
│ Switch now and your next 12 months cost $69 total       │
│ (that's $5.75/mo instead of $6.99).                     │
│                                                         │
│ Plus: Annual members get 50 rollover tokens/month.      │
│                                                         │
│ [Switch to Annual — Save $14.88/year]                   │
│                                                         │
│ [Keep Monthly]                                          │
└─────────────────────────────────────────────────────────┘
```

**Behavioral notes:**
- Concrete past spend creates loss aversion
- Shows "what you would have saved" (loss frame)
- Bonus feature (rollover tokens) adds value beyond savings
- Both options are clear and easy

---

## 5. Token Usage Nudges

### 5.1 Token Awareness Levels

| Tokens Remaining | Status | UI Treatment |
|------------------|--------|--------------|
| 100-51 (50%+) | Healthy | Green meter, no alerts |
| 50-31 (30-50%) | Moderate | Yellow meter, subtle reminder |
| 30-11 (10-30%) | Low | Orange meter, "running low" message |
| 10-1 (< 10%) | Critical | Red meter, active upsell prompt |
| 0 | Depleted | Modal with options |

### 5.2 Progressive Nudge System

#### At 50% Usage (First Awareness)

**In-App:** Subtle toast notification

```
"You've used 50 of your 100 tokens this month. 
Tokens reset on [Date]."

[View Usage] [Dismiss]
```

**No email. No push. Just awareness.**

---

#### At 30% Remaining (Soft Warning)

**In-App:** Token meter turns yellow + tooltip

```
"30 tokens left this month. 
Heavy AI users often grab a token bucket for peace of mind."

[See Token Options]
```

**Behavioral principle:** Social proof ("heavy AI users") normalizes purchasing more.

---

#### At 10 Tokens Remaining (Active Nudge)

**In-App:** Modal on next AI feature attempt

```
┌─────────────────────────────────────────────────┐
│ ⚠️ Running Low on Tokens                        │
│                                                 │
│ You have 10 tokens left this month.             │
│ Your current action costs 3 tokens.             │
│                                                 │
│ After this, you'll have 7 tokens until [Date].  │
│                                                 │
│ Want to grab some extra?                        │
│                                                 │
│ 50 tokens — $1.99                               │
│ 150 tokens — $4.99 (Best per-token value)       │
│ 400 tokens — $9.99                              │
│                                                 │
│ [Add Tokens]     [Continue with 10]             │
└─────────────────────────────────────────────────┘
```

**Behavioral notes:**
- Shows cost of current action (transparency)
- "Best value" anchor on middle option (decoy effect)
- Clear option to continue without buying

---

#### At 0 Tokens (Depleted)

**In-App:** Full-screen modal (blocking AI features only)

```
┌─────────────────────────────────────────────────┐
│ 🎯 You've Used All Your AI Tokens               │
│                                                 │
│ Great news: You got a lot done this month!      │
│                                                 │
│ Your tokens reset on [Date] ([X] days).         │
│                                                 │
│ In the meantime, you can:                       │
│                                                 │
│ 1. Add tokens now (never expire)                │
│    [50 for $1.99] [150 for $4.99] [400 for $9.99]│
│                                                 │
│ 2. Wait for your monthly reset                  │
│    You can still use all non-AI features        │
│                                                 │
│ 3. Upgrade to Annual                            │
│    Get 50 rollover tokens each month            │
│                                                 │
│ [Add Tokens]  [Switch to Annual]  [Wait It Out] │
└─────────────────────────────────────────────────┘
```

**Behavioral notes:**
- Positive framing ("you got a lot done!")
- Three clear options with different commitment levels
- "Wait it out" respects user autonomy (avoids sludge)

---

### 5.3 Proactive Heavy User Identification

**Trigger:** User consistently uses 80%+ tokens by mid-month (2+ months in a row)

**In-App Banner:**

```
┌─────────────────────────────────────────────────┐
│ 🚀 You're a Power User!                         │
│                                                 │
│ You've hit 80%+ tokens 2 months in a row.       │
│ Most power users grab a 150-token bundle        │
│ for peace of mind.                              │
│                                                 │
│ [Get 150 Tokens — $4.99]    [Not Now]           │
└─────────────────────────────────────────────────┘
```

**Email (once, after 2nd high-usage month):**

```
Subject: You're getting the most out of DinnerPlans 🔥

Hi [Name],

You've used 80%+ of your AI tokens two months running. 
That's awesome — you're really putting DinnerPlans to work!

A few options for power users like you:

1. **Token bundles** — Never expire, use when you need them
   50 tokens: $1.99 | 150 tokens: $4.99 | 400 tokens: $9.99

2. **Switch to Annual** — Get 50 rollover tokens/month
   $69/year ($5.75/mo) instead of $6.99/mo

3. **Keep your current plan** — Tokens reset on [Date]

Whatever works for you. Just wanted you to know your options.

[View My Options →]

— The DinnerPlans Team
```

---

## 6. Anti-Sludge Commitments

To ensure we remain ethical and user-respecting:

### 6.1 Easy Exit Guarantee

| Principle | Implementation |
|-----------|----------------|
| **One-tap cancellation** | Cancel button in Settings > Subscription, no phone call required |
| **Clear confirmation** | "Your subscription will remain active until [Date], then downgrade to Free" |
| **No guilt-tripping** | Cancellation flow shows facts only, not "Are you SURE? Think of the children!" |
| **Data preservation** | Free users keep all data (view-only for items over limit) for 1 year |
| **Immediate downgrade option** | "Cancel now and get prorated refund" available |

### 6.2 Notification Respect

| Channel | Max Frequency | Opt-Out |
|---------|---------------|---------|
| Push notifications | 3/week max | One-tap disable in app |
| Email (promotional) | 1/week during trial, 1/month after | Unsubscribe in every email |
| In-app modals | 1/day max, never blocking core functions | X button always visible |
| SMS | Never (unless opted in for delivery) | N/A |

### 6.3 Transparency Requirements

- Token costs shown before every AI action
- Subscription price shown in Settings at all times
- "Estimated savings" calculations based on USDA food waste data, methodology available
- No fake urgency ("Only 2 left!" when unlimited)
- No fake social proof ("1,247 people viewing this!" when not true)

---

## 7. A/B Testing Framework

### 7.1 Nudge Variables to Test

| Element | Variations | Success Metric |
|---------|------------|----------------|
| Trial reminder timing | Day 10 vs Day 11 vs Day 12 | Conversion rate |
| Loss vs gain framing | "Keep your recipes" vs "Unlock unlimited recipes" | Conversion rate |
| Email subject lines | Urgency vs value vs curiosity | Open rate → conversion |
| Token warning threshold | 30% vs 20% vs 10% | Token bucket attach rate |
| Annual upsell timing | Month 2 vs Month 3 vs Month 4 | Annual switch rate |
| Modal design | Full-screen vs banner vs inline | Conversion rate + bounce rate |

### 7.2 Guardrails

- Never A/B test cancellation flow (always make it easy)
- Test winner must outperform by 10%+ with p < 0.05
- User experience ratings must not decrease with winning variant
- Test for 2 full weeks minimum before declaring winner

---

## 8. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Trial-to-paid conversion | 15-25% | (Trial starts → Paid) / Trial starts |
| Free-to-paid conversion | 2-4% | (Free → Paid) / Free users |
| Token bucket attach rate | 5-10% | Premium users who buy tokens / Premium users |
| Annual plan adoption | 40%+ | Annual subs / Total paid subs |
| Monthly-to-annual switch rate | 15% within 6 months | Monthly users who switch to annual |
| Churn rate (monthly) | < 8% | Cancellations / Active subscriptions |
| NPS | > 50 | Net Promoter Score from in-app survey |
| Unsubscribe rate (email) | < 0.5% | Unsubscribes / Emails sent |

---

## 9. Implementation Priority

### Phase 1: Trial Essentials (Week 1-2)
- [ ] Trial status indicator in app header
- [ ] 5-email trial sequence
- [ ] Day 7 and Day 12 in-app modals
- [ ] Trial expiration handling

### Phase 2: Token Nudges (Week 2-3)
- [ ] Token usage meter UI
- [ ] 30%/10%/0% threshold notifications
- [ ] Token bucket purchase flow
- [ ] Usage history page

### Phase 3: Upsell Optimization (Week 3-4)
- [ ] Monthly-to-annual upgrade prompts
- [ ] Power user identification
- [ ] Feature gating modals for free users
- [ ] A/B testing infrastructure

### Phase 4: Win-back & Refinement (Week 4-5)
- [ ] Post-trial win-back email sequence
- [ ] Churned user re-engagement
- [ ] Full analytics dashboard
- [ ] A/B test first experiments

---

## Appendix A: Copy Bank

### Loss-Framed Messages (Use Sparingly)

| Context | Copy |
|---------|------|
| Trial ending | "Your [X] saved recipes become view-only in 3 days" |
| Token depletion | "AI features pause until [Date] or you add tokens" |
| Approaching pantry limit | "3 more items until your pantry hits the free limit" |

### Gain-Framed Messages (Default)

| Context | Copy |
|---------|------|
| Trial CTA | "Keep planning smarter meals" |
| Token bucket | "More AI power whenever you need it" |
| Annual upgrade | "Save 18% and never worry about running out" |

### Social Proof Messages

| Context | Copy |
|---------|------|
| Trial email | "Join 10,000+ families who've cut their grocery bills" |
| Token nudge | "Power users love the 150-token bundle" |
| ROI | "Average family saves $127/month with Premium" |

---

## Appendix B: Notification Templates

### Push Notifications

```
Day 1 (if inactive): Your pantry is waiting 🥫 Add a few items to get started
Day 7: Halfway through your trial! You've saved $[X] so far 🎉
Day 11: 3 days left — here's what happens next →
Day 14: Last day of Premium. Keep everything for $5.75/mo →
Token low: You're down to 10 AI tokens. Need more? →
```

### In-App Toasts

```
First AI use: "Nice! That was AI-powered 🎯 Premium keeps it going"
10th pantry item: "Your pantry is taking shape! 10 items and counting"
First savings estimate: "You just saved ~$8 in food that would've expired"
Token warning: "Heads up: 10 tokens left this month"
```

---

**End of Document**
