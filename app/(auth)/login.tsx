import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { colors, typography, spacing, borderRadius, shadows } from '../../lib/theme';

WebBrowser.maybeCompleteAuthSession();

const BIOMETRIC_CREDENTIALS_KEY = 'dinner_plans_biometric_credentials';

interface BiometricCredentials {
  email: string;
  password: string;
}

export default function LoginScreen(): React.ReactElement {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [hasSavedCredentials, setHasSavedCredentials] = useState(false);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState(false);
  const { signIn, loading } = useAuth();

  useEffect(() => {
    checkBiometricAvailability();
    checkAppleAvailability();
  }, []);

  const checkBiometricAvailability = async (): Promise<void> => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setIsBiometricAvailable(compatible && enrolled);
      if (compatible && enrolled) {
        const credentials = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_KEY);
        setHasSavedCredentials(!!credentials);
      }
    } catch (err) {
      console.error('Error checking biometric availability:', err);
    }
  };

  const checkAppleAvailability = async (): Promise<void> => {
    if (Platform.OS === 'ios') {
      const available = await AppleAuthentication.isAvailableAsync();
      setIsAppleAvailable(available);
    }
  };

  const handleLogin = async (): Promise<void> => {
    setError(null);
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }
    const { error: signInError } = await signIn(email.trim(), password);
    if (signInError) {
      setError(signInError.message || 'Failed to sign in');
    } else {
      if (isBiometricAvailable) {
        promptToSaveBiometrics(email.trim(), password);
      }
    }
  };

  const promptToSaveBiometrics = async (userEmail: string, userPassword: string): Promise<void> => {
    const existingCredentials = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_KEY);
    if (existingCredentials) {
      const parsed: BiometricCredentials = JSON.parse(existingCredentials);
      if (parsed.email === userEmail) {
        return;
      }
    }
    Alert.alert(
      'Enable Quick Login',
      'Would you like to enable Face ID / fingerprint login for faster access?',
      [
        { text: 'Not Now', style: 'cancel' },
        {
          text: 'Enable',
          onPress: async () => {
            const credentials: BiometricCredentials = { email: userEmail, password: userPassword };
            await SecureStore.setItemAsync(BIOMETRIC_CREDENTIALS_KEY, JSON.stringify(credentials));
            setHasSavedCredentials(true);
          },
        },
      ]
    );
  };

  const handleBiometricLogin = async (): Promise<void> => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Login to Dinner Plans',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      if (result.success) {
        const credentialsJson = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_KEY);
        if (credentialsJson) {
          const credentials: BiometricCredentials = JSON.parse(credentialsJson);
          setEmail(credentials.email);
          setPassword(credentials.password);
          const { error: signInError } = await signIn(credentials.email, credentials.password);
          if (signInError) {
            setError('Saved credentials are no longer valid. Please sign in manually.');
            await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY);
            setHasSavedCredentials(false);
          }
        }
      }
    } catch (err) {
      console.error('Biometric authentication error:', err);
      setError('Biometric authentication failed. Please try again.');
    }
  };

  const handleAppleSignIn = async (): Promise<void> => {
    try {
      setIsSocialLoading(true);
      setError(null);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (credential.identityToken) {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });
        if (error) {
          throw error;
        }
        if (data.user && credential.fullName) {
          const firstName = credential.fullName.givenName || '';
          const lastName = credential.fullName.familyName || '';
          if (firstName || lastName) {
            await supabase.auth.updateUser({
              data: { first_name: firstName, last_name: lastName },
            });
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && 'code' in err) {
        const appleError = err as { code: string };
        if (appleError.code !== 'ERR_REQUEST_CANCELED') {
          setError('Apple Sign In failed. Please try again.');
        }
      } else {
        setError('Apple Sign In failed. Please try again.');
      }
    } finally {
      setIsSocialLoading(false);
    }
  };

  const handleGoogleSignIn = async (): Promise<void> => {
    try {
      setIsSocialLoading(true);
      setError(null);
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'dinner-plans',
        path: 'auth/callback',
      });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
        if (result.type === 'success' && result.url) {
          const url = new URL(result.url);
          const params = new URLSearchParams(url.hash.substring(1));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          }
        }
      }
    } catch (err) {
      console.error('Google Sign In error:', err);
      setError('Google Sign In failed. Please try again.');
    } finally {
      setIsSocialLoading(false);
    }
  };

  const handleForgotPassword = async (): Promise<void> => {
    if (!forgotPasswordEmail.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }
    setIsSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail.trim(), {
        redirectTo: 'dinner-plans://auth/reset-password',
      });
      if (error) throw error;
      setResetSent(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send reset email';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSendingReset(false);
    }
  };

  const closeForgotPasswordModal = (): void => {
    setShowForgotPassword(false);
    setForgotPasswordEmail('');
    setResetSent(false);
  };

  const getBiometricIcon = (): keyof typeof Ionicons.glyphMap => {
    if (Platform.OS === 'ios') {
      return 'scan-outline';
    }
    return 'finger-print-outline';
  };

  const getBiometricLabel = (): string => {
    if (Platform.OS === 'ios') {
      return 'Face ID / Touch ID';
    }
    return 'Fingerprint';
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>DinnerPlans</Text>
            <Text style={styles.subtitle}>Manage your food inventory with ease</Text>
          </View>

          <View style={styles.form}>
            {isBiometricAvailable && hasSavedCredentials && (
              <TouchableOpacity
                style={styles.biometricButton}
                onPress={handleBiometricLogin}
                accessibilityLabel={`Sign in with ${getBiometricLabel()}`}
                accessibilityRole="button"
              >
                <View style={styles.biometricIconContainer}>
                  <Ionicons name={getBiometricIcon()} size={48} color={colors.brown} />
                </View>
                <Text style={styles.biometricText}>Sign in with {getBiometricLabel()}</Text>
              </TouchableOpacity>
            )}

            {isBiometricAvailable && hasSavedCredentials && (
              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>or sign in with email</Text>
                <View style={styles.divider} />
              </View>
            )}

            <Input
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
            />

            <TouchableOpacity
              style={styles.forgotPasswordLink}
              onPress={() => {
                setForgotPasswordEmail(email);
                setShowForgotPassword(true);
              }}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              style={styles.button}
            />

            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.socialButtons}>
              {isAppleAvailable && (
                <TouchableOpacity
                  style={[styles.socialButton, styles.appleButton]}
                  onPress={handleAppleSignIn}
                  disabled={isSocialLoading}
                  accessibilityLabel="Sign in with Apple"
                  accessibilityRole="button"
                >
                  {isSocialLoading ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <>
                      <Ionicons name="logo-apple" size={20} color={colors.white} />
                      <Text style={styles.appleButtonText}>Apple</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.socialButton, styles.googleButton]}
                onPress={handleGoogleSignIn}
                disabled={isSocialLoading}
                accessibilityLabel="Sign in with Google"
                accessibilityRole="button"
              >
                {isSocialLoading ? (
                  <ActivityIndicator color={colors.brown} size="small" />
                ) : (
                  <>
                    <Ionicons name="logo-google" size={20} color="#4285F4" />
                    <Text style={styles.googleButtonText}>Google</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <Link href="/(auth)/signup" asChild>
                <TouchableOpacity>
                  <Text style={styles.linkText}>Sign Up</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showForgotPassword}
        animationType="slide"
        transparent
        onRequestClose={closeForgotPasswordModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reset Password</Text>
              <TouchableOpacity onPress={closeForgotPasswordModal} accessibilityLabel="Close">
                <Ionicons name="close" size={24} color={colors.brown} />
              </TouchableOpacity>
            </View>
            {!resetSent ? (
              <>
                <Text style={styles.modalDescription}>
                  Enter your email address and we'll send you a link to reset your password.
                </Text>
                <Input
                  label="Email"
                  placeholder="Enter your email"
                  value={forgotPasswordEmail}
                  onChangeText={setForgotPasswordEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
                <Button
                  title={isSendingReset ? 'Sending...' : 'Send Reset Link'}
                  onPress={handleForgotPassword}
                  disabled={isSendingReset}
                  style={styles.modalButton}
                />
              </>
            ) : (
              <View style={styles.successContainer}>
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark-circle" size={64} color={colors.success} />
                </View>
                <Text style={styles.successTitle}>Email Sent!</Text>
                <Text style={styles.successDescription}>
                  We've sent a password reset link to {forgotPasswordEmail}. Please check your inbox and follow the instructions.
                </Text>
                <Button
                  title="Back to Login"
                  onPress={closeForgotPasswordModal}
                  style={styles.modalButton}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.space6,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.space8,
  },
  title: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.text4xl,
    fontWeight: typography.fontBold,
    color: colors.primary,
    marginBottom: spacing.space2,
  },
  subtitle: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textBase,
    color: colors.brownMuted,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  biometricButton: {
    alignItems: 'center',
    padding: spacing.space6,
    marginBottom: spacing.space4,
  },
  biometricIconContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.space3,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  biometricText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textBase,
    color: colors.brown,
    fontWeight: typography.fontSemibold,
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginBottom: spacing.space4,
    marginTop: -spacing.space2,
  },
  forgotPasswordText: {
    fontFamily: 'Nunito-Medium',
    color: colors.coral,
    fontSize: typography.textSm,
    fontWeight: typography.fontMedium,
  },
  errorText: {
    fontFamily: 'Nunito-Medium',
    color: colors.error,
    fontSize: typography.textSm,
    marginBottom: spacing.space4,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.space2,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.space6,
  },
  divider: {
    flex: 1,
    height: 2,
    backgroundColor: colors.creamDark,
  },
  dividerText: {
    fontFamily: 'Nunito-Regular',
    color: colors.brownMuted,
    fontSize: typography.textSm,
    paddingHorizontal: spacing.space4,
  },
  socialButtons: {
    flexDirection: 'row',
    gap: spacing.space3,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.space4,
    borderRadius: borderRadius.md,
    gap: spacing.space2,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  appleButton: {
    backgroundColor: colors.brown,
  },
  appleButtonText: {
    fontFamily: 'Nunito-SemiBold',
    color: colors.white,
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
  },
  googleButton: {
    backgroundColor: colors.white,
  },
  googleButtonText: {
    fontFamily: 'Nunito-SemiBold',
    color: colors.brown,
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.space6,
  },
  footerText: {
    fontFamily: 'Nunito-Regular',
    color: colors.brownMuted,
    fontSize: typography.textSm,
  },
  linkText: {
    fontFamily: 'Nunito-SemiBold',
    color: colors.coral,
    fontSize: typography.textSm,
    fontWeight: typography.fontSemibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(61, 35, 20, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.space6,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.brown,
    padding: spacing.space6,
    width: '100%',
    maxWidth: 400,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.space4,
  },
  modalTitle: {
    fontFamily: 'Quicksand-SemiBold',
    fontSize: typography.textXl,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  modalDescription: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    marginBottom: spacing.space5,
    lineHeight: typography.textSm * 1.5,
  },
  modalButton: {
    marginTop: spacing.space2,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: spacing.space4,
  },
  successIcon: {
    marginBottom: spacing.space4,
  },
  successTitle: {
    fontFamily: 'Quicksand-SemiBold',
    fontSize: typography.textXl,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
    marginBottom: spacing.space2,
  },
  successDescription: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    textAlign: 'center',
    lineHeight: typography.textSm * 1.5,
    marginBottom: spacing.space6,
  },
});
