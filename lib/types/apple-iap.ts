import type { SubscriptionTier, Subscription } from './subscription';

export const PAYMENT_PROVIDERS = ['stripe', 'apple'] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export const APPLE_TRANSACTION_STATUSES = [
  'purchased',
  'renewed',
  'expired',
  'revoked',
  'grace_period',
  'billing_retry',
] as const;
export type AppleTransactionStatus = (typeof APPLE_TRANSACTION_STATUSES)[number];

/**
 * Apple App Store Server Notification types (V2)
 */
export const APPLE_NOTIFICATION_TYPES = [
  'SUBSCRIBED',
  'DID_RENEW',
  'DID_FAIL_TO_RENEW',
  'DID_CHANGE_RENEWAL_STATUS',
  'DID_CHANGE_RENEWAL_PREF',
  'OFFER_REDEEMED',
  'EXPIRED',
  'GRACE_PERIOD_EXPIRED',
  'REFUND',
  'REVOKE',
  'CONSUMPTION_REQUEST',
  'RENEWAL_EXTENDED',
  'RENEWAL_EXTENSION',
  'PRICE_INCREASE',
  'REFUND_DECLINED',
  'REFUND_REVERSED',
  'EXTERNAL_PURCHASE_TOKEN',
  'ONE_TIME_CHARGE',
  'TEST',
] as const;
export type AppleNotificationType = (typeof APPLE_NOTIFICATION_TYPES)[number];

/**
 * Apple notification subtypes
 */
export const APPLE_NOTIFICATION_SUBTYPES = [
  'INITIAL_BUY',
  'RESUBSCRIBE',
  'DOWNGRADE',
  'UPGRADE',
  'AUTO_RENEW_ENABLED',
  'AUTO_RENEW_DISABLED',
  'VOLUNTARY',
  'BILLING_RETRY',
  'PRICE_INCREASE',
  'GRACE_PERIOD',
  'PENDING',
  'ACCEPTED',
  'BILLING_RECOVERY',
  'PRODUCT_NOT_FOR_SALE',
  'RENEWAL',
  'SUMMARY',
  'FAILURE',
  'UNREPORTED',
] as const;
export type AppleNotificationSubtype = (typeof APPLE_NOTIFICATION_SUBTYPES)[number];

/**
 * Extended Subscription with Apple IAP fields
 */
export interface SubscriptionWithApple extends Subscription {
  payment_provider: PaymentProvider;
  apple_original_transaction_id: string | null;
  apple_transaction_id: string | null;
  apple_product_id: string | null;
  apple_environment: 'Production' | 'Sandbox' | null;
  apple_purchase_date: string | null;
  apple_expires_date: string | null;
  apple_auto_renew_status: boolean;
  apple_is_in_billing_retry: boolean;
  apple_grace_period_expires: string | null;
  storefront: string | null;
  storefront_id: string | null;
}

/**
 * Apple Server Notification record
 */
export interface AppleServerNotification {
  id: string;
  user_id: string | null;
  notification_type: AppleNotificationType;
  subtype: AppleNotificationSubtype | null;
  notification_uuid: string;
  signed_date: string;
  original_transaction_id: string | null;
  transaction_id: string | null;
  product_id: string | null;
  environment: 'Production' | 'Sandbox';
  bundle_id: string | null;
  app_apple_id: number | null;
  raw_payload: Record<string, unknown>;
  processed: boolean;
  error_message: string | null;
  created_at: string;
}

/**
 * Apple receipt validation record
 */
export interface AppleReceiptValidation {
  id: string;
  user_id: string;
  original_transaction_id: string;
  transaction_id: string;
  product_id: string;
  purchase_date: string;
  expires_date: string | null;
  is_trial_period: boolean;
  is_in_intro_offer_period: boolean;
  is_upgraded: boolean;
  environment: 'Production' | 'Sandbox';
  validation_status: 'valid' | 'invalid' | 'expired';
  raw_receipt: Record<string, unknown> | null;
  validated_at: string;
  created_at: string;
}

/**
 * User storefront information
 */
export interface UserStorefront {
  id: string;
  user_id: string;
  storefront: string;
  storefront_id: string | null;
  detected_at: string;
  source: 'storekit' | 'ip' | 'manual';
  updated_at: string;
}

/**
 * Apple product configuration
 */
export interface AppleProduct {
  id: string;
  product_id: string;
  name: string;
  description: string | null;
  product_type: 'subscription' | 'non_consumable' | 'consumable';
  subscription_group_id: string | null;
  subscription_group_level: number | null;
  tier: SubscriptionTier | null;
  tokens_granted: number;
  price_cents: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * StoreKit 2 Product from react-native-iap
 */
export interface StoreKitProduct {
  productId: string;
  title: string;
  description: string;
  price: string;
  localizedPrice: string;
  currency: string;
  type: 'subs' | 'inapp';
  subscriptionPeriod?: {
    numberOfUnits: number;
    unit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
  };
}

/**
 * StoreKit 2 Purchase/Transaction
 */
export interface StoreKitPurchase {
  productId: string;
  transactionId: string;
  originalTransactionId: string;
  purchaseDate: number;
  expiresDate?: number;
  isUpgraded?: boolean;
  environment: 'Production' | 'Sandbox';
  appAccountToken?: string;
  transactionReceipt?: string;
}

/**
 * Payment option displayed in paywall
 */
export interface PaymentOption {
  provider: PaymentProvider;
  label: string;
  description: string;
  recommended?: boolean;
  processingFee?: string;
  disclosure?: string;
}

/**
 * Paywall configuration based on user location
 */
export interface PaywallConfig {
  showStripeOption: boolean;
  showAppleOption: boolean;
  recommendedProvider: PaymentProvider;
  stripeDisclosure: string | null;
  appleDisclosure: string | null;
  storefront: string | null;
  isUSUser: boolean;
}

/**
 * Apple IAP configuration
 * Product IDs must match those configured in App Store Connect
 */
export const APPLE_IAP_CONFIG = {
  bundleId: 'com.turtlecreekllc.dinnerplans',
  sharedSecret: process.env.EXPO_PUBLIC_APPLE_SHARED_SECRET || '',
  products: {
    // Individual tier (legacy names for backwards compatibility)
    premium_monthly: 'com.turtlecreekllc.dinnerplans.individual.monthly',
    premium_annual: 'com.turtlecreekllc.dinnerplans.individual.annual',
    // Individual tier (new naming)
    individual_monthly: 'com.turtlecreekllc.dinnerplans.individual.monthly',
    individual_annual: 'com.turtlecreekllc.dinnerplans.individual.annual',
    // Family tier
    family_monthly: 'com.turtlecreekllc.dinnerplans.family.monthly',
    family_annual: 'com.turtlecreekllc.dinnerplans.family.annual',
    // Token buckets
    tokens_50: 'com.turtlecreekllc.dinnerplans.tokens.50',
    tokens_150: 'com.turtlecreekllc.dinnerplans.tokens.150',
    tokens_400: 'com.turtlecreekllc.dinnerplans.tokens.400',
  },
  subscriptionGroupId: 'com.turtlecreekllc.dinnerplans.subscriptions',
} as const;

/**
 * Apple disclosure text (required for external payment links)
 */
export const APPLE_DISCLOSURE_TEXT = {
  externalPayment: `You will be directed to an external website to complete your purchase. Apple is not responsible for the privacy or security of transactions that take place outside of the App Store. DinnerPlans.ai is the merchant of record for this transaction.`,
  termsLink: 'https://dinnerplans.ai/terms',
  privacyLink: 'https://dinnerplans.ai/privacy',
} as const;

/**
 * US storefronts that allow external payment options
 */
export const US_STOREFRONTS = ['USA', 'US', 'usa', 'us'] as const;

/**
 * Purchase result from either provider
 */
export interface PurchaseResult {
  success: boolean;
  provider: PaymentProvider;
  transactionId?: string;
  productId?: string;
  error?: string;
  requiresVerification?: boolean;
}

/**
 * Unified entitlement check result
 */
export interface EntitlementResult {
  hasAccess: boolean;
  provider: PaymentProvider | null;
  tier: SubscriptionTier;
  expiresAt: string | null;
  isGracePeriod: boolean;
  isTrial: boolean;
}
