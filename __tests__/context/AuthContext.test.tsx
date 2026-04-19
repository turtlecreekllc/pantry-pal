/**
 * AuthContext Tests
 * Tests for authentication state management
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../../context/AuthContext';

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useSegments: () => [],
}));

// Mock Supabase
const mockSignIn = jest.fn();
const mockSignUp = jest.fn();
const mockSignOut = jest.fn();
const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      signInWithPassword: (args: any) => mockSignIn(args),
      signUp: (args: any) => mockSignUp(args),
      signOut: () => mockSignOut(),
      onAuthStateChange: (callback: any) => {
        mockOnAuthStateChange(callback);
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      },
    },
  },
}));

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  describe('initialization', () => {
    it('should start with loading state', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(result.current.loading).toBe(true);
    });

    it('should fetch session on mount', async () => {
      renderHook(() => useAuth(), { wrapper });
      expect(mockGetSession).toHaveBeenCalled();
    });

    it('should set up auth state listener', async () => {
      renderHook(() => useAuth(), { wrapper });
      expect(mockOnAuthStateChange).toHaveBeenCalled();
    });

    it('should have null user when not authenticated', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.user).toBeNull();
    });
  });

  describe('signIn', () => {
    it('should call supabase signInWithPassword', async () => {
      mockSignIn.mockResolvedValue({ data: { user: { id: '1' } }, error: null });
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signIn('test@example.com', 'password');
      });

      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
      });
    });

    it('should return error on failed sign in', async () => {
      mockSignIn.mockResolvedValue({ 
        data: null, 
        error: { message: 'Invalid credentials' } 
      });
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let signInResult;
      await act(async () => {
        signInResult = await result.current.signIn('test@example.com', 'wrong');
      });

      expect(signInResult.error).toBeDefined();
    });

    it('should return null error on successful sign in', async () => {
      mockSignIn.mockResolvedValue({ 
        data: { user: { id: '1' }, session: {} }, 
        error: null 
      });
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let signInResult;
      await act(async () => {
        signInResult = await result.current.signIn('test@example.com', 'password');
      });

      expect(signInResult.error).toBeNull();
    });
  });

  describe('signUp', () => {
    it('should call supabase signUp', async () => {
      mockSignUp.mockResolvedValue({ 
        data: { user: { id: '1', identities: [{}] }, session: {} }, 
        error: null 
      });
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signUp('new@example.com', 'password');
      });

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password',
      });
    });

    it('should handle email confirmation required', async () => {
      mockSignUp.mockResolvedValue({ 
        data: { user: { id: '1', identities: [{}] }, session: null }, 
        error: null 
      });
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let signUpResult;
      await act(async () => {
        signUpResult = await result.current.signUp('new@example.com', 'password');
      });

      expect(signUpResult.message).toBeDefined();
    });

    it('should handle duplicate email error', async () => {
      mockSignUp.mockResolvedValue({ 
        data: { user: { id: '1', identities: [] }, session: null }, 
        error: null 
      });
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let signUpResult;
      await act(async () => {
        signUpResult = await result.current.signUp('existing@example.com', 'password');
      });

      expect(signUpResult.error).toBeDefined();
    });
  });

  describe('signOut', () => {
    it('should call supabase signOut', async () => {
      mockSignOut.mockResolvedValue({ error: null });
      mockGetSession.mockResolvedValue({ 
        data: { session: { user: { id: '1' } } }, 
        error: null 
      });
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  describe('session management', () => {
    it('should update user when session changes', async () => {
      const mockUser = { id: '1', email: 'test@example.com' };
      mockGetSession.mockResolvedValue({ 
        data: { session: { user: mockUser, access_token: 'token' } }, 
        error: null 
      });
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user?.id).toBe('1');
    });

    it('should clear user on session end', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });
  });
});

