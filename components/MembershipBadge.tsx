/**
 * MembershipBadge Component
 * Displays user's subscription status in the header
 * Shows trial days remaining, premium status, or free tier
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSubscription } from '../hooks/useSubscription';
import { colors, typography, spacing, borderRadius } from '../lib/theme';

interface MembershipBadgeProps {
  /** Optional callback when badge is pressed */
  onPress?: () => void;
}

/**
 * Membership status badge for header display
 * Tappable to navigate to subscription settings
 */
export function MembershipBadge({ onPress }: MembershipBadgeProps): React.ReactElement | null {
  const router = useRouter();
  const { tier, isTrial, isPremium, daysUntilTrialEnd, loading } = useSubscription();
  const handlePress = (): void => {
    if (onPress) {
      onPress();
    } else {
      router.push('/settings/subscription');
    }
  };
  if (loading) {
    return null;
  }
  // Premium user - show crown badge
  if (isPremium && !isTrial) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        style={styles.container}
        accessibilityLabel="Premium member - tap to view subscription"
        accessibilityRole="button"
      >
        <View style={[styles.badge, styles.premiumBadge]}>
          <Ionicons name="diamond" size={14} color={colors.white} />
          <Text style={styles.premiumText}>PRO</Text>
        </View>
      </TouchableOpacity>
    );
  }
  // Trial user - show days remaining
  if (isTrial && daysUntilTrialEnd !== null) {
    const isLowDays = daysUntilTrialEnd <= 3;
    return (
      <TouchableOpacity
        onPress={handlePress}
        style={styles.container}
        accessibilityLabel={`Trial: ${daysUntilTrialEnd} days remaining - tap to view subscription`}
        accessibilityRole="button"
      >
        <View style={[styles.badge, styles.trialBadge, isLowDays && styles.trialBadgeUrgent]}>
          <Ionicons 
            name="time-outline" 
            size={12} 
            color={isLowDays ? colors.white : colors.brown} 
          />
          <Text style={[styles.trialText, isLowDays && styles.trialTextUrgent]}>
            {daysUntilTrialEnd}d
          </Text>
        </View>
      </TouchableOpacity>
    );
  }
  // Free user - show upgrade prompt badge
  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.container}
      accessibilityLabel="Free tier - tap to upgrade"
      accessibilityRole="button"
    >
      <View style={[styles.badge, styles.freeBadge]}>
        <Ionicons name="sparkles" size={14} color={colors.primary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginRight: spacing.space4,
    padding: spacing.space1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.space2,
    paddingVertical: spacing.space1,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
  },
  premiumBadge: {
    backgroundColor: colors.brown,
    borderColor: colors.brown,
  },
  premiumText: {
    fontFamily: 'Nunito-Bold',
    fontSize: typography.textXs,
    fontWeight: typography.fontBold,
    color: colors.white,
    letterSpacing: 0.5,
  },
  trialBadge: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  trialBadgeUrgent: {
    backgroundColor: colors.coral,
    borderColor: colors.coral,
  },
  trialText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textXs,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  trialTextUrgent: {
    color: colors.white,
  },
  freeBadge: {
    backgroundColor: colors.cream,
    borderColor: colors.primary,
  },
});

