import React from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../lib/theme';
import { styles } from '../styles';

interface SubscriptionStepProps {
  fadeAnim: Animated.Value;
  onStartTrial: () => void;
  onSkipToFree: () => void;
}

const TRIAL_FEATURES = [
  'Unlimited AI meal suggestions',
  'Household sharing (up to 6 people)',
  'Full nutrition tracking',
  'Unlimited pantry & saved recipes',
  'Priority Pepper support',
];

export function SubscriptionStep({
  fadeAnim,
  onStartTrial,
  onSkipToFree,
}: SubscriptionStepProps): React.ReactElement {
  return (
    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
      <Text style={styles.subTitle}>You're all set! One more thing...</Text>

      <View style={styles.trialCard}>
        <Text style={styles.trialEmoji}>🎁</Text>
        <Text style={styles.trialTitle}>TRY PREMIUM FREE FOR 14 DAYS</Text>

        <View style={styles.trialFeatures}>
          {TRIAL_FEATURES.map((feature, index) => (
            <View key={index} style={styles.trialFeatureItem}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.trialFeatureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <View style={styles.savingsCallout}>
          <Ionicons name="cash-outline" size={20} color={colors.success} />
          <Text style={styles.savingsText}>
            Families save $100+/month on groceries
          </Text>
        </View>

        <Text style={styles.priceText}>
          Your subscription: $6.99/month (pays for itself!)
        </Text>

        <TouchableOpacity style={styles.trialButton} onPress={onStartTrial}>
          <Text style={styles.trialButtonText}>Start Free Trial — No Card Required</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.freeLink} onPress={onSkipToFree}>
        <Text style={styles.freeLinkText}>I'll stick with free for now ↓</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
