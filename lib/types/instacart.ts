import type { GroceryItem } from './grocery';

export const INSTACART_ORDER_STATUSES = ['created', 'clicked', 'completed', 'cancelled'] as const;
export type InstacartOrderStatus = (typeof INSTACART_ORDER_STATUSES)[number];

/**
 * Instacart order tracking
 */
export interface InstacartOrder {
  id: string;
  user_id: string;
  household_id: string | null;
  grocery_list_snapshot: GroceryItem[];
  item_count: number;
  estimated_total_cents: number | null;
  instacart_link: string;
  utm_source: string;
  utm_campaign: string | null;
  status: InstacartOrderStatus;
  clicked_at: string | null;
  completed_at: string | null;
  commission_cents: number | null;
  created_at: string;
}
