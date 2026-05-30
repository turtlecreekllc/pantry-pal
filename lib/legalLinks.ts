/**
 * Legal links — single source of truth for Privacy Policy and Terms of Service URLs.
 * Update here to roll out new URLs everywhere they're surfaced in-app.
 */

import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';

export const LEGAL_URLS = {
  privacyPolicy: 'https://dinnerplans.ai/privacy',
  termsOfService: 'https://dinnerplans.ai/terms',
} as const;

export type LegalDocument = 'privacy' | 'terms';

export function getLegalUrl(doc: LegalDocument): string {
  return doc === 'privacy' ? LEGAL_URLS.privacyPolicy : LEGAL_URLS.termsOfService;
}

/**
 * Open a legal document inside the in-app browser (not the system browser).
 * Apple expects auto-renewing subscription paywalls to keep users in-app for
 * Terms/Privacy review.
 */
export async function openLegalLink(doc: LegalDocument): Promise<void> {
  const url = getLegalUrl(doc);
  await openBrowserAsync(url, {
    presentationStyle: WebBrowserPresentationStyle.PAGE_SHEET,
  });
}
