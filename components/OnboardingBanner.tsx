/**
 * OnboardingBanner Component
 * Displays a friendly reminder to complete onboarding setup
 * Includes progress indicator and reward preview
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../lib/theme';

const MascotImage = require('../assets/icon.png');

interface OnboardingBannerProps {
  /** Current onboarding step (0 = not started, 999 = completed) */
  onboardingStep: number;
  /** Callback when banner is dismissed (optional) */
  onDismiss?: () => void;
  /** Show compact version */
  compact?: boolean;
}

// Onboarding has approximately 6 main steps
const TOTAL_STEPS = 6;

/**
 * Calculate progress percentage from onboarding step
 */
function getProgressPercent(step: number): number {
  if (step >= 999) return 100;
  if (step <= 0) return 0;
  return Math.min(Math.round((step / TOTAL_STEPS) * 100), 95); // Max 95% until complete
}

/**
 * Get encouraging message based on progress
 */
function getProgressMessage(step: number): { title: string; subtitle: string } {
  if (step === 0) {
    return {
      title: "Let's get you set up! 🎯",
      subtitle: "Complete setup to unlock personalized meal suggestions",
    };
  }
  if (step === 1) {
    return {
      title: "Great start! Keep going! 🚀",
      subtitle: "Tell us about your household to personalize your experience",
    };
  }
  if (step < 4) {
    return {
      title: "You're halfway there! 💪",
      subtitle: "Just a few more steps to unlock your chef badge",
    };
  }
  return {
    title: "Almost done! 🎉",
    subtitle: "Finish setup to earn 50 bonus tokens!",
  };
}

export function OnboardingBanner({
  onboardingStep,
  onDismiss,
  compact = false,
}: OnboardingBannerProps): React.ReactElement | null {
  const router = useRouter();
  const progress = useMemo(() => getProgressPercent(onboardingStep), [onboardingStep]);
  const message = useMemo(() => getProgressMessage(onboardingStep), [onboardingStep]);

  const handlePress = () => {
    router.push('/onboarding');
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.compactContainer}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <View style={styles.compactIconContainer}>
          <Image source={MascotImage} style={styles.compactMascot} resizeMode="contain" />
        </View>
        <View style={styles.compactContent}>
          <Text style={styles.compactTitle}>Finish setup to earn rewards!</Text>
          <View style={styles.compactProgressBar}>
            <View style={[styles.compactProgressFill, { width: `${progress}%` }]} />
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.brown} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      {/* Dismiss button */}
      {onDismiss && (
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={onDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={18} color={colors.brownMuted} />
        </TouchableOpacity>
      )}

      <View style={styles.content}>
        {/* Left side - Mascot with progress ring */}
        <View style={styles.mascotContainer}>
          <View style={styles.progressRing}>
            <View style={[styles.progressRingFill, { 
              borderTopColor: progress >= 25 ? colors.primary : colors.creamDark,
              borderRightColor: progress >= 50 ? colors.primary : colors.creamDark,
              borderBottomColor: progress >= 75 ? colors.primary : colors.creamDark,
              borderLeftColor: progress >= 100 ? colors.primary : colors.creamDark,
            }]} />
            <Image source={MascotImage} style={styles.mascot} resizeMode="contain" />
          </View>
          <View style={styles.progressBadge}>
            <Text style={styles.progressBadgeText}>{progress}%</Text>
          </View>
        </View>

        {/* Right side - Message */}
        <View style={styles.messageContainer}>
          <Text style={styles.title}>{message.title}</Text>
          <Text style={styles.subtitle}>{message.subtitle}</Text>
          
          {/* Reward preview */}
          <View style={styles.rewardPreview}>
            <Ionicons name="gift-outline" size={14} color={colors.coral} />
            <Text style={styles.rewardText}>
              {progress < 50 ? '🏆 Chef badge' : '⚡ 50 bonus tokens'}
            </Text>
          </View>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressLabel}>
          {progress < 100 ? 'Continue setup' : 'Complete!'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.space4,
    marginTop: spacing.space3,
    marginBottom: spacing.space2,
    padding: spacing.space4,
    backgroundColor: colors.peachLight,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.coral,
    ...shadows.sm,
  },
  dismissButton: {
    position: 'absolute',
    top: spacing.space2,
    right: spacing.space2,
    zIndex: 1,
    padding: spacing.space1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mascotContainer: {
    marginRight: spacing.space4,
    position: 'relative',
  },
  progressRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.cream,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.creamDark,
  },
  progressRingFill: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 32,
    borderWidth: 3,
  },
  mascot: {
    width: 48,
    height: 48,
  },
  progressBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.space2,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  progressBadgeText: {
    fontFamily: 'Nunito-Bold',
    fontSize: typography.textXs,
    fontWeight: typography.fontBold,
    color: colors.brown,
  },
  messageContainer: {
    flex: 1,
  },
  title: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.textBase,
    fontWeight: typography.fontBold,
    color: colors.brown,
    marginBottom: spacing.space1,
  },
  subtitle: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownLight,
    lineHeight: typography.textSm * 1.4,
    marginBottom: spacing.space2,
  },
  rewardPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space1,
    backgroundColor: colors.cream,
    paddingHorizontal: spacing.space2,
    paddingVertical: spacing.space1,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  rewardText: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textXs,
    fontWeight: typography.fontMedium,
    color: colors.coral,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.space4,
    gap: spacing.space3,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.cream,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.brownMuted,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  progressLabel: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textSm,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  // Compact styles
  compactContainer: {
    marginHorizontal: spacing.space4,
    marginTop: spacing.space2,
    marginBottom: spacing.space1,
    padding: spacing.space3,
    backgroundColor: colors.peachLight,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.coral,
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cream,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.space3,
  },
  compactMascot: {
    width: 28,
    height: 28,
  },
  compactContent: {
    flex: 1,
  },
  compactTitle: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textSm,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
    marginBottom: spacing.space1,
  },
  compactProgressBar: {
    height: 4,
    backgroundColor: colors.cream,
    borderRadius: 2,
    overflow: 'hidden',
  },
  compactProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
});

