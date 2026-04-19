/**
 * IAP Service - Unified Export
 * 
 * Automatically selects the real Apple IAP service or mock implementation
 * based on the runtime environment.
 * 
 * - Development builds on iOS: Uses real react-native-iap
 * - Expo Go / Web / Simulator without dev build: Uses mock implementation
 * 
 * This allows seamless UI development in Expo Go while supporting
 * full IAP functionality in development builds.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Detect if we're running in an environment that supports native modules
 * 
 * Native modules are available when:
 * - Running on iOS in a development build (not Expo Go)
 * - Running on iOS in a production build
 */
function isNativeIAPAvailable(): boolean {
  // Not iOS - no Apple IAP
  if (Platform.OS !== 'ios') {
    return false;
  }
  // Check if we're in Expo Go (native modules not available)
  const isExpoGo = Constants.appOwnership === 'expo';
  if (isExpoGo) {
    console.log('[IAPService] Running in Expo Go - using mock IAP');
    return false;
  }
  // Check if we have a proper app bundle (development build or production)
  const executionEnvironment = Constants.executionEnvironment;
  if (executionEnvironment === 'storeClient') {
    console.log('[IAPService] Running in Expo Go client - using mock IAP');
    return false;
  }
  // We're in a standalone app or development build
  console.log('[IAPService] Running in development/production build - using real IAP');
  return true;
}

/** Flag indicating if we're using real IAP */
export const IS_USING_REAL_IAP = isNativeIAPAvailable();

// Conditional exports based on environment
// We use dynamic requires to avoid loading native modules in Expo Go

let iapModule: typeof import('./appleIapService') | typeof import('./iapMock');

if (IS_USING_REAL_IAP) {
  try {
    // Try to load the real IAP service
    iapModule = require('./appleIapService');
  } catch (error) {
    console.warn('[IAPService] Failed to load native IAP module, falling back to mock:', error);
    iapModule = require('./iapMock');
  }
} else {
  iapModule = require('./iapMock');
}

// Re-export all functions from the selected module
export const initializeIAP = iapModule.initializeIAP;
export const terminateIAP = iapModule.terminateIAP;
export const fetchSubscriptionProducts = iapModule.fetchSubscriptionProducts;
export const fetchConsumableProducts = iapModule.fetchConsumableProducts;
export const fetchAllProducts = iapModule.fetchAllProducts;
export const purchaseSubscription = iapModule.purchaseSubscription;
export const purchaseConsumable = iapModule.purchaseConsumable;
export const restorePurchases = iapModule.restorePurchases;
export const getCurrentSubscription = iapModule.getCurrentSubscription;
export const getStorefront = iapModule.getStorefront;
export const checkIntroEligibility = iapModule.checkIntroEligibility;
export const setupPurchaseListeners = iapModule.setupPurchaseListeners;
export const getCachedSubscriptions = iapModule.getCachedSubscriptions;
export const getCachedConsumables = iapModule.getCachedConsumables;
export const isIAPAvailable = iapModule.isIAPAvailable;


