/**
 * TokenWarningSystem Component
 * Progressive token warnings at different threshold levels
 * 50% - Subtle awareness
 * 30% - Soft warning  
 * 10% - Active nudge
 * 0% - Depleted modal
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, spacing, typography, shadows } from '../lib/theme';
import { TOKEN_BUCKETS } from '../lib/types';

type TokenLevel = 'healthy' | 'moderate' | 'low' | 'critical' | 'depleted';

interface TokenWarningProps {
  tokensRemaining: number;
  monthlyAllocation: number;
  usagePercent: number;
  daysUntilReset: number;
  onBuyTokens: (size: 50 | 150 | 400) => void;
  onSwitchToAnnual?: () => void;
  onDismiss: () => void;
}

/**
 * Get token level based on remaining tokens and usage percentage
 */
export function getTokenLevel(tokensRemaining: number, usagePercent: number): TokenLevel {
  if (tokensRemaining === 0) return 'depleted';
  if (tokensRemaining <= 10) return 'critical';
  if (usagePercent >= 70) return 'low';
  if (usagePercent >= 50) return 'moderate';
  return 'healthy';
}

/**
 * Token usage meter with visual indicator
 */
interface TokenMeterProps {
  tokensRemaining: number;
  monthlyAllocation: number;
  usagePercent: number;
  compact?: boolean;
}

export function TokenMeter({
  tokensRemaining,
  monthlyAllocation,
  usagePercent,
  compact = false,
}: TokenMeterProps) {
  const level = getTokenLevel(tokensRemaining, usagePercent);
  const meterColor = {
    healthy: colors.success,
    moderate: colors.warning,
    low: '#FF9800',
    critical: colors.error,
    depleted: colors.error,
  }[level];

  if (compact) {
    return (
      <View style={styles.compactMeter}>
        <View style={styles.compactMeterBar}>
          <View
            style={[
              styles.compactMeterFill,
              { width: `${100 - usagePercent}%`, backgroundColor: meterColor },
            ]}
          />
        </View>
        <Text style={[styles.compactMeterText, { color: meterColor }]}>
          {tokensRemaining}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.meterContainer}>
      <View style={styles.meterHeader}>
        <Text style={styles.meterLabel}>AI Tokens</Text>
        <Text style={[styles.meterValue, { color: meterColor }]}>
          {tokensRemaining} / {monthlyAllocation}
        </Text>
      </View>
      <View style={styles.meterBar}>
        <View
          style={[
            styles.meterFill,
            { width: `${100 - usagePercent}%`, backgroundColor: meterColor },
          ]}
        />
      </View>
      <Text style={styles.meterFooter}>{usagePercent}% used this month</Text>
    </View>
  );
}

/**
 * Subtle toast for 50% usage awareness
 */
interface TokenAwarenessToastProps {
  tokensRemaining: number;
  daysUntilReset: number;
  onDismiss: () => void;
  onViewUsage: () => void;
}

export function TokenAwarenessToast({
  tokensRemaining,
  daysUntilReset,
  onDismiss,
  onViewUsage,
}: TokenAwarenessToastProps) {
  return (
    <View style={styles.toastContainer}>
      <View style={styles.toastContent}>
        <Ionicons name="information-circle" size={20} color={colors.info} />
        <Text style={styles.toastText}>
          You've used {100 - Math.round((tokensRemaining / 100) * 100)} of your 100 tokens this month.
          {'\n'}Tokens reset in {daysUntilReset} days.
        </Text>
      </View>
      <View style={styles.toastActions}>
        <TouchableOpacity onPress={onViewUsage}>
          <Text style={styles.toastActionText}>View Usage</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDismiss}>
          <Text style={styles.toastDismissText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * Warning banner for 30% remaining
 */
interface TokenWarningBannerProps {
  tokensRemaining: number;
  onSeeOptions: () => void;
}

export function TokenWarningBanner({
  tokensRemaining,
  onSeeOptions,
}: TokenWarningBannerProps) {
  return (
    <View style={styles.warningBanner}>
      <View style={styles.warningContent}>
        <View style={styles.warningMeter}>
          <View style={[styles.warningMeterFill, { width: `${tokensRemaining}%` }]} />
        </View>
        <View style={styles.warningTextContainer}>
          <Text style={styles.warningTitle}>{tokensRemaining} tokens left this month</Text>
          <Text style={styles.warningSubtitle}>
            Heavy AI users often grab a token bucket for peace of mind.
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.warningButton} onPress={onSeeOptions}>
        <Text style={styles.warningButtonText}>See Options</Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * Critical warning modal for 10 tokens remaining
 */
interface TokenCriticalModalProps {
  visible: boolean;
  tokensRemaining: number;
  currentActionCost: number;
  daysUntilReset: number;
  onBuyTokens: (size: 50 | 150 | 400) => void;
  onContinue: () => void;
  onClose: () => void;
}

export function TokenCriticalModal({
  visible,
  tokensRemaining,
  currentActionCost,
  daysUntilReset,
  onBuyTokens,
  onContinue,
  onClose,
}: TokenCriticalModalProps) {
  const tokensAfterAction = tokensRemaining - currentActionCost;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color={colors.brownMuted} />
              </TouchableOpacity>

              <View style={styles.modalIcon}>
                <Ionicons name="warning" size={40} color="#FF9800" />
              </View>

              <Text style={styles.modalTitle}>Running Low on Tokens</Text>

              <View style={styles.tokenInfo}>
                <View style={styles.tokenInfoRow}>
                  <Text style={styles.tokenInfoLabel}>You have</Text>
                  <Text style={styles.tokenInfoValue}>{tokensRemaining} tokens</Text>
                </View>
                <View style={styles.tokenInfoRow}>
                  <Text style={styles.tokenInfoLabel}>This action costs</Text>
                  <Text style={styles.tokenInfoValue}>{currentActionCost} tokens</Text>
                </View>
                <View style={styles.tokenInfoDivider} />
                <View style={styles.tokenInfoRow}>
                  <Text style={styles.tokenInfoLabel}>After this</Text>
                  <Text style={[styles.tokenInfoValue, { color: colors.error }]}>
                    {tokensAfterAction} tokens
                  </Text>
                </View>
                <Text style={styles.tokenInfoNote}>
                  Until reset in {daysUntilReset} days
                </Text>
              </View>

              <Text style={styles.bucketTitle}>Want to grab some extra?</Text>

              <View style={styles.bucketOptions}>
                {TOKEN_BUCKETS.map((bucket, index) => (
                  <TouchableOpacity
                    key={bucket.size}
                    style={[
                      styles.bucketOption,
                      index === 1 && styles.bucketOptionBest,
                    ]}
                    onPress={() => onBuyTokens(bucket.size as 50 | 150 | 400)}
                  >
                    {index === 1 && (
                      <View style={styles.bestValueBadge}>
                        <Text style={styles.bestValueText}>Best per-token value</Text>
                      </View>
                    )}
                    <Text style={styles.bucketSize}>{bucket.size}</Text>
                    <Text style={styles.bucketLabel}>tokens</Text>
                    <Text style={styles.bucketPrice}>{bucket.displayPrice}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.addTokensButton}
                  onPress={() => onBuyTokens(150)}
                >
                  <Text style={styles.addTokensButtonText}>Add Tokens</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.continueButton} onPress={onContinue}>
                  <Text style={styles.continueButtonText}>
                    Continue with {tokensRemaining}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

/**
 * Token depleted full-screen modal
 */
interface TokenDepletedFullModalProps {
  visible: boolean;
  daysUntilReset: number;
  onBuyTokens: (size: 50 | 150 | 400) => void;
  onSwitchToAnnual: () => void;
  onWaitItOut: () => void;
  onClose: () => void;
}

export function TokenDepletedFullModal({
  visible,
  daysUntilReset,
  onBuyTokens,
  onSwitchToAnnual,
  onWaitItOut,
  onClose,
}: TokenDepletedFullModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, styles.depletedModal]}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color={colors.brownMuted} />
              </TouchableOpacity>

              <View style={[styles.modalIcon, { backgroundColor: colors.successBg }]}>
                <Ionicons name="checkmark-circle" size={40} color={colors.success} />
              </View>

              <Text style={styles.modalTitle}>You've Used All Your AI Tokens</Text>
              <Text style={styles.depletedSubtitle}>
                Great news: You got a lot done this month!
              </Text>

              <Text style={styles.resetInfo}>
                Your tokens reset in <Text style={styles.resetDays}>{daysUntilReset} days</Text>
              </Text>

              <Text style={styles.optionsTitle}>In the meantime, you can:</Text>

              <View style={styles.optionsList}>
                <View style={styles.optionItem}>
                  <Text style={styles.optionNumber}>1.</Text>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>Add tokens now (never expire)</Text>
                    <View style={styles.optionBuckets}>
                      {TOKEN_BUCKETS.map(bucket => (
                        <TouchableOpacity
                          key={bucket.size}
                          style={styles.optionBucket}
                          onPress={() => onBuyTokens(bucket.size as 50 | 150 | 400)}
                        >
                          <Text style={styles.optionBucketSize}>{bucket.size}</Text>
                          <Text style={styles.optionBucketPrice}>{bucket.displayPrice}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                <View style={styles.optionItem}>
                  <Text style={styles.optionNumber}>2.</Text>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>Wait for your monthly reset</Text>
                    <Text style={styles.optionDescription}>
                      You can still use all non-AI features
                    </Text>
                  </View>
                </View>

                <View style={styles.optionItem}>
                  <Text style={styles.optionNumber}>3.</Text>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>Upgrade to Annual</Text>
                    <Text style={styles.optionDescription}>
                      Get 50 rollover tokens each month
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.depletedActions}>
                <TouchableOpacity
                  style={styles.primaryAction}
                  onPress={() => onBuyTokens(150)}
                >
                  <Text style={styles.primaryActionText}>Add Tokens</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryAction}
                  onPress={onSwitchToAnnual}
                >
                  <Text style={styles.secondaryActionText}>Switch to Annual</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tertiaryAction} onPress={onWaitItOut}>
                  <Text style={styles.tertiaryActionText}>Wait It Out</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

/**
 * Power user identification banner
 */
interface PowerUserBannerProps {
  monthsAtHighUsage: number;
  onGetTokens: () => void;
  onDismiss: () => void;
}

export function PowerUserBanner({
  monthsAtHighUsage,
  onGetTokens,
  onDismiss,
}: PowerUserBannerProps) {
  return (
    <View style={styles.powerUserBanner}>
      <TouchableOpacity style={styles.powerUserDismiss} onPress={onDismiss}>
        <Ionicons name="close" size={18} color={colors.brownMuted} />
      </TouchableOpacity>
      
      <View style={styles.powerUserIcon}>
        <Ionicons name="rocket" size={24} color={colors.primary} />
      </View>
      
      <Text style={styles.powerUserTitle}>You're a Power User!</Text>
      <Text style={styles.powerUserMessage}>
        You've hit 80%+ tokens {monthsAtHighUsage} months in a row.
        {'\n'}Most power users grab a 150-token bundle for peace of mind.
      </Text>
      
      <View style={styles.powerUserActions}>
        <TouchableOpacity style={styles.powerUserButton} onPress={onGetTokens}>
          <Text style={styles.powerUserButtonText}>Get 150 Tokens — $4.99</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.powerUserDismissButton} onPress={onDismiss}>
          <Text style={styles.powerUserDismissText}>Not Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Token Meter styles
  meterContainer: {
    marginVertical: spacing.space2,
  },
  meterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.space2,
  },
  meterLabel: {
    fontSize: typography.textSm,
    fontWeight: typography.fontMedium,
    color: colors.brown,
  },
  meterValue: {
    fontSize: typography.textSm,
    fontWeight: typography.fontBold,
  },
  meterBar: {
    height: 8,
    backgroundColor: colors.creamDark,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  meterFooter: {
    fontSize: typography.textXs,
    color: colors.brownMuted,
    marginTop: spacing.space1,
  },
  // Compact meter
  compactMeter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
  },
  compactMeterBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.creamDark,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  compactMeterFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  compactMeterText: {
    fontSize: typography.textSm,
    fontWeight: typography.fontBold,
    minWidth: 24,
    textAlign: 'right',
  },
  // Toast styles
  toastContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.brown,
    padding: spacing.space4,
    marginHorizontal: spacing.space4,
    marginVertical: spacing.space2,
    ...shadows.sm,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.space3,
    marginBottom: spacing.space3,
  },
  toastText: {
    flex: 1,
    fontSize: typography.textSm,
    color: colors.brown,
    lineHeight: 20,
  },
  toastActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.space4,
  },
  toastActionText: {
    fontSize: typography.textSm,
    fontWeight: typography.fontSemibold,
    color: colors.primary,
  },
  toastDismissText: {
    fontSize: typography.textSm,
    color: colors.brownMuted,
  },
  // Warning banner styles
  warningBanner: {
    backgroundColor: colors.warningBg,
    borderRadius: borderRadius.lg,
    padding: spacing.space4,
    marginHorizontal: spacing.space4,
    marginVertical: spacing.space2,
  },
  warningContent: {
    marginBottom: spacing.space3,
  },
  warningMeter: {
    height: 6,
    backgroundColor: 'rgba(255,152,0,0.2)',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.space2,
  },
  warningMeterFill: {
    height: '100%',
    backgroundColor: colors.warning,
    borderRadius: borderRadius.full,
  },
  warningTextContainer: {},
  warningTitle: {
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: '#E65100',
    marginBottom: spacing.space1,
  },
  warningSubtitle: {
    fontSize: typography.textSm,
    color: '#E65100',
    opacity: 0.8,
  },
  warningButton: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.space2,
    alignItems: 'center',
  },
  warningButtonText: {
    fontSize: typography.textSm,
    fontWeight: typography.fontSemibold,
    color: '#E65100',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.brown,
    padding: spacing.space6,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: spacing.space3,
    right: spacing.space3,
    zIndex: 1,
  },
  modalIcon: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.warningBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.space4,
  },
  modalTitle: {
    fontSize: typography.textXl,
    fontWeight: typography.fontBold,
    color: colors.brown,
    textAlign: 'center',
    marginBottom: spacing.space4,
  },
  // Token info
  tokenInfo: {
    width: '100%',
    backgroundColor: colors.cream,
    borderRadius: borderRadius.md,
    padding: spacing.space4,
    marginBottom: spacing.space4,
  },
  tokenInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.space2,
  },
  tokenInfoLabel: {
    fontSize: typography.textSm,
    color: colors.brownMuted,
  },
  tokenInfoValue: {
    fontSize: typography.textSm,
    fontWeight: typography.fontBold,
    color: colors.brown,
  },
  tokenInfoDivider: {
    height: 1,
    backgroundColor: colors.peach,
    marginVertical: spacing.space2,
  },
  tokenInfoNote: {
    fontSize: typography.textXs,
    color: colors.brownMuted,
    textAlign: 'center',
    marginTop: spacing.space2,
  },
  // Bucket options
  bucketTitle: {
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
    marginBottom: spacing.space3,
  },
  bucketOptions: {
    flexDirection: 'row',
    width: '100%',
    gap: spacing.space2,
    marginBottom: spacing.space4,
  },
  bucketOption: {
    flex: 1,
    backgroundColor: colors.cream,
    borderRadius: borderRadius.md,
    padding: spacing.space3,
    alignItems: 'center',
  },
  bucketOptionBest: {
    backgroundColor: colors.successBg,
    borderWidth: 2,
    borderColor: colors.success,
  },
  bestValueBadge: {
    position: 'absolute',
    top: -8,
    backgroundColor: colors.success,
    paddingHorizontal: spacing.space2,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  bestValueText: {
    fontSize: 9,
    fontWeight: typography.fontBold,
    color: colors.white,
  },
  bucketSize: {
    fontSize: typography.text2xl,
    fontWeight: typography.fontBold,
    color: colors.brown,
  },
  bucketLabel: {
    fontSize: typography.textXs,
    color: colors.brownMuted,
  },
  bucketPrice: {
    fontSize: typography.textSm,
    fontWeight: typography.fontSemibold,
    color: colors.success,
    marginTop: spacing.space1,
  },
  // Modal actions
  modalActions: {
    width: '100%',
    gap: spacing.space2,
  },
  addTokensButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.brown,
    paddingVertical: spacing.space3,
    alignItems: 'center',
  },
  addTokensButtonText: {
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  continueButton: {
    paddingVertical: spacing.space2,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: typography.textSm,
    color: colors.brownMuted,
  },
  // Depleted modal
  depletedModal: {
    maxWidth: 420,
  },
  depletedSubtitle: {
    fontSize: typography.textBase,
    color: colors.success,
    textAlign: 'center',
    marginBottom: spacing.space4,
  },
  resetInfo: {
    fontSize: typography.textSm,
    color: colors.brownMuted,
    marginBottom: spacing.space4,
  },
  resetDays: {
    fontWeight: typography.fontBold,
    color: colors.brown,
  },
  optionsTitle: {
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
    alignSelf: 'flex-start',
    marginBottom: spacing.space3,
  },
  optionsList: {
    width: '100%',
    marginBottom: spacing.space4,
  },
  optionItem: {
    flexDirection: 'row',
    marginBottom: spacing.space3,
  },
  optionNumber: {
    fontSize: typography.textBase,
    fontWeight: typography.fontBold,
    color: colors.primary,
    width: 24,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: typography.textSm,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
    marginBottom: spacing.space1,
  },
  optionDescription: {
    fontSize: typography.textXs,
    color: colors.brownMuted,
  },
  optionBuckets: {
    flexDirection: 'row',
    gap: spacing.space2,
    marginTop: spacing.space2,
  },
  optionBucket: {
    backgroundColor: colors.cream,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.space2,
    paddingVertical: spacing.space1,
    alignItems: 'center',
  },
  optionBucketSize: {
    fontSize: typography.textSm,
    fontWeight: typography.fontBold,
    color: colors.brown,
  },
  optionBucketPrice: {
    fontSize: typography.textXs,
    color: colors.success,
  },
  // Depleted actions
  depletedActions: {
    width: '100%',
    gap: spacing.space2,
  },
  primaryAction: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.brown,
    paddingVertical: spacing.space3,
    alignItems: 'center',
  },
  primaryActionText: {
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  secondaryAction: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.brown,
    paddingVertical: spacing.space3,
    alignItems: 'center',
  },
  secondaryActionText: {
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  tertiaryAction: {
    paddingVertical: spacing.space2,
    alignItems: 'center',
  },
  tertiaryActionText: {
    fontSize: typography.textSm,
    color: colors.brownMuted,
  },
  // Power user banner
  powerUserBanner: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    padding: spacing.space4,
    marginHorizontal: spacing.space4,
    marginVertical: spacing.space2,
    alignItems: 'center',
    ...shadows.sm,
  },
  powerUserDismiss: {
    position: 'absolute',
    top: spacing.space2,
    right: spacing.space2,
  },
  powerUserIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.peachLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.space3,
  },
  powerUserTitle: {
    fontSize: typography.textLg,
    fontWeight: typography.fontBold,
    color: colors.brown,
    marginBottom: spacing.space2,
  },
  powerUserMessage: {
    fontSize: typography.textSm,
    color: colors.brownMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.space4,
  },
  powerUserActions: {
    width: '100%',
    gap: spacing.space2,
  },
  powerUserButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.brown,
    paddingVertical: spacing.space3,
    alignItems: 'center',
  },
  powerUserButtonText: {
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  powerUserDismissButton: {
    paddingVertical: spacing.space2,
    alignItems: 'center',
  },
  powerUserDismissText: {
    fontSize: typography.textSm,
    color: colors.brownMuted,
  },
});

