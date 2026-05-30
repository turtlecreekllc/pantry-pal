/**
 * PaywallModal legal link wiring — verifies that the modal's Terms/Privacy
 * handlers use the in-app browser via openLegalLink (Apple Guideline 3.1.2
 * best practice for auto-renewing subscriptions).
 *
 * Static-source assertion to avoid TurboModule render issues, matching the
 * convention in PaywallModal.test.tsx.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const source = readFileSync(
  join(__dirname, '..', '..', 'components', 'PaywallModal.tsx'),
  'utf8',
);

describe('PaywallModal legal links', () => {
  it('imports openLegalLink from the legal links module', () => {
    expect(source).toMatch(/from\s+['"]\.\.\/lib\/legalLinks['"]/);
    expect(source).toMatch(/openLegalLink/);
  });

  it('routes the Terms handler through openLegalLink (in-app browser)', () => {
    expect(source).toMatch(/openTerms\s*=\s*\(\s*\)\s*=>\s*\{[^}]*openLegalLink\(['"]terms['"]\)/);
  });

  it('routes the Privacy handler through openLegalLink (in-app browser)', () => {
    expect(source).toMatch(/openPrivacy\s*=\s*\(\s*\)\s*=>\s*\{[^}]*openLegalLink\(['"]privacy['"]\)/);
  });

  it('does not call Linking.openURL for the legal links anymore', () => {
    expect(source).not.toMatch(/Linking\.openURL\([^)]*termsLink/);
    expect(source).not.toMatch(/Linking\.openURL\([^)]*privacyLink/);
  });

  it('still renders Terms of Service and Privacy Policy tap targets', () => {
    expect(source).toMatch(/Terms of Service/);
    expect(source).toMatch(/Privacy Policy/);
  });
});
