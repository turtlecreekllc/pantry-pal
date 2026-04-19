/**
 * Tonight Suggestions Cache Service
 *
 * Wraps the `tonight_suggestions` Supabase table to make the Tonight screen
 * instant at 5pm instead of waiting 2–5s for Claude.
 *
 * Cache lifecycle:
 *   [no row for today]
 *     → background job or first open after 3pm triggers generation
 *     → row inserted (UPSERT — one per household per day)
 *     → pantry/roster change? DELETE row (invalidate)
 *     → user taps Refresh? DELETE + regenerate
 *     → midnight → date no longer matches → auto-stale
 */

import { supabase } from './supabase';
import { PantryItem } from './types';
import {
  generateTonightSuggestions,
  HouseholdMemberProfile,
  RecipeFeedbackSummary,
} from './tonightService';

// The cached payload mirrors what generateTonightSuggestions returns
export interface CachedSuggestions {
  topPick: any | null;         // TonightSuggestion (opaque JSONB)
  suggestions: any[];          // TonightSuggestion[]
  expiringItems: PantryItem[];
  generatedAt: string;         // ISO timestamp
  rosterMemberIds: string[];   // which member profiles were active
}

// ─── read ──────────────────────────────────────────────────────────────────────

/**
 * Read today's cached suggestions for a household.
 * Returns null on cache miss (no row) or any error.
 */
export async function readCachedSuggestions(
  householdId: string
): Promise<CachedSuggestions | null> {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const { data, error } = await supabase
      .from('tonight_suggestions')
      .select('suggestions, generated_at, roster_member_ids')
      .eq('household_id', householdId)
      .eq('date', today)
      .maybeSingle();

    if (error || !data) return null;

    const payload = data.suggestions as any;
    return {
      topPick: payload.topPick ?? null,
      suggestions: payload.suggestions ?? [],
      expiringItems: payload.expiringItems ?? [],
      generatedAt: data.generated_at,
      rosterMemberIds: data.roster_member_ids ?? [],
    };
  } catch {
    return null;
  }
}

// ─── write ─────────────────────────────────────────────────────────────────────

async function writeCachedSuggestions(
  householdId: string,
  result: { topPick: any; suggestions: any[]; expiringItems: PantryItem[] },
  rosterMemberIds: string[]
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  await supabase.from('tonight_suggestions').upsert(
    {
      household_id: householdId,
      date: today,
      suggestions: {
        topPick: result.topPick,
        suggestions: result.suggestions,
        expiringItems: result.expiringItems,
      },
      roster_member_ids: rosterMemberIds,
      generated_at: new Date().toISOString(),
    },
    { onConflict: 'household_id,date' }
  );
}

// ─── invalidate ────────────────────────────────────────────────────────────────

/**
 * Delete today's cache row for a household.
 * Call this when:
 *  - A pantry item is added or removed
 *  - The dinner roster changes
 *  - The user taps "Refresh"
 */
export async function invalidateTonightCache(householdId: string): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    await supabase
      .from('tonight_suggestions')
      .delete()
      .eq('household_id', householdId)
      .eq('date', today);
  } catch (e) {
    console.warn('[TonightCache] Failed to invalidate:', e);
  }
}

// ─── generate + cache ──────────────────────────────────────────────────────────

/**
 * Generate tonight's suggestions, write to cache, and return the result.
 * This is the single place that calls generateTonightSuggestions — both the
 * background pre-generation job and the on-demand Tonight screen path use this.
 */
export async function generateAndCacheSuggestions(
  householdId: string,
  pantryItems: PantryItem[],
  recentlyMadeRecipeIds: string[],
  activeRoster: HouseholdMemberProfile[],
  recentFeedback: RecipeFeedbackSummary
): Promise<{ topPick: any; suggestions: any[]; expiringItems: PantryItem[] }> {
  const result = await generateTonightSuggestions(
    pantryItems,
    recentlyMadeRecipeIds,
    activeRoster,
    recentFeedback
  );

  const rosterMemberIds = activeRoster.map((m) => m.id);

  // Write in the background — don't block the caller if it fails
  writeCachedSuggestions(householdId, result, rosterMemberIds).catch((e) =>
    console.warn('[TonightCache] Write failed (non-fatal):', e)
  );

  return result;
}

// ─── background pre-generation ─────────────────────────────────────────────────

/**
 * Call this on app foreground events (AppState 'active').
 * Triggers pre-generation if:
 *   1. Current time is between 15:00 and 23:59 (3pm–midnight)
 *   2. No valid cache row exists for today
 *
 * Returns true if pre-generation was triggered, false if skipped.
 * Generation runs in the background — caller does not await the result.
 */
export function maybePreGenerateSuggestions(
  householdId: string | undefined,
  pantryItems: PantryItem[],
  recentlyMadeRecipeIds: string[],
  activeRoster: HouseholdMemberProfile[],
  recentFeedback: RecipeFeedbackSummary
): boolean {
  if (!householdId) return false;
  if (pantryItems.length === 0) return false;

  const hour = new Date().getHours();
  // Only pre-generate between 3pm and midnight
  if (hour < 15) return false;

  // Fire-and-forget: check cache then generate if stale
  (async () => {
    try {
      const cached = await readCachedSuggestions(householdId);
      if (cached) return; // already fresh for today

      console.log('[TonightCache] Pre-generating suggestions in background...');
      await generateAndCacheSuggestions(
        householdId,
        pantryItems,
        recentlyMadeRecipeIds,
        activeRoster,
        recentFeedback
      );
      console.log('[TonightCache] Pre-generation complete.');
    } catch (e) {
      console.warn('[TonightCache] Pre-generation failed (non-fatal):', e);
    }
  })();

  return true;
}
