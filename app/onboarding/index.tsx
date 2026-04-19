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
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '../../hooks/useSubscription';
import { useUserPreferences } from '../../hooks/useUserPreferences';
import { searchRecipes } from '../../lib/recipeService';

const MascotImage = require('../../assets/icon.png');
import { RecipePreview } from '../../lib/types';
import { colors, typography, spacing, borderRadius, shadows } from '../../lib/theme';

type OnboardingStep = 
  | 'welcome' 
  | 'personalize' 
  | 'first-suggestion' 
  | 'pantry-seed' 
  | 'pantry-checklist'
  | 'personalized-result'
  | 'subscription';

type HouseholdSize = 'just-me' | 'couple' | 'family-small' | 'family-large';
type DietaryNeed = 'vegetarian' | 'gluten-free' | 'dairy-free' | 'low-carb' | 'nut-allergy' | 'none';

const HOUSEHOLD_OPTIONS: { id: HouseholdSize; emoji: string; label: string; servings: number }[] = [
  { id: 'just-me', emoji: '👤', label: 'Just Me', servings: 1 },
  { id: 'couple', emoji: '👫', label: 'Couple', servings: 2 },
  { id: 'family-small', emoji: '👨‍👩‍👧', label: 'Family (3-4)', servings: 4 },
  { id: 'family-large', emoji: '👨‍👩‍👧‍👦', label: 'Big Family', servings: 6 },
];

const DIETARY_OPTIONS: { id: DietaryNeed; label: string }[] = [
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'gluten-free', label: 'Gluten-free' },
  { id: 'dairy-free', label: 'Dairy-free' },
  { id: 'low-carb', label: 'Low-carb' },
  { id: 'nut-allergy', label: 'Nut allergy' },
  { id: 'none', label: 'None' },
];

const COMMON_INGREDIENTS = {
  proteins: ['Chicken', 'Ground Beef', 'Pork', 'Fish', 'Eggs', 'Tofu', 'Shrimp'],
  produce: ['Onions', 'Garlic', 'Tomatoes', 'Potatoes', 'Carrots', 'Broccoli', 'Bell Peppers'],
  dairy: ['Milk', 'Butter', 'Cheese', 'Eggs', 'Yogurt', 'Cream'],
  pantry: ['Pasta', 'Rice', 'Olive Oil', 'Flour', 'Canned Tomatoes', 'Chicken Broth'],
};

export default function OnboardingScreen(): React.ReactElement {
  const router = useRouter();
  const { startTrial } = useSubscription();
  const { 
    onboardingCompleted, 
    loading: preferencesLoading,
    updatePreferences,
    completeOnboarding,
  } = useUserPreferences();
  
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [householdSize, setHouseholdSize] = useState<HouseholdSize | null>(null);
  const [dietaryNeeds, setDietaryNeeds] = useState<Set<DietaryNeed>>(new Set());
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());
  const [suggestedRecipe, setSuggestedRecipe] = useState<RecipePreview | null>(null);
  const [personalizedRecipe, setPersonalizedRecipe] = useState<RecipePreview | null>(null);
  const [loading, setLoading] = useState(false);
  
  const fadeAnim = useState(new Animated.Value(0))[0];
  
  // Fade in animation on step change
  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [step, fadeAnim]);
  
  // Skip onboarding if already completed - wait for preferences to load first
  useEffect(() => {
    // Don't redirect until preferences are loaded
    if (preferencesLoading) return;
    
    if (onboardingCompleted) {
      router.replace('/(tabs)/tonight');
    }
  }, [onboardingCompleted, preferencesLoading, router]);
  
  // Fetch a popular recipe for the first suggestion
  const fetchPopularRecipe = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const recipes = await searchRecipes('chicken', 'themealdb');
      if (recipes.length > 0) {
        setSuggestedRecipe(recipes[0]);
      }
    } catch (error) {
      console.error('Error fetching recipe:', error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Fetch personalized recipe based on selected ingredients
  const fetchPersonalizedRecipe = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const ingredientList = Array.from(selectedIngredients);
      const query = ingredientList.length > 0 ? ingredientList[0] : 'chicken';
      const recipes = await searchRecipes(query, 'themealdb');
      if (recipes.length > 0) {
        setPersonalizedRecipe(recipes[0]);
      }
    } catch (error) {
      console.error('Error fetching personalized recipe:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedIngredients]);
  
  const toggleDietaryNeed = (need: DietaryNeed): void => {
    const newNeeds = new Set(dietaryNeeds);
    if (need === 'none') {
      newNeeds.clear();
      newNeeds.add('none');
    } else {
      newNeeds.delete('none');
      if (newNeeds.has(need)) {
        newNeeds.delete(need);
      } else {
        newNeeds.add(need);
      }
    }
    setDietaryNeeds(newNeeds);
  };
  
  const toggleIngredient = (ingredient: string): void => {
    const newIngredients = new Set(selectedIngredients);
    if (newIngredients.has(ingredient)) {
      newIngredients.delete(ingredient);
    } else {
      newIngredients.add(ingredient);
    }
    setSelectedIngredients(newIngredients);
  };
  
  const handleContinueFromPersonalize = async (): Promise<void> => {
    // Save household size and dietary preferences
    const householdSizeValue = HOUSEHOLD_OPTIONS.find(h => h.id === householdSize)?.servings || 2;
    const dietaryArray = Array.from(dietaryNeeds).filter(d => d !== 'none');
    
    await updatePreferences({
      household_size: householdSizeValue,
      dietary_preferences: dietaryArray,
      onboarding_step: 1,
    });
    
    fetchPopularRecipe();
    setStep('first-suggestion');
  };
  
  const handlePantrySeedOption = (option: 'photo' | 'voice' | 'checklist' | 'skip'): void => {
    switch (option) {
      case 'photo':
        // In full implementation, would open camera
        Alert.alert('Coming soon', 'Photo scanning will be available in the next update!');
        break;
      case 'voice':
        // In full implementation, would open voice input
        Alert.alert('Coming soon', 'Voice input will be available in the next update!');
        break;
      case 'checklist':
        setStep('pantry-checklist');
        break;
      case 'skip':
        setStep('subscription');
        break;
    }
  };
  
  const handleChecklistDone = (): void => {
    fetchPersonalizedRecipe();
    setStep('personalized-result');
  };
  
  const handleStartTrial = async (): Promise<void> => {
    // Mark onboarding as complete and start trial
    await completeOnboarding();
    const result = await startTrial();
    if (result.success) {
      router.replace('/(tabs)/tonight');
    } else {
      // Still navigate even if trial fails - user completed onboarding
      router.replace('/(tabs)/tonight');
    }
  };
  
  const handleSkipToFree = async (): Promise<void> => {
    // Mark onboarding as complete even when skipping
    await completeOnboarding();
    router.replace('/(tabs)/tonight');
  };
  
  const handleEnterApp = async (): Promise<void> => {
    // Mark onboarding as complete
    await completeOnboarding();
    router.replace('/(tabs)/tonight');
  };
  
  // Step 1: Welcome (5 seconds)
  const renderWelcomeStep = (): React.ReactElement => (
    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
      <View style={styles.welcomeContent}>
        <View style={styles.mascotContainer}>
          <Image source={MascotImage} style={styles.mascotImage} resizeMode="contain" />
        </View>
        
        <Text style={styles.welcomeTitle}>Hi! I'm your Chef! 👋</Text>
        <Text style={styles.welcomeSubtitle}>
          I'm here to end the "what's for dinner?" question forever.
        </Text>
      </View>
      
      <TouchableOpacity style={styles.primaryButton} onPress={() => setStep('personalize')}>
        <Text style={styles.primaryButtonText}>Let's Go!</Text>
        <Ionicons name="arrow-forward" size={20} color={colors.brown} />
      </TouchableOpacity>
    </Animated.View>
  );
  
  // Step 2: Quick Personalization (15 seconds)
  const renderPersonalizeStep = (): React.ReactElement => (
    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
      <Text style={styles.questionText}>Quick question—who am I cooking for?</Text>
      
      <View style={styles.householdGrid}>
        {HOUSEHOLD_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.householdOption,
              householdSize === option.id && styles.householdOptionSelected,
            ]}
            onPress={() => setHouseholdSize(option.id)}
          >
            <Text style={styles.householdEmoji}>{option.emoji}</Text>
            <Text style={[
              styles.householdLabel,
              householdSize === option.id && styles.householdLabelSelected,
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <Text style={styles.questionText}>Any dietary needs?</Text>
      
      <View style={styles.dietaryGrid}>
        {DIETARY_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.dietaryChip,
              dietaryNeeds.has(option.id) && styles.dietaryChipSelected,
            ]}
            onPress={() => toggleDietaryNeed(option.id)}
          >
            <Text style={[
              styles.dietaryChipText,
              dietaryNeeds.has(option.id) && styles.dietaryChipTextSelected,
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleContinueFromPersonalize}>
          <Text style={styles.primaryButtonText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.brown} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipLink} onPress={handleContinueFromPersonalize}>
          <Text style={styles.skipLinkText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
  
  // Step 3: First Suggestion (Instant Value - 30 seconds)
  const renderFirstSuggestionStep = (): React.ReactElement => (
    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
      <Text style={styles.suggestionIntro}>
        Perfect! Here's what families like yours are loving this week...
      </Text>
      
      {loading ? (
        <View style={styles.loadingCard}>
          <Text style={styles.loadingText}>Finding something delicious...</Text>
        </View>
      ) : suggestedRecipe ? (
        <View style={styles.recipeCard}>
          <Image
            source={{ uri: suggestedRecipe.thumbnail }}
            style={styles.recipeImage}
          />
          <View style={styles.recipeContent}>
            <Text style={styles.recipeTitle}>{suggestedRecipe.name}</Text>
            <View style={styles.recipeMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={16} color={colors.brownMuted} />
                <Text style={styles.metaText}>40 min</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="people-outline" size={16} color={colors.brownMuted} />
                <Text style={styles.metaText}>Serves 4</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="star" size={16} color={colors.warning} />
                <Text style={styles.metaText}>4.9</Text>
              </View>
            </View>
            <Text style={styles.recipeTagline}>
              "Simple, healthy, and a crowd pleaser!"
            </Text>
          </View>
        </View>
      ) : null}
      
      <View style={styles.suggestionActions}>
        <TouchableOpacity style={styles.actionButtonOutline} onPress={() => fetchPopularRecipe()}>
          <Ionicons name="refresh" size={18} color={colors.brown} />
          <Text style={styles.actionButtonOutlineText}>Show Another</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButtonFilled} onPress={handleEnterApp}>
          <Ionicons name="restaurant" size={18} color={colors.brown} />
          <Text style={styles.actionButtonFilledText}>Let's Cook</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.divider} />
      
      <View style={styles.betterSuggestionsPrompt}>
        <Ionicons name="bulb-outline" size={24} color={colors.primary} />
        <Text style={styles.betterSuggestionsTitle}>
          Want suggestions based on what's in YOUR kitchen?
        </Text>
      </View>
      
      <View style={styles.promptActions}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => setStep('pantry-seed')}>
          <Text style={styles.primaryButtonText}>Yes, let's do it!</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipLink} onPress={() => setStep('subscription')}>
          <Text style={styles.skipLinkText}>Maybe later</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
  
  // Step 4: Quick Pantry Seed Options
  const renderPantrySeedStep = (): React.ReactElement => (
    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
      <Text style={styles.seedTitle}>
        Awesome! Pick the fastest way to tell me what's in your kitchen:
      </Text>
      
      <TouchableOpacity 
        style={styles.seedOption}
        onPress={() => handlePantrySeedOption('photo')}
      >
        <View style={styles.seedOptionIcon}>
          <Ionicons name="camera" size={28} color={colors.coral} />
        </View>
        <View style={styles.seedOptionContent}>
          <Text style={styles.seedOptionTitle}>📸 SNAP YOUR FRIDGE</Text>
          <Text style={styles.seedOptionSubtitle}>
            Take a quick photo—I'll identify what I see
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.brownMuted} />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.seedOption}
        onPress={() => handlePantrySeedOption('voice')}
      >
        <View style={styles.seedOptionIcon}>
          <Ionicons name="mic" size={28} color={colors.coral} />
        </View>
        <View style={styles.seedOptionContent}>
          <Text style={styles.seedOptionTitle}>🎤 TELL ME OUT LOUD</Text>
          <Text style={styles.seedOptionSubtitle}>
            "I have chicken, rice, broccoli, and cheese"
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.brownMuted} />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.seedOption}
        onPress={() => handlePantrySeedOption('checklist')}
      >
        <View style={styles.seedOptionIcon}>
          <Ionicons name="list" size={28} color={colors.coral} />
        </View>
        <View style={styles.seedOptionContent}>
          <Text style={styles.seedOptionTitle}>📋 PICK FROM COMMON ITEMS</Text>
          <Text style={styles.seedOptionSubtitle}>
            Quick checklist of typical ingredients
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.brownMuted} />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.skipLink} onPress={() => handlePantrySeedOption('skip')}>
        <Text style={styles.skipLinkText}>Skip for now</Text>
      </TouchableOpacity>
    </Animated.View>
  );
  
  // Step 4B: Pantry Checklist
  const renderPantryChecklistStep = (): React.ReactElement => (
    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.checklistTitle}>
          Tap what you usually have on hand:
        </Text>
        
        {Object.entries(COMMON_INGREDIENTS).map(([category, items]) => (
          <View key={category} style={styles.ingredientCategory}>
            <Text style={styles.categoryTitle}>
              {category === 'proteins' ? '🥩 PROTEINS' :
               category === 'produce' ? '🥬 PRODUCE' :
               category === 'dairy' ? '🧀 DAIRY' : '🥫 PANTRY STAPLES'}
            </Text>
            <View style={styles.ingredientGrid}>
              {items.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.ingredientChip,
                    selectedIngredients.has(item) && styles.ingredientChipSelected,
                  ]}
                  onPress={() => toggleIngredient(item)}
                >
                  <Text style={[
                    styles.ingredientChipText,
                    selectedIngredients.has(item) && styles.ingredientChipTextSelected,
                  ]}>
                    {item}
                    {selectedIngredients.has(item) ? ' ✓' : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
        
        <View style={styles.checklistFooter}>
          <Text style={styles.selectedCount}>
            Selected: {selectedIngredients.size} items
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={handleChecklistDone}>
            <Text style={styles.primaryButtonText}>Done</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.brown} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Animated.View>
  );
  
  // Step 5: Personalized Result
  const renderPersonalizedResultStep = (): React.ReactElement => (
    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
      <View style={styles.resultHeader}>
        <Text style={styles.resultEmoji}>✨</Text>
        <Text style={styles.resultTitle}>Now we're cooking!</Text>
      </View>
      
      <Text style={styles.resultSubtitle}>
        Based on what you have, here's tonight's perfect dinner:
      </Text>
      
      {loading ? (
        <View style={styles.loadingCard}>
          <Text style={styles.loadingText}>Finding your perfect match...</Text>
        </View>
      ) : personalizedRecipe ? (
        <View style={styles.recipeCard}>
          <Image
            source={{ uri: personalizedRecipe.thumbnail }}
            style={styles.recipeImage}
          />
          <View style={styles.recipeContent}>
            <Text style={styles.recipeTitle}>{personalizedRecipe.name}</Text>
            <View style={styles.recipeMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={16} color={colors.brownMuted} />
                <Text style={styles.metaText}>30 min</Text>
              </View>
              <View style={styles.matchBadge}>
                <Text style={styles.matchBadgeText}>
                  You have {Math.min(selectedIngredients.size, 9)}/10 ingredients!
                </Text>
              </View>
            </View>
          </View>
        </View>
      ) : null}
      
      <TouchableOpacity style={styles.cookButton} onPress={() => setStep('subscription')}>
        <Ionicons name="restaurant" size={20} color={colors.brown} />
        <Text style={styles.cookButtonText}>Let's Make This</Text>
      </TouchableOpacity>
      
      <View style={styles.divider} />
      
      <TouchableOpacity style={styles.enterAppLink} onPress={handleEnterApp}>
        <Text style={styles.enterAppText}>→ Enter DinnerPlans</Text>
      </TouchableOpacity>
    </Animated.View>
  );
  
  // Step 6: Subscription (After Value Demonstrated)
  const renderSubscriptionStep = (): React.ReactElement => (
    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
      <Text style={styles.subTitle}>You're all set! One more thing...</Text>
      
      <View style={styles.trialCard}>
        <Text style={styles.trialEmoji}>🎁</Text>
        <Text style={styles.trialTitle}>TRY PREMIUM FREE FOR 14 DAYS</Text>
        
        <View style={styles.trialFeatures}>
          {[
            'Unlimited AI meal suggestions',
            'Household sharing (up to 6 people)',
            'Full nutrition tracking',
            'Unlimited pantry & saved recipes',
            'Priority Pepper support',
          ].map((feature, index) => (
            <View key={index} style={styles.trialFeatureItem}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.trialFeatureText}>{feature}</Text>
            </View>
          ))}
        </View>
        
        <View style={styles.savingsCallout}>
          <Ionicons name="cash-outline" size={20} color={colors.success} />
          <Text style={styles.savingsText}>
            Families save $100+/month on groceries
          </Text>
        </View>
        
        <Text style={styles.priceText}>
          Your subscription: $6.99/month (pays for itself!)
        </Text>
        
        <TouchableOpacity style={styles.trialButton} onPress={handleStartTrial}>
          <Text style={styles.trialButtonText}>Start Free Trial — No Card Required</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity style={styles.freeLink} onPress={handleSkipToFree}>
        <Text style={styles.freeLinkText}>I'll stick with free for now ↓</Text>
      </TouchableOpacity>
    </Animated.View>
  );
  
  // Show loading while checking if onboarding is completed
  if (preferencesLoading) {
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
        {step === 'welcome' && renderWelcomeStep()}
        {step === 'personalize' && renderPersonalizeStep()}
        {step === 'first-suggestion' && renderFirstSuggestionStep()}
        {step === 'pantry-seed' && renderPantrySeedStep()}
        {step === 'pantry-checklist' && renderPantryChecklistStep()}
        {step === 'personalized-result' && renderPersonalizedResultStep()}
        {step === 'subscription' && renderSubscriptionStep()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textBase,
    color: colors.brownMuted,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.space6,
    paddingTop: spacing.space10,
  },
  stepContainer: {
    flex: 1,
  },
  // Welcome
  welcomeContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.space16,
  },
  mascotContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.brown,
    marginBottom: spacing.space8,
    overflow: 'hidden',
  },
  mascotImage: {
    width: 130,
    height: 130,
  },
  welcomeTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.text3xl,
    fontWeight: typography.fontBold,
    color: colors.brown,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textLg,
    color: colors.brownMuted,
    textAlign: 'center',
    marginTop: spacing.space4,
    lineHeight: typography.textLg * 1.5,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.space2,
    backgroundColor: colors.primary,
    paddingVertical: spacing.space4,
    paddingHorizontal: spacing.space8,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.brown,
    ...shadows.sm,
  },
  primaryButtonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: typography.textLg,
    fontWeight: typography.fontBold,
    color: colors.brown,
  },
  // Personalize
  questionText: {
    fontFamily: 'Quicksand-SemiBold',
    fontSize: typography.textXl,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
    marginBottom: spacing.space4,
  },
  householdGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.space3,
    marginBottom: spacing.space8,
  },
  householdOption: {
    width: '47%',
    paddingVertical: spacing.space4,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.brown,
    ...shadows.sm,
  },
  householdOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.brown,
  },
  householdEmoji: {
    fontSize: 32,
    marginBottom: spacing.space2,
  },
  householdLabel: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    color: colors.brown,
    fontWeight: typography.fontMedium,
  },
  householdLabelSelected: {
    fontFamily: 'Nunito-Bold',
    fontWeight: typography.fontBold,
  },
  dietaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.space2,
    marginBottom: spacing.space8,
  },
  dietaryChip: {
    paddingVertical: spacing.space2,
    paddingHorizontal: spacing.space3,
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.brownMuted,
  },
  dietaryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.brown,
  },
  dietaryChipText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
  },
  dietaryChipTextSelected: {
    fontFamily: 'Nunito-SemiBold',
    color: colors.brown,
    fontWeight: typography.fontSemibold,
  },
  actionRow: {
    alignItems: 'center',
    gap: spacing.space4,
  },
  skipLink: {
    paddingVertical: spacing.space3,
  },
  skipLinkText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    textDecorationLine: 'underline',
  },
  // First Suggestion
  suggestionIntro: {
    fontFamily: 'Quicksand-SemiBold',
    fontSize: typography.textXl,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
    textAlign: 'center',
    marginBottom: spacing.space6,
  },
  loadingCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.space8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.brown,
  },
  recipeCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.brown,
    overflow: 'hidden',
    marginBottom: spacing.space4,
    ...shadows.md,
  },
  recipeImage: {
    width: '100%',
    height: 180,
  },
  recipeContent: {
    padding: spacing.space4,
  },
  recipeTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.textXl,
    fontWeight: typography.fontBold,
    color: colors.brown,
    marginBottom: spacing.space2,
  },
  recipeMeta: {
    flexDirection: 'row',
    gap: spacing.space4,
    marginBottom: spacing.space3,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space1,
  },
  metaText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
  },
  recipeTagline: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    fontStyle: 'italic',
  },
  suggestionActions: {
    flexDirection: 'row',
    gap: spacing.space3,
    marginBottom: spacing.space6,
  },
  actionButtonOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.space2,
    paddingVertical: spacing.space3,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  actionButtonOutlineText: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    color: colors.brown,
    fontWeight: typography.fontMedium,
  },
  actionButtonFilled: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.space2,
    paddingVertical: spacing.space3,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  actionButtonFilledText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textSm,
    color: colors.brown,
    fontWeight: typography.fontSemibold,
  },
  divider: {
    height: 1,
    backgroundColor: colors.brownMuted,
    opacity: 0.2,
    marginVertical: spacing.space6,
  },
  betterSuggestionsPrompt: {
    alignItems: 'center',
    marginBottom: spacing.space4,
  },
  betterSuggestionsTitle: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textLg,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
    textAlign: 'center',
    marginTop: spacing.space2,
  },
  promptActions: {
    alignItems: 'center',
    gap: spacing.space3,
  },
  // Pantry Seed
  seedTitle: {
    fontFamily: 'Quicksand-SemiBold',
    fontSize: typography.textXl,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
    marginBottom: spacing.space6,
  },
  seedOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.space4,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.brown,
    marginBottom: spacing.space3,
    ...shadows.sm,
  },
  seedOptionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.coralLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.space4,
  },
  seedOptionContent: {
    flex: 1,
  },
  seedOptionTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: typography.textBase,
    fontWeight: typography.fontBold,
    color: colors.brown,
    marginBottom: 2,
  },
  seedOptionSubtitle: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
  },
  // Checklist
  checklistTitle: {
    fontFamily: 'Quicksand-SemiBold',
    fontSize: typography.textXl,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
    marginBottom: spacing.space6,
  },
  ingredientCategory: {
    marginBottom: spacing.space6,
  },
  categoryTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: typography.textSm,
    fontWeight: typography.fontBold,
    color: colors.brown,
    marginBottom: spacing.space3,
    letterSpacing: 0.5,
  },
  ingredientGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.space2,
  },
  ingredientChip: {
    paddingVertical: spacing.space2,
    paddingHorizontal: spacing.space3,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.brownMuted,
  },
  ingredientChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.brown,
  },
  ingredientChipText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
  },
  ingredientChipTextSelected: {
    fontFamily: 'Nunito-SemiBold',
    color: colors.brown,
    fontWeight: typography.fontSemibold,
  },
  checklistFooter: {
    marginTop: spacing.space4,
    alignItems: 'center',
    gap: spacing.space3,
  },
  selectedCount: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textBase,
    color: colors.brown,
  },
  // Result
  resultHeader: {
    alignItems: 'center',
    marginBottom: spacing.space4,
  },
  resultEmoji: {
    fontSize: 48,
    marginBottom: spacing.space2,
  },
  resultTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.text2xl,
    fontWeight: typography.fontBold,
    color: colors.brown,
  },
  resultSubtitle: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textBase,
    color: colors.brownMuted,
    textAlign: 'center',
    marginBottom: spacing.space4,
  },
  matchBadge: {
    backgroundColor: colors.successBg,
    paddingVertical: 2,
    paddingHorizontal: spacing.space2,
    borderRadius: borderRadius.sm,
  },
  matchBadgeText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textSm,
    color: colors.success,
    fontWeight: typography.fontSemibold,
  },
  cookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.space2,
    backgroundColor: colors.coral,
    paddingVertical: spacing.space4,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.brown,
    ...shadows.sm,
  },
  cookButtonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: typography.textLg,
    fontWeight: typography.fontBold,
    color: colors.white,
  },
  enterAppLink: {
    alignItems: 'center',
    paddingVertical: spacing.space4,
  },
  enterAppText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textBase,
    color: colors.coral,
    fontWeight: typography.fontSemibold,
  },
  // Subscription
  subTitle: {
    fontFamily: 'Quicksand-SemiBold',
    fontSize: typography.textXl,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
    textAlign: 'center',
    marginBottom: spacing.space6,
  },
  trialCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.space6,
    borderWidth: 2,
    borderColor: colors.coral,
    alignItems: 'center',
    ...shadows.md,
  },
  trialEmoji: {
    fontSize: 48,
    marginBottom: spacing.space2,
  },
  trialTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.textLg,
    fontWeight: typography.fontBold,
    color: colors.coral,
    marginBottom: spacing.space4,
  },
  trialFeatures: {
    width: '100%',
    marginBottom: spacing.space4,
  },
  trialFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space3,
    paddingVertical: spacing.space2,
  },
  trialFeatureText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brown,
  },
  savingsCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
    backgroundColor: colors.successBg,
    paddingVertical: spacing.space2,
    paddingHorizontal: spacing.space4,
    borderRadius: borderRadius.full,
    marginBottom: spacing.space3,
  },
  savingsText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textSm,
    color: colors.success,
    fontWeight: typography.fontSemibold,
  },
  priceText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    marginBottom: spacing.space4,
  },
  trialButton: {
    backgroundColor: colors.coral,
    paddingVertical: spacing.space4,
    paddingHorizontal: spacing.space6,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.brown,
    width: '100%',
    alignItems: 'center',
  },
  trialButtonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: typography.textBase,
    fontWeight: typography.fontBold,
    color: colors.white,
  },
  freeLink: {
    alignItems: 'center',
    paddingVertical: spacing.space6,
  },
  freeLinkText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
  },
});
