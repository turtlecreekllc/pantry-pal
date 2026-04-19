/**
 * Apple IAP Service
 * Handles Apple In-App Purchase operations using StoreKit 2
 * 
 * This service manages:
 * - Product fetching from App Store
 * - Purchase flow initiation
 * - Transaction verification
 * - Subscription status checks
 * - Storefront detection
 */

import { Platform } from 'react-native';
import {
  initConnection,
  endConnection,
  getProducts,
  getSubscriptions,
  requestPurchase,
  requestSubscription,
  finishTransaction,
  getPurchaseHistory,
  getAvailablePurchases,
  flushFailedPurchasesCachedAsPendingAndroid,
  purchaseUpdatedListener,
  purchaseErrorListener,
  type Product,
  type Subscription,
  type Purchase,
  type SubscriptionPurchase,
  type PurchaseError,
} from 'react-native-iap';
import { supabase } from './supabase';
import {
  APPLE_IAP_CONFIG,
  PaymentProvider,
  PurchaseResult,
  StoreKitProduct,
  StoreKitPurchase,
} from './types';

/** Product IDs from App Store Connect */
const PRODUCT_IDS = {
  subscriptions: [
    APPLE_IAP_CONFIG.products.premium_monthly,
    APPLE_IAP_CONFIG.products.premium_annual,
  ],
  consumables: [
    APPLE_IAP_CONFIG.products.tokens_50,
    APPLE_IAP_CONFIG.products.tokens_150,
    APPLE_IAP_CONFIG.products.tokens_400,
  ],
};

/** Cached products */
let cachedSubscriptions: Subscription[] = [];
let cachedConsumables: Product[] = [];
let isInitialized = false;

/** Purchase update listeners */
let purchaseUpdateSubscription: { remove: () => void } | null = null;
let purchaseErrorSubscription: { remove: () => void } | null = null;

/**
 * Initialize the IAP connection
 * Must be called before any other IAP operations
 */
export async function initializeIAP(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    console.log('[AppleIAP] Not on iOS, skipping initialization');
    return false;
  }
  if (isInitialized) {
    console.log('[AppleIAP] Already initialized');
    return true;
  }
  try {
    console.log('[AppleIAP] Initializing connection...');
    const result = await initConnection();
    console.log('[AppleIAP] Connection initialized:', result);
    isInitialized = true;
    return true;
  } catch (error) {
    console.error('[AppleIAP] Failed to initialize:', error);
    return false;
  }
}

/**
 * End the IAP connection
 * Call this when the app is closing or IAP is no longer needed
 */
export async function terminateIAP(): Promise<void> {
  if (!isInitialized) return;
  try {
    // Remove listeners
    if (purchaseUpdateSubscription) {
      purchaseUpdateSubscription.remove();
      purchaseUpdateSubscription = null;
    }
    if (purchaseErrorSubscription) {
      purchaseErrorSubscription.remove();
      purchaseErrorSubscription = null;
    }
    await endConnection();
    isInitialized = false;
    console.log('[AppleIAP] Connection terminated');
  } catch (error) {
    console.error('[AppleIAP] Error terminating connection:', error);
  }
}

/**
 * Fetch available subscription products from App Store
 */
export async function fetchSubscriptionProducts(): Promise<StoreKitProduct[]> {
  if (Platform.OS !== 'ios') return [];
  try {
    await initializeIAP();
    console.log('[AppleIAP] Fetching subscriptions:', PRODUCT_IDS.subscriptions);
    const subscriptions = await getSubscriptions({ skus: PRODUCT_IDS.subscriptions });
    cachedSubscriptions = subscriptions;
    console.log('[AppleIAP] Found subscriptions:', subscriptions.length);
    return subscriptions.map(mapSubscriptionToStoreKitProduct);
  } catch (error) {
    console.error('[AppleIAP] Error fetching subscriptions:', error);
    return [];
  }
}

/**
 * Fetch available consumable products (token packs) from App Store
 */
export async function fetchConsumableProducts(): Promise<StoreKitProduct[]> {
  if (Platform.OS !== 'ios') return [];
  try {
    await initializeIAP();
    console.log('[AppleIAP] Fetching consumables:', PRODUCT_IDS.consumables);
    const products = await getProducts({ skus: PRODUCT_IDS.consumables });
    cachedConsumables = products;
    console.log('[AppleIAP] Found consumables:', products.length);
    return products.map(mapProductToStoreKitProduct);
  } catch (error) {
    console.error('[AppleIAP] Error fetching consumables:', error);
    return [];
  }
}

/**
 * Fetch all products (subscriptions + consumables)
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
 * Purchase a subscription
 */
export async function purchaseSubscription(
  productId: string,
  userId: string
): Promise<PurchaseResult> {
  if (Platform.OS !== 'ios') {
    return { success: false, provider: 'apple', error: 'Apple IAP only available on iOS' };
  }
  try {
    await initializeIAP();
    console.log('[AppleIAP] Purchasing subscription:', productId);
    // Use appAccountToken to associate purchase with user
    const purchase = await requestSubscription({
      sku: productId,
      andDangerouslyFinishTransactionAutomaticallyIOS: false,
      appAccountToken: userId, // This links the purchase to our user
    });
    if (!purchase) {
      return { success: false, provider: 'apple', error: 'No purchase returned' };
    }
    // Verify and process the purchase
    const result = await processPurchase(purchase as SubscriptionPurchase, userId);
    return result;
  } catch (error) {
    console.error('[AppleIAP] Purchase error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // Check for user cancellation
    if (errorMessage.includes('cancelled') || errorMessage.includes('canceled')) {
      return { success: false, provider: 'apple', error: 'Purchase cancelled by user' };
    }
    return { success: false, provider: 'apple', error: errorMessage };
  }
}

/**
 * Purchase a consumable (token pack)
 */
export async function purchaseConsumable(
  productId: string,
  userId: string
): Promise<PurchaseResult> {
  if (Platform.OS !== 'ios') {
    return { success: false, provider: 'apple', error: 'Apple IAP only available on iOS' };
  }
  try {
    await initializeIAP();
    console.log('[AppleIAP] Purchasing consumable:', productId);
    const purchase = await requestPurchase({
      sku: productId,
      andDangerouslyFinishTransactionAutomaticallyIOS: false,
    });
    if (!purchase) {
      return { success: false, provider: 'apple', error: 'No purchase returned' };
    }
    // Verify and process the purchase
    const result = await processPurchase(purchase as Purchase, userId, true);
    return result;
  } catch (error) {
    console.error('[AppleIAP] Consumable purchase error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, provider: 'apple', error: errorMessage };
  }
}

/**
 * Process and verify a purchase with the backend
 */
async function processPurchase(
  purchase: Purchase | SubscriptionPurchase,
  userId: string,
  isConsumable: boolean = false
): Promise<PurchaseResult> {
  try {
    console.log('[AppleIAP] Processing purchase:', purchase.productId);
    // Get storefront info
    const storefront = await getStorefront();
    // Validate with our backend
    const { data, error } = await supabase.functions.invoke('validate-apple-receipt', {
      body: {
        userId,
        transactionId: purchase.transactionId,
        originalTransactionId: (purchase as SubscriptionPurchase).originalTransactionIdIOS 
          || purchase.transactionId,
        productId: purchase.productId,
        purchaseDate: purchase.transactionDate,
        expiresDate: (purchase as SubscriptionPurchase).expirationDateAndroid, // iOS uses different property
        environment: __DEV__ ? 'Sandbox' : 'Production',
        storefront: storefront?.storefront,
        storefrontId: storefront?.storefrontId,
      },
    });
    if (error) {
      console.error('[AppleIAP] Validation error:', error);
      throw new Error(error.message);
    }
    // Finish the transaction after successful validation
    await finishTransaction({
      purchase,
      isConsumable,
    });
    console.log('[AppleIAP] Transaction finished successfully');
    return {
      success: true,
      provider: 'apple',
      transactionId: purchase.transactionId,
      productId: purchase.productId,
    };
  } catch (error) {
    console.error('[AppleIAP] Process purchase error:', error);
    return {
      success: false,
      provider: 'apple',
      error: error instanceof Error ? error.message : 'Failed to process purchase',
      requiresVerification: true, // Transaction may still be pending
    };
  }
}

/**
 * Restore previous purchases
 * Used when user reinstalls app or switches devices
 */
export async function restorePurchases(userId: string): Promise<PurchaseResult> {
  if (Platform.OS !== 'ios') {
    return { success: false, provider: 'apple', error: 'Apple IAP only available on iOS' };
  }
  try {
    await initializeIAP();
    console.log('[AppleIAP] Restoring purchases...');
    const purchases = await getAvailablePurchases();
    console.log('[AppleIAP] Found purchases to restore:', purchases.length);
    if (purchases.length === 0) {
      return { success: false, provider: 'apple', error: 'No purchases to restore' };
    }
    // Process each purchase
    for (const purchase of purchases) {
      // Only process subscriptions (not consumables)
      if (PRODUCT_IDS.subscriptions.includes(purchase.productId)) {
        await processPurchase(purchase as SubscriptionPurchase, userId);
      }
    }
    return { success: true, provider: 'apple' };
  } catch (error) {
    console.error('[AppleIAP] Restore error:', error);
    return {
      success: false,
      provider: 'apple',
      error: error instanceof Error ? error.message : 'Failed to restore purchases',
    };
  }
}

/**
 * Get current subscription status from App Store
 */
export async function getCurrentSubscription(): Promise<SubscriptionPurchase | null> {
  if (Platform.OS !== 'ios') return null;
  try {
    await initializeIAP();
    const purchases = await getAvailablePurchases();
    // Find active subscription
    const subscription = purchases.find(p => 
      PRODUCT_IDS.subscriptions.includes(p.productId)
    ) as SubscriptionPurchase | undefined;
    return subscription || null;
  } catch (error) {
    console.error('[AppleIAP] Error getting current subscription:', error);
    return null;
  }
}

/**
 * Get the user's App Store storefront (country/region)
 */
export async function getStorefront(): Promise<{
  storefront: string;
  storefrontId: string;
} | null> {
  if (Platform.OS !== 'ios') return null;
  try {
    // react-native-iap doesn't expose storefront directly
    // We need to use a native module or derive from purchase info
    // For now, return null and let the app determine from other sources
    return null;
  } catch (error) {
    console.error('[AppleIAP] Error getting storefront:', error);
    return null;
  }
}

/**
 * Check if user is eligible for introductory offer
 */
export async function checkIntroEligibility(
  productId: string
): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    // This would require additional native code to check
    // For now, return true as default
    return true;
  } catch (error) {
    console.error('[AppleIAP] Error checking intro eligibility:', error);
    return true;
  }
}

/**
 * Set up purchase listeners for handling transactions
 * Returns cleanup function
 */
export function setupPurchaseListeners(
  onPurchaseUpdate: (purchase: Purchase) => void,
  onPurchaseError: (error: PurchaseError) => void
): () => void {
  // Remove existing listeners
  if (purchaseUpdateSubscription) {
    purchaseUpdateSubscription.remove();
  }
  if (purchaseErrorSubscription) {
    purchaseErrorSubscription.remove();
  }
  // Set up new listeners
  purchaseUpdateSubscription = purchaseUpdatedListener(onPurchaseUpdate);
  purchaseErrorSubscription = purchaseErrorListener(onPurchaseError);
  // Return cleanup function
  return () => {
    if (purchaseUpdateSubscription) {
      purchaseUpdateSubscription.remove();
      purchaseUpdateSubscription = null;
    }
    if (purchaseErrorSubscription) {
      purchaseErrorSubscription.remove();
      purchaseErrorSubscription = null;
    }
  };
}

/**
 * Map react-native-iap Subscription to our StoreKitProduct type
 */
function mapSubscriptionToStoreKitProduct(sub: Subscription): StoreKitProduct {
  return {
    productId: sub.productId,
    title: sub.title,
    description: sub.description,
    price: sub.price,
    localizedPrice: sub.localizedPrice,
    currency: sub.currency,
    type: 'subs',
    subscriptionPeriod: sub.subscriptionPeriodUnitIOS ? {
      numberOfUnits: sub.subscriptionPeriodNumberIOS || 1,
      unit: mapPeriodUnit(sub.subscriptionPeriodUnitIOS),
    } : undefined,
  };
}

/**
 * Map react-native-iap Product to our StoreKitProduct type
 */
function mapProductToStoreKitProduct(product: Product): StoreKitProduct {
  return {
    productId: product.productId,
    title: product.title,
    description: product.description,
    price: product.price,
    localizedPrice: product.localizedPrice,
    currency: product.currency,
    type: 'inapp',
  };
}

/**
 * Map iOS period unit to our format
 */
function mapPeriodUnit(unit: string): 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' {
  switch (unit.toUpperCase()) {
    case 'DAY':
      return 'DAY';
    case 'WEEK':
      return 'WEEK';
    case 'MONTH':
      return 'MONTH';
    case 'YEAR':
      return 'YEAR';
    default:
      return 'MONTH';
  }
}

/**
 * Get cached subscription products
 */
export function getCachedSubscriptions(): StoreKitProduct[] {
  return cachedSubscriptions.map(mapSubscriptionToStoreKitProduct);
}

/**
 * Get cached consumable products
 */
export function getCachedConsumables(): StoreKitProduct[] {
  return cachedConsumables.map(mapProductToStoreKitProduct);
}

/**
 * Check if IAP is available on this device
 */
export function isIAPAvailable(): boolean {
  return Platform.OS === 'ios';
}

