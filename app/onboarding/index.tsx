/**
 * Onboarding Screen - Value Before Commitment
 *
 * Per PRD: Show value in first 30 seconds before asking for any data
 *
 * Flow:
 * 1. Welcome (5s) - Pepper introduces itself
 * 2. Quick Personalization (15s) - Household size, dietary needs
 * 3. Instant Value (30s) - Show a recipe suggestion immediately
 * 4. Quick Pantry Seed (optional) - Ways to add ingredients
 * 5. Personalized Result - Show matched recipe
 * 6. Subscription (after value demonstrated)
 *
 * Decomposed in QUAL-005: state machine lives in useOnboardingFlow,
 * each step is a pure presenter under ./steps/.
 */

import React, { useEffect, useState } from 'react';
import { View, ScrollView, Animated, ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../lib/theme';
import { styles } from './styles';
import { useOnboardingFlow } from './useOnboardingFlow';
import { WelcomeStep } from './steps/WelcomeStep';
import { PersonalizeStep } from './steps/PersonalizeStep';
import { FirstSuggestionStep } from './steps/FirstSuggestionStep';
import { PantrySeedStep } from './steps/PantrySeedStep';
import { PantryChecklistStep } from './steps/PantryChecklistStep';
import { PersonalizedResultStep } from './steps/PersonalizedResultStep';
import { SubscriptionStep } from './steps/SubscriptionStep';

export default function OnboardingScreen(): React.ReactElement {
  const flow = useOnboardingFlow();
  const fadeAnim = useState(new Animated.Value(0))[0];

  // Fade in animation on step change
  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [flow.step, fadeAnim]);

  if (flow.preferencesLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.coral} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {flow.step === 'welcome' && (
          <WelcomeStep
            fadeAnim={fadeAnim}
            onContinue={() => flow.setStep('personalize')}
          />
        )}
        {flow.step === 'personalize' && (
          <PersonalizeStep
            fadeAnim={fadeAnim}
            householdSize={flow.householdSize}
            dietaryNeeds={flow.dietaryNeeds}
            onSelectHouseholdSize={flow.setHouseholdSize}
            onToggleDietaryNeed={flow.toggleDietaryNeed}
            onContinue={flow.handleContinueFromPersonalize}
          />
        )}
        {flow.step === 'first-suggestion' && (
          <FirstSuggestionStep
            fadeAnim={fadeAnim}
            loading={flow.loading}
            suggestedRecipe={flow.suggestedRecipe}
            onShowAnother={flow.fetchPopularRecipe}
            onLetsCook={flow.handleEnterApp}
            onWantBetterSuggestions={() => flow.setStep('pantry-seed')}
            onMaybeLater={() => flow.setStep('subscription')}
          />
        )}
        {flow.step === 'pantry-seed' && (
          <PantrySeedStep
            fadeAnim={fadeAnim}
            onSelectOption={flow.handlePantrySeedOption}
          />
        )}
        {flow.step === 'pantry-checklist' && (
          <PantryChecklistStep
            fadeAnim={fadeAnim}
            selectedIngredients={flow.selectedIngredients}
            onToggleIngredient={flow.toggleIngredient}
            onDone={flow.handleChecklistDone}
          />
        )}
        {flow.step === 'personalized-result' && (
          <PersonalizedResultStep
            fadeAnim={fadeAnim}
            loading={flow.loading}
            personalizedRecipe={flow.personalizedRecipe}
            selectedIngredientCount={flow.selectedIngredients.size}
            onLetsMake={() => flow.setStep('subscription')}
            onEnterApp={flow.handleEnterApp}
          />
        )}
        {flow.step === 'subscription' && (
          <SubscriptionStep
            fadeAnim={fadeAnim}
            onStartTrial={flow.handleStartTrial}
            onSkipToFree={flow.handleSkipToFree}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
