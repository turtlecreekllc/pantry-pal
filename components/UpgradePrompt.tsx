/**
 * UpgradePrompt Components
 * Various upgrade prompt modals and banners for strategic upgrade moments
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
import { useSubscription, PLAN_PRICING, TOKEN_BUCKETS } from '../hooks/useSubscription';
import { Button } from './ui/Button';

// ============================================
// FEATURE GATE MODAL
// Shows when free user tries to access premium feature
// ============================================

interface FeatureGateModalProps {
  visible: boolean;
  onClose: () => void;
  feature: string;
  featureDescription?: string;
}

export function FeatureGateModal({
  visible,
  onClose,
  feature,
  featureDescription,
}: FeatureGateModalProps) {
  const { openCheckout, startTrial, isTrialExpired } = useSubscription();
  const handleStartTrial = async () => {
    const result = await startTrial();
    if (result.success) {
      onClose();
    }
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
              <View style={styles.modalIcon}>
                <Ionicons name="lock-closed" size={40} color="#FF9800" />
              </View>
              <Text style={styles.modalTitle}>Premium Feature</Text>
              <Text style={styles.modalFeature}>{feature}</Text>
              {featureDescription && (
                <Text style={styles.modalDescription}>{featureDescription}</Text>
              )}
              <View style={styles.roiBanner}>
                <Ionicons name="trending-up" size={20} color="#4CAF50" />
                <Text style={styles.roiBannerText}>
                  Premium users save $127/month on average
                </Text>
              </View>
              {!isTrialExpired && (
                <Button
                  title="Start 14-Day Free Trial"
                  onPress={handleStartTrial}
                  style={styles.primaryButton}
                />
              )}
              <View style={styles.planButtons}>
                <TouchableOpacity
                  style={styles.planButton}
                  onPress={() => {
                    openCheckout('premium_monthly');
                    onClose();
                  }}
                >
                  <Text style={styles.planButtonPrice}>{PLAN_PRICING.premium_monthly.displayPrice}</Text>
                  <Text style={styles.planButtonPeriod}>/month</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.planButton, styles.planButtonRecommended]}
                  onPress={() => {
                    openCheckout('premium_annual');
                    onClose();
                  }}
                >
                  <Text style={styles.saveBadge}>Save 18%</Text>
                  <Text style={[styles.planButtonPrice, styles.planButtonPriceRecommended]}>
                    {PLAN_PRICING.premium_annual.monthlyEquivalent}
                  </Text>
                  <Text style={styles.planButtonPeriod}>/month</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ============================================
// LIMIT REACHED MODAL
// Shows when free user hits a usage limit
// ============================================

interface LimitReachedModalProps {
  visible: boolean;
  onClose: () => void;
  limitType: 'pantry' | 'recipes' | 'scans' | 'lists';
  current: number;
  limit: number;
}

export function LimitReachedModal({
  visible,
  onClose,
  limitType,
  current,
  limit,
}: LimitReachedModalProps) {
  const { openCheckout, startTrial, isTrialExpired } = useSubscription();
  const limitMessages = {
    pantry: {
      title: 'Pantry Full!',
      description: `You've reached ${current}/${limit} pantry items. Upgrade for unlimited items.`,
      icon: 'basket' as const,
    },
    recipes: {
      title: 'Recipe Collection Full!',
      description: `You've saved ${current}/${limit} recipes. Upgrade to never lose a favorite.`,
      icon: 'book' as const,
    },
    scans: {
      title: 'Scan Limit Reached',
      description: `You've used ${current}/${limit} barcode scans this month. Upgrade for unlimited scanning.`,
      icon: 'barcode' as const,
    },
    lists: {
      title: 'Grocery List Limit',
      description: 'Free tier includes 1 grocery list. Upgrade to organize by store!',
      icon: 'cart' as const,
    },
  };
  const message = limitMessages[limitType];
  const handleStartTrial = async () => {
    const result = await startTrial();
    if (result.success) {
      onClose();
    }
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
              <View style={[styles.modalIcon, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name={message.icon} size={40} color="#FF9800" />
              </View>
              <Text style={styles.modalTitle}>{message.title}</Text>
              <Text style={styles.modalDescription}>{message.description}</Text>
              {/* Progress Bar */}
              <View style={styles.limitProgress}>
                <View style={styles.limitProgressBar}>
                  <View
                    style={[
                      styles.limitProgressFill,
                      { width: `${(current / limit) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.limitProgressText}>
                  {current}/{limit} used
                </Text>
              </View>
              {!isTrialExpired && (
                <Button
                  title="Try Premium Free for 14 Days"
                  onPress={handleStartTrial}
                  style={styles.primaryButton}
                />
              )}
              <TouchableOpacity
                style={styles.subscribeLink}
                onPress={() => {
                  openCheckout('premium_annual');
                  onClose();
                }}
              >
                <Text style={styles.subscribeLinkText}>
                  Subscribe from {PLAN_PRICING.premium_annual.monthlyEquivalent}/month
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ============================================
// TOKEN DEPLETED MODAL
// Shows when premium user runs out of tokens
// ============================================

interface TokenDepletedModalProps {
  visible: boolean;
  onClose: () => void;
  tokensNeeded: number;
  feature: string;
}

export function TokenDepletedModal({
  visible,
  onClose,
  tokensNeeded,
  feature,
}: TokenDepletedModalProps) {
  const { openTokenPurchase, totalTokens } = useSubscription();
  const recommendedBucket = TOKEN_BUCKETS.find(b => b.size >= tokensNeeded) || TOKEN_BUCKETS[2];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
              <View style={[styles.modalIcon, { backgroundColor: '#FFEBEE' }]}>
                <Ionicons name="flash-off" size={40} color="#f44336" />
              </View>
              <Text style={styles.modalTitle}>Out of Tokens</Text>
              <Text style={styles.modalDescription}>
                {feature} requires {tokensNeeded} tokens, but you only have {totalTokens}.
              </Text>
              <Text style={styles.tokenBucketTitle}>Get More Tokens</Text>
              <View style={styles.tokenBuckets}>
                {TOKEN_BUCKETS.map(bucket => (
                  <TouchableOpacity
                    key={bucket.size}
                    style={[
                      styles.tokenBucket,
                      bucket.size === recommendedBucket.size && styles.tokenBucketRecommended,
                    ]}
                    onPress={() => {
                      openTokenPurchase(bucket.size as 50 | 150 | 400);
                      onClose();
                    }}
                  >
                    {bucket.size === recommendedBucket.size && (
                      <Text style={styles.tokenBucketBadge}>Best Value</Text>
                    )}
                    <Text style={styles.tokenBucketSize}>{bucket.size}</Text>
                    <Text style={styles.tokenBucketLabel}>tokens</Text>
                    <Text style={styles.tokenBucketPrice}>{bucket.displayPrice}</Text>
                    <Text style={styles.tokenBucketPer}>{bucket.perToken}/token</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.tokenNote}>
                Purchased tokens never expire
              </Text>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ============================================
// TRIAL REMINDER BANNER
// Shows as countdown during trial
// ============================================

interface TrialReminderBannerProps {
  daysRemaining: number;
  onUpgrade: () => void;
  onDismiss?: () => void;
}

export function TrialReminderBanner({
  daysRemaining,
  onUpgrade,
  onDismiss,
}: TrialReminderBannerProps) {
  const urgentStyle = daysRemaining <= 3;
  return (
    <View style={[styles.banner, urgentStyle && styles.bannerUrgent]}>
      <View style={styles.bannerContent}>
        <Ionicons
          name={urgentStyle ? 'time' : 'gift'}
          size={24}
          color={urgentStyle ? '#FF5722' : '#4CAF50'}
        />
        <View style={styles.bannerText}>
          <Text style={[styles.bannerTitle, urgentStyle && styles.bannerTitleUrgent]}>
            {daysRemaining === 0
              ? 'Trial ends today!'
              : daysRemaining === 1
              ? '1 day left in trial'
              : `${daysRemaining} days left in trial`}
          </Text>
          <Text style={styles.bannerSubtitle}>
            Subscribe now to keep your AI features
          </Text>
        </View>
      </View>
      <View style={styles.bannerActions}>
        <TouchableOpacity style={styles.bannerButton} onPress={onUpgrade}>
          <Text style={styles.bannerButtonText}>Subscribe</Text>
        </TouchableOpacity>
        {onDismiss && (
          <TouchableOpacity style={styles.bannerDismiss} onPress={onDismiss}>
            <Ionicons name="close" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ============================================
// POST VALUE PROMPT
// Shows after successful AI feature use
// ============================================

interface PostValuePromptProps {
  visible: boolean;
  onClose: () => void;
  savedValue?: number; // Estimated value of what was just saved
  feature: string;
}

export function PostValuePrompt({
  visible,
  onClose,
  savedValue,
  feature,
}: PostValuePromptProps) {
  const { openCheckout, isPremium } = useSubscription();
  if (isPremium) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, styles.postValueContent]}>
              <View style={[styles.modalIcon, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="checkmark-circle" size={40} color="#4CAF50" />
              </View>
              <Text style={styles.postValueTitle}>Great Choice!</Text>
              {savedValue && (
                <Text style={styles.postValueSavings}>
                  You just saved ~${savedValue.toFixed(2)} worth of ingredients
                </Text>
              )}
              <Text style={styles.postValueDescription}>
                Upgrade to unlock unlimited {feature} and save even more.
              </Text>
              <TouchableOpacity
                style={styles.postValueButton}
                onPress={() => {
                  openCheckout('premium_annual');
                  onClose();
                }}
              >
                <Text style={styles.postValueButtonText}>
                  Unlock More Savings
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.postValueDismiss} onPress={onClose}>
                <Text style={styles.postValueDismissText}>Maybe Later</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ============================================
// INLINE UPGRADE CTA
// Small inline component for embedding in screens
// ============================================

interface InlineUpgradeCTAProps {
  message?: string;
  compact?: boolean;
  onPress?: () => void;
}

export function InlineUpgradeCTA({
  message = 'Upgrade for unlimited access',
  compact = false,
  onPress,
}: InlineUpgradeCTAProps) {
  const { openCheckout, isPremium } = useSubscription();
  if (isPremium) return null;
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      openCheckout('premium_annual');
    }
  };
  if (compact) {
    return (
      <TouchableOpacity style={styles.inlineCTACompact} onPress={handlePress}>
        <Ionicons name="star" size={14} color="#FFD700" />
        <Text style={styles.inlineCTACompactText}>Upgrade</Text>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity style={styles.inlineCTA} onPress={handlePress}>
      <View style={styles.inlineCTAContent}>
        <Ionicons name="rocket" size={20} color="#4CAF50" />
        <Text style={styles.inlineCTAText}>{message}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#4CAF50" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Modal Base Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
    zIndex: 1,
  },
  modalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF8E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalFeature: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  // ROI Banner
  roiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
  },
  roiBannerText: {
    fontSize: 13,
    color: '#2E7D32',
    marginLeft: 8,
    flex: 1,
  },
  // Buttons
  primaryButton: {
    width: '100%',
    marginBottom: 12,
  },
  planButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  planButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  planButtonRecommended: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  saveBadge: {
    position: 'absolute',
    top: -8,
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  planButtonPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  planButtonPriceRecommended: {
    color: '#4CAF50',
  },
  planButtonPeriod: {
    fontSize: 12,
    color: '#999',
  },
  subscribeLink: {
    marginTop: 12,
    paddingVertical: 8,
  },
  subscribeLinkText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  // Limit Progress
  limitProgress: {
    width: '100%',
    marginBottom: 20,
  },
  limitProgressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  limitProgressFill: {
    height: '100%',
    backgroundColor: '#FF9800',
    borderRadius: 4,
  },
  limitProgressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  // Token Buckets
  tokenBucketTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  tokenBuckets: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    marginBottom: 12,
  },
  tokenBucket: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  tokenBucketRecommended: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  tokenBucketBadge: {
    position: 'absolute',
    top: -8,
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tokenBucketSize: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  tokenBucketLabel: {
    fontSize: 10,
    color: '#666',
  },
  tokenBucketPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    marginTop: 4,
  },
  tokenBucketPer: {
    fontSize: 9,
    color: '#999',
  },
  tokenNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  // Banner Styles
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  bannerUrgent: {
    backgroundColor: '#FFEBEE',
  },
  bannerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerText: {
    marginLeft: 12,
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  bannerTitleUrgent: {
    color: '#C62828',
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  bannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bannerButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  bannerButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  bannerDismiss: {
    padding: 4,
  },
  // Post Value Styles
  postValueContent: {
    maxWidth: 320,
  },
  postValueTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  postValueSavings: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 8,
  },
  postValueDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  postValueButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  postValueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  postValueDismiss: {
    marginTop: 12,
    paddingVertical: 8,
  },
  postValueDismissText: {
    fontSize: 14,
    color: '#999',
  },
  // Inline CTA Styles
  inlineCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginVertical: 8,
  },
  inlineCTAContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inlineCTAText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginLeft: 8,
  },
  inlineCTACompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  inlineCTACompactText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F9A825',
    marginLeft: 4,
  },
});

