/**
 * Analytics wrapper — provider-agnostic façade over a product analytics SDK.
 *
 * Default provider: PostHog (posthog-react-native). The SDK is injected via
 * `setAnalyticsProvider` from the app entry point so this module has no hard
 * dependency on a specific vendor and can be swapped (Amplitude, Mixpanel,
 * Segment) without touching call sites.
 *
 * Guardrails:
 *  - Calls are no-ops when no provider is registered (test/dev with no key).
 *  - Event properties are scrubbed of known PII keys before being forwarded.
 *    Email addresses, household member names, and free-text personal fields
 *    must never reach the analytics backend.
 */
export type AnalyticsProperties = Record<string, unknown>;

export interface AnalyticsProvider {
  identify: (distinctId: string, properties?: AnalyticsProperties) => void;
  capture: (event: string, properties?: AnalyticsProperties) => void;
  screen: (name: string, properties?: AnalyticsProperties) => void;
  reset: () => void;
  alias?: (alias: string) => void;
}

/**
 * Canonical event names. Adding a new event? Add the constant here so call
 * sites stay typo-proof and grep-friendly. Keep names snake_case.
 */
export const AnalyticsEvent = {
  Signup: 'signup',
  OnboardingStepCompleted: 'onboarding_step_completed',
  OnboardingCompleted: 'onboarding_completed',
  FirstPantryItemAdded: 'first_pantry_item_added',
  FirstTonightSuggestionAccepted: 'first_tonight_suggestion_accepted',
  RecipeSaved: 'recipe_saved',
  RecipeCooked: 'recipe_cooked',
  PaywallView: 'paywall_view',
  PaywallPurchase: 'paywall_purchase',
  TrialStart: 'trial_start',
  TrialConvert: 'trial_convert',
  SubscriptionCancel: 'subscription_cancel',
} as const;
export type AnalyticsEventName =
  (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

/**
 * Property keys that must never be sent to analytics. Match is case-insensitive
 * on the exact key — we do not scan values. Call sites are responsible for not
 * shoving raw PII into otherwise-innocent keys (e.g. `note: "John's birthday"`).
 */
const PII_KEY_DENYLIST = new Set<string>([
  'email',
  'email_address',
  'phone',
  'phone_number',
  'name',
  'first_name',
  'last_name',
  'full_name',
  'member_name',
  'member_names',
  'household_member_name',
  'household_member_names',
  'address',
  'password',
]);

function scrubProperties(
  properties?: AnalyticsProperties
): AnalyticsProperties | undefined {
  if (!properties) return undefined;
  const out: AnalyticsProperties = {};
  for (const [key, value] of Object.entries(properties)) {
    if (PII_KEY_DENYLIST.has(key.toLowerCase())) continue;
    out[key] = value;
  }
  return out;
}

let provider: AnalyticsProvider | null = null;
let identifiedUserId: string | null = null;

export function setAnalyticsProvider(next: AnalyticsProvider | null): void {
  provider = next;
}

export function getAnalyticsProvider(): AnalyticsProvider | null {
  return provider;
}

/**
 * Identify the current user. The analytics SDK is expected to merge the
 * anonymous distinct_id collected pre-login into this user id (PostHog does
 * this automatically when `identify` is called with a stable id).
 */
export function identify(
  userId: string,
  properties?: AnalyticsProperties
): void {
  if (!userId || !provider) return;
  if (identifiedUserId === userId) return;
  identifiedUserId = userId;
  try {
    provider.identify(userId, scrubProperties(properties));
  } catch (err) {
    console.warn('[analytics] identify failed:', err);
  }
}

/**
 * Track a product event. Safe to call before the provider is registered — the
 * call is dropped silently rather than buffered, because pre-init events are
 * almost always test artefacts.
 */
export function track(
  event: AnalyticsEventName | string,
  properties?: AnalyticsProperties
): void {
  if (!provider) return;
  try {
    provider.capture(event, scrubProperties(properties));
  } catch (err) {
    console.warn('[analytics] capture failed:', err);
  }
}

export function screen(name: string, properties?: AnalyticsProperties): void {
  if (!provider) return;
  try {
    provider.screen(name, scrubProperties(properties));
  } catch (err) {
    console.warn('[analytics] screen failed:', err);
  }
}

/**
 * Reset the SDK state on logout so the next session starts as a fresh
 * anonymous user (prevents the previous user's events from being attributed
 * to a new sign-in on a shared device).
 */
export function reset(): void {
  identifiedUserId = null;
  if (!provider) return;
  try {
    provider.reset();
  } catch (err) {
    console.warn('[analytics] reset failed:', err);
  }
}

// Exposed for tests only.
export function __resetForTests(): void {
  provider = null;
  identifiedUserId = null;
}
