import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { acceptInviteByToken } from '../../lib/householdService';
import { useAuth } from '../../context/AuthContext';
import { useHouseholdContext } from '../../context/HouseholdContext';
import { colors, textStyles, spacing, borderRadius } from '../../lib/theme';

export default function InviteScreen() {
  const params = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { refreshHouseholds } = useHouseholdContext();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying invitation...');

  useEffect(() => {
    if (!params.token) {
      setStatus('error');
      setMessage('This invitation link looks broken. Ask the household owner to send you a new one.');
      return;
    }

    if (!user) {
        setStatus('error');
        setMessage('Please log in to your account, then tap the invitation link again.');
        return;
    }

    acceptInvite();
  }, [params.token, user]);

  const acceptInvite = async () => {
    try {
      if (!user) return;
      await acceptInviteByToken({ token: params.token, userId: user.id });
      await refreshHouseholds();
      setStatus('success');
      setMessage('You have successfully joined the household!');
    } catch (e: any) {
      console.error('Invite error:', e);
      setStatus('error');
      const raw = e.message || '';
      if (raw.toLowerCase().includes('expired')) {
        setMessage('This invitation has expired. Ask the household owner to send a new invite.');
      } else if (raw.toLowerCase().includes('already')) {
        setMessage("You're already a member of this household!");
      } else {
        setMessage("Couldn't join the household. Check your connection and try again, or ask the owner for a new link.");
      }
    }
  };

  const handleContinue = () => {
    if (user) {
        router.replace('/(tabs)');
    } else {
        router.replace('/(auth)/login');
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Household Invite', headerShown: true }} />
      
      <View style={styles.content}>
        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.message}>{message}</Text>
          </>
        )}

        {status === 'success' && (
          <>
            <Ionicons name="checkmark-circle" size={64} color={colors.success} />
            <Text style={styles.title}>Welcome!</Text>
            <Text style={styles.message}>{message}</Text>
            <TouchableOpacity style={styles.button} onPress={handleContinue}>
              <Text style={styles.buttonText}>Go to Home</Text>
            </TouchableOpacity>
          </>
        )}

        {status === 'error' && (
          <>
            <Ionicons name="alert-circle" size={64} color={colors.error} />
            <Text style={styles.title}>Oops!</Text>
            <Text style={styles.message}>{message}</Text>
            <TouchableOpacity style={styles.button} onPress={handleContinue}>
              <Text style={styles.buttonText}>Back to Home</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: {
    ...textStyles.headline2,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  message: {
    ...textStyles.body,
    color: colors.brownMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.md,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  buttonText: {
    ...textStyles.buttonText,
    color: colors.white,
  },
});
