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

## Releases & build numbers

Production builds are produced via EAS Build. **EAS owns build-number increments** — do not bump `ios.buildNumber` or `android.versionCode` in `app.json` by hand.

- `npm run build:ios` → runs tests, then `eas build --platform ios --profile production`.
- `npm run build:android` → runs tests, then `eas build --platform android --profile production`.

The production profile in `eas.json` has `autoIncrement: true` with per-platform `ios.autoIncrement: "buildNumber"` and `android.autoIncrement: "versionCode"`. With `cli.appVersionSource: "local"`, EAS Build bumps the values in `app.json` as part of the build and commits the change back.

Semver `expo.version` (currently `1.6.20`) is bumped manually — change it in `app.json` when you cut a release that warrants a user-visible version change.

If TestFlight or Play Console reports a build number that's ahead of `app.json` (e.g., a build was uploaded outside the EAS pipeline), use `eas build:version:set` to realign rather than hand-editing `app.json`.
