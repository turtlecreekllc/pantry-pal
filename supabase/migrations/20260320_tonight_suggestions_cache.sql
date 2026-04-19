-- Migration: tonight_suggestions (cache)
-- Purpose: Pre-generated dinner suggestions cached at 4:30pm (or first open after 3pm).
--          Makes the Tonight screen instant at 5pm instead of waiting 2-5s for Claude.
--
-- Cache invalidation triggers:
--   1. New day (date changes at midnight)
--   2. Pantry item added/removed (caller deletes cache row)
--   3. Roster changes (who's eating tonight changed)
--
-- Cache state machine:
--
--   [no row for today]
--       │
--       ▼
--   4:30pm background job OR first open after 3pm
--       │ callClaude(pantry + roster + constraints + feedback)
--       ▼
--   [row inserted: suggestions cached]
--       │
--       ├─ pantry/roster changes? → DELETE row → back to start
--       ├─ midnight? → date no longer matches → auto-stale
--       └─ user taps Refresh → DELETE row + regenerate
--
--   Tonight screen reads:
--       SELECT * WHERE household_id=? AND date=TODAY
--       → hit: instant display
--       → miss: generate on-demand with spinner

CREATE TABLE IF NOT EXISTS tonight_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  suggestions JSONB NOT NULL,          -- array of TonightSuggestion objects
  roster_member_ids UUID[] NOT NULL,   -- which profiles were active when generated
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One cache row per household per day; upsert on regeneration
  CONSTRAINT tonight_suggestions_unique UNIQUE (household_id, date)
);

CREATE INDEX IF NOT EXISTS idx_tonight_suggestions_household_date
  ON tonight_suggestions(household_id, date);

-- RLS
ALTER TABLE tonight_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household_members_access_suggestions"
  ON tonight_suggestions FOR ALL
  USING (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );
