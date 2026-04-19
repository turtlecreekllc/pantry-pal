/**
 * AnnualUpsellModal Component
 * Promotes monthly-to-annual upgrade based on behavioral nudge PRD
 * Shows past spend, potential savings, and rollover token benefit
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, spacing, typography, shadows } from '../lib/theme';
import { PLAN_PRICING } from '../lib/types';

interface AnnualUpsellModalProps {
  visible: boolean;
  monthsSubscribed: number;
  totalPaidSoFar: number; // In cents
  onSwitchToAnnual: () => void;
  onKeepMonthly: () => void;
  onClose: () => void;
}

/**
 * Calculate savings if user had been on annual plan
 */
function calculateSavings(monthsSubscribed: number, totalPaid: number): {
  wouldHavePaid: number;
  couldHaveSaved: number;
  annualSavingsPerYear: number;
} {
  // Monthly is $6.99, annual is $69/year ($5.75/mo)
  const monthlyRate = 699; // cents
  const annualMonthlyRate = 575; // cents (69/12)
  
  const wouldHavePaid = monthsSubscribed * annualMonthlyRate;
  const couldHaveSaved = totalPaid - wouldHavePaid;
  const annualSavingsPerYear = (monthlyRate - annualMonthlyRate) * 12; // ~$14.88/year

  return {
    wouldHavePaid,
    couldHaveSaved: Math.max(0, couldHaveSaved),
    annualSavingsPerYear,
  };
}

/**
 * Modal promoting upgrade from monthly to annual plan
 */
export function AnnualUpsellModal({
  visible,
  monthsSubscribed,
  totalPaidSoFar,
  onSwitchToAnnual,
  onKeepMonthly,
  onClose,
}: AnnualUpsellModalProps) {
  const { wouldHavePaid, couldHaveSaved, annualSavingsPerYear } = calculateSavings(
    monthsSubscribed,
    totalPaidSoFar
  );

  const formatCents = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color={colors.brownMuted} />
              </TouchableOpacity>

              {/* Header */}
              <View style={styles.iconContainer}>
                <Ionicons name="bulb" size={40} color={colors.primary} />
              </View>

              <Text style={styles.title}>Save 18% with Annual</Text>
              <Text style={styles.subtitle}>
                You've been with us {monthsSubscribed} month{monthsSubscribed !== 1 ? 's' : ''} —
                thanks for sticking around!
              </Text>

              {/* Savings breakdown */}
              <View style={styles.savingsCard}>
                <View style={styles.savingsRow}>
                  <Text style={styles.savingsLabel}>You've paid so far</Text>
                  <Text style={styles.savingsValue}>{formatCents(totalPaidSoFar)}</Text>
                </View>
                <View style={styles.savingsRow}>
                  <Text style={styles.savingsLabel}>Annual plan would've been</Text>
                  <Text style={[styles.savingsValue, styles.savingsValueGreen]}>
                    {formatCents(wouldHavePaid)}
                  </Text>
                </View>
                {couldHaveSaved > 0 && (
                  <>
                    <View style={styles.savingsDivider} />
                    <View style={styles.savingsRow}>
                      <Text style={styles.savingsLabel}>You'd have saved</Text>
                      <Text style={[styles.savingsValue, styles.savingsHighlight]}>
                        {formatCents(couldHaveSaved)}
                      </Text>
                    </View>
                  </>
                )}
              </View>

              {/* Annual plan details */}
              <View style={styles.annualDetails}>
                <Text style={styles.annualTitle}>Switch now and your next 12 months cost</Text>
                <View style={styles.priceContainer}>
                  <Text style={styles.price}>{PLAN_PRICING.premium_annual.displayPrice}</Text>
                  <Text style={styles.priceNote}>total</Text>
                </View>
                <Text style={styles.priceBreakdown}>
                  That's {PLAN_PRICING.premium_annual.monthlyEquivalent}/mo instead of{' '}
                  {PLAN_PRICING.premium_monthly.displayPrice}
                </Text>
              </View>

              {/* Rollover benefit */}
              <View style={styles.bonusContainer}>
                <View style={styles.bonusIcon}>
                  <Ionicons name="gift" size={20} color={colors.success} />
                </View>
                <View style={styles.bonusContent}>
                  <Text style={styles.bonusTitle}>Plus: 50 rollover tokens/month</Text>
                  <Text style={styles.bonusDescription}>
                    Unused subscription tokens roll over each month (up to 50)
                  </Text>
                </View>
              </View>

              {/* Annual savings callout */}
              <View style={styles.savingsCallout}>
                <Ionicons name="wallet" size={18} color="#2E7D32" />
                <Text style={styles.savingsCalloutText}>
                  Save {formatCents(annualSavingsPerYear)}/year with annual billing
                </Text>
              </View>

              {/* Actions */}
              <TouchableOpacity style={styles.primaryButton} onPress={onSwitchToAnnual}>
                <Text style={styles.primaryButtonText}>
                  Switch to Annual — Save {formatCents(annualSavingsPerYear)}/year
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryButton} onPress={onKeepMonthly}>
                <Text style={styles.secondaryButtonText}>Keep Monthly</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

/**
 * Inline banner version for settings page
 */
interface AnnualUpsellBannerProps {
  monthsSubscribed: number;
  onLearnMore: () => void;
  onDismiss: () => void;
}

export function AnnualUpsellBanner({
  monthsSubscribed,
  onLearnMore,
  onDismiss,
}: AnnualUpsellBannerProps) {
  return (
    <View style={styles.banner}>
      <TouchableOpacity style={styles.bannerDismiss} onPress={onDismiss}>
        <Ionicons name="close" size={16} color={colors.brownMuted} />
      </TouchableOpacity>
      
      <View style={styles.bannerContent}>
        <View style={styles.bannerIcon}>
          <Ionicons name="trending-up" size={24} color={colors.success} />
        </View>
        <View style={styles.bannerText}>
          <Text style={styles.bannerTitle}>Save 18% with Annual</Text>
          <Text style={styles.bannerSubtitle}>
            You've paid ${((monthsSubscribed * 699) / 100).toFixed(2)} so far.
            {'\n'}Annual would've been ${((monthsSubscribed * 575) / 100).toFixed(2)}.
          </Text>
        </View>
      </View>
      
      <TouchableOpacity style={styles.bannerButton} onPress={onLearnMore}>
        <Text style={styles.bannerButtonText}>Learn More</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.success} />
      </TouchableOpacity>
    </View>
  );
}

/**
 * Post-payment invoice email upsell component (for embedding)
 */
interface InvoiceUpsellProps {
  monthsSubscribed: number;
  lastPayment: number;
  annualEquivalent: number;
  onUpgrade: () => void;
}

export function InvoiceUpsell({
  monthsSubscribed,
  lastPayment,
  annualEquivalent,
  onUpgrade,
}: InvoiceUpsellProps) {
  const savings = lastPayment - annualEquivalent;
  
  return (
    <View style={styles.invoiceUpsell}>
      <Text style={styles.invoiceTitle}>
        You've paid ${((monthsSubscribed * lastPayment) / 100).toFixed(2)}
      </Text>
      <Text style={styles.invoiceSubtitle}>
        Annual would've been ${((monthsSubscribed * annualEquivalent) / 100).toFixed(2)}
      </Text>
      {savings > 0 && (
        <TouchableOpacity style={styles.invoiceButton} onPress={onUpgrade}>
          <Text style={styles.invoiceButtonText}>
            Switch & Save ${(savings / 100).toFixed(2)}/mo
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * Helper to check if annual upsell should be shown
 */
export function shouldShowAnnualUpsell(
  monthsSubscribed: number,
  lastShownDate: string | null,
  tier: string
): boolean {
  // Only for monthly subscribers
  if (tier !== 'premium_monthly') return false;
  // Show after 2+ months
  if (monthsSubscribed < 2) return false;
  // Only once per month
  if (lastShownDate) {
    const lastShown = new Date(lastShownDate);
    const now = new Date();
    const monthsDiff = (now.getFullYear() - lastShown.getFullYear()) * 12 + 
                       (now.getMonth() - lastShown.getMonth());
    if (monthsDiff < 1) return false;
  }
  return true;
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
    backgroundColor: colors.peachLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.space4,
  },
  title: {
    fontSize: typography.textXl,
    fontWeight: typography.fontBold,
    color: colors.brown,
    marginBottom: spacing.space2,
  },
  subtitle: {
    fontSize: typography.textSm,
    color: colors.brownMuted,
    textAlign: 'center',
    marginBottom: spacing.space4,
  },
  // Savings card
  savingsCard: {
    width: '100%',
    backgroundColor: colors.cream,
    borderRadius: borderRadius.md,
    padding: spacing.space4,
    marginBottom: spacing.space4,
  },
  savingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.space2,
  },
  savingsLabel: {
    fontSize: typography.textSm,
    color: colors.brownMuted,
  },
  savingsValue: {
    fontSize: typography.textSm,
    fontWeight: typography.fontBold,
    color: colors.brown,
  },
  savingsValueGreen: {
    color: colors.success,
  },
  savingsHighlight: {
    color: '#2E7D32',
    fontSize: typography.textBase,
  },
  savingsDivider: {
    height: 1,
    backgroundColor: colors.peach,
    marginVertical: spacing.space2,
  },
  // Annual details
  annualDetails: {
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.space4,
  },
  annualTitle: {
    fontSize: typography.textSm,
    color: colors.brownMuted,
    marginBottom: spacing.space2,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.space1,
  },
  price: {
    fontSize: typography.text3xl,
    fontWeight: typography.fontBold,
    color: colors.success,
  },
  priceNote: {
    fontSize: typography.textSm,
    color: colors.brownMuted,
  },
  priceBreakdown: {
    fontSize: typography.textSm,
    color: colors.brownMuted,
    marginTop: spacing.space1,
  },
  // Bonus
  bonusContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    backgroundColor: colors.successBg,
    borderRadius: borderRadius.md,
    padding: spacing.space3,
    marginBottom: spacing.space3,
    gap: spacing.space3,
  },
  bonusIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bonusContent: {
    flex: 1,
  },
  bonusTitle: {
    fontSize: typography.textSm,
    fontWeight: typography.fontSemibold,
    color: '#2E7D32',
    marginBottom: 2,
  },
  bonusDescription: {
    fontSize: typography.textXs,
    color: '#388E3C',
  },
  // Savings callout
  savingsCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
    marginBottom: spacing.space4,
  },
  savingsCalloutText: {
    fontSize: typography.textSm,
    fontWeight: typography.fontSemibold,
    color: '#2E7D32',
  },
  // Buttons
  primaryButton: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.brown,
    paddingVertical: spacing.space3,
    alignItems: 'center',
    marginBottom: spacing.space2,
  },
  primaryButtonText: {
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  secondaryButton: {
    paddingVertical: spacing.space2,
  },
  secondaryButtonText: {
    fontSize: typography.textSm,
    color: colors.brownMuted,
  },
  // Banner styles
  banner: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.success,
    padding: spacing.space4,
    marginHorizontal: spacing.space4,
    marginVertical: spacing.space2,
    ...shadows.sm,
  },
  bannerDismiss: {
    position: 'absolute',
    top: spacing.space2,
    right: spacing.space2,
    zIndex: 1,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.space3,
    gap: spacing.space3,
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.successBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
    marginBottom: spacing.space1,
  },
  bannerSubtitle: {
    fontSize: typography.textSm,
    color: colors.brownMuted,
    lineHeight: 18,
  },
  bannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.successBg,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.space2,
    gap: spacing.space1,
  },
  bannerButtonText: {
    fontSize: typography.textSm,
    fontWeight: typography.fontSemibold,
    color: colors.success,
  },
  // Invoice upsell
  invoiceUpsell: {
    backgroundColor: colors.peachLight,
    borderRadius: borderRadius.md,
    padding: spacing.space3,
    alignItems: 'center',
  },
  invoiceTitle: {
    fontSize: typography.textSm,
    color: colors.brown,
    marginBottom: spacing.space1,
  },
  invoiceSubtitle: {
    fontSize: typography.textSm,
    color: colors.success,
    fontWeight: typography.fontSemibold,
    marginBottom: spacing.space2,
  },
  invoiceButton: {
    backgroundColor: colors.success,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.space3,
    paddingVertical: spacing.space2,
  },
  invoiceButtonText: {
    fontSize: typography.textSm,
    fontWeight: typography.fontSemibold,
    color: colors.white,
  },
});

