import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Animated,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useHouseholdContext } from '../context/HouseholdContext';
import { useAuth } from '../context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ONBOARDING_DISMISSED_KEY = 'pantry_pal_household_onboarding_dismissed';

interface HouseholdOnboardingProps {
  /** Force show even if dismissed before */
  forceShow?: boolean;
}

type OnboardingStep = 'welcome' | 'choice' | 'create' | 'join' | 'skip';

/**
 * Onboarding flow that guides new users to create or join a household.
 * Shows automatically for users without a household.
 */
export function HouseholdOnboarding({ forceShow = false }: HouseholdOnboardingProps) {
  const { user } = useAuth();
  const { hasHousehold, createNewHousehold, pendingInvites, loading } = useHouseholdContext();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [householdName, setHouseholdName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    checkShouldShow();
  }, [user, hasHousehold, loading, forceShow]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  const checkShouldShow = async () => {
    if (loading || !user) return;
    if (hasHousehold) {
      setVisible(false);
      return;
    }
    if (forceShow) {
      setVisible(true);
      return;
    }
    const dismissed = await AsyncStorage.getItem(`${ONBOARDING_DISMISSED_KEY}_${user.id}`);
    if (!dismissed) {
      setVisible(true);
    }
  };

  const handleDismiss = async () => {
    if (user) {
      await AsyncStorage.setItem(`${ONBOARDING_DISMISSED_KEY}_${user.id}`, 'true');
    }
    setVisible(false);
    setStep('welcome');
    setHouseholdName('');
  };

  const handleCreateHousehold = async () => {
    if (!householdName.trim()) {
      Alert.alert('Error', 'Please enter a name for your household');
      return;
    }
    setIsCreating(true);
    try {
      await createNewHousehold(householdName.trim());
      setVisible(false);
      Alert.alert('Welcome!', 'Your household has been created. You can now invite family members from the settings.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create household';
      Alert.alert('Error', message);
    } finally {
      setIsCreating(false);
    }
  };

  const renderWelcomeStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconCircle}>
        <Ionicons name="home" size={48} color="#4CAF50" />
      </View>
      <Text style={styles.title}>Welcome to Pantry Pal!</Text>
      <Text style={styles.description}>
        Get the most out of your pantry by sharing with your household. Sync pantry items, meal
        plans, and grocery lists with family members.
      </Text>
      <TouchableOpacity style={styles.primaryButton} onPress={() => setStep('choice')}>
        <Text style={styles.primaryButtonText}>Get Started</Text>
        <Ionicons name="arrow-forward" size={20} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.skipButton} onPress={handleDismiss}>
        <Text style={styles.skipButtonText}>Skip for now</Text>
      </TouchableOpacity>
    </View>
  );

  const renderChoiceStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>How would you like to start?</Text>
      <Text style={styles.description}>
        Create a new household or join an existing one if someone has invited you.
      </Text>
      <TouchableOpacity style={styles.optionCard} onPress={() => setStep('create')}>
        <View style={[styles.optionIcon, { backgroundColor: '#e8f5e9' }]}>
          <Ionicons name="add-circle" size={32} color="#4CAF50" />
        </View>
        <View style={styles.optionContent}>
          <Text style={styles.optionTitle}>Create a Household</Text>
          <Text style={styles.optionDescription}>
            Start fresh and invite your family members
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#ccc" />
      </TouchableOpacity>
      {pendingInvites.length > 0 && (
        <View style={styles.inviteBanner}>
          <Ionicons name="mail" size={20} color="#2196F3" />
          <Text style={styles.inviteBannerText}>
            You have {pendingInvites.length} pending invite{pendingInvites.length !== 1 ? 's' : ''}!
          </Text>
        </View>
      )}
      <TouchableOpacity style={styles.optionCard} onPress={() => setStep('join')}>
        <View style={[styles.optionIcon, { backgroundColor: '#e3f2fd' }]}>
          <Ionicons name="people" size={32} color="#2196F3" />
        </View>
        <View style={styles.optionContent}>
          <Text style={styles.optionTitle}>Join a Household</Text>
          <Text style={styles.optionDescription}>
            Accept an invite from someone else
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#ccc" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.backLink} onPress={() => setStep('welcome')}>
        <Ionicons name="arrow-back" size={18} color="#666" />
        <Text style={styles.backLinkText}>Back</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCreateStep = () => (
    <View style={styles.stepContainer}>
      <View style={[styles.iconCircle, { backgroundColor: '#e8f5e9' }]}>
        <Ionicons name="add-circle" size={48} color="#4CAF50" />
      </View>
      <Text style={styles.title}>Name Your Household</Text>
      <Text style={styles.description}>
        Give your household a name that everyone will recognize.
      </Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="e.g., Smith Family, Apartment 4B"
          value={householdName}
          onChangeText={setHouseholdName}
          autoFocus
          maxLength={50}
        />
      </View>
      <TouchableOpacity
        style={[styles.primaryButton, isCreating && styles.disabledButton]}
        onPress={handleCreateHousehold}
        disabled={isCreating}
      >
        {isCreating ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={styles.primaryButtonText}>Create Household</Text>
            <Ionicons name="checkmark" size={20} color="#fff" />
          </>
        )}
      </TouchableOpacity>
      <TouchableOpacity style={styles.backLink} onPress={() => setStep('choice')}>
        <Ionicons name="arrow-back" size={18} color="#666" />
        <Text style={styles.backLinkText}>Back</Text>
      </TouchableOpacity>
    </View>
  );

  const renderJoinStep = () => (
    <View style={styles.stepContainer}>
      <View style={[styles.iconCircle, { backgroundColor: '#e3f2fd' }]}>
        <Ionicons name="people" size={48} color="#2196F3" />
      </View>
      <Text style={styles.title}>Join a Household</Text>
      {pendingInvites.length > 0 ? (
        <>
          <Text style={styles.description}>
            You have pending invites! Accept one to join that household.
          </Text>
          <View style={styles.inviteList}>
            {pendingInvites.map((invite) => (
              <View key={invite.id} style={styles.inviteCard}>
                <View style={styles.inviteInfo}>
                  <Text style={styles.inviteHouseholdName}>
                    {invite.household_name || 'Unknown Household'}
                  </Text>
                  <Text style={styles.inviteExpiry}>
                    Expires: {new Date(invite.expires_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
          <Text style={styles.hintText}>
            Accept invites from the banner at the top of your pantry.
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.description}>
            You don't have any pending invites. Ask a household member to send you an invite link.
          </Text>
          <View style={styles.tipBox}>
            <Ionicons name="information-circle" size={20} color="#666" />
            <Text style={styles.tipText}>
              When you receive an invite link, open it in the app to join the household.
            </Text>
          </View>
        </>
      )}
      <TouchableOpacity style={styles.backLink} onPress={() => setStep('choice')}>
        <Ionicons name="arrow-back" size={18} color="#666" />
        <Text style={styles.backLinkText}>Back</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.skipButton} onPress={handleDismiss}>
        <Text style={styles.skipButtonText}>I'll do this later</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return renderWelcomeStep();
      case 'choice':
        return renderChoiceStep();
      case 'create':
        return renderCreateStep();
      case 'join':
        return renderJoinStep();
      default:
        return renderWelcomeStep();
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleDismiss}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity style={styles.closeButton} onPress={handleDismiss}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          {renderStep()}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepContainer: {
    padding: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    gap: 8,
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  disabledButton: {
    opacity: 0.6,
  },
  skipButton: {
    paddingVertical: 12,
  },
  skipButtonText: {
    fontSize: 14,
    color: '#666',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 12,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: '#666',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    marginTop: 8,
  },
  backLinkText: {
    fontSize: 14,
    color: '#666',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  inviteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    width: '100%',
    marginBottom: 12,
    gap: 8,
  },
  inviteBannerText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '500',
  },
  inviteList: {
    width: '100%',
    marginBottom: 16,
  },
  inviteCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  inviteInfo: {
    flex: 1,
  },
  inviteHouseholdName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  inviteExpiry: {
    fontSize: 12,
    color: '#666',
  },
  hintText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

