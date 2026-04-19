/**
 * PaywallModal Component
 * Three-tier paywall for subscription purchases (Free/Individual/Family)
 * 
 * Supports:
 * - Three-tier selection: Free, Individual ($9.99/mo), Family ($14.99/mo)
 * - Monthly/Annual toggle with 17% savings display
 * - Contextual variations based on trigger point
 * - 14-day free trial for paid tiers
 * - Apple IAP and Stripe payment options
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { openBrowserAsync } from 'expo-web-browser';
import { useAuth } from '../context/AuthContext';
import * as subscriptionService from '../lib/subscriptionService';
import {
  PaymentProvider,
  PaywallConfig,
  PurchaseResult,
  PLAN_PRICING,
  APPLE_DISCLOSURE_TEXT,
  PaywallTrigger,
  PaywallContext,
  TierCategory,
} from '../lib/types';

interface PaywallModalProps {
  /** Whether modal is visible */
  visible: boolean;
  /** Close handler */
  onClose: () => void;
  /** Success callback after purchase/trial start */
  onSuccess?: () => void;
  /** Paywall context for customization */
  context?: PaywallContext;
  /** Force highlight a specific tier */
  highlightTier?: TierCategory;
}

type BillingCycle = 'monthly' | 'annual';
type SelectedTier = 'free' | 'individual' | 'family';

interface TierFeature {
  text: string;
  included: boolean;
}

interface TierDisplay {
  id: SelectedTier;
  name: string;
  monthlyPrice: string;
  annualPrice: string;
  monthlyEquivalent: string;
  annualSavings: string;
  badge?: string;
  badgeColor?: string;
  ctaText: string;
  features: TierFeature[];
}

const TIER_DISPLAYS: TierDisplay[] = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: '$0',
    annualPrice: '$0',
    monthlyEquivalent: '$0',
    annualSavings: '',
    ctaText: 'Get Started',
    features: [
      { text: '50 pantry items', included: true },
      { text: '25 saved recipes', included: true },
      { text: '10 scans/month', included: true },
      { text: 'Basic lists', included: true },
      { text: 'Email support', included: true },
    ],
  },
  {
    id: 'individual',
    name: 'Individual',
    monthlyPrice: '$9.99',
    annualPrice: '$99',
    monthlyEquivalent: '$8.25/mo',
    annualSavings: 'Save $20.88',
    badge: 'Most Popular',
    badgeColor: '#F97316',
    ctaText: 'Start 14-Day Free Trial',
    features: [
      { text: 'Unlimited pantry', included: true },
      { text: 'Unlimited recipes', included: true },
      { text: 'Unlimited scans', included: true },
      { text: 'AI recipe suggestions', included: true },
      { text: 'Expiration tracking', included: true },
      { text: 'Smart lists', included: true },
      { text: 'Priority support', included: true },
    ],
  },
  {
    id: 'family',
    name: 'Family',
    monthlyPrice: '$14.99',
    annualPrice: '$149',
    monthlyEquivalent: '$12.42/mo',
    annualSavings: 'Save $30.88',
    ctaText: 'Start 14-Day Free Trial',
    features: [
      { text: 'Everything in Individual', included: true },
      { text: 'Up to 6 members', included: true },
      { text: 'Weekly AI planning', included: true },
      { text: 'Per-person prefs', included: true },
      { text: 'Shared pantry', included: true },
      { text: 'Recipe scaling', included: true },
      { text: 'Calendar sync', included: true },
    ],
  },
];

/** Get contextual header based on trigger */
function getContextualHeader(context?: PaywallContext): { title: string; subtitle: string } {
  if (!context) {
    return {
      title: 'Choose Your Plan',
      subtitle: 'Save time. Waste less. Eat better.',
    };
  }
  switch (context.trigger) {
    case 'pantry_limit':
      return {
        title: 'Pantry Full',
        subtitle: `You've reached ${context.limit} items — the free tier limit.`,
      };
    case 'recipe_limit':
      return {
        title: 'Recipe Limit Reached',
        subtitle: `You've saved ${context.limit} recipes — the free tier limit.`,
      };
    case 'scan_limit':
      return {
        title: 'Scan Limit Reached',
        subtitle: `You've used ${context.limit} scans this month.`,
      };
    case 'ai_suggestions':
      return {
        title: 'Unlock AI Suggestions',
        subtitle: 'Get personalized recipes based on your pantry.',
      };
    case 'meal_plan':
      return {
        title: 'Unlock Meal Planning',
        subtitle: 'Plan your family\'s meals for the entire week with AI.',
      };
    case 'add_family_member':
      return {
        title: 'Family Features',
        subtitle: 'Meal planning works better together.',
      };
    case 'recipe_scaling':
      return {
        title: 'Recipe Scaling',
        subtitle: 'Adjust servings automatically for any group size.',
      };
    case 'calendar_sync':
      return {
        title: 'Calendar Sync',
        subtitle: 'Sync your meal plans with your family calendar.',
      };
    case 'trial_expiring':
      return {
        title: 'Keep Your Premium Features',
        subtitle: 'Your trial is ending soon.',
      };
    default:
      return {
        title: 'Choose Your Plan',
        subtitle: 'Save time. Waste less. Eat better.',
      };
  }
}

export function PaywallModal({
  visible,
  onClose,
  onSuccess,
  context,
  highlightTier,
}: PaywallModalProps): React.ReactElement {
  const { user } = useAuth();
  const [selectedTier, setSelectedTier] = useState<SelectedTier>(
    highlightTier || context?.highlightedTier || 'individual'
  );
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>('stripe');
  const [paywallConfig, setPaywallConfig] = useState<PaywallConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDisclosure, setShowDisclosure] = useState(false);
  const [showProviderSelection, setShowProviderSelection] = useState(false);
  const { title, subtitle } = getContextualHeader(context);
  // Load paywall configuration
  useEffect(() => {
    if (visible && user?.id) {
      loadPaywallConfig();
    }
  }, [visible, user?.id]);
  // Update selected tier when context changes
  useEffect(() => {
    if (context?.highlightedTier) {
      setSelectedTier(context.highlightedTier);
    } else if (highlightTier) {
      setSelectedTier(highlightTier);
    }
  }, [context?.highlightedTier, highlightTier]);
  const loadPaywallConfig = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      const config = await subscriptionService.getPaywallConfiguration(user.id);
      setPaywallConfig(config);
      setSelectedProvider(config.recommendedProvider);
    } catch (err) {
      console.error('[Paywall] Error loading config:', err);
      setError('Failed to load payment options');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);
  const getSubscriptionTier = (): 'individual_monthly' | 'individual_annual' | 'family_monthly' | 'family_annual' => {
    if (selectedTier === 'individual') {
      return billingCycle === 'annual' ? 'individual_annual' : 'individual_monthly';
    }
    return billingCycle === 'annual' ? 'family_annual' : 'family_monthly';
  };
  const handleStartTrial = useCallback(async () => {
    if (!user?.id || isPurchasing) return;
    if (selectedTier === 'free') {
      onClose();
      return;
    }
    setIsPurchasing(true);
    setError(null);
    try {
      const trialTier = selectedTier === 'family' ? 'trial_family' : 'trial_individual';
      const result = await subscriptionService.startFreeTrial(user.id, trialTier);
      if (result.success) {
        onSuccess?.();
        onClose();
      } else {
        setError(result.error || 'Failed to start trial');
      }
    } catch (err) {
      console.error('[Paywall] Trial error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start trial');
    } finally {
      setIsPurchasing(false);
    }
  }, [user?.id, selectedTier, isPurchasing, onSuccess, onClose]);
  const handlePurchase = useCallback(async () => {
    if (!user?.id || isPurchasing) return;
    if (selectedTier === 'free') {
      onClose();
      return;
    }
    // Show provider selection if both are available
    if (paywallConfig?.showStripeOption && paywallConfig?.showAppleOption && !showProviderSelection) {
      setShowProviderSelection(true);
      return;
    }
    // Show disclosure for Stripe before proceeding
    if (selectedProvider === 'stripe' && !showDisclosure && paywallConfig?.showAppleOption) {
      setShowDisclosure(true);
      return;
    }
    setIsPurchasing(true);
    setError(null);
    try {
      const tier = getSubscriptionTier();
      let result: PurchaseResult;
      if (selectedProvider === 'stripe') {
        const successUrl = 'dinnerplans://subscription/success';
        const cancelUrl = 'dinnerplans://subscription/cancel';
        const checkoutUrl = await subscriptionService.getStripeCheckoutUrl(
          user.id,
          tier,
          successUrl,
          cancelUrl
        );
        if (!checkoutUrl) {
          throw new Error('Failed to create checkout session');
        }
        await openBrowserAsync(checkoutUrl);
        result = { success: true, provider: 'stripe' };
      } else {
        result = await subscriptionService.purchaseSubscription(
          user.id,
          tier,
          'apple'
        );
      }
      if (result.success) {
        onSuccess?.();
        onClose();
      } else if (result.error && !result.error.includes('cancel')) {
        setError(result.error);
      }
    } catch (err) {
      console.error('[Paywall] Purchase error:', err);
      setError(err instanceof Error ? err.message : 'Purchase failed');
    } finally {
      setIsPurchasing(false);
      setShowDisclosure(false);
      setShowProviderSelection(false);
    }
  }, [
    user?.id,
    selectedProvider,
    selectedTier,
    billingCycle,
    isPurchasing,
    showDisclosure,
    showProviderSelection,
    paywallConfig,
    onSuccess,
    onClose,
  ]);
  const handleRestore = useCallback(async () => {
    if (!user?.id || Platform.OS !== 'ios') return;
    setIsPurchasing(true);
    setError(null);
    try {
      const result = await subscriptionService.restorePurchases(user.id);
      if (result.success) {
        onSuccess?.();
        onClose();
      } else {
        setError(result.error || 'No purchases to restore');
      }
    } catch (err) {
      setError('Failed to restore purchases');
    } finally {
      setIsPurchasing(false);
    }
  }, [user?.id, onSuccess, onClose]);
  const openTerms = () => {
    Linking.openURL(APPLE_DISCLOSURE_TEXT.termsLink);
  };
  const openPrivacy = () => {
    Linking.openURL(APPLE_DISCLOSURE_TEXT.privacyLink);
  };
  if (!visible) return <></>;
  const renderTierCard = (tierDisplay: TierDisplay, index: number) => {
    const isSelected = selectedTier === tierDisplay.id;
    const isPopular = tierDisplay.id === 'individual';
    const price = billingCycle === 'annual' ? tierDisplay.annualPrice : tierDisplay.monthlyPrice;
    const priceLabel = billingCycle === 'annual' ? '/year' : tierDisplay.id === 'free' ? '/forever' : '/month';
    return (
      <TouchableOpacity
        key={tierDisplay.id}
        onPress={() => setSelectedTier(tierDisplay.id)}
        accessibilityRole="radio"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={`${tierDisplay.name} plan, ${price} ${priceLabel}`}
        className={`flex-1 rounded-2xl p-4 border-2 ${
          isSelected
            ? isPopular
              ? 'border-orange-500 bg-orange-50'
              : 'border-emerald-500 bg-emerald-50'
            : 'border-gray-200 bg-white'
        } ${isPopular && !isSelected ? 'shadow-md' : ''}`}
        style={{ minWidth: 100 }}
      >
        {/* Badge */}
        {tierDisplay.badge && (
          <View
            className="absolute -top-3 left-1/2 px-2 py-1 rounded-full"
            style={{
              backgroundColor: tierDisplay.badgeColor || '#F97316',
              transform: [{ translateX: -40 }],
            }}
          >
            <Text className="text-white text-xs font-bold">{tierDisplay.badge}</Text>
          </View>
        )}
        {/* Tier Name */}
        <Text className={`text-base font-semibold text-center mb-2 ${
          isSelected ? 'text-gray-900' : 'text-gray-700'
        }`}>
          {tierDisplay.name}
        </Text>
        {/* Price */}
        <View className="items-center mb-3">
          <Text className={`text-2xl font-bold ${
            isSelected
              ? isPopular ? 'text-orange-600' : 'text-emerald-600'
              : 'text-gray-900'
          }`}>
            {price}
          </Text>
          <Text className="text-xs text-gray-500">{priceLabel}</Text>
          {billingCycle === 'annual' && tierDisplay.id !== 'free' && (
            <Text className="text-xs text-emerald-600 mt-1">
              {tierDisplay.monthlyEquivalent}
            </Text>
          )}
        </View>
        {/* CTA Button */}
        <TouchableOpacity
          onPress={() => {
            setSelectedTier(tierDisplay.id);
            if (tierDisplay.id === 'free') {
              onClose();
            }
          }}
          className={`rounded-xl py-2 mb-3 ${
            isSelected
              ? isPopular
                ? 'bg-orange-500'
                : 'bg-emerald-500'
              : 'border border-gray-300 bg-white'
          }`}
        >
          <Text className={`text-center text-sm font-semibold ${
            isSelected ? 'text-white' : 'text-gray-700'
          }`}>
            {tierDisplay.id === 'free' ? 'Get Started' : tierDisplay.ctaText}
          </Text>
        </TouchableOpacity>
        {/* Features */}
        <View className="space-y-1">
          {tierDisplay.features.map((feature, idx) => (
            <View key={idx} className="flex-row items-center">
              <Ionicons
                name="checkmark-circle"
                size={14}
                color={tierDisplay.id === 'free' ? '#9CA3AF' : '#F97316'}
              />
              <Text className="text-xs text-gray-600 ml-1 flex-1">{feature.text}</Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>
    );
  };
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
          <TouchableOpacity
            onPress={onClose}
            className="p-2"
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <View className="flex-1" />
          <View className="w-10" />
        </View>
        <ScrollView className="flex-1" contentContainerClassName="px-4 py-6">
          {isLoading ? (
            <View className="items-center justify-center py-12">
              <ActivityIndicator size="large" color="#10b981" />
              <Text className="mt-4 text-gray-500">Loading options...</Text>
            </View>
          ) : (
            <>
              {/* Header */}
              <View className="items-center mb-6">
                <Text className="text-2xl font-bold text-gray-900 text-center">{title}</Text>
                <Text className="text-gray-500 mt-2 text-center">{subtitle}</Text>
              </View>
              {/* Billing Toggle */}
              <View className="flex-row items-center justify-center mb-6">
                <View className="flex-row bg-gray-100 rounded-full p-1">
                  <TouchableOpacity
                    onPress={() => setBillingCycle('monthly')}
                    className={`px-4 py-2 rounded-full ${
                      billingCycle === 'monthly' ? 'bg-white shadow-sm' : ''
                    }`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: billingCycle === 'monthly' }}
                  >
                    <Text className={`text-sm font-medium ${
                      billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      Monthly
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setBillingCycle('annual')}
                    className={`px-4 py-2 rounded-full flex-row items-center ${
                      billingCycle === 'annual' ? 'bg-white shadow-sm' : ''
                    }`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: billingCycle === 'annual' }}
                  >
                    <Text className={`text-sm font-medium ${
                      billingCycle === 'annual' ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      Annual
                    </Text>
                    {billingCycle === 'annual' && (
                      <View className="bg-emerald-500 ml-2 px-2 py-0.5 rounded-full">
                        <Text className="text-white text-xs font-bold">Save 17%</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
              {/* Tier Cards */}
              <View className="flex-row gap-3 mb-6">
                {TIER_DISPLAYS.map((tier, index) => renderTierCard(tier, index))}
              </View>
              {/* Error Message */}
              {error && (
                <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <Text className="text-red-700 text-center">{error}</Text>
                </View>
              )}
              {/* Primary CTA */}
              {selectedTier !== 'free' && (
                <TouchableOpacity
                  onPress={handleStartTrial}
                  disabled={isPurchasing}
                  className={`rounded-xl py-4 mb-4 ${
                    isPurchasing ? 'bg-gray-300' : 'bg-orange-500'
                  }`}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isPurchasing }}
                >
                  {isPurchasing ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-semibold text-lg text-center">
                      Start 14-Day Free Trial
                    </Text>
                  )}
                </TouchableOpacity>
              )}
              {/* Secondary CTA - Subscribe directly */}
              {selectedTier !== 'free' && (
                <TouchableOpacity
                  onPress={handlePurchase}
                  disabled={isPurchasing}
                  className="py-2 mb-4"
                  accessibilityRole="button"
                >
                  <Text className="text-gray-500 text-center underline">
                    Or subscribe now for {billingCycle === 'annual'
                      ? TIER_DISPLAYS.find(t => t.id === selectedTier)?.annualPrice
                      : TIER_DISPLAYS.find(t => t.id === selectedTier)?.monthlyPrice}
                    {billingCycle === 'annual' ? '/year' : '/month'}
                  </Text>
                </TouchableOpacity>
              )}
              {/* Trust Badges */}
              <View className="flex-row items-center justify-center gap-4 py-4 border-t border-gray-100">
                <View className="flex-row items-center">
                  <Ionicons name="lock-closed" size={14} color="#6B7280" />
                  <Text className="text-gray-500 text-xs ml-1">Cancel anytime</Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="shield-checkmark" size={14} color="#6B7280" />
                  <Text className="text-gray-500 text-xs ml-1">Secure payment</Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="gift" size={14} color="#6B7280" />
                  <Text className="text-gray-500 text-xs ml-1">14-day free trial</Text>
                </View>
              </View>
              {/* Restore Purchases (iOS only) */}
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  onPress={handleRestore}
                  disabled={isPurchasing}
                  className="py-2 items-center"
                  accessibilityRole="button"
                >
                  <Text className="text-gray-400 text-sm underline">Restore Purchases</Text>
                </TouchableOpacity>
              )}
              {/* Terms & Privacy */}
              <View className="flex-row justify-center gap-4 py-4">
                <TouchableOpacity onPress={openTerms}>
                  <Text className="text-gray-400 text-xs underline">Terms of Service</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={openPrivacy}>
                  <Text className="text-gray-400 text-xs underline">Privacy Policy</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </View>
      {/* Provider Selection Modal */}
      <Modal
        visible={showProviderSelection}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProviderSelection(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-center px-4">
          <View className="bg-white rounded-2xl p-6 max-w-md w-full">
            <Text className="text-lg font-bold text-gray-900 mb-4 text-center">
              Payment Method
            </Text>
            <View className="gap-3 mb-4">
              {/* Stripe Option */}
              <TouchableOpacity
                onPress={() => {
                  setSelectedProvider('stripe');
                  setShowProviderSelection(false);
                  handlePurchase();
                }}
                className={`border-2 rounded-xl p-4 ${
                  paywallConfig?.recommendedProvider === 'stripe'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center">
                      <Ionicons name="card" size={20} color="#3b82f6" />
                    </View>
                    <View>
                      <Text className="font-medium text-gray-900">Pay with Card</Text>
                      <Text className="text-sm text-gray-500">Secure checkout</Text>
                    </View>
                  </View>
                  {paywallConfig?.recommendedProvider === 'stripe' && (
                    <View className="bg-blue-500 px-2 py-0.5 rounded">
                      <Text className="text-xs font-medium text-white">BEST VALUE</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              {/* Apple IAP Option */}
              <TouchableOpacity
                onPress={() => {
                  setSelectedProvider('apple');
                  setShowProviderSelection(false);
                  handlePurchase();
                }}
                className="border-2 border-gray-200 rounded-xl p-4"
              >
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
                    <Ionicons name="logo-apple" size={20} color="#1f2937" />
                  </View>
                  <View>
                    <Text className="font-medium text-gray-900">Pay with Apple</Text>
                    <Text className="text-sm text-gray-500">In-App Purchase</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => setShowProviderSelection(false)}
              className="py-3 items-center"
            >
              <Text className="text-gray-500">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Disclosure Confirmation Modal */}
      <Modal
        visible={showDisclosure}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDisclosure(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-center px-4">
          <View className="bg-white rounded-2xl p-6 max-w-md w-full">
            <Text className="text-lg font-bold text-gray-900 mb-4 text-center">
              External Payment
            </Text>
            <Text className="text-gray-600 text-sm mb-6 text-center">
              {APPLE_DISCLOSURE_TEXT.externalPayment}
            </Text>
            <View className="gap-3">
              <TouchableOpacity
                onPress={() => {
                  setShowDisclosure(false);
                  handlePurchase();
                }}
                className="bg-blue-500 rounded-xl py-3 items-center"
              >
                <Text className="text-white font-semibold">Continue to Checkout</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowDisclosure(false)}
                className="py-3 items-center"
              >
                <Text className="text-gray-500">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

export default PaywallModal;
