/**
 * ProgressInvestmentCard Component
 * Displays user's accumulated value during trial for endowment effect
 * Shows pantry items, saved recipes, AI generations, and estimated savings
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, spacing, typography, shadows } from '../lib/theme';

interface ProgressStats {
  pantryItems: number;
  savedRecipes: number;
  mealPlansGenerated: number;
  estimatedSavings: number;
}

interface ProgressInvestmentCardProps {
  stats: ProgressStats;
  daysInTrial: number;
  onUpgradePress: () => void;
  variant?: 'compact' | 'full';
}

/**
 * Shows user's progress and investment during trial
 * Leverages endowment effect and sunk cost psychology
 */
export function ProgressInvestmentCard({
  stats,
  daysInTrial,
  onUpgradePress,
  variant = 'full',
}: ProgressInvestmentCardProps) {
  if (variant === 'compact') {
    return (
      <TouchableOpacity
        style={styles.compactContainer}
        onPress={onUpgradePress}
        accessibilityRole="button"
        accessibilityLabel="View your trial progress"
      >
        <View style={styles.compactContent}>
          <Ionicons name="trophy" size={20} color={colors.primary} />
          <Text style={styles.compactTitle}>Your Trial Progress</Text>
        </View>
        <View style={styles.compactStats}>
          <StatBadge value={stats.pantryItems} label="items" />
          <StatBadge value={stats.savedRecipes} label="recipes" />
          <StatBadge value={`$${stats.estimatedSavings}`} label="saved" />
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.brownMuted} />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="trophy" size={24} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Your Trial in Numbers</Text>
          <Text style={styles.subtitle}>
            {daysInTrial} days of Premium access
          </Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          icon="basket"
          value={stats.pantryItems}
          label="Pantry Items"
          color={colors.success}
        />
        <StatCard
          icon="book"
          value={stats.savedRecipes}
          label="Saved Recipes"
          color={colors.info}
        />
        <StatCard
          icon="sparkles"
          value={stats.mealPlansGenerated}
          label="AI Plans"
          color={colors.primary}
        />
        <StatCard
          icon="cash"
          value={`$${stats.estimatedSavings}`}
          label="Estimated Savings"
          color={colors.success}
          highlighted
        />
      </View>

      <View style={styles.lossWarning}>
        <Ionicons name="warning" size={18} color={colors.warning} />
        <Text style={styles.lossWarningText}>
          Losing Premium means losing access to all of this
        </Text>
      </View>

      <TouchableOpacity
        style={styles.upgradeButton}
        onPress={onUpgradePress}
        accessibilityRole="button"
        accessibilityLabel="Subscribe to keep your progress"
      >
        <Text style={styles.upgradeButtonText}>Keep Everything</Text>
        <Ionicons name="arrow-forward" size={18} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}

interface StatCardProps {
  icon: string;
  value: number | string;
  label: string;
  color: string;
  highlighted?: boolean;
}

function StatCard({ icon, value, label, color, highlighted }: StatCardProps) {
  return (
    <View style={[styles.statCard, highlighted && styles.statCardHighlighted]}>
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={[styles.statValue, highlighted && styles.statValueHighlighted]}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

interface StatBadgeProps {
  value: number | string;
  label: string;
}

function StatBadge({ value, label }: StatBadgeProps) {
  return (
    <View style={styles.statBadge}>
      <Text style={styles.statBadgeValue}>{value}</Text>
      <Text style={styles.statBadgeLabel}>{label}</Text>
    </View>
  );
}

/**
 * Inline celebration component for milestone moments
 */
interface MilestoneCelebrationProps {
  milestone: 'pantry_10' | 'recipes_5' | 'first_ai_plan' | 'savings_milestone';
  value?: number;
  onDismiss: () => void;
}

export function MilestoneCelebration({
  milestone,
  value,
  onDismiss,
}: MilestoneCelebrationProps) {
  const milestoneConfig = {
    pantry_10: {
      icon: 'sparkles' as const,
      title: 'Nice! Your pantry is growing 🎉',
      message: `You've added ${value || 10} items`,
    },
    recipes_5: {
      icon: 'book' as const,
      title: '5 recipes saved!',
      message: 'Your collection is taking shape',
    },
    first_ai_plan: {
      icon: 'restaurant' as const,
      title: 'Your first personalized meal plan!',
      message: 'Premium makes this possible',
    },
    savings_milestone: {
      icon: 'cash' as const,
      title: `You just saved ~$${value || 8}`,
      message: "In ingredients that would've gone bad",
    },
  };

  const config = milestoneConfig[milestone];

  return (
    <View style={styles.celebrationContainer}>
      <View style={styles.celebrationContent}>
        <View style={styles.celebrationIcon}>
          <Ionicons name={config.icon} size={24} color={colors.primary} />
        </View>
        <View style={styles.celebrationText}>
          <Text style={styles.celebrationTitle}>{config.title}</Text>
          <Text style={styles.celebrationMessage}>{config.message}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.celebrationDismiss}
        onPress={onDismiss}
        accessibilityLabel="Dismiss"
      >
        <Ionicons name="close" size={20} color={colors.brownMuted} />
      </TouchableOpacity>
    </View>
  );
}

/**
 * Feature attribution toast for AI-powered actions
 */
interface FeatureAttributionProps {
  feature: string;
  description: string;
  onKeepPremium: () => void;
  onDismiss: () => void;
}

export function FeatureAttribution({
  feature,
  description,
  onKeepPremium,
  onDismiss,
}: FeatureAttributionProps) {
  return (
    <View style={styles.attributionContainer}>
      <View style={styles.attributionHeader}>
        <View style={styles.attributionBadge}>
          <Ionicons name="sparkles" size={14} color={colors.primary} />
          <Text style={styles.attributionBadgeText}>{feature}</Text>
        </View>
        <TouchableOpacity onPress={onDismiss}>
          <Ionicons name="close" size={18} color={colors.brownMuted} />
        </TouchableOpacity>
      </View>
      <Text style={styles.attributionDescription}>{description}</Text>
      <Text style={styles.attributionNote}>
        This is a Premium feature you're trying out.
      </Text>
      <TouchableOpacity
        style={styles.attributionButton}
        onPress={onKeepPremium}
      >
        <Text style={styles.attributionButtonText}>Keep Premium →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.brown,
    padding: spacing.space4,
    ...shadows.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.space4,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.peachLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.space3,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: typography.textLg,
    fontWeight: typography.fontBold,
    color: colors.brown,
  },
  subtitle: {
    fontSize: typography.textSm,
    color: colors.brownMuted,
    marginTop: spacing.space1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.space2,
    marginBottom: spacing.space4,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.cream,
    borderRadius: borderRadius.md,
    padding: spacing.space3,
    alignItems: 'center',
  },
  statCardHighlighted: {
    backgroundColor: colors.successBg,
    borderWidth: 2,
    borderColor: colors.success,
  },
  statValue: {
    fontSize: typography.text2xl,
    fontWeight: typography.fontBold,
    color: colors.brown,
    marginTop: spacing.space1,
  },
  statValueHighlighted: {
    color: '#2E7D32',
  },
  statLabel: {
    fontSize: typography.textXs,
    color: colors.brownMuted,
    marginTop: spacing.space1,
    textAlign: 'center',
  },
  lossWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningBg,
    borderRadius: borderRadius.sm,
    padding: spacing.space3,
    marginBottom: spacing.space4,
    gap: spacing.space2,
  },
  lossWarningText: {
    flex: 1,
    fontSize: typography.textSm,
    color: '#E65100',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.brown,
    paddingVertical: spacing.space3,
    gap: spacing.space2,
  },
  upgradeButtonText: {
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  // Compact variant
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.peachLight,
    borderRadius: borderRadius.md,
    padding: spacing.space3,
    marginHorizontal: spacing.space4,
    marginVertical: spacing.space2,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
    flex: 1,
  },
  compactTitle: {
    fontSize: typography.textSm,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  compactStats: {
    flexDirection: 'row',
    gap: spacing.space3,
    marginRight: spacing.space2,
  },
  statBadge: {
    alignItems: 'center',
  },
  statBadgeValue: {
    fontSize: typography.textSm,
    fontWeight: typography.fontBold,
    color: colors.brown,
  },
  statBadgeLabel: {
    fontSize: 10,
    color: colors.brownMuted,
  },
  // Celebration styles
  celebrationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    padding: spacing.space3,
    marginHorizontal: spacing.space4,
    marginVertical: spacing.space2,
    ...shadows.sm,
  },
  celebrationContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space3,
  },
  celebrationIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.peachLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  celebrationText: {
    flex: 1,
  },
  celebrationTitle: {
    fontSize: typography.textSm,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  celebrationMessage: {
    fontSize: typography.textXs,
    color: colors.brownMuted,
    marginTop: 2,
  },
  celebrationDismiss: {
    padding: spacing.space1,
  },
  // Attribution styles
  attributionContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.brown,
    padding: spacing.space4,
    ...shadows.sm,
  },
  attributionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.space2,
  },
  attributionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.peachLight,
    paddingHorizontal: spacing.space2,
    paddingVertical: spacing.space1,
    borderRadius: borderRadius.full,
    gap: spacing.space1,
  },
  attributionBadgeText: {
    fontSize: typography.textXs,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  attributionDescription: {
    fontSize: typography.textBase,
    fontWeight: typography.fontMedium,
    color: colors.brown,
    marginBottom: spacing.space2,
  },
  attributionNote: {
    fontSize: typography.textSm,
    color: colors.brownMuted,
    marginBottom: spacing.space3,
  },
  attributionButton: {
    alignSelf: 'flex-start',
  },
  attributionButtonText: {
    fontSize: typography.textSm,
    fontWeight: typography.fontSemibold,
    color: colors.primary,
  },
});

