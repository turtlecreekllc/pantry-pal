import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { colors, typography, spacing, borderRadius } from '../../lib/theme';

export default function SignUpScreen(): React.ReactElement {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { signUp, loading } = useAuth();

  const handleSignUp = async (): Promise<void> => {
    setError(null);
    setSuccessMessage(null);
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    if (!password) {
      setError('Please enter a password');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    const { error: signUpError, message } = await signUp(email.trim(), password);
    if (signUpError) {
      setError(signUpError.message || 'Failed to create account');
    } else if (message) {
      setSuccessMessage(message);
    }
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
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join DinnerPlans to start tracking your food</Text>
          </View>

          <View style={styles.form}>
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
              placeholder="Create a password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password-new"
            />

            <Input
              label="Confirm Password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password-new"
            />

            {error && <Text style={styles.errorText}>{error}</Text>}

            {successMessage && (
              <View style={styles.successContainer}>
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            )}

            <Button
              title={successMessage ? 'Resend Email' : 'Create Account'}
              onPress={handleSignUp}
              loading={loading}
              disabled={!!successMessage}
              style={styles.button}
            />

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text style={styles.linkText}>Sign In</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    marginBottom: spacing.space12,
  },
  title: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.text3xl,
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
  errorText: {
    fontFamily: 'Nunito-Medium',
    color: colors.error,
    fontSize: typography.textSm,
    marginBottom: spacing.space4,
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: colors.successBg,
    padding: spacing.space4,
    borderRadius: borderRadius.md,
    marginBottom: spacing.space4,
    borderWidth: 1,
    borderColor: colors.success,
  },
  successText: {
    fontFamily: 'Nunito-Medium',
    color: colors.success,
    fontSize: typography.textSm,
    textAlign: 'center',
    lineHeight: typography.textSm * 1.5,
  },
  button: {
    marginTop: spacing.space2,
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
});
