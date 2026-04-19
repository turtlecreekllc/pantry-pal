/**
 * Instacart Integration Service
 * Handles deep linking to Instacart for grocery delivery
 * and affiliate tracking via Impact.com
 */
import { Linking, Alert, Platform } from 'react-native';
import { GroceryItem } from './types';
import { supabase } from './supabase';

/** Instacart API configuration */
const INSTACART_CONFIG = {
  baseUrl: 'https://www.instacart.com',
  partnerId: process.env.EXPO_PUBLIC_INSTACART_PARTNER_ID || '',
  affiliateId: process.env.EXPO_PUBLIC_IMPACT_AFFILIATE_ID || '',
  deepLinkScheme: 'instacart://',
  webFallback: 'https://www.instacart.com/store',
} as const;

/** Product search result from Instacart */
interface InstacartProduct {
  readonly id: string;
  readonly name: string;
  readonly price: number;
  readonly imageUrl: string;
  readonly quantity: number;
}

/** Cart item for Instacart order */
interface InstacartCartItem {
  readonly productId: string;
  readonly quantity: number;
  readonly unit: string;
}

/** Order tracking record */
interface InstacartOrderRecord {
  readonly id: string;
  readonly userId: string;
  readonly groceryListId: string;
  readonly instacartLink: string;
  readonly status: 'created' | 'opened' | 'completed';
  readonly createdAt: Date;
}

/**
 * Generates an Instacart shopping link with pre-populated items
 * @param items - Grocery items to add to cart
 * @returns URL to Instacart with items pre-populated
 */
function generateInstacartLink(items: readonly GroceryItem[]): string {
  const baseUrl = INSTACART_CONFIG.baseUrl;
  const searchTerms = items
    .filter((item) => !item.checked)
    .map((item) => {
      const quantity = item.quantity || 1;
      const unit = item.unit || '';
      const searchTerm = `${quantity} ${unit} ${item.name}`.trim();
      return encodeURIComponent(searchTerm);
    })
    .join(',');
  const affiliateParams = INSTACART_CONFIG.affiliateId
    ? `&utm_source=dinnerplans&utm_medium=app&utm_campaign=grocery_list&aid=${INSTACART_CONFIG.affiliateId}`
    : '';
  return `${baseUrl}/store/search?q=${searchTerms}${affiliateParams}`;
}

/**
 * Creates an Instacart deep link that opens the app directly
 * @param items - Grocery items to add to cart
 * @returns Deep link URL for Instacart app
 */
function generateDeepLink(items: readonly GroceryItem[]): string {
  const searchTerms = items
    .filter((item) => !item.checked)
    .map((item) => encodeURIComponent(item.name))
    .join(',');
  return `${INSTACART_CONFIG.deepLinkScheme}store/search?q=${searchTerms}`;
}

/**
 * Checks if Instacart app is installed on device
 * @returns Promise resolving to true if Instacart is installed
 */
async function isInstacartInstalled(): Promise<boolean> {
  try {
    const canOpen = await Linking.canOpenURL(INSTACART_CONFIG.deepLinkScheme);
    return canOpen;
  } catch {
    return false;
  }
}

/**
 * Opens Instacart with grocery list items pre-populated
 * Attempts deep link first, falls back to web
 * @param items - Grocery items to add to cart
 * @param groceryListId - ID of the grocery list for tracking
 * @param userId - User ID for tracking
 */
async function openInstacartWithItems({
  items,
  groceryListId,
  userId,
}: {
  readonly items: readonly GroceryItem[];
  readonly groceryListId?: string;
  readonly userId?: string;
}): Promise<{ success: boolean; link: string }> {
  const uncheckedItems = items.filter((item) => !item.checked);
  if (uncheckedItems.length === 0) {
    Alert.alert(
      'No Items',
      'Add some items to your grocery list first, or uncheck some items to order.',
    );
    return { success: false, link: '' };
  }
  const isAppInstalled = await isInstacartInstalled();
  const link = isAppInstalled
    ? generateDeepLink(uncheckedItems)
    : generateInstacartLink(uncheckedItems);
  try {
    // Track the order creation
    if (groceryListId && userId) {
      await trackOrderCreation({
        userId,
        groceryListId,
        instacartLink: link,
      });
    }
    const opened = await Linking.openURL(link);
    return { success: true, link };
  } catch (error) {
    console.error('Failed to open Instacart:', error);
    // Fallback to web link
    const webLink = generateInstacartLink(uncheckedItems);
    try {
      await Linking.openURL(webLink);
      return { success: true, link: webLink };
    } catch (webError) {
      Alert.alert(
        'Unable to Open Instacart',
        'Please visit instacart.com to complete your order.',
      );
      return { success: false, link: '' };
    }
  }
}

/**
 * Tracks order creation in database for affiliate attribution
 * @param params - Order tracking parameters
 */
async function trackOrderCreation({
  userId,
  groceryListId,
  instacartLink,
}: {
  readonly userId: string;
  readonly groceryListId: string;
  readonly instacartLink: string;
}): Promise<void> {
  try {
    const { error } = await supabase.from('instacart_orders').insert({
      user_id: userId,
      grocery_list_id: groceryListId,
      instacart_link: instacartLink,
      status: 'created',
    });
    if (error) {
      console.error('Failed to track Instacart order:', error);
    }
  } catch (error) {
    console.error('Error tracking Instacart order:', error);
  }
}

/**
 * Gets estimated delivery time based on location
 * This is a placeholder - actual implementation would call Instacart API
 * @returns Estimated delivery time string
 */
function getEstimatedDeliveryTime(): string {
  // In a real implementation, this would check Instacart availability
  return 'as fast as 2 hours';
}

/**
 * Calculates estimated total for items
 * This is a rough estimate - actual prices vary by store
 * @param items - Grocery items to estimate
 * @returns Estimated total as formatted string
 */
function estimateTotal(items: readonly GroceryItem[]): string {
  const uncheckedItems = items.filter((item) => !item.checked);
  // Rough estimate: $3-5 per item on average
  const avgPricePerItem = 4;
  const itemsTotal = uncheckedItems.length * avgPricePerItem;
  const deliveryFee = 5.99;
  const serviceFee = itemsTotal * 0.05;
  const total = itemsTotal + deliveryFee + serviceFee;
  return `$${total.toFixed(2)}`;
}

/**
 * Gets user's order history from Instacart integration
 * @param userId - User ID to fetch orders for
 * @returns Promise resolving to array of order records
 */
async function getOrderHistory(
  userId: string,
): Promise<readonly InstacartOrderRecord[]> {
  try {
    const { data, error } = await supabase
      .from('instacart_orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) {
      console.error('Failed to fetch order history:', error);
      return [];
    }
    return (data || []).map((order) => ({
      id: order.id,
      userId: order.user_id,
      groceryListId: order.grocery_list_id,
      instacartLink: order.instacart_link,
      status: order.status,
      createdAt: new Date(order.created_at),
    }));
  } catch (error) {
    console.error('Error fetching order history:', error);
    return [];
  }
}

/** Instacart service with all public methods */
export const instacartService = {
  generateInstacartLink,
  generateDeepLink,
  isInstacartInstalled,
  openInstacartWithItems,
  trackOrderCreation,
  getEstimatedDeliveryTime,
  estimateTotal,
  getOrderHistory,
} as const;

