/**
 * LegalScreen tests — verify both legal documents are surfaced and open
 * via the in-app browser.
 *
 * Follows the same render-light pattern as PaywallModal.test.tsx to avoid
 * TurboModule issues; renders the screen and asserts the press handlers
 * call openLegalLink with the right document.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

const mockOpenLegalLink = jest.fn(() => Promise.resolve());

jest.mock('../../lib/legalLinks', () => {
  const actual = jest.requireActual('../../lib/legalLinks');
  return {
    ...actual,
    openLegalLink: (...args: unknown[]) => mockOpenLegalLink(...args),
  };
});

import LegalScreen from '../../app/settings/legal';
import { LEGAL_URLS } from '../../lib/legalLinks';

describe('LegalScreen', () => {
  beforeEach(() => {
    mockOpenLegalLink.mockClear();
  });

  it('renders a Privacy Policy row', () => {
    const { getByTestId, getByText } = render(<LegalScreen />);
    expect(getByTestId('legal-privacy-row')).toBeTruthy();
    expect(getByText('Privacy Policy')).toBeTruthy();
  });

  it('renders a Terms of Service row', () => {
    const { getByTestId, getByText } = render(<LegalScreen />);
    expect(getByTestId('legal-terms-row')).toBeTruthy();
    expect(getByText('Terms of Service')).toBeTruthy();
  });

  it('shows the hosted Privacy URL from the constants module', () => {
    const { getByText } = render(<LegalScreen />);
    expect(getByText(LEGAL_URLS.privacyPolicy)).toBeTruthy();
  });

  it('shows the hosted Terms URL from the constants module', () => {
    const { getByText } = render(<LegalScreen />);
    expect(getByText(LEGAL_URLS.termsOfService)).toBeTruthy();
  });

  it('opens Privacy Policy via the in-app browser when tapped', () => {
    const { getByTestId } = render(<LegalScreen />);
    fireEvent.press(getByTestId('legal-privacy-row'));
    expect(mockOpenLegalLink).toHaveBeenCalledWith('privacy');
  });

  it('opens Terms of Service via the in-app browser when tapped', () => {
    const { getByTestId } = render(<LegalScreen />);
    fireEvent.press(getByTestId('legal-terms-row'));
    expect(mockOpenLegalLink).toHaveBeenCalledWith('terms');
  });
});
