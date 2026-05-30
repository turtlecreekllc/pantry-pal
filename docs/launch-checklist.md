# Dinner Plans AI — App Store Launch Checklist

Tracks the non-code artifacts required to ship to the Apple App Store and Google Play. None of this lives in the repo by default, so it gets tracked here to keep submission un-blocked.

**Owners use these tags:**
- `@shane` — founder / final approver
- `@design` — visuals (screenshots, marketing imagery)
- `@copy` — marketing copy, ASO, release notes
- `@legal` — privacy, terms, age rating
- `@ops` — credentials, accounts, secrets

**Target state legend:**
- `DRAFT` — exists but not final
- `READY` — approved and ready to paste into store console
- `LIVE` — already submitted / published

---

## 1. App Store Connect metadata

Owner: `@shane` · Target: `READY` before first TestFlight external review.

- [ ] App name (30 char max)
- [ ] Subtitle (30 char max)
- [ ] Primary category and secondary category
- [ ] Bundle ID confirmed matches `app.json` / EAS config
- [ ] SKU
- [ ] Pricing tier (free + IAP)
- [ ] Availability (countries / regions)
- [ ] Content rights (does the app contain third-party content?)
- [ ] Sign-in required toggle

## 2. Google Play Console metadata

Owner: `@shane` · Target: `READY` before closed testing track is opened.

- [ ] App title (30 char max)
- [ ] Short description (80 char max)
- [ ] Full description (4000 char max)
- [ ] Application category and tags
- [ ] Contact details (email, website, phone)
- [ ] Content rating questionnaire (IARC)
- [ ] Target audience and content (ages, appeals to children?)
- [ ] Data safety form
- [ ] Government apps / financial features declarations
- [ ] Ads declaration (currently `No ads`)

## 3. Screenshots per device size

Owner: `@design` · Target: `READY` per device class.

Apple required sizes (App Store Connect):
- [ ] 6.9" iPhone (1320 x 2868) — required
- [ ] 6.5" iPhone (1284 x 2778 or 1242 x 2688) — required for older fallback
- [ ] 13" iPad Pro (2064 x 2752) — required if iPad supported

Google Play required:
- [ ] Phone screenshots (min 2, max 8, 1080 x 1920 recommended)
- [ ] 7" tablet (optional, recommended)
- [ ] 10" tablet (optional, recommended)
- [ ] Feature graphic (1024 x 500)

Per-screen shot list (suggested):
- [ ] Tonight tab with suggestions
- [ ] Pantry with photo-scanned items
- [ ] Recipe detail / cookbook
- [ ] Household roster with dietary profiles
- [ ] Voice assistant in action
- [ ] Paywall (must reflect current Stripe / Apple IAP pricing)

## 4. Marketing copy

Owner: `@copy` · Target: `READY` after brand-guide review.

- [ ] Promotional text (170 char, App Store, updatable without resubmit)
- [ ] Description (4000 char, App Store)
- [ ] Short description (80 char, Google Play)
- [ ] Full description (4000 char, Google Play)
- [ ] What's new / release notes for first release
- [ ] App preview video script (optional but recommended)

## 5. ASO keywords

Owner: `@copy` · Target: `READY` for v1, revisit quarterly.

- [ ] Apple keyword field (100 char comma-separated, no spaces)
- [ ] Google Play does NOT take keywords — keyword density tuned into full description
- [ ] Tracked competitor keywords list (separate doc / spreadsheet)
- [ ] Primary keyword targets documented with rank baseline

## 6. App Privacy nutrition label answers

Owner: `@legal` (review) + `@shane` (sign-off) · Target: `READY`.

For each data type, answer: collected? linked to user? used for tracking?

- [ ] Contact Info — email (Supabase auth)
- [ ] Identifiers — user ID (Supabase auth)
- [ ] Usage Data — product interaction (analytics, if any)
- [ ] Diagnostics — crash data (Expo / Sentry, if enabled)
- [ ] User Content — photos (pantry scans), recipes saved
- [ ] Health & Fitness — dietary restrictions (if classified as health)
- [ ] Purchases — IAP transaction info
- [ ] Location — NOT collected (confirm)
- [ ] Tracking — NOT used (confirm — no third-party SDKs cross-app tracking)

Google Play data safety form mirrors the above. Both must be consistent.

## 7. Support and marketing URLs

Owner: `@ops` · Target: `LIVE` before submission.

- [ ] Support URL — public page with contact form / email
- [ ] Marketing URL — landing page (can be the marketing site)
- [ ] Privacy Policy URL — must be live and accessible
- [ ] Terms of Service URL — must be live and accessible
- [ ] EULA — Apple's default unless we have a custom one

## 8. Demo account credentials

Owner: `@ops` · Target: `READY` per submission cycle.

Required by App Store review when sign-in is needed:
- [ ] Email
- [ ] Password
- [ ] Household pre-seeded with sample data (pantry, roster, saved recipes)
- [ ] Active subscription state (sandbox / promo) so reviewers can see paywalled features
- [ ] Notes field describing how to reach key flows in under 60 seconds

Store demo creds in 1Password / vault, not in this file. Reference the vault item by name only.

## 9. Release notes template

Owner: `@copy` · Target: maintained as living template.

```
What's new in {{version}}

• {{Highlight 1 — user-visible feature}}
• {{Highlight 2 — UX improvement}}
• {{Highlight 3 — bug fix or perf}}

Thanks for cooking with us. Feedback: feedback@dinnerplans.ai
```

- [ ] Template kept in sync with brand voice (see `docs/dinner-plans-ai-brand-guide.md`)
- [ ] Per-release notes filled in and reviewed before each submission

## 10. Age rating questionnaire

Owner: `@legal` · Target: `READY`, re-confirmed each year.

- [ ] Apple age rating questionnaire answers (cartoon violence, mature themes, etc.) — expected 4+
- [ ] Google Play IARC questionnaire answers — expected Everyone
- [ ] Confirm answers match data collection (e.g. user-generated content moderation policy)

---

## Submission gate

Before tapping "Submit for Review":

- [ ] All sections above at `READY` or `LIVE`
- [ ] Build uploaded via EAS Submit and processed
- [ ] TestFlight smoke test passed on at least one external tester
- [ ] Demo creds tested fresh by someone outside the dev loop
- [ ] Privacy + Terms URLs return 200 in incognito
