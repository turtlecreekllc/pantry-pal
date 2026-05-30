/**
 * Signup screen — legal acknowledgement tests.
 * Asserts that the "By signing up..." copy and Terms/Privacy tap targets
 * are present and route through openLegalLink (in-app browser).
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

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    signUp: jest.fn(() => Promise.resolve({ error: null })),
    loading: false,
  }),
}));

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

import SignUpScreen from '../../app/(auth)/signup';

describe('SignUpScreen legal acknowledgement', () => {
  beforeEach(() => {
    mockOpenLegalLink.mockClear();
  });

  it('displays a "By signing up..." acknowledgement', () => {
    const { getByText } = render(<SignUpScreen />);
    expect(getByText(/By signing up, you agree to our/i)).toBeTruthy();
  });

  it('renders a tappable Terms link', () => {
    const { getByTestId } = render(<SignUpScreen />);
    expect(getByTestId('signup-terms-link')).toBeTruthy();
  });

  it('renders a tappable Privacy Policy link', () => {
    const { getByTestId } = render(<SignUpScreen />);
    expect(getByTestId('signup-privacy-link')).toBeTruthy();
  });

  it('opens Terms via the in-app browser when tapped', () => {
    const { getByTestId } = render(<SignUpScreen />);
    fireEvent.press(getByTestId('signup-terms-link'));
    expect(mockOpenLegalLink).toHaveBeenCalledWith('terms');
  });

  it('opens Privacy Policy via the in-app browser when tapped', () => {
    const { getByTestId } = render(<SignUpScreen />);
    fireEvent.press(getByTestId('signup-privacy-link'));
    expect(mockOpenLegalLink).toHaveBeenCalledWith('privacy');
  });
});
