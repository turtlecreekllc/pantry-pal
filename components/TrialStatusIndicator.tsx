/**
 * TrialStatusIndicator Component
 * Persistent trial status indicator for app header/navigation
 * Shows countdown and urgency-based styling
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, spacing, typography } from '../lib/theme';

interface TrialStatusIndicatorProps {
  daysRemaining: number;
  onPress: () => void;
}

/**
 * Persistent trial status indicator that shows countdown and urgency-based styling
 * - Days 1-7: Subtle indicator (green)
 * - Days 8-11: Moderate prominence (amber)
 * - Days 12-14: High prominence (red, gentle pulse)
 */
export function TrialStatusIndicator({
  daysRemaining,
  onPress,
}: TrialStatusIndicatorProps) {
  const { urgencyLevel, backgroundColor, textColor, iconColor, message } = useMemo(() => {
    if (daysRemaining <= 0) {
      return {
        urgencyLevel: 'expired' as const,
        backgroundColor: colors.errorBg,
        textColor: colors.error,
        iconColor: colors.error,
        message: 'Trial ended',
      };
    }
    if (daysRemaining <= 3) {
      return {
        urgencyLevel: 'high' as const,
        backgroundColor: colors.errorBg,
        textColor: '#C62828',
        iconColor: colors.error,
        message: daysRemaining === 1 ? 'Trial ends tomorrow' : `${daysRemaining} days left`,
      };
    }
    if (daysRemaining <= 7) {
      return {
        urgencyLevel: 'moderate' as const,
        backgroundColor: colors.warningBg,
        textColor: '#E65100',
        iconColor: colors.warning,
        message: `${daysRemaining} days left`,
      };
    }
    return {
      urgencyLevel: 'low' as const,
      backgroundColor: colors.successBg,
      textColor: '#2E7D32',
      iconColor: colors.success,
      message: `${daysRemaining} days left`,
    };
  }, [daysRemaining]);

  const iconName = useMemo(() => {
    switch (urgencyLevel) {
      case 'expired':
        return 'alert-circle';
      case 'high':
        return 'time';
      case 'moderate':
        return 'hourglass';
      default:
        return 'gift';
    }
  }, [urgencyLevel]);

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor }]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`Premium trial ${message}. Tap to view subscription options.`}
    >
      <View style={styles.content}>
        <Ionicons name={iconName} size={16} color={iconColor} />
        <Text style={[styles.badge, { color: textColor }]}>Premium Trial</Text>
        <View style={styles.divider} />
        <Text style={[styles.countdown, { color: textColor }]}>{message}</Text>
      </View>
      <View style={styles.subscribeButton}>
        <Text style={styles.subscribeText}>Subscribe</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.primary} />
      </View>
    </TouchableOpacity>
  );
}

/**
 * Compact version for inline display in headers
 */
export function TrialStatusBadge({
  daysRemaining,
  onPress,
}: TrialStatusIndicatorProps) {
  const isUrgent = daysRemaining <= 3;
  const backgroundColor = isUrgent ? colors.errorBg : colors.warningBg;
  const textColor = isUrgent ? '#C62828' : '#E65100';

  return (
    <TouchableOpacity
      style={[styles.badge, { backgroundColor }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Trial ends in ${daysRemaining} days`}
    >
      <Ionicons
        name={isUrgent ? 'time' : 'gift'}
        size={14}
        color={textColor}
      />
      <Text style={[styles.badgeText, { color: textColor }]}>
        {daysRemaining}d
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space2,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.space4,
    marginVertical: spacing.space2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.space2,
    paddingVertical: spacing.space1,
    borderRadius: borderRadius.full,
    gap: spacing.space1,
  },
  badgeText: {
    fontSize: typography.textXs,
    fontWeight: typography.fontSemibold,
  },
  divider: {
    width: 1,
    height: 14,
    backgroundColor: colors.brownMuted,
    opacity: 0.3,
  },
  countdown: {
    fontSize: typography.textSm,
    fontWeight: typography.fontSemibold,
  },
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.space3,
    paddingVertical: spacing.space1,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  subscribeText: {
    fontSize: typography.textXs,
    fontWeight: typography.fontSemibold,
    color: colors.primaryDark,
  },
});

