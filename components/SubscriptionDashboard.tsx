/**
 * SubscriptionDashboard Component
 * Displays subscription status, token balance, and management options
 * Updated for three-tier model: Free, Individual, Family
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription, PLAN_PRICING, TOKEN_BUCKETS } from '../hooks/useSubscription';
import { Button } from './ui/Button';
import { getTierCategory, TierCategory, FEATURE_ACCESS } from '../lib/types';

interface SubscriptionDashboardProps {
  onViewHistory?: () => void;
  onUpgrade?: () => void;
  onShowPaywall?: (highlightTier?: TierCategory) => void;
}

/** Get display name for tier */
function getTierDisplayName(tier: string, isAnnual: boolean): string {
  const category = getTierCategory(tier as any);
  if (category === 'free') return 'Free';
  if (category === 'individual') return isAnnual ? 'Individual Annual' : 'Individual Monthly';
  if (category === 'family') return isAnnual ? 'Family Annual' : 'Family Monthly';
  return 'Free';
}

/** Get price display for tier */
function getTierPriceDisplay(tier: string): string {
  switch (tier) {
    case 'individual_monthly':
      return PLAN_PRICING.individual_monthly.displayPrice + '/month';
    case 'individual_annual':
      return PLAN_PRICING.individual_annual.displayPrice + '/year';
    case 'family_monthly':
      return PLAN_PRICING.family_monthly.displayPrice + '/month';
    case 'family_annual':
      return PLAN_PRICING.family_annual.displayPrice + '/year';
    case 'trial_individual':
    case 'trial_family':
      return 'Free Trial';
    default:
      return 'Free';
  }
}

export function SubscriptionDashboard({ onViewHistory, onUpgrade, onShowPaywall }: SubscriptionDashboardProps) {
  const {
    loading,
    error,
    isPremium,
    isTrial,
    isTrialExpired,
    tier,
    daysUntilRenewal,
    daysUntilTrialEnd,
    totalTokens,
    tokenUsagePercent,
    subscriptionTokens,
    purchasedTokens,
    rolloverTokens,
    startTrial,
    openCheckout,
    openTokenPurchase,
    openCustomerPortal,
    cancelSubscription,
    resumeSubscription,
    getSavings,
    state,
  } = useSubscription();
  const [savings, setSavings] = useState({ itemsSaved: 0, moneySaved: 0, co2Avoided: 0 });
  const [loadingSavings, setLoadingSavings] = useState(true);
  const tierCategory = getTierCategory(tier as any);
  const isIndividual = tierCategory === 'individual' || tier === 'trial_individual';
  const isFamily = tierCategory === 'family' || tier === 'trial_family';
  const isAnnual = tier.includes('annual');
  useEffect(() => {
    getSavings('month').then(data => {
      setSavings(data);
      setLoadingSavings(false);
    });
  }, [getSavings]);
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F97316" />
        <Text style={styles.loadingText}>Loading subscription...</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#f44336" />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }
  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancel Subscription',
      `You've saved an estimated $${savings.moneySaved.toFixed(2)} this month. Are you sure you want to cancel?`,
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: async () => {
            const result = await cancelSubscription();
            if (result.success) {
              Alert.alert('Subscription Canceled', 'Your subscription will remain active until the end of your billing period.');
            } else {
              Alert.alert('Error', result.error || 'Failed to cancel subscription');
            }
          },
        },
      ]
    );
  };
  const handleBuyTokens = () => {
    Alert.alert(
      'Buy More Tokens',
      'Choose a token bucket:',
      TOKEN_BUCKETS.map(bucket => ({
        text: `${bucket.size} tokens - ${bucket.displayPrice}`,
        onPress: () => openTokenPurchase(bucket.size as 50 | 150 | 400),
      })).concat([{ text: 'Cancel', style: 'cancel' as const, onPress: () => {} }])
    );
  };
  const handleUpgradeToFamily = () => {
    if (onShowPaywall) {
      onShowPaywall('family');
    }
  };
  const renderPremiumDashboard = () => (
    <>
      {/* Plan Status Card */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <View style={[styles.planBadge, isFamily && styles.planBadgeFamily]}>
            <Ionicons
              name={isFamily ? 'people' : 'person'}
              size={20}
              color={isFamily ? '#7C3AED' : '#F97316'}
            />
            <Text style={[styles.planBadgeText, isFamily && styles.planBadgeTextFamily]}>
              {getTierDisplayName(tier, isAnnual)}
            </Text>
          </View>
          <Text style={styles.statusActive}>
            {isTrial ? 'Trial' : 'Active'}
          </Text>
        </View>
        <View style={styles.statusDetails}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>
              {isTrial ? 'Trial ends in' : 'Renews in'}
            </Text>
            <Text style={styles.statusValue}>
              {isTrial
                ? `${daysUntilTrialEnd} days`
                : `${daysUntilRenewal} days`}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Price</Text>
            <Text style={styles.statusValue}>
              {getTierPriceDisplay(tier)}
            </Text>
          </View>
        </View>
        {/* Upgrade to Family option for Individual users */}
        {isIndividual && !isTrial && (
          <TouchableOpacity
            style={styles.upgradeToFamilyButton}
            onPress={handleUpgradeToFamily}
          >
            <Ionicons name="people" size={16} color="#7C3AED" />
            <Text style={styles.upgradeToFamilyText}>
              Upgrade to Family — +$5/mo
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#7C3AED" />
          </TouchableOpacity>
        )}
        {!isTrial && (
          <TouchableOpacity style={styles.manageButton} onPress={openCustomerPortal}>
            <Text style={styles.manageButtonText}>Manage Subscription</Text>
            <Ionicons name="open-outline" size={16} color="#F97316" />
          </TouchableOpacity>
        )}
      </View>
      {/* Token Balance Card */}
      <View style={styles.tokenCard}>
        <Text style={styles.tokenCardTitle}>AI Tokens</Text>
        <View style={styles.tokenBalance}>
          <Text style={styles.tokenAmount}>{totalTokens}</Text>
          <Text style={styles.tokenLabel}>available</Text>
        </View>
        {/* Token Usage Meter */}
        <View style={styles.usageMeter}>
          <View style={styles.usageMeterBackground}>
            <View
              style={[
                styles.usageMeterFill,
                {
                  width: `${Math.min(tokenUsagePercent, 100)}%`,
                  backgroundColor: tokenUsagePercent >= 80 ? '#FF9800' : '#F97316',
                },
              ]}
            />
          </View>
          <Text style={styles.usageMeterText}>{tokenUsagePercent}% used this month</Text>
        </View>
        {/* Token Breakdown */}
        <View style={styles.tokenBreakdown}>
          <View style={styles.tokenBreakdownRow}>
            <View style={[styles.tokenDot, { backgroundColor: '#F97316' }]} />
            <Text style={styles.tokenBreakdownLabel}>Monthly</Text>
            <Text style={styles.tokenBreakdownValue}>{subscriptionTokens}</Text>
          </View>
          <View style={styles.tokenBreakdownRow}>
            <View style={[styles.tokenDot, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.tokenBreakdownLabel}>Purchased</Text>
            <Text style={styles.tokenBreakdownValue}>{purchasedTokens}</Text>
          </View>
          {isAnnual && (
            <View style={styles.tokenBreakdownRow}>
              <View style={[styles.tokenDot, { backgroundColor: '#7C3AED' }]} />
              <Text style={styles.tokenBreakdownLabel}>Rollover</Text>
              <Text style={styles.tokenBreakdownValue}>{rolloverTokens}</Text>
            </View>
          )}
        </View>
        {/* Token Actions */}
        <View style={styles.tokenActions}>
          {totalTokens < 30 && (
            <Button
              title="Buy More Tokens"
              onPress={handleBuyTokens}
              style={styles.buyTokensButton}
            />
          )}
          <TouchableOpacity style={styles.viewHistoryButton} onPress={onViewHistory}>
            <Text style={styles.viewHistoryText}>View Usage History</Text>
            <Ionicons name="chevron-forward" size={16} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
      {/* Family Features Card (Family tier only) */}
      {isFamily && (
        <View style={styles.familyFeaturesCard}>
          <View style={styles.familyFeaturesHeader}>
            <Ionicons name="people" size={24} color="#7C3AED" />
            <Text style={styles.familyFeaturesTitle}>Family Features</Text>
          </View>
          <View style={styles.familyFeaturesGrid}>
            <View style={styles.familyFeatureItem}>
              <Ionicons name="person-add" size={20} color="#7C3AED" />
              <Text style={styles.familyFeatureLabel}>Up to 6 members</Text>
            </View>
            <View style={styles.familyFeatureItem}>
              <Ionicons name="calendar" size={20} color="#7C3AED" />
              <Text style={styles.familyFeatureLabel}>Weekly AI planning</Text>
            </View>
            <View style={styles.familyFeatureItem}>
              <Ionicons name="nutrition" size={20} color="#7C3AED" />
              <Text style={styles.familyFeatureLabel}>Per-person prefs</Text>
            </View>
            <View style={styles.familyFeatureItem}>
              <Ionicons name="sync" size={20} color="#7C3AED" />
              <Text style={styles.familyFeatureLabel}>Shared pantry</Text>
            </View>
          </View>
        </View>
      )}
      {/* Savings Card */}
      {!loadingSavings && savings.moneySaved > 0 && (
        <View style={styles.savingsCard}>
          <View style={styles.savingsHeader}>
            <Ionicons name="leaf" size={24} color="#10B981" />
            <Text style={styles.savingsTitle}>Your Impact This Month</Text>
          </View>
          <View style={styles.savingsGrid}>
            <View style={styles.savingsItem}>
              <Text style={styles.savingsValue}>${savings.moneySaved.toFixed(0)}</Text>
              <Text style={styles.savingsLabel}>Saved</Text>
            </View>
            <View style={styles.savingsItem}>
              <Text style={styles.savingsValue}>{savings.itemsSaved}</Text>
              <Text style={styles.savingsLabel}>Items Rescued</Text>
            </View>
            <View style={styles.savingsItem}>
              <Text style={styles.savingsValue}>{savings.co2Avoided.toFixed(1)}kg</Text>
              <Text style={styles.savingsLabel}>CO₂ Avoided</Text>
            </View>
          </View>
        </View>
      )}
      {/* Annual Switch Option (Monthly users) */}
      {!isAnnual && !isTrial && (
        <TouchableOpacity
          style={styles.annualSwitchButton}
          onPress={() => openCheckout(isFamily ? 'family_annual' : 'individual_annual')}
        >
          <Ionicons name="calendar" size={20} color="#F97316" />
          <Text style={styles.annualSwitchText}>Switch to Annual — Save 17%</Text>
        </TouchableOpacity>
      )}
      {/* Cancel Option */}
      {!isTrial && !state?.subscription?.cancel_at_period_end && (
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancelSubscription}>
          <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
        </TouchableOpacity>
      )}
      {state?.subscription?.cancel_at_period_end && (
        <View style={styles.canceledBanner}>
          <Ionicons name="information-circle" size={20} color="#FF9800" />
          <Text style={styles.canceledText}>
            Your subscription will end on {new Date(state.subscription.current_period_end || '').toLocaleDateString()}
          </Text>
          <TouchableOpacity onPress={resumeSubscription}>
            <Text style={styles.resumeText}>Resume</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
  const renderFreeDashboard = () => (
    <>
      {/* Upgrade Card */}
      <View style={styles.upgradeCard}>
        <View style={styles.upgradeHeader}>
          <Ionicons name="rocket" size={32} color="#F97316" />
          <Text style={styles.upgradeTitle}>Upgrade to Premium</Text>
          <Text style={styles.upgradeSubtitle}>
            Save time. Waste less. Eat better.
          </Text>
        </View>
        {/* ROI Callout */}
        <View style={styles.roiCallout}>
          <Ionicons name="cash-outline" size={20} color="#10B981" />
          <Text style={styles.roiText}>
            Pays for itself after saving just ONE ingredient from the trash
          </Text>
        </View>
        {/* Plan Options */}
        <View style={styles.planOptions}>
          {/* Individual */}
          <TouchableOpacity
            style={[styles.planOption, styles.planOptionRecommended]}
            onPress={() => onShowPaywall?.('individual')}
          >
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedBadgeText}>Most Popular</Text>
            </View>
            <Text style={[styles.planOptionName, styles.planOptionNameSelected]}>Individual</Text>
            <Text style={[styles.planOptionPrice, styles.planOptionPriceSelected]}>
              {PLAN_PRICING.individual_monthly.displayPrice}
            </Text>
            <Text style={styles.planOptionPeriod}>/month</Text>
            <View style={styles.planFeatures}>
              <Text style={styles.planFeatureText}>• AI suggestions</Text>
              <Text style={styles.planFeatureText}>• Unlimited pantry</Text>
              <Text style={styles.planFeatureText}>• 100 tokens/mo</Text>
            </View>
          </TouchableOpacity>
          {/* Family */}
          <TouchableOpacity
            style={styles.planOption}
            onPress={() => onShowPaywall?.('family')}
          >
            <Text style={styles.planOptionName}>Family</Text>
            <Text style={styles.planOptionPrice}>
              {PLAN_PRICING.family_monthly.displayPrice}
            </Text>
            <Text style={styles.planOptionPeriod}>/month</Text>
            <View style={styles.planFeatures}>
              <Text style={styles.planFeatureText}>• Up to 6 members</Text>
              <Text style={styles.planFeatureText}>• Weekly AI planning</Text>
              <Text style={styles.planFeatureText}>• 150 tokens/mo</Text>
            </View>
          </TouchableOpacity>
        </View>
        {/* Trial Option */}
        {!isTrialExpired && (
          <TouchableOpacity
            style={styles.trialButton}
            onPress={async () => {
              const result = await startTrial();
              if (!result.success) {
                Alert.alert('Error', result.error || 'Failed to start trial');
              }
            }}
          >
            <Text style={styles.trialButtonText}>Start 14-Day Free Trial</Text>
            <Text style={styles.trialButtonSubtext}>No credit card required</Text>
          </TouchableOpacity>
        )}
      </View>
      {/* Feature Comparison */}
      <View style={styles.featuresCard}>
        <Text style={styles.featuresTitle}>Compare Plans</Text>
        {[
          { icon: 'sparkles', text: 'AI recipe suggestions', individual: true, family: true },
          { icon: 'infinite', text: 'Unlimited pantry items', individual: true, family: true },
          { icon: 'barcode', text: 'Unlimited barcode scans', individual: true, family: true },
          { icon: 'calendar', text: 'Weekly AI meal planning', individual: false, family: true },
          { icon: 'people', text: 'Up to 6 household members', individual: false, family: true },
          { icon: 'nutrition', text: 'Per-person preferences', individual: false, family: true },
          { icon: 'sync', text: 'Recipe scaling', individual: false, family: true },
        ].map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <Ionicons
              name={feature.icon as any}
              size={20}
              color="#666"
            />
            <Text style={styles.featureText}>{feature.text}</Text>
            <View style={styles.featureChecks}>
              <Ionicons
                name={feature.individual ? 'checkmark-circle' : 'close-circle'}
                size={18}
                color={feature.individual ? '#F97316' : '#ccc'}
              />
              <Ionicons
                name={feature.family ? 'checkmark-circle' : 'close-circle'}
                size={18}
                color={feature.family ? '#7C3AED' : '#ccc'}
              />
            </View>
          </View>
        ))}
        <View style={styles.featureRowHeader}>
          <Text style={styles.featureHeaderSpacer} />
          <View style={styles.featureChecks}>
            <Text style={styles.featureHeaderLabel}>Indiv.</Text>
            <Text style={styles.featureHeaderLabel}>Family</Text>
          </View>
        </View>
      </View>
      {/* Current Limits */}
      <View style={styles.limitsCard}>
        <Text style={styles.limitsTitle}>Your Free Tier Usage</Text>
        <View style={styles.limitRow}>
          <Text style={styles.limitLabel}>Pantry Items</Text>
          <View style={styles.limitProgress}>
            <View
              style={[
                styles.limitProgressBar,
                { width: `${((state?.usageLimits?.pantry_items_count || 0) / 50) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.limitValue}>
            {state?.usageLimits?.pantry_items_count || 0}/50
          </Text>
        </View>
        <View style={styles.limitRow}>
          <Text style={styles.limitLabel}>Saved Recipes</Text>
          <View style={styles.limitProgress}>
            <View
              style={[
                styles.limitProgressBar,
                { width: `${((state?.usageLimits?.saved_recipes_count || 0) / 25) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.limitValue}>
            {state?.usageLimits?.saved_recipes_count || 0}/25
          </Text>
        </View>
        <View style={styles.limitRow}>
          <Text style={styles.limitLabel}>Barcode Scans</Text>
          <View style={styles.limitProgress}>
            <View
              style={[
                styles.limitProgressBar,
                { width: `${((state?.usageLimits?.barcode_scans_count || 0) / 10) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.limitValue}>
            {state?.usageLimits?.barcode_scans_count || 0}/10
          </Text>
        </View>
      </View>
    </>
  );
  return (
    <View style={styles.container}>
      {isPremium || isTrial ? renderPremiumDashboard() : renderFreeDashboard()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
  },
  // Premium Dashboard Styles
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  planBadgeFamily: {
    backgroundColor: '#F3E8FF',
  },
  planBadgeText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#F97316',
  },
  planBadgeTextFamily: {
    color: '#7C3AED',
  },
  statusActive: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  statusDetails: {
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  upgradeToFamilyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: '#F3E8FF',
    borderRadius: 12,
    gap: 8,
  },
  upgradeToFamilyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  manageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F97316',
    marginRight: 4,
  },
  // Token Card Styles
  tokenCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tokenCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  tokenBalance: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  tokenAmount: {
    fontSize: 48,
    fontWeight: '700',
    color: '#F97316',
  },
  tokenLabel: {
    fontSize: 18,
    color: '#666',
    marginLeft: 8,
  },
  usageMeter: {
    marginBottom: 16,
  },
  usageMeterBackground: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  usageMeterFill: {
    height: '100%',
    borderRadius: 4,
  },
  usageMeterText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  tokenBreakdown: {
    marginBottom: 16,
  },
  tokenBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tokenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  tokenBreakdownLabel: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  tokenBreakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  tokenActions: {
    gap: 12,
  },
  buyTokensButton: {
    backgroundColor: '#F97316',
  },
  viewHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  viewHistoryText: {
    fontSize: 14,
    color: '#666',
  },
  // Family Features Card
  familyFeaturesCard: {
    backgroundColor: '#F3E8FF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  familyFeaturesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  familyFeaturesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7C3AED',
    marginLeft: 8,
  },
  familyFeaturesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  familyFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '45%',
    gap: 6,
  },
  familyFeatureLabel: {
    fontSize: 12,
    color: '#6B21A8',
  },
  // Savings Card Styles
  savingsCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  savingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  savingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
    marginLeft: 8,
  },
  savingsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  savingsItem: {
    alignItems: 'center',
  },
  savingsValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#065F46',
  },
  savingsLabel: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 4,
  },
  // Annual Switch
  annualSwitchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 8,
    gap: 8,
  },
  annualSwitchText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F97316',
  },
  // Cancel Button Styles
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#999',
  },
  canceledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  canceledText: {
    flex: 1,
    fontSize: 13,
    color: '#E65100',
    marginLeft: 8,
  },
  resumeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F97316',
  },
  // Free Dashboard Styles
  upgradeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  upgradeHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  upgradeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginTop: 12,
  },
  upgradeSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  roiCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  roiText: {
    flex: 1,
    fontSize: 13,
    color: '#065F46',
    marginLeft: 8,
  },
  planOptions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  planOption: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planOptionRecommended: {
    borderColor: '#F97316',
    backgroundColor: '#FFF7ED',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: '#F97316',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  recommendedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  planOptionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
    marginTop: 8,
  },
  planOptionNameSelected: {
    color: '#333',
  },
  planOptionPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  planOptionPriceSelected: {
    color: '#F97316',
  },
  planOptionPeriod: {
    fontSize: 12,
    color: '#999',
  },
  planFeatures: {
    marginTop: 12,
    alignItems: 'flex-start',
    width: '100%',
  },
  planFeatureText: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  trialButton: {
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 8,
  },
  trialButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F97316',
  },
  trialButtonSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  // Features Card Styles
  featuresCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  featureRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
  },
  featureHeaderSpacer: {
    flex: 1,
  },
  featureHeaderLabel: {
    width: 50,
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
  },
  featureChecks: {
    flexDirection: 'row',
    width: 100,
    justifyContent: 'space-around',
  },
  // Limits Card Styles
  limitsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  limitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  limitLabel: {
    fontSize: 14,
    color: '#666',
    width: 100,
  },
  limitProgress: {
    flex: 1,
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  limitProgressBar: {
    height: '100%',
    backgroundColor: '#F97316',
    borderRadius: 3,
  },
  limitValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    width: 50,
    textAlign: 'right',
  },
});
