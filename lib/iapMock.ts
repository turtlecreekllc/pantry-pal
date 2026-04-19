/**
 * IAP Mock Service
 * Provides mock implementations for react-native-iap when running in environments
 * that don't support native modules (Expo Go, web, simulator without dev build)
 * 
 * This allows UI development and testing without needing a development build
 */

import {
  APPLE_IAP_CONFIG,
  StoreKitProduct,
  PurchaseResult,
} from './types';

/** Mock subscription products matching real App Store products */
const MOCK_SUBSCRIPTIONS: StoreKitProduct[] = [
  {
    productId: APPLE_IAP_CONFIG.products.premium_monthly,
    title: 'Premium Monthly',
    description: 'Monthly premium subscription with unlimited AI features',
    price: '6.99',
    localizedPrice: '$6.99',
    currency: 'USD',
    type: 'subs',
    subscriptionPeriod: {
      numberOfUnits: 1,
      unit: 'MONTH',
    },
  },
  {
    productId: APPLE_IAP_CONFIG.products.premium_annual,
    title: 'Premium Annual',
    description: 'Annual premium subscription - Save 17%',
    price: '69.00',
    localizedPrice: '$69.00',
    currency: 'USD',
    type: 'subs',
    subscriptionPeriod: {
      numberOfUnits: 1,
      unit: 'YEAR',
    },
  },
];

/** Mock consumable products */
const MOCK_CONSUMABLES: StoreKitProduct[] = [
  {
    productId: APPLE_IAP_CONFIG.products.tokens_50,
    title: '50 AI Tokens',
    description: 'Token pack for AI features',
    price: '1.99',
    localizedPrice: '$1.99',
    currency: 'USD',
    type: 'inapp',
  },
  {
    productId: APPLE_IAP_CONFIG.products.tokens_150,
    title: '150 AI Tokens',
    description: 'Token pack for AI features - Best Value',
    price: '4.99',
    localizedPrice: '$4.99',
    currency: 'USD',
    type: 'inapp',
  },
  {
    productId: APPLE_IAP_CONFIG.products.tokens_400,
    title: '400 AI Tokens',
    description: 'Token pack for AI features - Best Deal',
    price: '9.99',
    localizedPrice: '$9.99',
    currency: 'USD',
    type: 'inapp',
  },
];

/** Simulated network delay for realistic UX testing */
const MOCK_DELAY_MS = 500;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Mock: Initialize IAP connection
 */
export async function initializeIAP(): Promise<boolean> {
  console.log('[MockIAP] Initializing mock IAP connection...');
  await delay(MOCK_DELAY_MS);
  console.log('[MockIAP] Mock connection initialized');
  return true;
}

/**
 * Mock: Terminate IAP connection
 */
export async function terminateIAP(): Promise<void> {
  console.log('[MockIAP] Mock connection terminated');
}

/**
 * Mock: Fetch subscription products
 */
export async function fetchSubscriptionProducts(): Promise<StoreKitProduct[]> {
  console.log('[MockIAP] Fetching mock subscription products...');
  await delay(MOCK_DELAY_MS);
  return MOCK_SUBSCRIPTIONS;
}

/**
 * Mock: Fetch consumable products
 */
export async function fetchConsumableProducts(): Promise<StoreKitProduct[]> {
  console.log('[MockIAP] Fetching mock consumable products...');
  await delay(MOCK_DELAY_MS);
  return MOCK_CONSUMABLES;
}

/**
 * Mock: Fetch all products
 */
export async function fetchAllProducts(): Promise<{
  subscriptions: StoreKitProduct[];
  consumables: StoreKitProduct[];
}> {
  const [subscriptions, consumables] = await Promise.all([
    fetchSubscriptionProducts(),
    fetchConsumableProducts(),
  ]);
  return { subscriptions, consumables };
}

/**
 * Mock: Purchase subscription
 * Always returns success for UI testing
 */
export async function purchaseSubscription(
  productId: string,
  userId: string
): Promise<PurchaseResult> {
  console.log('[MockIAP] Mock purchase subscription:', productId, 'for user:', userId);
  await delay(MOCK_DELAY_MS * 2);
  console.log('[MockIAP] ⚠️ MOCK PURCHASE - This is simulated, not a real transaction');
  return {
    success: true,
    provider: 'apple',
    transactionId: `mock-transaction-${Date.now()}`,
    productId,
  };
}

/**
 * Mock: Purchase consumable
 */
export async function purchaseConsumable(
  productId: string,
  userId: string
): Promise<PurchaseResult> {
  console.log('[MockIAP] Mock purchase consumable:', productId, 'for user:', userId);
  await delay(MOCK_DELAY_MS * 2);
  console.log('[MockIAP] ⚠️ MOCK PURCHASE - This is simulated, not a real transaction');
  return {
    success: true,
    provider: 'apple',
    transactionId: `mock-transaction-${Date.now()}`,
    productId,
  };
}

/**
 * Mock: Restore purchases
 */
export async function restorePurchases(userId: string): Promise<PurchaseResult> {
  console.log('[MockIAP] Mock restore purchases for user:', userId);
  await delay(MOCK_DELAY_MS);
  return {
    success: false,
    provider: 'apple',
    error: 'No purchases to restore (mock environment)',
  };
}

/**
 * Mock: Get current subscription
 */
export async function getCurrentSubscription(): Promise<null> {
  console.log('[MockIAP] Mock get current subscription - returning null');
  return null;
}

/**
 * Mock: Get storefront
 */
export async function getStorefront(): Promise<{ storefront: string; storefrontId: string }> {
  return {
    storefront: 'USA',
    storefrontId: 'mock-storefront-usa',
  };
}

/**
 * Mock: Check intro eligibility
 */
export async function checkIntroEligibility(productId: string): Promise<boolean> {
  console.log('[MockIAP] Mock check intro eligibility for:', productId);
  return true;
}

/**
 * Mock: Setup purchase listeners
 */
export function setupPurchaseListeners(
  onPurchaseUpdate: (purchase: unknown) => void,
  onPurchaseError: (error: unknown) => void
): () => void {
  console.log('[MockIAP] Mock purchase listeners setup (no-op)');
  return () => {
    console.log('[MockIAP] Mock purchase listeners removed');
  };
}

/**
 * Mock: Get cached subscriptions
 */
export function getCachedSubscriptions(): StoreKitProduct[] {
  return MOCK_SUBSCRIPTIONS;
}

/**
 * Mock: Get cached consumables
 */
export function getCachedConsumables(): StoreKitProduct[] {
  return MOCK_CONSUMABLES;
}

/**
 * Mock: Check if IAP is available
 * Returns true so UI flows work, but purchases are mocked
 */
export function isIAPAvailable(): boolean {
  return true;
}


