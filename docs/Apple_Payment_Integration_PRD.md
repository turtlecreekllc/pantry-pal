# Apple Payment Integration PRD

| Field | Value |
|-------|-------|
| **Document Version** | 1.0 |
| **Last Updated** | December 30, 2025 |
| **Author** | Shane (Product Lead) |
| **Status** | Draft |

---

## 1. Executive Summary

This PRD outlines the strategy and technical requirements for implementing payment processing in iOS applications following the landmark Epic v. Apple court ruling of April 2025. The ruling fundamentally changed the iOS payment landscape, allowing developers to link to external payment processors for digital goods and subscriptions without paying Apple's commission.

This document provides a comprehensive framework for implementing a hybrid payment strategy that maximizes revenue while maintaining excellent user experience and full regulatory compliance.

---

## 2. Background & Context

### 2.1 Regulatory Landscape

On April 30, 2025, U.S. District Judge Yvonne Gonzalez Rogers issued an immediate injunction prohibiting Apple from charging any commission on purchases made outside iOS apps. Apple was found in civil contempt for violating anti-steering provisions, and was required to update App Store guidelines by May 1, 2025.

#### Key Regulatory Changes

- Apps distributed in the U.S. App Store can include links/buttons to external payment systems
- Apple cannot charge commission on purchases made through external payment methods
- Apple cannot discriminate against apps using external payment methods
- Ruling applies only to the United States App Store
- International markets still require Apple's In-App Purchase (IAP) system

### 2.2 Business Opportunity

The fee differential between Apple IAP and external payment processors represents a significant revenue opportunity:

| Payment Method | Fee Structure | $10 Subscription Cost |
|----------------|---------------|----------------------|
| Apple IAP (Standard) | 30% | $3.00 |
| Apple IAP (Small Business) | 15% | $1.50 |
| Apple IAP (Year 2+ Sub) | 15% | $1.50 |
| **Stripe** | **2.9% + $0.30** | **$0.59** |

---

## 3. Problem Statement

Currently, iOS apps selling digital goods must navigate a complex payment landscape with multiple considerations:

1. **High transaction fees:** Apple's 15-30% commission significantly impacts profit margins
2. **Delayed payouts:** Apple's 45-90 day payout cycle affects cash flow
3. **Limited pricing flexibility:** Apple's predefined pricing tiers restrict pricing strategies
4. **Geographic complexity:** Different rules apply to U.S. vs. international users
5. **User experience trade-offs:** External payment flows may reduce conversion rates

---

## 4. Objectives

### 4.1 Primary Objectives

1. Maximize revenue by reducing payment processing fees by up to 90%
2. Maintain seamless user experience across all payment methods
3. Ensure full compliance with Apple's updated App Store guidelines
4. Support both U.S. and international users with appropriate payment options
5. Implement robust subscription management and entitlement syncing

### 4.2 Key Performance Indicators

- **Payment processing cost reduction:** Target 80%+ reduction for U.S. users
- **External payment adoption rate:** Target 40%+ of U.S. users choosing Stripe
- **Conversion rate maintenance:** <5% drop compared to Apple IAP baseline
- **Time to payout:** 2-3 days (Stripe) vs. 45-90 days (Apple)
- **Customer support tickets related to payments:** <2% of transactions

---

## 5. Recommended Strategy: Hybrid Payment Approach

Based on regulatory requirements and business optimization, we recommend implementing a hybrid payment strategy that offers both Apple IAP and Stripe external payments based on user location and preference.

### 5.1 Strategy Overview

| User Location | Primary Option | Secondary Option |
|---------------|----------------|------------------|
| United States | Stripe Checkout (promoted) | Apple IAP (available) |
| International | Apple IAP (required) | N/A |

### 5.2 Payment Flow Architecture

**U.S. Users - Stripe External Payment Flow:**

- User taps "Subscribe" or "Purchase" in paywall
- App displays payment options with required Apple disclosures
- User selects Stripe option → redirected to Stripe Checkout page
- User completes payment on Stripe-hosted checkout
- Webhook triggers entitlement sync → user returns to app with access unlocked

**International Users - Apple IAP Flow:**

- User taps "Subscribe" or "Purchase" in paywall
- Native Apple IAP sheet appears
- User authenticates with Face ID/Touch ID/Password
- Transaction completes → entitlements updated via StoreKit

---

## 6. Functional Requirements

### 6.1 User Location Detection

- Implement App Store storefront detection to determine user's App Store region
- Cache region determination to minimize API calls
- Support manual override for testing purposes

### 6.2 Paywall Implementation

- Display subscription tiers with pricing and features
- For U.S. users: Show both Stripe and Apple IAP options
- For international users: Show Apple IAP only
- Include required Apple disclosures for external payment links (U.S. only)
- Support A/B testing of paywall variants

### 6.3 Apple IAP Integration (StoreKit 2)

- Configure products in App Store Connect
- Implement StoreKit 2 for modern async/await transaction handling
- Handle transaction verification and entitlement delivery
- Implement App Store Server Notifications V2 for webhook events
- Support subscription management (upgrades, downgrades, cancellation)
- Handle restore purchases functionality

### 6.4 Stripe Integration

- Implement Stripe Checkout for web-based payment flow
- Configure Stripe Billing for subscription management
- Implement Stripe webhooks for payment events
- Configure Customer Portal for subscription self-service
- Implement Smart Retries for failed payment recovery
- Support Stripe Tax for automatic tax calculation and remittance

### 6.5 Entitlement Management

- Create unified entitlement system that works across payment providers
- Sync entitlements in real-time upon successful payment
- Support cross-device entitlement access via user authentication
- Handle subscription status changes (renewal, expiration, cancellation)
- Implement grace period handling for failed renewals

### 6.6 Compliance Requirements

**Required Apple Disclosures (U.S. external payments):**

- Clear indication that payment will occur outside the app
- Statement that Apple is not responsible for external transactions
- Information about the merchant processing the payment
- Link to merchant's terms of service and privacy policy

---

## 7. Technical Requirements

### 7.1 Backend Infrastructure

- Database schema for storing user subscriptions and payment history
- Webhook endpoints for both Apple and Stripe events
- API endpoints for entitlement verification
- Receipt validation service for Apple transactions
- Idempotency handling for webhook processing
- Audit logging for all payment events

### 7.2 Mobile App Requirements

- iOS 15.0+ minimum deployment target (StoreKit 2 requirement)
- In-app browser for Stripe Checkout flow
- Deep link handling for return from Stripe Checkout
- Offline entitlement caching with periodic sync
- StoreKit 2 integration for Apple IAP

### 7.3 Security Requirements

- Server-side receipt validation (never trust client-side)
- Stripe webhook signature verification
- Apple Server Notification signature verification
- PCI DSS compliance (handled by Stripe)
- Secure storage of API keys and secrets
- Rate limiting on payment endpoints

### 7.4 Suggested Data Model

| Field | Type | Description |
|-------|------|-------------|
| user_id | UUID | Foreign key to users table |
| payment_provider | ENUM | 'apple' \| 'stripe' |
| provider_subscription_id | STRING | External ID from provider |
| product_id | STRING | Internal product identifier |
| status | ENUM | 'active' \| 'canceled' \| 'expired' \| 'grace_period' |
| current_period_start | TIMESTAMP | Start of current billing period |
| current_period_end | TIMESTAMP | End of current billing period |
| cancel_at_period_end | BOOLEAN | Whether to cancel at end |

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Lower conversion on external payment | Medium - potential revenue impact | A/B test, optimize UX, offer both options |
| Apple policy changes | High - could invalidate strategy | Monitor guidelines, maintain IAP fallback |
| Tax compliance complexity | Medium - operational overhead | Use Stripe Tax or Managed Payments |
| Entitlement sync failures | High - poor user experience | Robust retry logic, manual restore option |
| Support complexity | Low - increased tickets | Clear FAQs, unified support dashboard |

---

## 9. Implementation Timeline

### Phase 1: Foundation (Weeks 1-2)

1. Set up Stripe account and configure products/prices
2. Design and implement database schema for subscriptions
3. Implement Stripe webhook endpoints
4. Configure App Store Connect products (if not already done)

### Phase 2: Backend Integration (Weeks 3-4)

1. Implement unified entitlement service
2. Build Stripe Checkout session creation endpoint
3. Implement Apple Server Notifications V2 handler
4. Create entitlement verification API
5. Set up Stripe Customer Portal

### Phase 3: Mobile Implementation (Weeks 5-6)

1. Implement user location detection
2. Build paywall UI with dual payment options
3. Implement StoreKit 2 integration
4. Build Stripe Checkout web view flow
5. Implement deep link handling for checkout return
6. Add required Apple disclosures

### Phase 4: Testing & Launch (Weeks 7-8)

1. End-to-end testing of both payment flows
2. Sandbox testing with Apple and Stripe test modes
3. App Store review submission
4. Staged rollout (10% → 50% → 100%)
5. A/B testing framework implementation
6. Analytics and monitoring setup

---

## 10. Success Criteria

The implementation will be considered successful when:

1. Both Apple IAP and Stripe payment flows are fully functional
2. Entitlements sync correctly across all payment methods and devices
3. Payment processing fees reduced by 80%+ for Stripe transactions
4. Overall conversion rate within 5% of Apple IAP baseline
5. Payment-related support tickets remain below 2% of transactions
6. App Store review approval obtained without payment-related rejections

---

## 11. Appendix

### 11.1 Reference Documentation

- Stripe iOS Documentation: https://docs.stripe.com/mobile/digital-goods
- Apple StoreKit 2: https://developer.apple.com/storekit/
- App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Stripe Billing: https://stripe.com/billing
- Stripe Managed Payments: https://stripe.com/blog/building-for-the-next-wave-of-app-monetization

### 11.2 Third-Party Solutions to Consider

- **RevenueCat** - Cross-platform subscription management with Stripe integration
- **Adapty** - Alternative subscription management platform
- **Qonversion** - Analytics-focused subscription platform

### 11.3 Glossary

- **IAP:** In-App Purchase - Apple's native payment system
- **StoreKit:** Apple's framework for handling in-app purchases
- **Entitlement:** User's access rights to premium features based on purchase
- **Webhook:** HTTP callback triggered by payment events
- **MoR:** Merchant of Record - entity responsible for payment processing and tax compliance

---

## 12. Implementation Notes

### 12.1 Files Created/Modified

**Database Migrations:**
- `supabase/migrations/20241230_apple_iap_support.sql` - Apple IAP schema

**Supabase Edge Functions:**
- `supabase/functions/apple-webhook/index.ts` - Apple App Store Server Notifications handler
- `supabase/functions/validate-apple-receipt/index.ts` - Receipt validation endpoint

**Mobile Services:**
- `lib/appleIapService.ts` - Apple IAP operations using StoreKit 2
- `lib/storefrontService.ts` - User location detection for payment options
- `lib/subscriptionService.ts` - Updated with hybrid payment support

**Components:**
- `components/PaywallModal.tsx` - Unified paywall with dual payment options

**Hooks:**
- `hooks/useSubscription.ts` - Updated with hybrid payment methods

**Types:**
- `lib/types.ts` - Apple IAP types and interfaces

### 12.2 Required Environment Variables

**Mobile App (.env):**
```bash
# Stripe Configuration
EXPO_PUBLIC_STRIPE_PRICE_MONTHLY=price_xxx
EXPO_PUBLIC_STRIPE_PRICE_ANNUAL=price_xxx
EXPO_PUBLIC_STRIPE_PRICE_TOKENS_50=price_xxx
EXPO_PUBLIC_STRIPE_PRICE_TOKENS_150=price_xxx
EXPO_PUBLIC_STRIPE_PRICE_TOKENS_400=price_xxx

# Apple IAP Configuration (optional, for shared secret validation)
EXPO_PUBLIC_APPLE_SHARED_SECRET=your_shared_secret
```

**Supabase Edge Functions:**
```bash
# Stripe
STRIPE_SECRET_KEY=sk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_MONTHLY=price_xxx
STRIPE_PRICE_ANNUAL=price_xxx

# Apple (for Server-to-Server notifications)
APPLE_TEAM_ID=your_team_id
APPLE_KEY_ID=your_key_id
APPLE_BUNDLE_ID=com.turtlecreekllc.dinnerplans
APPLE_PRIVATE_KEY=your_private_key_contents
```

### 12.3 App Store Connect Configuration

1. **Create Products in App Store Connect:**
   - `com.turtlecreekllc.dinnerplans.premium.monthly` - Auto-renewable subscription
   - `com.turtlecreekllc.dinnerplans.premium.annual` - Auto-renewable subscription
   - `com.turtlecreekllc.dinnerplans.tokens.50` - Consumable
   - `com.turtlecreekllc.dinnerplans.tokens.150` - Consumable
   - `com.turtlecreekllc.dinnerplans.tokens.400` - Consumable

2. **Configure Server Notifications:**
   - URL: `https://your-project.supabase.co/functions/v1/apple-webhook`
   - Version: V2 (recommended)

3. **Create Subscription Group:**
   - ID: `com.turtlecreekllc.dinnerplans.subscriptions`
   - Products: Monthly and Annual subscriptions

### 12.4 Deep Link Routes

The app handles these deep links for payment callbacks:
- `dinnerplans://subscription/success` - Stripe subscription success
- `dinnerplans://subscription/cancel` - Stripe subscription cancelled
- `dinnerplans://tokens/success` - Stripe token purchase success
- `dinnerplans://tokens/cancel` - Stripe token purchase cancelled
- `dinnerplans://settings/subscription` - Return from Stripe Customer Portal
