# DinnerPlans E2E Tests (Playwright)

End-to-end tests for the DinnerPlans web version, verifying all major user flows.

## Setup

### 1. Install Playwright browsers (run once)
```bash
npx playwright install chromium
```

### 2. Create a test account in Supabase
Go to your [Supabase Dashboard](https://supabase.com/dashboard/project/hmqphrhwplppnxknjnxy/auth/users) → Authentication → Users → Create user:
- Email: `test@dinnerplans.ai`
- Password: `TestPass123!`

Or set your own credentials:
```bash
export TEST_EMAIL=your@email.com
export TEST_PASSWORD=yourpassword
```

### 3. Start the Expo web server
In a **separate terminal**:
```bash
npx expo start --web
# Server starts at http://localhost:8081
```

### 4. Run the tests
```bash
# All tests
npm run test:e2e

# With visual browser (watch what's happening)
npm run test:e2e:headed

# Interactive UI mode
npm run test:e2e:ui

# Specific test file
npx playwright test e2e/auth.spec.ts

# View last test report
npm run test:e2e:report
```

## Test Files

| File | Coverage |
|------|----------|
| `auth.spec.ts` | Login, signup, logout, redirects |
| `pantry.spec.ts` | Pantry list, filters, add item (scan + manual) |
| `recipes.spec.ts` | Recipe search, detail view, saved recipes |
| `tonight.spec.ts` | Home screen, dinner suggestions, navigation |
| `plan-and-grocery.spec.ts` | Meal calendar, grocery list CRUD |
| `onboarding.spec.ts` | First-launch flow, step navigation |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TEST_EMAIL` | `test@dinnerplans.ai` | Test user email |
| `TEST_PASSWORD` | `TestPass123!` | Test user password |
| `APP_URL` | `http://localhost:8081` | Expo web server URL |

## Skipped Tests

Tests that require a real Supabase account (`TEST_EMAIL` not set) are automatically skipped.
The "App Load Smoke Test" and "Authentication UI validation" tests run without credentials.

## Troubleshooting

**Tests fail with "Target page, context or browser has been closed"**
→ Increase `actionTimeout` in `playwright.config.ts`

**App shows blank screen**
→ Check Expo web server is running: `curl http://localhost:8081`

**Login tests fail with "Invalid credentials"**
→ Create the test user in Supabase dashboard

**Camera/scan tests show "not supported"**
→ Expected on web — camera tests handle this gracefully

## CI/CD

To run in CI (e.g. GitHub Actions):
```yaml
- name: Start Expo web
  run: npx expo start --web &

- name: Wait for server
  run: npx wait-on http://localhost:8081 --timeout 60000

- name: Run E2E tests
  run: npx playwright test
  env:
    TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
    TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
    CI: true
```
