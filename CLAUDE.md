# Dinner Plans AI — CLAUDE.md

React Native + Expo app (SDK 54, Expo Router 6). TypeScript everywhere.

## Quick orientation

| Area | Path |
|---|---|
| Screens (tabs) | `app/(tabs)/` |
| Settings screens | `app/settings/` |
| Business logic | `lib/` |
| Components | `components/` |
| Tests | `__tests__/` |
| Supabase migrations | `supabase/migrations/` |

## AI / Claude

All AI calls go through **`lib/claudeService.ts`** — do not add direct `fetch` calls to the Anthropic API elsewhere.

- `callClaude(system, messages, opts?)` — text completions
- `callClaudeVision(system, imageBase64, mediaType?, prompt?)` — image analysis
- `callClaudeWithTools(system, tools, messages, toolExecutor)` — multi-turn tool use

**Image calls must compress first:**
```typescript
import { compressImageForClaude } from './imageUtils';
const compressed = await compressImageForClaude(imageBase64);
await callClaudeVision(PROMPT, compressed, 'image/jpeg');
```

**OpenAI is retained ONLY for audio** (TTS `tts-1` and STT `whisper-1`) in `components/VoiceAssistantModal.tsx`. Do not migrate those.

Environment variable: `EXPO_PUBLIC_ANTHROPIC_API_KEY`

## Supabase

Client: `lib/supabase.ts`. All tables use RLS. Key tables:

- `pantry_items` — user's food inventory
- `household_member_profiles` — per-person dietary profiles for dinner roster
- `user_recipe_feedback` — swipe/like/cook feedback (used by tonight suggestions)
- `tonight_suggestions` — pre-generated suggestion cache (keyed by household + date)
- `recipes` / `user_saved_recipes` — cookbook

Upsert pattern for feedback:
```typescript
await supabase.from('user_recipe_feedback').upsert(
  { household_id, recipe_id, recipe_name, ...fields },
  { onConflict: 'household_id,recipe_id' }
);
```

## Tonight tab (`app/(tabs)/tonight.tsx`)

The core feature. Uses `lib/tonightService.ts`:
- `generateTonightSuggestions(pantryItems, recentlyMade, activeRoster, feedback)`
- `HouseholdMemberProfile` — dietary profile shape
- `RecipeFeedbackSummary` — liked/disliked/cooked recipe names
- `mergeRosterConstraints(roster)` — unions all member constraints

Roster members are loaded from `household_member_profiles`. Feedback is loaded from `user_recipe_feedback`.

## Theme

Single source of truth: `lib/theme.ts`. Always import from there.
```typescript
import { colors, typography, spacing, borderRadius } from '../../lib/theme';
```

Common colors: `colors.brown`, `colors.brownMuted`, `colors.primary` (honey gold `#F5B84C`), `colors.cream`, `colors.white`, `colors.border`, `colors.error`, `colors.success`.

Font families: `Nunito-Regular`, `Nunito-SemiBold`, `Nunito-Bold`, `Quicksand-Bold`, `Quicksand-SemiBold`.

## Database migrations

```bash
npm run db:push        # apply pending migrations to production
npm run db:push:dry    # preview pending migrations (no changes)
```

Migrations live in `supabase/migrations/`. The journal is tracked in `public.migration_journal` on the remote DB (not `supabase_migrations.schema_migrations` — this project uses non-standard filenames that predate the Supabase CLI convention).

When adding a new migration:
1. Create `supabase/migrations/<YYYYMMDD>_<description>.sql` using `IF NOT EXISTS` / `CREATE OR REPLACE` for idempotency
2. Run `npm run db:push:dry` to preview, then `npm run db:push` to apply

## Testing

```bash
npx jest                    # all 304 tests
npx jest lib/tonightService # specific file
```

Jest config: `jest.config.js`. Mocks: `__mocks__/` + `__tests__/setup.ts`.

**Important:** `jest.resetAllMocks()` does NOT clear `.mock.calls` on module-level mocks created via `jest.mock()` factory functions. Always add `(mockFn as jest.Mock).mockClear()` in the describe-level `beforeEach` when testing call arguments.

## Navigation

Expo Router file-based routing. Settings sub-screens need:
1. A file at `app/settings/<name>.tsx`
2. A `<Stack.Screen name="<name>" options={{ title: '…' }} />` in `app/settings/_layout.tsx`
3. Navigation via `router.push('/settings/<name>')` or `handleNavigate('/settings/<name>')` in `more.tsx`

## Key conventions

- No raw `fetch` to Anthropic — use `claudeService.ts`
- No `colors.borderLight` (doesn't exist) — use `colors.border`
- `borderRadius.full` is `9999` — no null-coalescing needed
- Supabase feedback writes use `upsert` with `onConflict: 'household_id,recipe_id'`
- Image vision calls always compress first via `compressImageForClaude`
