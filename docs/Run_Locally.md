# Run Dinner Plans Locally

Get the app running on your machine for development and testing.

## Prerequisites

- **Node.js** 18+ or 20+ (LTS recommended)
- **npm** (comes with Node)

## 1. Install dependencies

```bash
npm install
```

### Windows: disable autocrlf

The repo enforces LF line endings via `.gitattributes`. On Windows, set this once
per clone to keep `git status` clean (otherwise Git rewrites LF → CRLF on checkout):

```bash
git config --local core.autocrlf false
```

If a clone was already created with CRLF in the working tree, refresh it after
setting the flag:

```bash
git rm --cached -r .
git reset --hard HEAD
```

## 2. Environment variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your keys. **Required for local run:**

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous (public) key |
| `EXPO_PUBLIC_STRIPE_*` | Stripe price IDs (see `.env.example`) |

**Provider secrets (server-side only).** Anthropic, OpenAI, and Spoonacular keys
are proxied through Supabase Edge Functions (`claude-proxy`, `openai-audio-proxy`,
`spoonacular-proxy`) per SEC-006 so they never ship in the client bundle. Set
them as Supabase secrets, not as `EXPO_PUBLIC_*`:

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set SPOONACULAR_API_KEY=...
```

**Optional** (features work with fallbacks if unset):

- `EXPO_PUBLIC_INSTACART_PARTNER_ID` / `EXPO_PUBLIC_IMPACT_AFFILIATE_ID` – Instacart deep links
- `EXPO_PUBLIC_REMOVE_BG_API_KEY` – Background removal for images
- `EXPO_PUBLIC_APPLE_SHARED_SECRET` – Apple IAP server validation
- `EXPO_PUBLIC_APP_URL` – App URL scheme (default: `dinner-plans://`)

## 3. Supabase migrations

Ensure your Supabase project has all migrations applied (tables, RLS, functions). From the project root:

- Apply migrations via [Supabase Dashboard](https://app.supabase.com) → SQL Editor, or
- Use Supabase CLI: `supabase db push` (if linked)

Migrations live in `supabase/migrations/`.

## 4. Start the app

**Web (fastest for local iteration):**

```bash
npx expo start --web
```

If port 8081 is in use:

```bash
npx expo start --web --port 8082
```

**iOS simulator:**

```bash
npx expo start --ios
```

**Android emulator:**

```bash
npx expo start --android
```

Then open the URL shown in the terminal (e.g. http://localhost:8081) or scan the QR code with Expo Go on a device.

## 5. Run tests

**Unit / integration (Jest):**

```bash
npm test
```

**E2E (Playwright; requires app running on web first):**

```bash
npx expo start --web
# In another terminal:
npm run test:e2e
```

## 6. Core flow check

After the app loads:

1. **Auth** – You should see the Login screen (or be redirected there). Sign up or sign in.
2. **Onboarding** – If first time, complete onboarding (household size, preferences, etc.).
3. **Tabs** – You should land on Tonight, then be able to open Plan, Pantry, Grocery, and More without crashes.

IAP, HealthKit, and Siri Shortcuts require native builds (e.g. EAS development build) and are not fully available on web.
