/**
 * PostHog bootstrap. Wires the SDK into the [setAnalyticsProvider] hook.
 *
 * The SDK is loaded with a runtime require so the project still builds and
 * runs when `posthog-react-native` is not installed (e.g. CI, tests). When
 * the package is present and `EXPO_PUBLIC_POSTHOG_KEY` is set, a provider
 * is registered; otherwise analytics calls are silent no-ops.
 *
 * To enable in production:
 *   1. npm install posthog-react-native
 *   2. Set EXPO_PUBLIC_POSTHOG_KEY and (optionally) EXPO_PUBLIC_POSTHOG_HOST
 *
 * Swapping providers (Amplitude, Mixpanel, Segment) means replacing this file
 * and the [setAnalyticsProvider] call in app/_layout.tsx — nothing else.
 */
import {
  AnalyticsProperties,
  AnalyticsProvider,
  setAnalyticsProvider,
} from './analytics';

interface PostHogLike {
  identify: (id: string, props?: Record<string, unknown>) => void;
  capture: (event: string, props?: Record<string, unknown>) => void;
  screen: (name: string, props?: Record<string, unknown>) => void;
  reset: () => void;
  alias?: (alias: string) => void;
}

function loadPostHogModule(): unknown {
  try {
    // Indirect require so Metro / Jest do not error when the optional dep is
    // missing. When the package is installed, this resolves normally.
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    return require('posthog-react-native');
  } catch {
    return null;
  }
}

export async function initializeAnalytics(): Promise<void> {
  const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  if (!apiKey) {
    return;
  }

  const mod = loadPostHogModule() as
    | { PostHog?: new (key: string, opts?: Record<string, unknown>) => PostHogLike }
    | null;
  if (!mod || !mod.PostHog) {
    console.warn(
      '[analytics] EXPO_PUBLIC_POSTHOG_KEY is set but posthog-react-native is not installed.'
    );
    return;
  }

  const host = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
  let client: PostHogLike;
  try {
    client = new mod.PostHog(apiKey, {
      host,
      captureAppLifecycleEvents: true,
    });
  } catch (err) {
    console.warn('[analytics] PostHog init failed:', err);
    return;
  }

  const provider: AnalyticsProvider = {
    identify: (id: string, props?: AnalyticsProperties) =>
      client.identify(id, props as Record<string, unknown> | undefined),
    capture: (event: string, props?: AnalyticsProperties) =>
      client.capture(event, props as Record<string, unknown> | undefined),
    screen: (name: string, props?: AnalyticsProperties) =>
      client.screen(name, props as Record<string, unknown> | undefined),
    reset: () => client.reset(),
    alias: client.alias ? (alias: string) => client.alias!(alias) : undefined,
  };
  setAnalyticsProvider(provider);
}
