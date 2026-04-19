/**
 * Tonight Screen - The new home screen
 * Answers "What's for dinner tonight?" immediately with zero friction.
 * Provides personalized dinner suggestions based on pantry and preferences.
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Alert,
  Image,
  AppState,
  AppStateStatus,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePantry } from '../../hooks/usePantry';
import { useMealPlans } from '../../hooks/useMealPlans';
import { useHouseholdContext } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { useSavedRecipes } from '../../hooks/useSavedRecipes';
import { useUserPreferences } from '../../hooks/useUserPreferences';
import { PepperFAB } from '../../components/PepperFAB';
import { SwipeableRecipeCard } from '../../components/SwipeableRecipeCard';
import {
  getGreeting,
  getExpiringItems,
  getDaysUntilExpiration,
  getQuickCategories,
  generatePersonalizedIntro,
  HouseholdMemberProfile,
  RecipeFeedbackSummary,
} from '../../lib/tonightService';
import {
  readCachedSuggestions,
  generateAndCacheSuggestions,
  invalidateTonightCache,
  maybePreGenerateSuggestions,
} from '../../lib/tonightCacheService';
import { generateContextualSuggestions, getQuickActions } from '../../lib/pepperContext';
import { EnhancedScoredRecipe, PantryItem, MealPlan } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { colors, typography, spacing, borderRadius, shadows } from '../../lib/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TonightSuggestion {
  recipe: EnhancedScoredRecipe;
  reason: string;
  isTopPick: boolean;
}

export default function TonightScreen(): React.ReactElement {
  const router = useRouter();
  const { user } = useAuth();
  const { activeHousehold } = useHouseholdContext();
  const { pantryItems, loading: pantryLoading } = usePantry({
    householdId: activeHousehold?.id,
  });
  const { mealPlans } = useMealPlans({
    householdId: activeHousehold?.id,
  });
  const { saveRecipe, isRecipeSaved } = useSavedRecipes();
  const { onboardingCompleted, preferences } = useUserPreferences();
  
  // Show onboarding callout if not completed OR if the field is null/undefined
  const shouldShowOnboardingCTA = !onboardingCompleted || preferences?.onboarding_completed == null;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [suggestions, setSuggestions] = useState<TonightSuggestion[]>([]);
  const [expiringItems, setExpiringItems] = useState<PantryItem[]>([]);
  const [greeting, setGreeting] = useState({ greeting: '', subGreeting: '' });
  // Roster: all household member profiles
  const [allMembers, setAllMembers] = useState<HouseholdMemberProfile[]>([]);
  // Which members are eating tonight (persisted across sessions via Supabase)
  const [activeRosterIds, setActiveRosterIds] = useState<Set<string>>(new Set());
  const [rosterLoaded, setRosterLoaded] = useState(false);
  // Recent feedback for Claude personalization
  const [recentFeedback, setRecentFeedback] = useState<RecipeFeedbackSummary>({
    likedRecipeNames: [],
    dislikedRecipeNames: [],
    cookedRecipeNames: [],
  });
  
  // Get user's first name from metadata
  const firstName = user?.user_metadata?.first_name || '';
  const householdSize = activeHousehold?.member_count || 2;

  // Refs for AppState-based background pre-generation
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const activeRosterRef = useRef<HouseholdMemberProfile[]>([]);
  const recentFeedbackRef = useRef<RecipeFeedbackSummary>({
    likedRecipeNames: [],
    dislikedRecipeNames: [],
    cookedRecipeNames: [],
  });
  const recentlyMadeRef = useRef<string[]>([]);

  // Keep refs current so AppState handler always has fresh data
  useEffect(() => {
    activeRosterRef.current = allMembers.filter(m => activeRosterIds.has(m.id));
  }, [allMembers, activeRosterIds]);

  useEffect(() => {
    recentFeedbackRef.current = recentFeedback;
  }, [recentFeedback]);

  useEffect(() => {
    recentlyMadeRef.current = mealPlans
      .filter((m) => m.is_completed && m.recipe_id)
      .map((m) => m.recipe_id!)
      .slice(0, 10);
  }, [mealPlans]);

  // Background pre-generation: fires on app foreground after 3pm if cache is stale
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const wasBackground = appStateRef.current === 'background' || appStateRef.current === 'inactive';
      const isNowActive = nextState === 'active';
      if (wasBackground && isNowActive && activeHousehold?.id) {
        maybePreGenerateSuggestions(
          activeHousehold.id,
          pantryItems,
          recentlyMadeRef.current,
          activeRosterRef.current,
          recentFeedbackRef.current
        );
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, [activeHousehold?.id, pantryItems]);

  // Get greeting with user's first name
  useEffect(() => {
    setGreeting(getGreeting(firstName));
  }, [firstName]);

  // Load household member profiles and recent feedback
  useEffect(() => {
    if (!activeHousehold?.id || !user?.id) return;
    loadRosterAndFeedback();
  }, [activeHousehold?.id, user?.id]);

  const loadRosterAndFeedback = async (): Promise<void> => {
    if (!activeHousehold?.id || !user?.id) {
      setRosterLoaded(true);
      return;
    }
    try {
      // Load all household member profiles
      const { data: members } = await supabase
        .from('household_member_profiles')
        .select('*')
        .eq('household_id', activeHousehold.id)
        .order('display_name');

      if (members && members.length > 0) {
        setAllMembers(members as HouseholdMemberProfile[]);
        // Default: all is_default_included members are active
        const defaultActive = new Set<string>(
          (members as HouseholdMemberProfile[])
            .filter(m => m.is_default_included)
            .map(m => m.id)
        );
        setActiveRosterIds(defaultActive);
      }

      // Load recent feedback (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: feedback } = await supabase
        .from('user_recipe_feedback')
        .select('recipe_name, liked, disliked, cooked, cooked_at')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo);

      if (feedback) {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        setRecentFeedback({
          likedRecipeNames: feedback.filter(f => f.liked).map(f => f.recipe_name),
          dislikedRecipeNames: feedback.filter(f => f.disliked).map(f => f.recipe_name),
          // Only exclude recently cooked (last 7 days)
          cookedRecipeNames: feedback
            .filter(f => f.cooked && f.cooked_at && f.cooked_at >= sevenDaysAgo)
            .map(f => f.recipe_name),
        });
      }
    } catch (err) {
      console.warn('[Tonight] Failed to load roster/feedback:', err);
    } finally {
      setRosterLoaded(true);
    }
  };

  // Load suggestions when pantry changes (wait for roster to load first if available)
  useEffect(() => {
    if (!pantryLoading && (rosterLoaded || !activeHousehold?.id)) {
      loadSuggestions();
    }
  }, [pantryItems, pantryLoading, rosterLoaded, activeRosterIds]);
  
  const loadSuggestions = async (forceRefresh = false): Promise<void> => {
    try {
      setLoading(true);
      console.log('[Tonight] Loading suggestions, pantry items:', pantryItems.length);

      // Get recently made recipe IDs from meal plans
      const recentlyMade = mealPlans
        .filter((m) => m.is_completed && m.recipe_id)
        .map((m) => m.recipe_id!)
        .slice(0, 10);

      // Build active roster from selected member IDs
      const activeRoster = allMembers.filter(m => activeRosterIds.has(m.id));

      let result: { topPick: any; suggestions: any[]; expiringItems: PantryItem[] };

      // Cache-first: check for today's pre-generated suggestions (skip on force refresh)
      if (!forceRefresh && activeHousehold?.id) {
        const cached = await readCachedSuggestions(activeHousehold.id);
        if (cached) {
          console.log('[Tonight] Cache hit — showing pre-generated suggestions');
          result = {
            topPick: cached.topPick,
            suggestions: cached.suggestions,
            expiringItems: cached.expiringItems,
          };
        } else {
          result = await generateAndCacheSuggestions(
            activeHousehold.id,
            pantryItems,
            recentlyMade,
            activeRoster,
            recentFeedback
          );
        }
      } else if (activeHousehold?.id) {
        // Force refresh: invalidate then regenerate
        await invalidateTonightCache(activeHousehold.id);
        result = await generateAndCacheSuggestions(
          activeHousehold.id,
          pantryItems,
          recentlyMade,
          activeRoster,
          recentFeedback
        );
      } else {
        // No household (no cache available)
        const { generateTonightSuggestions } = await import('../../lib/tonightService');
        result = await generateTonightSuggestions(pantryItems, recentlyMade, activeRoster, recentFeedback);
      }

      console.log('[Tonight] Got suggestions:', {
        topPick: result.topPick?.recipe?.name,
        suggestions: result.suggestions?.length ?? 0,
        expiringItems: result.expiringItems?.length ?? 0,
      });

      // Combine top pick and suggestions
      const allSuggestions = result.topPick
        ? [result.topPick, ...result.suggestions]
        : result.suggestions;

      setSuggestions(allSuggestions);
      setExpiringItems(result.expiringItems);
      setCurrentIndex(0);
    } catch (error) {
      console.error('[Tonight] Error loading suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await loadSuggestions(true); // force refresh — bypass cache
    setRefreshing(false);
  };
  
  const handleSwipeLeft = useCallback((): void => {
    // Dislike and move to next
    if (suggestions[currentIndex] && user?.id) {
      const recipe = suggestions[currentIndex].recipe;
      persistRecipeFeedback(recipe.id, recipe.name, { disliked: true });
    }
    if (currentIndex < suggestions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  }, [currentIndex, suggestions.length, suggestions, user?.id]);

  const handleSwipeRight = useCallback((): void => {
    // Like and move to next
    if (suggestions[currentIndex] && user?.id) {
      const recipe = suggestions[currentIndex].recipe;
      persistRecipeFeedback(recipe.id, recipe.name, { liked: true });
    }
    if (currentIndex < suggestions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  }, [currentIndex, suggestions, suggestions.length, user?.id]);

  const persistRecipeFeedback = async (
    recipeId: string,
    recipeName: string,
    update: { liked?: boolean; disliked?: boolean; cooked?: boolean }
  ): Promise<void> => {
    if (!user?.id) return;
    try {
      await supabase.from('user_recipe_feedback').upsert(
        {
          user_id: user.id,
          household_id: activeHousehold?.id ?? null,
          recipe_id: recipeId,
          recipe_name: recipeName,
          ...update,
          ...(update.cooked ? { cooked_at: new Date().toISOString() } : {}),
        },
        { onConflict: 'user_id,recipe_id' }
      );
      // Update local feedback state optimistically
      setRecentFeedback(prev => {
        if (update.liked) return { ...prev, likedRecipeNames: [...new Set([...prev.likedRecipeNames, recipeName])] };
        if (update.disliked) return { ...prev, dislikedRecipeNames: [...new Set([...prev.dislikedRecipeNames, recipeName])] };
        if (update.cooked) return { ...prev, cookedRecipeNames: [...new Set([...prev.cookedRecipeNames, recipeName])] };
        return prev;
      });
    } catch (err) {
      console.warn('[Tonight] Failed to persist feedback:', err);
    }
  };

  const handleLike = useCallback((recipe: EnhancedScoredRecipe): void => {
    persistRecipeFeedback(recipe.id, recipe.name, { liked: true });
  }, [user?.id, activeHousehold?.id]);
  
  const handleSave = useCallback(async (recipe: EnhancedScoredRecipe): Promise<void> => {
    try {
      const source = recipe.id.startsWith('spoonacular-') ? 'spoonacular' : 'themealdb';
      await saveRecipe({ ...recipe, recipeSource: source }, source);
      Alert.alert('Saved!', `${recipe.name} has been added to your saved recipes.`);
    } catch (error) {
      console.error('Error saving recipe:', error);
      Alert.alert('Error', 'Could not save recipe. Please try again.');
    }
  }, [saveRecipe]);
  
  const handleCookedThis = useCallback((): void => {
    if (suggestions[currentIndex] && user?.id) {
      const recipe = suggestions[currentIndex].recipe;
      persistRecipeFeedback(recipe.id, recipe.name, { cooked: true });
      Alert.alert('Nice!', `Great job cooking ${recipe.name}! We'll remember this.`);
    }
  }, [currentIndex, suggestions, user?.id]);

  const toggleRosterMember = useCallback((memberId: string): void => {
    // Invalidate cache — new roster means new constraints for Claude
    if (activeHousehold?.id) {
      invalidateTonightCache(activeHousehold.id).catch(() => {});
    }
    setActiveRosterIds(prev => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  }, [activeHousehold?.id]);

  const handleCategoryPress = (categoryId: string): void => {
    router.push({
      pathname: '/(tabs)/recipes',
      params: { search: categoryId },
    });
  };
  
  const handleExpiringRecipes = (): void => {
    const ingredientNames = expiringItems.map((item) => item.name);
    router.push({
      pathname: '/recipe/generate',
      params: { ingredients: ingredientNames.join(',') },
    });
  };
  
  const handleSnapPantry = (): void => {
    router.push('/scan/photo');
  };
  
  const handleTellPepper = (): void => {
    router.push('/(tabs)/chat');
  };
  
  const handleViewWeek = (): void => {
    router.push('/(tabs)/plan');
  };
  
  // Get week plan summary
  const weekPlanSummary = getWeekPlanSummary(mealPlans);
  
  // Get Pepper suggestions
  const pepperSuggestions = generateContextualSuggestions('tonight', {
    pantryItems,
    mealPlans,
  });
  
  const quickActions = getQuickActions('tonight');
  
  // Stable ratings per suggestion — computed once when suggestions change
  const stableRatings = useMemo(
    () => suggestions.map(() => ({
      rating: 4.5 + Math.random() * 0.4,
      count: Math.floor(50 + Math.random() * 200),
    })),
    [suggestions]
  );

  // Current recipe
  const currentSuggestion = suggestions[currentIndex];
  const currentRecipe = currentSuggestion?.recipe;
  const personalizedIntro = currentRecipe 
    ? generatePersonalizedIntro(currentRecipe, householdSize)
    : '';
  
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <TonightSkeleton />
      </SafeAreaView>
    );
  }
  
  // Empty state - no pantry items
  if (pantryItems.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.emptyContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {/* Onboarding Completion CTA */}
          {shouldShowOnboardingCTA && (
            <TouchableOpacity
              style={styles.onboardingCTAEmpty}
              onPress={() => router.push('/onboarding')}
              accessibilityLabel="Complete your setup"
              accessibilityRole="button"
            >
              <View style={styles.onboardingCTAIcon}>
                <Ionicons name="sparkles" size={24} color={colors.coral} />
              </View>
              <View style={styles.onboardingCTAContent}>
                <Text style={styles.onboardingCTATitle}>Complete Your Setup 🎯</Text>
                <Text style={styles.onboardingCTASubtitle}>
                  Tell us about your kitchen for personalized suggestions
                </Text>
              </View>
              <View style={styles.onboardingCTAButton}>
                <Text style={styles.onboardingCTAButtonText}>Start</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.brown} />
              </View>
            </TouchableOpacity>
          )}
          
          <Text style={styles.emptyTitle}>What sounds good tonight?</Text>
          
          <View style={styles.categoriesGrid}>
            {getQuickCategories().map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={styles.categoryCard}
                onPress={() => handleCategoryPress(cat.id)}
                accessibilityLabel={cat.label}
                accessibilityRole="button"
              >
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                <Text style={styles.categoryLabel}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <TouchableOpacity style={styles.surpriseButton} onPress={handleRefresh}>
            <Ionicons name="dice-outline" size={20} color={colors.brown} />
            <Text style={styles.surpriseButtonText}>Surprise Me</Text>
          </TouchableOpacity>
          
          <View style={styles.emptyDivider} />
          
          <View style={styles.emptyPrompt}>
            <Ionicons name="bulb-outline" size={24} color={colors.primary} />
            <Text style={styles.emptyPromptTitle}>Want better suggestions?</Text>
            <Text style={styles.emptyPromptText}>
              Tell me what's in your kitchen and I'll find recipes that match!
            </Text>
          </View>
          
          <View style={styles.emptyActions}>
            <TouchableOpacity style={styles.emptyActionButton} onPress={handleSnapPantry}>
              <Ionicons name="camera-outline" size={20} color={colors.brown} />
              <Text style={styles.emptyActionText}>Snap Your Pantry</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.emptyActionButton} onPress={handleTellPepper}>
              <Ionicons name="mic-outline" size={20} color={colors.brown} />
              <Text style={styles.emptyActionText}>Tell Pepper</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        
        <PepperFAB
          context="tonight"
          quickActions={quickActions}
          contextData={{
            pantryItems,
            mealPlans,
          }}
        />
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting Banner */}
        <View style={styles.greetingBanner}>
          <Text style={styles.greetingText}>{greeting.greeting}</Text>
          <Text style={styles.subGreetingText}>{greeting.subGreeting}</Text>
        </View>
        
        {/* Onboarding Completion CTA */}
        {shouldShowOnboardingCTA && (
          <TouchableOpacity
            style={styles.onboardingCTA}
            onPress={() => router.push('/onboarding')}
            accessibilityLabel="Complete your setup"
            accessibilityRole="button"
          >
            <View style={styles.onboardingCTAIcon}>
              <Ionicons name="sparkles" size={24} color={colors.coral} />
            </View>
            <View style={styles.onboardingCTAContent}>
              <Text style={styles.onboardingCTATitle}>Complete Your Setup 🎯</Text>
              <Text style={styles.onboardingCTASubtitle}>
                Tell us about your kitchen for personalized suggestions
              </Text>
            </View>
            <View style={styles.onboardingCTAButton}>
              <Text style={styles.onboardingCTAButtonText}>Start</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.brown} />
            </View>
          </TouchableOpacity>
        )}
        
        {/* Expiring Items Banner */}
        {expiringItems.length > 0 && (
          <TouchableOpacity style={styles.expiringBanner} onPress={handleExpiringRecipes}>
            <Ionicons name="warning-outline" size={18} color={colors.warning} />
            <Text style={styles.expiringText}>
              🍅 {expiringItems.length} item{expiringItems.length > 1 ? 's' : ''} expiring soon
              —tap for recipes that use them
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.brownMuted} />
          </TouchableOpacity>
        )}
        
        {/* No Suggestions State */}
        {!loading && suggestions.length === 0 && pantryItems.length > 0 && (
          <View style={styles.noSuggestionsCard}>
            <Ionicons name="search-outline" size={48} color={colors.brownMuted} />
            <Text style={styles.noSuggestionsTitle}>No recipes found</Text>
            <Text style={styles.noSuggestionsText}>
              We couldn't find recipes matching your pantry items right now. 
              Try adding more items or check back later!
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
              <Ionicons name="refresh" size={18} color={colors.brown} />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Who's Eating Tonight - Roster Picker */}
        {allMembers.length > 0 && (
          <View style={styles.rosterSection}>
            <Text style={styles.rosterTitle}>Who's eating tonight?</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rosterScroll}
            >
              {allMembers.map(member => {
                const isActive = activeRosterIds.has(member.id);
                return (
                  <TouchableOpacity
                    key={member.id}
                    style={[styles.rosterChip, isActive && styles.rosterChipActive]}
                    onPress={() => toggleRosterMember(member.id)}
                  >
                    <Text style={styles.rosterEmoji}>{member.avatar_emoji}</Text>
                    <Text style={[styles.rosterName, isActive && styles.rosterNameActive]}>
                      {member.display_name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Swipeable Recipe Card */}
        {currentRecipe && (
          <View style={styles.cardSection}>
            <View style={styles.cardHeader}>
              <Ionicons name="trophy" size={16} color={colors.primary} />
              <Text style={styles.cardHeaderText}>
                {currentIndex === 0 ? "TONIGHT'S TOP PICK" : `SUGGESTION ${currentIndex + 1} OF ${suggestions.length}`}
              </Text>
            </View>
            
            <SwipeableRecipeCard
              recipe={currentRecipe}
              personalizedIntro={personalizedIntro}
              onSwipeLeft={handleSwipeLeft}
              onSwipeRight={handleSwipeRight}
              onLike={handleLike}
              onSave={handleSave}
              isLiked={recentFeedback.likedRecipeNames.includes(currentRecipe.name)}
              isSaved={isRecipeSaved(currentRecipe.id, currentRecipe.id.startsWith('spoonacular-') ? 'spoonacular' : 'themealdb')}
              rating={stableRatings[currentIndex]?.rating ?? 4.7}
              ratingCount={stableRatings[currentIndex]?.count ?? 120}
            />
            
            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.primaryActionButton}
                onPress={() => router.push({
                  pathname: `/recipe/${currentRecipe.id}`,
                  params: { action: 'cook' },
                })}
              >
                <Ionicons name="restaurant" size={18} color={colors.brown} />
                <Text style={styles.primaryActionText}>Let's Make This</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cookedButton}
                onPress={handleCookedThis}
              >
                <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                <Text style={styles.cookedButtonText}>Made it!</Text>
              </TouchableOpacity>
            </View>
            
            {/* Pepper's Why This Recipe Chip */}
            <TouchableOpacity style={styles.pepperWhyChip} onPress={handleTellPepper}>
              <View style={styles.pepperAvatar}>
                <Text style={styles.pepperEmoji}>🌶️</Text>
              </View>
              <Text style={styles.pepperWhyText}>Why this recipe?</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.brownMuted} />
            </TouchableOpacity>
            
            {/* Navigation dots */}
            <View style={styles.dotsContainer}>
              {suggestions.slice(0, Math.min(suggestions.length, 5)).map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index === currentIndex && styles.dotActive,
                  ]}
                />
              ))}
              {suggestions.length > 5 && (
                <Text style={styles.moreDotsText}>+{suggestions.length - 5}</Text>
              )}
            </View>
          </View>
        )}
        
        {/* More Ideas Carousel */}
        {suggestions.length > 1 && (
          <View style={styles.moreIdeasSection}>
            <Text style={[styles.sectionTitle, styles.moreIdeasTitle]}>More Ideas</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.moreIdeasScroll}
            >
              {suggestions.slice(1, 6).map((suggestion, index) => (
                <TouchableOpacity
                  key={suggestion.recipe.id}
                  style={styles.moreIdeaCard}
                  onPress={() => setCurrentIndex(index + 1)}
                >
                  <Image
                    source={{ uri: suggestion.recipe.thumbnail }}
                    style={styles.moreIdeaImage}
                  />
                  <View style={styles.moreIdeaContent}>
                    <Text style={styles.moreIdeaTitle} numberOfLines={2}>
                      {suggestion.recipe.name}
                    </Text>
                    <View style={styles.moreIdeaMatch}>
                      <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                      <Text style={styles.moreIdeaMatchText}>
                        {suggestion.recipe.matchScore ?? suggestion.recipe.matchPercentage ?? 0}% match
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        
        {/* Want More Ideas CTA - Always show to encourage pantry engagement */}
        <View style={styles.wantMoreSection}>
          <View style={styles.wantMoreIcon}>
            <Ionicons name="bulb" size={24} color={colors.primary} />
          </View>
          <Text style={styles.wantMoreTitle}>
            {pantryItems.length < 5 
              ? 'Want more personalized ideas?' 
              : 'Want even better matches?'}
          </Text>
          <Text style={styles.wantMoreText}>
            {pantryItems.length < 5
              ? 'Add items to your pantry and I\'ll find recipes that match what you have!'
              : pantryItems.length < 15
                ? `You have ${pantryItems.length} items. Add more for better recipe matches!`
                : 'Keep your pantry updated for the best recipe recommendations!'}
          </Text>
          <View style={styles.wantMoreButtons}>
            <TouchableOpacity style={styles.wantMoreButton} onPress={handleSnapPantry}>
              <Ionicons name="camera-outline" size={18} color={colors.brown} />
              <Text style={styles.wantMoreButtonText}>Snap Pantry</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.wantMoreButton} onPress={() => router.push('/(tabs)/pantry')}>
              <Ionicons name="add-circle-outline" size={18} color={colors.brown} />
              <Text style={styles.wantMoreButtonText}>Add Items</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.wantMoreHint}>
            📸 Quick tip: Snap a photo of your fridge or receipt!
          </Text>
        </View>
        
        {/* Use It Up Section */}
        {expiringItems.length > 0 && (
          <View style={styles.useItUpSection}>
            <Text style={styles.sectionTitle}>Use It Up (expiring soon)</Text>
            <View style={styles.expiringItemsRow}>
              {expiringItems.slice(0, 4).map((item) => (
                <View key={item.id} style={styles.expiringItemChip}>
                  <Text style={styles.expiringItemName}>{item.name}</Text>
                  <Text style={styles.expiringItemDays}>
                    ({getDaysUntilExpiration(item.expiration_date!)}d)
                  </Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={styles.seeRecipesLink} onPress={handleExpiringRecipes}>
              <Text style={styles.seeRecipesText}>See recipes using these →</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* This Week's Plan Section */}
        <View style={styles.weekPlanSection}>
          <Text style={styles.sectionTitle}>This Week's Plan</Text>
          <View style={styles.weekPlanRow}>
            {weekPlanSummary.map((day) => (
              <View
                key={day.dayName}
                style={[styles.dayPill, day.isToday && styles.dayPillToday]}
              >
                <Text style={[styles.dayName, day.isToday && styles.dayNameToday]}>
                  {day.dayName}
                </Text>
                <Text
                  style={[styles.dayMeal, day.isToday && styles.dayMealToday]}
                  numberOfLines={1}
                >
                  {day.meal || '???'}
                </Text>
                {day.isCompleted && (
                  <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                )}
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.viewWeekLink} onPress={handleViewWeek}>
            <Text style={styles.viewWeekText}>View full week →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      <PepperFAB
        context="tonight"
        suggestion={pepperSuggestions[0]}
        quickActions={quickActions}
        hasSuggestion={pepperSuggestions.length > 0}
        contextData={{
          pantryItems,
          mealPlans,
        }}
      />
    </SafeAreaView>
  );
}

/** Loading skeleton component */
function TonightSkeleton(): React.ReactElement {
  return (
    <View style={styles.skeletonContainer}>
      <View style={styles.skeletonGreeting} />
      <View style={styles.skeletonCard} />
      <View style={styles.skeletonSection} />
    </View>
  );
}

/** Get week plan summary from meal plans */
function getWeekPlanSummary(
  mealPlans: MealPlan[]
): { dayName: string; meal: string | null; isToday: boolean; isCompleted: boolean }[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayOfWeek + 1);
  
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  return dayNames.map((dayName, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const dateStr = date.toISOString().split('T')[0];
    
    const dinnerPlan = mealPlans.find(
      (m) => m.date === dateStr && m.meal_type === 'dinner'
    );
    
    return {
      dayName,
      meal: dinnerPlan?.recipe_name || null,
      isToday: index === (dayOfWeek === 0 ? 6 : dayOfWeek - 1),
      isCompleted: dinnerPlan?.is_completed || false,
    };
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.space4,
  },
  emptyContent: {
    flex: 1,
    padding: spacing.space6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.text2xl,
    fontWeight: typography.fontBold,
    color: colors.brown,
    textAlign: 'center',
    marginBottom: spacing.space8,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.space3,
    marginBottom: spacing.space6,
  },
  categoryCard: {
    width: 80,
    paddingVertical: spacing.space4,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.brown,
    ...shadows.sm,
  },
  categoryEmoji: {
    fontSize: 28,
    marginBottom: spacing.space2,
  },
  categoryLabel: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    color: colors.brown,
    fontWeight: typography.fontMedium,
  },
  surpriseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
    paddingVertical: spacing.space3,
    paddingHorizontal: spacing.space6,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.brown,
    ...shadows.sm,
  },
  surpriseButtonText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textBase,
    color: colors.brown,
    fontWeight: typography.fontSemibold,
  },
  emptyDivider: {
    width: '60%',
    height: 2,
    backgroundColor: colors.brownMuted,
    opacity: 0.2,
    marginVertical: spacing.space8,
  },
  emptyPrompt: {
    alignItems: 'center',
    marginBottom: spacing.space6,
  },
  emptyPromptTitle: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textLg,
    color: colors.brown,
    fontWeight: typography.fontSemibold,
    marginTop: spacing.space2,
  },
  emptyPromptText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textBase,
    color: colors.brownMuted,
    textAlign: 'center',
    marginTop: spacing.space2,
    maxWidth: 280,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: spacing.space3,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
    paddingVertical: spacing.space3,
    paddingHorizontal: spacing.space4,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  emptyActionText: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    color: colors.brown,
    fontWeight: typography.fontMedium,
  },
  greetingBanner: {
    padding: spacing.space4,
    paddingTop: spacing.space4,
  },
  greetingText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.text2xl,
    fontWeight: typography.fontBold,
    color: colors.brown,
  },
  subGreetingText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textBase,
    color: colors.brownMuted,
    marginTop: spacing.space1,
  },
  onboardingCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.space4,
    marginBottom: spacing.space4,
    padding: spacing.space4,
    backgroundColor: colors.peachLight,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.coral,
    ...shadows.sm,
  },
  onboardingCTAEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.space6,
    padding: spacing.space4,
    backgroundColor: colors.peachLight,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.coral,
    ...shadows.sm,
  },
  onboardingCTAIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.space3,
    borderWidth: 2,
    borderColor: colors.coral,
  },
  onboardingCTAContent: {
    flex: 1,
  },
  onboardingCTATitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.textBase,
    fontWeight: typography.fontBold,
    color: colors.brown,
    marginBottom: spacing.space1,
  },
  onboardingCTASubtitle: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownLight,
    lineHeight: typography.textSm * 1.4,
  },
  onboardingCTAButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space1,
    paddingVertical: spacing.space2,
    paddingHorizontal: spacing.space3,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  onboardingCTAButtonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: typography.textSm,
    fontWeight: typography.fontBold,
    color: colors.brown,
  },
  expiringBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
    marginHorizontal: spacing.space4,
    marginBottom: spacing.space4,
    padding: spacing.space3,
    backgroundColor: colors.warningBg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  expiringText: {
    flex: 1,
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brown,
  },
  cardSection: {
    marginBottom: spacing.space4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
    marginHorizontal: spacing.space4,
    marginBottom: spacing.space2,
  },
  cardHeaderText: {
    fontFamily: 'Nunito-Bold',
    fontSize: typography.textXs,
    fontWeight: typography.fontBold,
    color: colors.primary,
    letterSpacing: 1,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.space2,
    marginTop: spacing.space3,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.creamDark,
  },
  dotActive: {
    backgroundColor: colors.coral,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  moreDotsText: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textXs,
    color: colors.brownMuted,
    marginLeft: spacing.space1,
  },
  rosterSection: {
    marginHorizontal: spacing.space4,
    marginBottom: spacing.space3,
  },
  rosterTitle: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    marginBottom: spacing.space2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rosterScroll: {
    gap: spacing.space2,
    paddingBottom: spacing.space1,
  },
  rosterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space1,
    paddingVertical: spacing.space1,
    paddingHorizontal: spacing.space3,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rosterChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  rosterEmoji: {
    fontSize: 18,
  },
  rosterName: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textSm,
    color: colors.brownMuted,
  },
  rosterNameActive: {
    color: colors.brown,
  },
  actionButtons: {
    flexDirection: 'row',
    marginHorizontal: spacing.space4,
    marginTop: spacing.space3,
    gap: spacing.space2,
  },
  cookedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.space2,
    paddingVertical: spacing.space4,
    paddingHorizontal: spacing.space3,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: '#4CAF50',
    backgroundColor: '#4CAF5015',
  },
  cookedButtonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: typography.textSm,
    color: '#4CAF50',
  },
  primaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.space2,
    paddingVertical: spacing.space4,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.brown,
    ...shadows.sm,
  },
  primaryActionText: {
    fontFamily: 'Nunito-Bold',
    fontSize: typography.textBase,
    fontWeight: typography.fontBold,
    color: colors.brown,
  },
  pepperWhyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.space2,
    marginTop: spacing.space3,
    paddingVertical: spacing.space2,
    paddingHorizontal: spacing.space3,
    backgroundColor: colors.coralLight,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.coral,
  },
  pepperAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pepperEmoji: {
    fontSize: 14,
  },
  pepperWhyText: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    fontWeight: typography.fontMedium,
    color: colors.brown,
  },
  moreIdeasSection: {
    marginTop: spacing.space4,
    marginBottom: spacing.space4,
  },
  moreIdeasTitle: {
    paddingHorizontal: spacing.space4,
  },
  moreIdeasScroll: {
    paddingHorizontal: spacing.space4,
    gap: spacing.space3,
  },
  moreIdeaCard: {
    width: 140,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.brown,
    overflow: 'hidden',
    ...shadows.sm,
  },
  moreIdeaImage: {
    width: '100%',
    height: 90,
  },
  moreIdeaContent: {
    padding: spacing.space3,
  },
  moreIdeaTitle: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textSm,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
    marginBottom: spacing.space1,
  },
  moreIdeaMatch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space1,
  },
  moreIdeaMatchText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textXs,
    color: colors.success,
  },
  wantMoreSection: {
    marginHorizontal: spacing.space4,
    marginBottom: spacing.space4,
    padding: spacing.space4,
    backgroundColor: colors.peachLight,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.peach,
    alignItems: 'center',
  },
  wantMoreIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.space3,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  wantMoreTitle: {
    fontFamily: 'Quicksand-SemiBold',
    fontSize: typography.textLg,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
    textAlign: 'center',
    marginBottom: spacing.space2,
  },
  wantMoreText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    textAlign: 'center',
    marginBottom: spacing.space4,
  },
  wantMoreButtons: {
    flexDirection: 'row',
    gap: spacing.space3,
  },
  wantMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
    paddingVertical: spacing.space3,
    paddingHorizontal: spacing.space4,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  wantMoreButtonText: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    fontWeight: typography.fontMedium,
    color: colors.brown,
  },
  wantMoreHint: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textXs,
    color: colors.brownMuted,
    marginTop: spacing.space3,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontFamily: 'Quicksand-SemiBold',
    fontSize: typography.textLg,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
    marginBottom: spacing.space3,
  },
  useItUpSection: {
    marginHorizontal: spacing.space4,
    marginBottom: spacing.space4,
    padding: spacing.space4,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  expiringItemsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.space2,
    marginBottom: spacing.space3,
  },
  expiringItemChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space1,
    paddingVertical: spacing.space2,
    paddingHorizontal: spacing.space3,
    backgroundColor: colors.warningBg,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  expiringItemName: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    color: colors.brown,
    fontWeight: typography.fontMedium,
  },
  expiringItemDays: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textXs,
    color: colors.brownMuted,
  },
  seeRecipesLink: {
    alignSelf: 'flex-start',
  },
  seeRecipesText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textSm,
    color: colors.coral,
    fontWeight: typography.fontSemibold,
  },
  weekPlanSection: {
    marginHorizontal: spacing.space4,
    marginBottom: spacing.space4,
    padding: spacing.space4,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  weekPlanRow: {
    flexDirection: 'row',
    gap: spacing.space2,
    marginBottom: spacing.space3,
  },
  dayPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.space2,
    paddingHorizontal: spacing.space1,
    backgroundColor: colors.cream,
    borderRadius: borderRadius.sm,
  },
  dayPillToday: {
    backgroundColor: colors.primary,
  },
  dayName: {
    fontFamily: 'Nunito-Medium',
    fontSize: 10,
    color: colors.brownMuted,
    fontWeight: typography.fontMedium,
  },
  dayNameToday: {
    color: colors.brown,
  },
  dayMeal: {
    fontFamily: 'Nunito-Regular',
    fontSize: 9,
    color: colors.brown,
    textAlign: 'center',
    marginTop: 2,
  },
  dayMealToday: {
    fontFamily: 'Nunito-SemiBold',
    fontWeight: typography.fontSemibold,
  },
  viewWeekLink: {
    alignSelf: 'flex-start',
  },
  viewWeekText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textSm,
    color: colors.coral,
    fontWeight: typography.fontSemibold,
  },
  skeletonContainer: {
    flex: 1,
    padding: spacing.space4,
  },
  skeletonGreeting: {
    width: '60%',
    height: 32,
    backgroundColor: colors.creamDark,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.space4,
  },
  skeletonCard: {
    width: '100%',
    height: 400,
    backgroundColor: colors.creamDark,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.space4,
  },
  skeletonSection: {
    width: '100%',
    height: 100,
    backgroundColor: colors.creamDark,
    borderRadius: borderRadius.lg,
  },
  noSuggestionsCard: {
    marginHorizontal: spacing.space4,
    marginVertical: spacing.space6,
    padding: spacing.space6,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.brown,
    alignItems: 'center',
    ...shadows.sm,
  },
  noSuggestionsTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.textXl,
    fontWeight: typography.fontBold,
    color: colors.brown,
    marginTop: spacing.space4,
    marginBottom: spacing.space2,
  },
  noSuggestionsText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textBase,
    color: colors.brownMuted,
    textAlign: 'center',
    marginBottom: spacing.space4,
    lineHeight: typography.textBase * 1.5,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
    paddingVertical: spacing.space3,
    paddingHorizontal: spacing.space6,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  retryButtonText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
});
