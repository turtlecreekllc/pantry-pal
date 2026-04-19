/**
 * TrialNudgeModal Component
 * Strategic modals for key trial moments based on behavioral nudge PRD
 * Day 3: First value moment celebration
 * Day 7: Halfway checkpoint
 * Day 10: Soft urgency
 * Day 12-13: Strong loss aversion
 * Day 14: Final push
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, spacing, typography, shadows } from '../lib/theme';
import { PLAN_PRICING } from '../lib/types';

interface TrialStats {
  pantryItems: number;
  savedRecipes: number;
  mealPlansGenerated: number;
  estimatedSavings: number;
  daysUsed: number;
}

type NudgeType = 
  | 'first_value' 
  | 'halfway' 
  | 'soft_urgency' 
  | 'strong_urgency' 
  | 'final_push';

interface TrialNudgeModalProps {
  visible: boolean;
  nudgeType: NudgeType;
  daysRemaining: number;
  stats: TrialStats;
  trialEndDate: string;
  onStartSubscription: (plan: 'premium_monthly' | 'premium_annual') => void;
  onDismiss: () => void;
}

/**
 * Strategic trial nudge modal based on day in trial
 */
export function TrialNudgeModal({
  visible,
  nudgeType,
  daysRemaining,
  stats,
  trialEndDate,
  onStartSubscription,
  onDismiss,
}: TrialNudgeModalProps) {
  const config = useMemo(() => getNudgeConfig(nudgeType, daysRemaining, stats, trialEndDate), [
    nudgeType,
    daysRemaining,
    stats,
    trialEndDate,
  ]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.container, config.urgent && styles.containerUrgent]}>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={onDismiss}
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={24} color={colors.brownMuted} />
              </TouchableOpacity>

              {/* Icon */}
              <View style={[styles.iconContainer, { backgroundColor: config.iconBg }]}>
                <Ionicons name={config.icon as any} size={40} color={config.iconColor} />
              </View>

              {/* Title */}
              <Text style={[styles.title, config.urgent && styles.titleUrgent]}>
                {config.title}
              </Text>

              {/* Subtitle */}
              {config.subtitle && (
                <Text style={styles.subtitle}>{config.subtitle}</Text>
              )}

              {/* Stats (for later trial days) */}
              {config.showStats && (
                <View style={styles.statsContainer}>
                  <Text style={styles.statsTitle}>Here's what you've built:</Text>
                  <View style={styles.statsGrid}>
                    <StatItem 
                      value={stats.pantryItems} 
                      label="Pantry Items" 
                      icon="basket" 
                    />
                    <StatItem 
                      value={stats.savedRecipes} 
                      label="Saved Recipes" 
                      icon="book" 
                    />
                    <StatItem 
                      value={stats.mealPlansGenerated} 
                      label="AI Plans" 
                      icon="sparkles" 
                    />
                    <StatItem 
                      value={`$${stats.estimatedSavings}`} 
                      label="Est. Savings" 
                      icon="cash" 
                      highlighted
                    />
                  </View>
                </View>
              )}

              {/* Loss message (for urgent nudges) */}
              {config.lossMessage && (
                <View style={styles.lossMessageContainer}>
                  <Ionicons name="warning" size={18} color={colors.warning} />
                  <Text style={styles.lossMessageText}>{config.lossMessage}</Text>
                </View>
              )}

              {/* ROI callout */}
              <View style={styles.roiContainer}>
                <Ionicons name="trending-up" size={18} color={colors.success} />
                <Text style={styles.roiText}>
                  Premium costs less than one meal out — and saves you $100+/month
                </Text>
              </View>

              {/* Plan options */}
              <View style={styles.planOptions}>
                <TouchableOpacity
                  style={styles.planOption}
                  onPress={() => onStartSubscription('premium_monthly')}
                >
                  <Text style={styles.planName}>Monthly</Text>
                  <Text style={styles.planPrice}>{PLAN_PRICING.premium_monthly.displayPrice}</Text>
                  <Text style={styles.planPeriod}>/month</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.planOption, styles.planOptionRecommended]}
                  onPress={() => onStartSubscription('premium_annual')}
                >
                  <View style={styles.saveBadge}>
                    <Text style={styles.saveBadgeText}>Save 18%</Text>
                  </View>
                  <Text style={[styles.planName, styles.planNameRecommended]}>Annual</Text>
                  <Text style={[styles.planPrice, styles.planPriceRecommended]}>
                    {PLAN_PRICING.premium_annual.monthlyEquivalent}
                  </Text>
                  <Text style={styles.planPeriod}>/month</Text>
                  <Text style={styles.planNote}>Best Value</Text>
                </TouchableOpacity>
              </View>

              {/* Primary CTA for final push */}
              {config.showOneClick && (
                <TouchableOpacity
                  style={styles.oneClickButton}
                  onPress={() => onStartSubscription('premium_annual')}
                >
                  <Text style={styles.oneClickText}>Subscribe Now — {PLAN_PRICING.premium_annual.monthlyEquivalent}/mo</Text>
                </TouchableOpacity>
              )}

              {/* Dismiss option */}
              <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
                <Text style={styles.dismissText}>
                  {config.dismissText || 'Maybe Later'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

interface NudgeConfig {
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle?: string;
  showStats: boolean;
  lossMessage?: string;
  showOneClick: boolean;
  dismissText?: string;
  urgent: boolean;
}

function getNudgeConfig(
  type: NudgeType,
  daysRemaining: number,
  stats: TrialStats,
  trialEndDate: string
): NudgeConfig {
  switch (type) {
    case 'first_value':
      return {
        icon: 'sparkles',
        iconBg: colors.successBg,
        iconColor: colors.success,
        title: 'Your first AI-powered moment! 🎉',
        subtitle: 'This is what Premium makes possible.',
        showStats: false,
        showOneClick: false,
        dismissText: 'Keep Exploring',
        urgent: false,
      };

    case 'halfway':
      return {
        icon: 'flag',
        iconBg: colors.peachLight,
        iconColor: colors.primary,
        title: 'Halfway Through Your Trial!',
        subtitle: `You've been using DinnerPlans for ${stats.daysUsed} days.`,
        showStats: true,
        showOneClick: false,
        dismissText: 'Continue Trial',
        urgent: false,
      };

    case 'soft_urgency':
      return {
        icon: 'time',
        iconBg: colors.warningBg,
        iconColor: colors.warning,
        title: `${daysRemaining} Days Left in Your Trial`,
        subtitle: "Here's what you've accomplished so far.",
        showStats: true,
        lossMessage: 'Without Premium, AI features and unlimited access go away.',
        showOneClick: false,
        dismissText: 'I\'ll Decide Later',
        urgent: false,
      };

    case 'strong_urgency':
      return {
        icon: 'alert-circle',
        iconBg: colors.errorBg,
        iconColor: colors.error,
        title: 'Your Trial Ends Soon',
        subtitle: new Date(trialEndDate).toLocaleDateString(undefined, { 
          weekday: 'long', 
          month: 'short', 
          day: 'numeric' 
        }),
        showStats: true,
        lossMessage: `Your ${stats.pantryItems} pantry items and ${stats.savedRecipes} saved recipes become limited.`,
        showOneClick: false,
        dismissText: 'Remind Me Tomorrow',
        urgent: true,
      };

    case 'final_push':
      return {
        icon: 'hourglass',
        iconBg: colors.errorBg,
        iconColor: colors.error,
        title: 'Last Day of Premium',
        subtitle: 'Don\'t lose everything you\'ve built.',
        showStats: true,
        lossMessage: `You've saved an estimated $${stats.estimatedSavings} so far. Keep saving with Premium.`,
        showOneClick: true,
        dismissText: 'Let Trial Expire',
        urgent: true,
      };

    default:
      return {
        icon: 'gift',
        iconBg: colors.peachLight,
        iconColor: colors.primary,
        title: 'Enjoying Your Trial?',
        showStats: false,
        showOneClick: false,
        urgent: false,
      };
  }
}

interface StatItemProps {
  value: number | string;
  label: string;
  icon: string;
  highlighted?: boolean;
}

function StatItem({ value, label, icon, highlighted }: StatItemProps) {
  return (
    <View style={[styles.statItem, highlighted && styles.statItemHighlighted]}>
      <Ionicons 
        name={icon as any} 
        size={18} 
        color={highlighted ? colors.success : colors.brownMuted} 
      />
      <Text style={[styles.statValue, highlighted && styles.statValueHighlighted]}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/**
 * Determines which nudge type to show based on trial day
 */
export function getNudgeTypeForTrialDay(
  daysInTrial: number,
  hasSeenFirstValue: boolean
): NudgeType | null {
  // Day 3: First value moment (if hasn't seen one yet)
  if (daysInTrial <= 3 && !hasSeenFirstValue) {
    return 'first_value';
  }
  // Day 7: Halfway check-in
  if (daysInTrial === 7) {
    return 'halfway';
  }
  // Day 10: Soft urgency
  if (daysInTrial === 10) {
    return 'soft_urgency';
  }
  // Days 12-13: Strong urgency
  if (daysInTrial === 12 || daysInTrial === 13) {
    return 'strong_urgency';
  }
  // Day 14: Final push
  if (daysInTrial === 14) {
    return 'final_push';
  }
  return null;
}

/**
 * Check if user should see a nudge today (once per day max)
 */
export function shouldShowNudgeToday(
  lastNudgeDate: string | null,
  nudgeType: NudgeType
): boolean {
  if (!lastNudgeDate) return true;
  const last = new Date(lastNudgeDate);
  const now = new Date();
  // Only show one nudge per day
  return last.toDateString() !== now.toDateString();
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.brown,
    padding: spacing.space6,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  containerUrgent: {
    borderColor: colors.error,
    borderWidth: 3,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.space3,
    right: spacing.space3,
    zIndex: 1,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.space4,
  },
  title: {
    fontSize: typography.textXl,
    fontWeight: typography.fontBold,
    color: colors.brown,
    textAlign: 'center',
    marginBottom: spacing.space2,
  },
  titleUrgent: {
    color: colors.error,
  },
  subtitle: {
    fontSize: typography.textBase,
    color: colors.brownMuted,
    textAlign: 'center',
    marginBottom: spacing.space4,
  },
  // Stats
  statsContainer: {
    width: '100%',
    backgroundColor: colors.cream,
    borderRadius: borderRadius.md,
    padding: spacing.space4,
    marginBottom: spacing.space4,
  },
  statsTitle: {
    fontSize: typography.textSm,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
    marginBottom: spacing.space3,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.space2,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    padding: spacing.space2,
  },
  statItemHighlighted: {
    backgroundColor: colors.successBg,
  },
  statValue: {
    fontSize: typography.textLg,
    fontWeight: typography.fontBold,
    color: colors.brown,
    marginTop: spacing.space1,
  },
  statValueHighlighted: {
    color: '#2E7D32',
  },
  statLabel: {
    fontSize: 10,
    color: colors.brownMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  // Loss message
  lossMessageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.warningBg,
    borderRadius: borderRadius.sm,
    padding: spacing.space3,
    marginBottom: spacing.space4,
    width: '100%',
    gap: spacing.space2,
  },
  lossMessageText: {
    flex: 1,
    fontSize: typography.textSm,
    color: '#E65100',
    lineHeight: 18,
  },
  // ROI
  roiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successBg,
    borderRadius: borderRadius.sm,
    padding: spacing.space3,
    marginBottom: spacing.space4,
    width: '100%',
    gap: spacing.space2,
  },
  roiText: {
    flex: 1,
    fontSize: typography.textSm,
    color: '#2E7D32',
  },
  // Plan options
  planOptions: {
    flexDirection: 'row',
    width: '100%',
    gap: spacing.space2,
    marginBottom: spacing.space3,
  },
  planOption: {
    flex: 1,
    backgroundColor: colors.cream,
    borderRadius: borderRadius.md,
    padding: spacing.space3,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planOptionRecommended: {
    borderColor: colors.success,
    backgroundColor: colors.successBg,
  },
  saveBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.space2,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  saveBadgeText: {
    fontSize: 10,
    fontWeight: typography.fontBold,
    color: colors.white,
  },
  planName: {
    fontSize: typography.textSm,
    fontWeight: typography.fontSemibold,
    color: colors.brownMuted,
    marginBottom: 2,
  },
  planNameRecommended: {
    color: colors.brown,
  },
  planPrice: {
    fontSize: typography.text2xl,
    fontWeight: typography.fontBold,
    color: colors.brown,
  },
  planPriceRecommended: {
    color: '#2E7D32',
  },
  planPeriod: {
    fontSize: typography.textXs,
    color: colors.brownMuted,
  },
  planNote: {
    fontSize: 10,
    fontWeight: typography.fontSemibold,
    color: colors.success,
    marginTop: spacing.space1,
  },
  // One click
  oneClickButton: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.brown,
    paddingVertical: spacing.space4,
    alignItems: 'center',
    marginBottom: spacing.space2,
  },
  oneClickText: {
    fontSize: typography.textBase,
    fontWeight: typography.fontBold,
    color: colors.brown,
  },
  // Dismiss
  dismissButton: {
    paddingVertical: spacing.space2,
  },
  dismissText: {
    fontSize: typography.textSm,
    color: colors.brownMuted,
  },
});

