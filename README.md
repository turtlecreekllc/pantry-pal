# Dinner Plans

Mobile app for pantry management, meal planning, and recipe discovery (React Native + Expo, Supabase).

## Run locally

See **[docs/Run_Locally.md](docs/Run_Locally.md)** for:

- Prerequisites (Node 18+)
- Environment setup (`.env`, Supabase)
- Commands: `npm install`, `npx expo start --web`, `npm test`, `npm run test:e2e`
- Core flow check (auth → onboarding → tabs)

Quick start:

```bash
npm install
cp .env.example .env   # then edit .env with your keys
npx expo start --web
```

## Tests

- **Unit / integration:** `npm test` (Jest; excludes e2e)
- **E2E:** `npm run test:e2e` (Playwright; run after starting the web app)
