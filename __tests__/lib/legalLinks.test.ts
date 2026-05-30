/**
 * legalLinks tests — constants + in-app browser opener.
 */

const mockOpenBrowserAsync = jest.fn(() => Promise.resolve({ type: 'dismiss' }));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: (...args: unknown[]) => mockOpenBrowserAsync(...args),
  WebBrowserPresentationStyle: {
    PAGE_SHEET: 'pageSheet',
    FORM_SHEET: 'formSheet',
  },
}));

import { LEGAL_URLS, getLegalUrl, openLegalLink } from '../../lib/legalLinks';

describe('legalLinks', () => {
  beforeEach(() => {
    mockOpenBrowserAsync.mockClear();
  });

  describe('LEGAL_URLS', () => {
    it('exposes a hosted Privacy Policy URL', () => {
      expect(LEGAL_URLS.privacyPolicy).toMatch(/^https:\/\//);
      expect(LEGAL_URLS.privacyPolicy).toContain('privacy');
    });

    it('exposes a hosted Terms of Service URL', () => {
      expect(LEGAL_URLS.termsOfService).toMatch(/^https:\/\//);
      expect(LEGAL_URLS.termsOfService).toContain('terms');
    });

    it('uses the dinnerplans.ai domain that matches the Apple IAP disclosure', () => {
      expect(LEGAL_URLS.privacyPolicy).toContain('dinnerplans.ai');
      expect(LEGAL_URLS.termsOfService).toContain('dinnerplans.ai');
    });
  });

  describe('getLegalUrl', () => {
    it('returns the privacy URL for "privacy"', () => {
      expect(getLegalUrl('privacy')).toBe(LEGAL_URLS.privacyPolicy);
    });

    it('returns the terms URL for "terms"', () => {
      expect(getLegalUrl('terms')).toBe(LEGAL_URLS.termsOfService);
    });
  });

  describe('openLegalLink', () => {
    it('opens the privacy URL via the in-app browser, not the system browser', async () => {
      await openLegalLink('privacy');
      expect(mockOpenBrowserAsync).toHaveBeenCalledTimes(1);
      expect(mockOpenBrowserAsync).toHaveBeenCalledWith(
        LEGAL_URLS.privacyPolicy,
        expect.any(Object),
      );
    });

    it('opens the terms URL via the in-app browser, not the system browser', async () => {
      await openLegalLink('terms');
      expect(mockOpenBrowserAsync).toHaveBeenCalledTimes(1);
      expect(mockOpenBrowserAsync).toHaveBeenCalledWith(
        LEGAL_URLS.termsOfService,
        expect.any(Object),
      );
    });

    it('uses a pageSheet presentation so users stay in-app', async () => {
      await openLegalLink('privacy');
      const [, opts] = mockOpenBrowserAsync.mock.calls[0] as [string, { presentationStyle: string }];
      expect(opts.presentationStyle).toBe('pageSheet');
    });
  });
});
