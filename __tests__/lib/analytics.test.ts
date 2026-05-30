import {
  AnalyticsEvent,
  AnalyticsProvider,
  __resetForTests,
  getAnalyticsProvider,
  identify,
  reset,
  screen,
  setAnalyticsProvider,
  track,
} from '../../lib/analytics';

function makeMockProvider(): jest.Mocked<AnalyticsProvider> {
  return {
    identify: jest.fn(),
    capture: jest.fn(),
    screen: jest.fn(),
    reset: jest.fn(),
    alias: jest.fn(),
  };
}

describe('analytics', () => {
  beforeEach(() => {
    __resetForTests();
  });

  describe('no-op when no provider is registered', () => {
    it('track() does nothing without a provider', () => {
      expect(() => track('signup', { foo: 'bar' })).not.toThrow();
    });

    it('identify() does nothing without a provider', () => {
      expect(() => identify('user-123')).not.toThrow();
    });

    it('reset() does nothing without a provider', () => {
      expect(() => reset()).not.toThrow();
    });

    it('screen() does nothing without a provider', () => {
      expect(() => screen('Home')).not.toThrow();
    });
  });

  describe('setAnalyticsProvider', () => {
    it('registers a provider that receives subsequent calls', () => {
      const provider = makeMockProvider();
      setAnalyticsProvider(provider);

      track('signup', { method: 'email' });
      expect(provider.capture).toHaveBeenCalledWith('signup', { method: 'email' });
    });

    it('allows providers to be swapped', () => {
      const first = makeMockProvider();
      const second = makeMockProvider();
      setAnalyticsProvider(first);
      track('e1');
      setAnalyticsProvider(second);
      track('e2');

      expect(first.capture).toHaveBeenCalledWith('e1', undefined);
      expect(second.capture).toHaveBeenCalledWith('e2', undefined);
      expect(getAnalyticsProvider()).toBe(second);
    });

    it('can clear the provider with null', () => {
      const provider = makeMockProvider();
      setAnalyticsProvider(provider);
      setAnalyticsProvider(null);
      track('after_clear');
      expect(provider.capture).not.toHaveBeenCalled();
    });
  });

  describe('PII redaction', () => {
    let provider: jest.Mocked<AnalyticsProvider>;

    beforeEach(() => {
      provider = makeMockProvider();
      setAnalyticsProvider(provider);
    });

    it('strips email from event properties', () => {
      track('signup', { email: 'shane@turtlecreekllc.com', method: 'email' });
      expect(provider.capture).toHaveBeenCalledWith('signup', { method: 'email' });
    });

    it('strips household member names', () => {
      track('roster_updated', {
        member_name: 'Alice',
        member_names: ['Alice', 'Bob'],
        roster_size: 2,
      });
      expect(provider.capture).toHaveBeenCalledWith('roster_updated', {
        roster_size: 2,
      });
    });

    it('strips PII keys case-insensitively', () => {
      track('event', { Email: 'x@y.com', NAME: 'Shane', count: 1 });
      expect(provider.capture).toHaveBeenCalledWith('event', { count: 1 });
    });

    it('strips PII keys from identify properties too', () => {
      identify('user-1', { email: 'leak@test.com', plan: 'pro' });
      expect(provider.identify).toHaveBeenCalledWith('user-1', { plan: 'pro' });
    });

    it('strips PII keys from screen properties too', () => {
      screen('Profile', { email: 'leak@test.com', section: 'overview' });
      expect(provider.screen).toHaveBeenCalledWith('Profile', { section: 'overview' });
    });

    it('passes through when no PII present', () => {
      track('paywall_view', { trigger: 'pantry_limit', limit: 25 });
      expect(provider.capture).toHaveBeenCalledWith('paywall_view', {
        trigger: 'pantry_limit',
        limit: 25,
      });
    });

    it('passes through undefined properties unchanged', () => {
      track('app_open');
      expect(provider.capture).toHaveBeenCalledWith('app_open', undefined);
    });
  });

  describe('identify', () => {
    it('forwards user id to provider', () => {
      const provider = makeMockProvider();
      setAnalyticsProvider(provider);
      identify('user-42');
      expect(provider.identify).toHaveBeenCalledWith('user-42', undefined);
    });

    it('deduplicates repeated identify calls for the same user', () => {
      const provider = makeMockProvider();
      setAnalyticsProvider(provider);
      identify('user-42');
      identify('user-42');
      identify('user-42');
      expect(provider.identify).toHaveBeenCalledTimes(1);
    });

    it('re-identifies when the user id changes', () => {
      const provider = makeMockProvider();
      setAnalyticsProvider(provider);
      identify('user-1');
      identify('user-2');
      expect(provider.identify).toHaveBeenCalledTimes(2);
    });

    it('does nothing for empty user id', () => {
      const provider = makeMockProvider();
      setAnalyticsProvider(provider);
      identify('');
      expect(provider.identify).not.toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('forwards reset to provider and clears identify dedupe', () => {
      const provider = makeMockProvider();
      setAnalyticsProvider(provider);
      identify('user-1');
      reset();
      identify('user-1');

      expect(provider.reset).toHaveBeenCalledTimes(1);
      expect(provider.identify).toHaveBeenCalledTimes(2);
    });
  });

  describe('error containment', () => {
    it('does not throw when the provider throws', () => {
      const provider = makeMockProvider();
      provider.capture.mockImplementation(() => {
        throw new Error('boom');
      });
      setAnalyticsProvider(provider);
      expect(() => track('signup')).not.toThrow();
    });
  });

  describe('AnalyticsEvent constants', () => {
    it('exposes all required acceptance-criteria events', () => {
      const required = [
        'Signup',
        'OnboardingStepCompleted',
        'OnboardingCompleted',
        'FirstPantryItemAdded',
        'FirstTonightSuggestionAccepted',
        'RecipeSaved',
        'RecipeCooked',
        'PaywallView',
        'PaywallPurchase',
        'TrialStart',
        'TrialConvert',
        'SubscriptionCancel',
      ] as const;
      for (const key of required) {
        expect(AnalyticsEvent[key]).toBeTruthy();
      }
    });
  });
});
