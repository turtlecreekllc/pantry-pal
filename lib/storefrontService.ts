/**
 * Storefront Detection Service
 * Determines user's App Store region to show appropriate payment options
 * 
 * Per the Epic v. Apple ruling:
 * - US users can be offered external payment options (Stripe)
 * - International users must use Apple IAP
 * 
 * This service detects the user's storefront via:
 * 1. StoreKit (preferred - most accurate)
 * 2. Cached storefront from database
 * 3. IP-based geolocation (fallback)
 */

import { Platform, NativeModules } from 'react-native';
import { supabase } from './supabase';
import {
  US_STOREFRONTS,
  PaywallConfig,
  PaymentProvider,
  UserStorefront,
  APPLE_DISCLOSURE_TEXT,
} from './types';

/** Cached storefront info */
let cachedStorefront: UserStorefront | null = null;
let storefrontPromise: Promise<UserStorefront | null> | null = null;

/**
 * Detect the user's App Store storefront
 * Returns the ISO 3166-1 alpha-3 country code (e.g., 'USA', 'GBR')
 */
export async function detectStorefront(userId: string): Promise<UserStorefront | null> {
  // Return cached value if available
  if (cachedStorefront) {
    return cachedStorefront;
  }
  // Prevent multiple concurrent requests
  if (storefrontPromise) {
    return storefrontPromise;
  }
  storefrontPromise = detectStorefrontInternal(userId);
  try {
    cachedStorefront = await storefrontPromise;
    return cachedStorefront;
  } finally {
    storefrontPromise = null;
  }
}

/**
 * Internal storefront detection logic
 */
async function detectStorefrontInternal(userId: string): Promise<UserStorefront | null> {
  // Try multiple detection methods in order of preference
  // 1. Check database first (already detected)
  const dbStorefront = await getStorefrontFromDatabase(userId);
  if (dbStorefront) {
    console.log('[Storefront] Found in database:', dbStorefront.storefront);
    return dbStorefront;
  }
  // 2. Try to detect from StoreKit (iOS only)
  if (Platform.OS === 'ios') {
    const storeKitStorefront = await detectFromStoreKit();
    if (storeKitStorefront) {
      console.log('[Storefront] Detected from StoreKit:', storeKitStorefront);
      await saveStorefront(userId, storeKitStorefront, null, 'storekit');
      return getStorefrontFromDatabase(userId);
    }
  }
  // 3. Fallback: Use IP-based detection
  const ipStorefront = await detectFromIP();
  if (ipStorefront) {
    console.log('[Storefront] Detected from IP:', ipStorefront);
    await saveStorefront(userId, ipStorefront, null, 'ip');
    return getStorefrontFromDatabase(userId);
  }
  console.log('[Storefront] Could not detect storefront');
  return null;
}

/**
 * Get storefront from database
 */
async function getStorefrontFromDatabase(userId: string): Promise<UserStorefront | null> {
  try {
    const { data, error } = await supabase
      .from('user_storefronts')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error && error.code !== 'PGRST116') {
      console.error('[Storefront] Database error:', error);
      return null;
    }
    return data;
  } catch (error) {
    console.error('[Storefront] Error fetching from database:', error);
    return null;
  }
}

/**
 * Detect storefront from StoreKit
 * Note: This requires native module integration
 */
async function detectFromStoreKit(): Promise<string | null> {
  if (Platform.OS !== 'ios') return null;
  try {
    // react-native-iap doesn't expose storefront directly
    // We would need a custom native module for this
    // For now, return null and use other methods
    // TODO: Implement native module for storefront detection
    return null;
  } catch (error) {
    console.error('[Storefront] StoreKit detection error:', error);
    return null;
  }
}

/**
 * Detect storefront from IP address using a geolocation service
 */
async function detectFromIP(): Promise<string | null> {
  try {
    // Use a free IP geolocation API
    const response = await fetch('https://ipapi.co/json/', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`IP lookup failed: ${response.status}`);
    }
    const data = await response.json();
    // Convert ISO 3166-1 alpha-2 to alpha-3
    const countryCode = data.country_code_iso3 || mapAlpha2ToAlpha3(data.country_code);
    return countryCode || null;
  } catch (error) {
    console.error('[Storefront] IP detection error:', error);
    return null;
  }
}

/**
 * Save storefront to database
 */
async function saveStorefront(
  userId: string,
  storefront: string,
  storefrontId: string | null,
  source: 'storekit' | 'ip' | 'manual'
): Promise<void> {
  try {
    await supabase.rpc('save_user_storefront', {
      p_user_id: userId,
      p_storefront: storefront,
      p_storefront_id: storefrontId,
      p_source: source,
    });
  } catch (error) {
    console.error('[Storefront] Error saving storefront:', error);
  }
}

/**
 * Check if user is in a US storefront
 */
export function isUSStorefront(storefront: string | null | undefined): boolean {
  if (!storefront) return false;
  return US_STOREFRONTS.some(us => 
    storefront.toUpperCase() === us.toUpperCase()
  );
}

/**
 * Get paywall configuration based on user's storefront
 * Determines which payment options to show
 */
export async function getPaywallConfig(userId: string): Promise<PaywallConfig> {
  const storefront = await detectStorefront(userId);
  const storefrontCode = storefront?.storefront || null;
  const isUS = isUSStorefront(storefrontCode);
  // US users: Show both Stripe and Apple options
  // Non-US users: Apple IAP only
  if (isUS) {
    return {
      showStripeOption: true,
      showAppleOption: true,
      recommendedProvider: 'stripe', // Recommend Stripe for lower fees
      stripeDisclosure: APPLE_DISCLOSURE_TEXT.externalPayment,
      appleDisclosure: null,
      storefront: storefrontCode,
      isUSUser: true,
    };
  }
  return {
    showStripeOption: false,
    showAppleOption: true,
    recommendedProvider: 'apple',
    stripeDisclosure: null,
    appleDisclosure: null,
    storefront: storefrontCode,
    isUSUser: false,
  };
}

/**
 * Clear cached storefront (for testing or when user changes)
 */
export function clearStorefrontCache(): void {
  cachedStorefront = null;
  storefrontPromise = null;
}

/**
 * Manually set storefront (for testing or user override)
 */
export async function setStorefrontManually(
  userId: string,
  storefront: string
): Promise<void> {
  await saveStorefront(userId, storefront, null, 'manual');
  clearStorefrontCache();
}

/**
 * Map ISO 3166-1 alpha-2 to alpha-3 country codes
 */
function mapAlpha2ToAlpha3(alpha2: string | undefined): string | null {
  if (!alpha2) return null;
  const mapping: Record<string, string> = {
    'US': 'USA',
    'GB': 'GBR',
    'CA': 'CAN',
    'AU': 'AUS',
    'DE': 'DEU',
    'FR': 'FRA',
    'JP': 'JPN',
    'IT': 'ITA',
    'ES': 'ESP',
    'NL': 'NLD',
    'BR': 'BRA',
    'MX': 'MEX',
    'IN': 'IND',
    'CN': 'CHN',
    'KR': 'KOR',
    'RU': 'RUS',
    'SE': 'SWE',
    'NO': 'NOR',
    'DK': 'DNK',
    'FI': 'FIN',
    'CH': 'CHE',
    'AT': 'AUT',
    'BE': 'BEL',
    'IE': 'IRL',
    'NZ': 'NZL',
    'SG': 'SGP',
    'HK': 'HKG',
    'TW': 'TWN',
    'PL': 'POL',
    'PT': 'PRT',
    'ZA': 'ZAF',
    'AR': 'ARG',
    'CL': 'CHL',
    'CO': 'COL',
    'MY': 'MYS',
    'TH': 'THA',
    'PH': 'PHL',
    'ID': 'IDN',
    'VN': 'VNM',
    'AE': 'ARE',
    'SA': 'SAU',
    'IL': 'ISR',
    'TR': 'TUR',
    'EG': 'EGY',
    'NG': 'NGA',
    'KE': 'KEN',
  };
  return mapping[alpha2.toUpperCase()] || null;
}

/**
 * Get display name for a storefront
 */
export function getStorefrontDisplayName(storefront: string | null): string {
  if (!storefront) return 'Unknown';
  const names: Record<string, string> = {
    'USA': 'United States',
    'GBR': 'United Kingdom',
    'CAN': 'Canada',
    'AUS': 'Australia',
    'DEU': 'Germany',
    'FRA': 'France',
    'JPN': 'Japan',
    'ITA': 'Italy',
    'ESP': 'Spain',
    'NLD': 'Netherlands',
    'BRA': 'Brazil',
    'MEX': 'Mexico',
    'IND': 'India',
    'CHN': 'China',
    'KOR': 'South Korea',
  };
  return names[storefront.toUpperCase()] || storefront;
}

