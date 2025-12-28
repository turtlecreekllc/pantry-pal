import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { acceptInviteByToken } from '../../lib/householdService';
import { useAuth } from '../../context/AuthContext';
import { useHouseholdContext } from '../../context/HouseholdContext';

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
      setMessage('Invalid invitation link');
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
      setMessage(e.message || 'Failed to accept invitation');
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
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.message}>{message}</Text>
          </>
        )}

        {status === 'success' && (
          <>
            <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
            <Text style={styles.title}>Welcome!</Text>
            <Text style={styles.message}>{message}</Text>
            <TouchableOpacity style={styles.button} onPress={handleContinue}>
              <Text style={styles.buttonText}>Go to Home</Text>
            </TouchableOpacity>
          </>
        )}

        {status === 'error' && (
          <>
            <Ionicons name="alert-circle" size={64} color="#f44336" />
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
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    marginTop: 16,
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
