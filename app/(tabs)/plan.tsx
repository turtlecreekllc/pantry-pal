/**
 * Plan Screen - Weekly Meal Calendar
 * Visual weekly meal planning with drag-and-drop simplicity.
 * Enhanced with Pepper suggestions and family voting.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'react-native';
import { MealCalendar } from '../../components/MealCalendar';
import { MealCompletionModal } from '../../components/MealCompletionModal';
import { MealVotingModal } from '../../components/MealVotingModal';
import { PepperFAB } from '../../components/PepperFAB';
import { ExpandableFAB } from '../../components/ExpandableFAB';

const MascotImage = require('../../assets/icon.png');
import { useMealPlans } from '../../hooks/useMealPlans';
import { usePantry } from '../../hooks/usePantry';
import { useCalendar } from '../../hooks/useCalendar';
import { useHealth } from '../../context/HealthContext';
import { useHouseholdContext } from '../../context/HouseholdContext';
import { saveNutritionToHealth } from '../../lib/healthService';
import { generateContextualSuggestions, getQuickActions } from '../../lib/pepperContext';
import { votingService, MealVote } from '../../lib/votingService';
import { MealPlan, MealType, ExtendedRecipe, IngredientDeduction } from '../../lib/types';
import { getRecipeDetails } from '../../lib/recipeService';
import { colors, typography, spacing, borderRadius, shadows } from '../../lib/theme';

export default function PlanScreen(): React.ReactElement {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [completingMeal, setCompletingMeal] = useState<MealPlan | null>(null);
  const [recipeForCompletion, setRecipeForCompletion] = useState<ExtendedRecipe | null>(null);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Voting state
  const [activeVotes, setActiveVotes] = useState<MealVote[]>([]);
  const [selectedVote, setSelectedVote] = useState<MealVote | null>(null);
  const [showVotingModal, setShowVotingModal] = useState(false);
  
  const { activeHousehold } = useHouseholdContext();
  const householdMembers = activeHousehold?.members;
  const { mealPlans, completeMeal, deleteMealPlan, refreshMealPlans } = useMealPlans({
    householdId: activeHousehold?.id,
  });
  const { pantryItems, restoreItem, refreshPantry } = usePantry({
    householdId: activeHousehold?.id,
  });
  const { removeMealEvent } = useCalendar();
  const { isHealthSyncEnabled } = useHealth();
  
  // Calculate weekly stats
  const weekStats = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    const weekMeals = mealPlans.filter((m) => {
      const mealDate = new Date(m.date);
      return mealDate >= startOfWeek && mealDate <= endOfWeek && m.meal_type === 'dinner';
    });
    
    const plannedCount = weekMeals.length;
    const completedCount = weekMeals.filter((m) => m.is_completed).length;
    
    // Find empty days
    const emptyDays: string[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      const dateStr = day.toISOString().split('T')[0];
      const hasMeal = weekMeals.some((m) => m.date === dateStr);
      if (!hasMeal) {
        emptyDays.push(getDayName(day));
      }
    }
    
    return { plannedCount, completedCount, totalDays: 7, emptyDays };
  }, [mealPlans]);
  
  // Pepper suggestions for this context
  const pepperSuggestions = generateContextualSuggestions('plan', {
    mealPlans,
    pantryItems,
  });
  const quickActions = getQuickActions('plan');
  
  // Check if household has multiple members for voting
  const canVote = activeHousehold && householdMembers && householdMembers.length > 1;
  
  // Load active votes for household
  useEffect(() => {
    if (!activeHousehold?.id) return;
    const loadVotes = async (): Promise<void> => {
      try {
        const votes = await votingService.getActiveVotes(activeHousehold.id);
        setActiveVotes(Array.from(votes));
      } catch (error) {
        console.error('Error loading votes:', error);
      }
    };
    loadVotes();
    // Subscribe to vote updates
    const unsubscribe = votingService.subscribeToVotes(activeHousehold.id, (updatedVote) => {
      setActiveVotes((prev) => {
        const index = prev.findIndex((v) => v.id === updatedVote.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = updatedVote;
          return updated;
        }
        return [...prev, updatedVote];
      });
    });
    return () => {
      unsubscribe();
    };
  }, [activeHousehold?.id]);
  
  // Handle starting a new vote
  const handleStartVote = (date: string): void => {
    if (!canVote) {
      Alert.alert(
        'Household Required',
        'Voting is available when you have household members. Invite family members to start voting on meals!',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Invite Members', onPress: () => router.push('/settings/household') },
        ]
      );
      return;
    }
    // Navigate to recipe selection for voting
    router.push({
      pathname: '/meal/add',
      params: { date, mealType: 'dinner', mode: 'vote' },
    });
  };
  
  // Handle opening a vote for viewing/voting
  const handleOpenVote = (vote: MealVote): void => {
    setSelectedVote(vote);
    setShowVotingModal(true);
  };
  
  // Handle vote completion
  const handleVoteComplete = async (): Promise<void> => {
    setShowVotingModal(false);
    setSelectedVote(null);
    await refreshMealPlans();
  };
  
  const handleAddMeal = (date: string, mealType: MealType): void => {
    router.push({
      pathname: '/meal/add',
      params: { date, mealType },
    });
  };
  
  const handleMealPress = async (meal: MealPlan): Promise<void> => {
    if (meal.is_completed) {
      Alert.alert(
        'Meal Completed',
        `${meal.recipe_name} was completed on ${new Date(meal.completed_at!).toLocaleDateString()}.`,
        [
          { text: 'OK' },
          { text: 'Delete', style: 'destructive', onPress: () => handleDeleteMeal(meal) },
        ]
      );
    } else {
      setCompletingMeal(meal);
      if (meal.recipe_id) {
        setIsLoadingRecipe(true);
        try {
          const recipe = await getRecipeDetails(meal.recipe_id);
          setRecipeForCompletion(recipe);
        } catch (error) {
          console.error('Error loading recipe:', error);
        } finally {
          setIsLoadingRecipe(false);
        }
      }
    }
  };
  
  const handleDeleteMeal = async (meal: MealPlan): Promise<void> => {
    const hasDeductions = meal.ingredient_deductions && meal.ingredient_deductions.length > 0;
    Alert.alert(
      'Delete Meal',
      hasDeductions
        ? 'This will restore the deducted ingredients back to your pantry. Continue?'
        : 'Are you sure you want to remove this meal from your plan?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMealPlan(meal.id, { onRestore: restoreItem });
              await removeMealEvent(meal.id);
              await refreshPantry();
            } catch (error) {
              console.error('Error deleting meal:', error);
              Alert.alert('Error', 'Failed to delete meal');
            }
          },
        },
      ]
    );
  };
  
  const handleCompleteMeal = async (deductions: IngredientDeduction[]): Promise<void> => {
    if (!completingMeal) return;
    try {
      await completeMeal(completingMeal.id, deductions);
      await refreshPantry();
      let syncMessage = '';
      if (isHealthSyncEnabled && recipeForCompletion?.nutrition) {
        const consumedAt = new Date();
        const success = await saveNutritionToHealth(
          recipeForCompletion.nutrition,
          consumedAt,
          completingMeal.meal_type,
          completingMeal.recipe_name
        );
        if (success) {
          syncMessage = ' and synced to Health app';
        } else {
          syncMessage = ' (Health sync failed)';
        }
      }
      setCompletingMeal(null);
      setRecipeForCompletion(null);
      Alert.alert('Success', `Meal marked as complete${syncMessage}!`);
    } catch (error) {
      console.error('Error completing meal:', error);
      Alert.alert('Error', 'Failed to complete meal. Please try again.');
    }
  };
  
  const handleCancelCompletion = (): void => {
    setCompletingMeal(null);
    setRecipeForCompletion(null);
  };
  
  const handleRefresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    await refreshMealPlans();
    setRefreshing(false);
  }, [refreshMealPlans]);
  
  const handlePepperFillWeek = (): void => {
    // Navigate to AI-powered meal planning
    router.push('/recipe/generate');
  };
  
  const handleGenerateGroceryList = (): void => {
    // Generate grocery list from planned meals
    router.push('/(tabs)/grocery');
  };
  
  const handlePepperSuggestionPress = useCallback((): void => {
    if (weekStats.emptyDays.length > 0) {
      handlePepperFillWeek();
    }
  }, [weekStats.emptyDays]);
  
  // Pantry add menu actions
  const addMenuActions = [
    {
      icon: 'barcode-outline' as const,
      label: 'Scan Barcode',
      onPress: () => router.push('/(tabs)/scan'),
    },
    {
      icon: 'receipt-outline' as const,
      label: 'Scan Receipt',
      onPress: () => router.push('/scan/receipt'),
    },
    {
      icon: 'create-outline' as const,
      label: 'Add Manually',
      onPress: () => router.push('/item/manual'),
    },
    {
      icon: 'mic-outline' as const,
      label: 'Voice Add',
      onPress: () => router.push('/(tabs)/chat'),
    },
  ];
  
  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Week Navigation Header */}
        <View style={styles.weekNavHeader}>
          <TouchableOpacity
            style={styles.weekNavButton}
            onPress={() => {
              const newDate = new Date(selectedDate);
              newDate.setDate(selectedDate.getDate() - 7);
              setSelectedDate(newDate);
            }}
            accessibilityLabel="Previous week"
          >
            <Ionicons name="chevron-back" size={20} color={colors.brown} />
          </TouchableOpacity>
          <View style={styles.weekNavCenter}>
            <Text style={styles.weekTitle}>
              {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
            <TouchableOpacity
              style={styles.todayButton}
              onPress={() => setSelectedDate(new Date())}
            >
              <Ionicons name="today-outline" size={14} color={colors.brown} />
              <Text style={styles.todayButtonText}>Today</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.weekNavButton}
            onPress={() => {
              const newDate = new Date(selectedDate);
              newDate.setDate(selectedDate.getDate() + 7);
              setSelectedDate(newDate);
            }}
            accessibilityLabel="Next week"
          >
            <Ionicons name="chevron-forward" size={20} color={colors.brown} />
          </TouchableOpacity>
        </View>
        
        {/* Week View Calendar */}
        <MealCalendar
          mealPlans={mealPlans}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onAddMeal={handleAddMeal}
          onMealPress={handleMealPress}
        />
        
        {/* Week Overview */}
        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <Ionicons name="analytics-outline" size={20} color={colors.brown} />
            <Text style={styles.overviewTitle}>This Week's Overview</Text>
          </View>
          <View style={styles.overviewStats}>
            <View style={styles.overviewStat}>
              <Text style={styles.overviewStatValue}>
                {weekStats.plannedCount}/{weekStats.totalDays}
              </Text>
              <Text style={styles.overviewStatLabel}>Meals Planned</Text>
            </View>
            <View style={styles.overviewDivider} />
            <View style={styles.overviewStat}>
              <Text style={styles.overviewStatValue}>{weekStats.completedCount}</Text>
              <Text style={styles.overviewStatLabel}>Completed</Text>
            </View>
            <View style={styles.overviewDivider} />
            <View style={styles.overviewStat}>
              <View style={styles.nutritionBadge}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.nutritionText}>Good</Text>
              </View>
              <Text style={styles.overviewStatLabel}>Balance</Text>
            </View>
          </View>
        </View>
        
        {/* Active Votes Section */}
        {activeVotes.length > 0 && (
          <View style={styles.votesCard}>
            <View style={styles.votesHeader}>
              <Ionicons name="hand-left" size={20} color={colors.coral} />
              <Text style={styles.votesTitle}>Active Votes</Text>
              <View style={styles.votesBadge}>
                <Text style={styles.votesBadgeText}>{activeVotes.length}</Text>
              </View>
            </View>
            {activeVotes.map((vote) => (
              <TouchableOpacity
                key={vote.id}
                style={styles.voteItem}
                onPress={() => handleOpenVote(vote)}
              >
                <View style={styles.voteItemContent}>
                  <Text style={styles.voteRecipeName}>{vote.recipeName}</Text>
                  <Text style={styles.voteDate}>
                    for {new Date(vote.proposedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </Text>
                </View>
                <View style={styles.voteStatus}>
                  <Text style={styles.voteStatusText}>
                    {vote.responses?.length || 0}/{householdMembers?.length || 0} voted
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.brownMuted} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        {/* Start Vote CTA for households */}
        {canVote && weekStats.emptyDays.length > 0 && (
          <View style={styles.startVoteCard}>
            <View style={styles.startVoteContent}>
              <Ionicons name="people" size={24} color={colors.coral} />
              <View style={styles.startVoteText}>
                <Text style={styles.startVoteTitle}>Let the family decide!</Text>
                <Text style={styles.startVoteSubtitle}>
                  Start a vote for {weekStats.emptyDays[0]}'s dinner
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.startVoteButton}
              onPress={() => {
                const startOfWeek = new Date(selectedDate);
                startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay() + 1);
                const dayIndex = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(weekStats.emptyDays[0]);
                const targetDate = new Date(startOfWeek);
                targetDate.setDate(startOfWeek.getDate() + dayIndex);
                handleStartVote(targetDate.toISOString().split('T')[0]);
              }}
            >
              <Ionicons name="hand-left-outline" size={16} color={colors.brown} />
              <Text style={styles.startVoteButtonText}>Start Vote</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Pepper Suggestions Card */}
        {weekStats.emptyDays.length > 0 && (
          <View style={styles.pepperCard}>
            <View style={styles.pepperHeader}>
              <View style={styles.pepperAvatar}>
                <Image source={MascotImage} style={styles.pepperAvatarImage} resizeMode="contain" />
              </View>
              <Text style={styles.pepperTitle}>Chef's Suggestions</Text>
            </View>
            <Text style={styles.pepperMessage}>
              {weekStats.emptyDays.length === 1
                ? `${weekStats.emptyDays[0]} is empty. Want me to suggest a meal using what you have?`
                : `${weekStats.emptyDays.slice(0, 3).join(', ')}${weekStats.emptyDays.length > 3 ? ` and ${weekStats.emptyDays.length - 3} more` : ''} are empty. Want me to fill them in?`}
            </Text>
            <View style={styles.pepperActions}>
              <TouchableOpacity style={styles.pepperPrimaryButton} onPress={handlePepperFillWeek}>
                <Text style={styles.pepperPrimaryButtonText}>Yes, fill them in</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pepperSecondaryButton}>
                <Text style={styles.pepperSecondaryButtonText}>I'll do it myself</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {/* Generate Grocery List Card */}
        {weekStats.plannedCount > 0 && (
          <View style={styles.groceryCard}>
            <View style={styles.groceryHeader}>
              <Ionicons name="cart-outline" size={20} color={colors.brown} />
              <Text style={styles.groceryTitle}>Generate Grocery List</Text>
            </View>
            <Text style={styles.groceryMessage}>
              Based on this week's meals, you need ingredients for {weekStats.plannedCount} dinner
              {weekStats.plannedCount > 1 ? 's' : ''}.
            </Text>
            <View style={styles.groceryActions}>
              <TouchableOpacity style={styles.groceryButton} onPress={handleGenerateGroceryList}>
                <Text style={styles.groceryButtonText}>Create List</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.instacartButton}>
                <Ionicons name="storefront-outline" size={16} color={colors.success} />
                <Text style={styles.instacartButtonText}>Order on Instacart</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        <View style={styles.bottomPadding} />
      </ScrollView>
      
      <MealCompletionModal
        visible={completingMeal !== null}
        mealPlan={completingMeal}
        recipe={recipeForCompletion}
        pantryItems={pantryItems}
        onComplete={handleCompleteMeal}
        onCancel={handleCancelCompletion}
      />
      
      {/* Meal Voting Modal */}
      <MealVotingModal
        visible={showVotingModal}
        vote={selectedVote}
        onClose={() => {
          setShowVotingModal(false);
          setSelectedVote(null);
        }}
        onVoteComplete={handleVoteComplete}
      />
      
      {/* Add Pantry Items FAB - Left side */}
      <ExpandableFAB actions={addMenuActions} position="left" />
      
      {/* Pepper AI FAB - Right side */}
      <PepperFAB
        context="plan"
        suggestion={pepperSuggestions[0]}
        quickActions={quickActions}
        hasSuggestion={weekStats.emptyDays.length > 0}
        onSuggestionPress={handlePepperSuggestionPress}
        contextData={{
          mealPlans,
          pantryItems,
          selectedDate: selectedDate.toISOString().split('T')[0],
        }}
      />
    </SafeAreaView>
  );
}

function getDayName(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scrollView: {
    flex: 1,
  },
  weekNavHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space3,
  },
  weekNavCenter: {
    alignItems: 'center',
    gap: spacing.space1,
  },
  weekTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.textLg,
    fontWeight: typography.fontBold,
    color: colors.brown,
  },
  weekNavButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space1,
    paddingVertical: spacing.space1,
    paddingHorizontal: spacing.space2,
    backgroundColor: colors.peachLight,
    borderRadius: borderRadius.full,
  },
  todayButtonText: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textXs,
    fontWeight: typography.fontMedium,
    color: colors.brown,
  },
  overviewCard: {
    marginHorizontal: spacing.space4,
    marginTop: spacing.space4,
    padding: spacing.space4,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.brown,
    ...shadows.sm,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
    marginBottom: spacing.space4,
  },
  overviewTitle: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  overviewStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overviewStat: {
    flex: 1,
    alignItems: 'center',
  },
  overviewStatValue: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.textXl,
    fontWeight: typography.fontBold,
    color: colors.brown,
  },
  overviewStatLabel: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textXs,
    color: colors.brownMuted,
    marginTop: spacing.space1,
  },
  overviewDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.brownMuted,
    opacity: 0.3,
  },
  nutritionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space1,
    paddingVertical: spacing.space1,
    paddingHorizontal: spacing.space2,
    backgroundColor: colors.successBg,
    borderRadius: borderRadius.full,
  },
  nutritionText: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    fontWeight: typography.fontMedium,
    color: colors.success,
  },
  pepperCard: {
    marginHorizontal: spacing.space4,
    marginTop: spacing.space4,
    padding: spacing.space4,
    backgroundColor: colors.coralLight,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.coral,
  },
  pepperHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
    marginBottom: spacing.space3,
  },
  pepperAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.brown,
    overflow: 'hidden',
  },
  pepperAvatarImage: {
    width: 32,
    height: 32,
  },
  pepperTitle: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  pepperMessage: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brown,
    lineHeight: typography.textSm * 1.5,
    marginBottom: spacing.space4,
  },
  pepperActions: {
    flexDirection: 'row',
    gap: spacing.space3,
  },
  pepperPrimaryButton: {
    flex: 1,
    paddingVertical: spacing.space3,
    backgroundColor: colors.coral,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.brown,
    alignItems: 'center',
  },
  pepperPrimaryButtonText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textSm,
    fontWeight: typography.fontSemibold,
    color: colors.white,
  },
  pepperSecondaryButton: {
    flex: 1,
    paddingVertical: spacing.space3,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.brown,
    alignItems: 'center',
  },
  pepperSecondaryButtonText: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    fontWeight: typography.fontMedium,
    color: colors.brown,
  },
  // Voting styles
  votesCard: {
    marginHorizontal: spacing.space4,
    marginTop: spacing.space4,
    padding: spacing.space4,
    backgroundColor: colors.coralLight,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.coral,
  },
  votesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
    marginBottom: spacing.space3,
  },
  votesTitle: {
    flex: 1,
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  votesBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  votesBadgeText: {
    fontFamily: 'Nunito-Bold',
    fontSize: typography.textXs,
    fontWeight: typography.fontBold,
    color: colors.white,
  },
  voteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.space3,
    paddingHorizontal: spacing.space3,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.brown,
    marginBottom: spacing.space2,
  },
  voteItemContent: {
    flex: 1,
  },
  voteRecipeName: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textSm,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  voteDate: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textXs,
    color: colors.brownMuted,
    marginTop: 2,
  },
  voteStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space1,
  },
  voteStatusText: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textXs,
    fontWeight: typography.fontMedium,
    color: colors.brownMuted,
  },
  startVoteCard: {
    marginHorizontal: spacing.space4,
    marginTop: spacing.space4,
    padding: spacing.space4,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.coral,
    borderStyle: 'dashed',
  },
  startVoteContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space3,
    marginBottom: spacing.space3,
  },
  startVoteText: {
    flex: 1,
  },
  startVoteTitle: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  startVoteSubtitle: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    marginTop: 2,
  },
  startVoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.space2,
    paddingVertical: spacing.space3,
    backgroundColor: colors.coral,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  startVoteButtonText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textSm,
    fontWeight: typography.fontSemibold,
    color: colors.white,
  },
  groceryCard: {
    marginHorizontal: spacing.space4,
    marginTop: spacing.space4,
    padding: spacing.space4,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.brown,
    ...shadows.sm,
  },
  groceryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
    marginBottom: spacing.space2,
  },
  groceryTitle: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  groceryMessage: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    marginBottom: spacing.space4,
  },
  groceryActions: {
    flexDirection: 'row',
    gap: spacing.space3,
  },
  groceryButton: {
    flex: 1,
    paddingVertical: spacing.space3,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.brown,
    alignItems: 'center',
  },
  groceryButtonText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textSm,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  instacartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.space2,
    paddingVertical: spacing.space3,
    backgroundColor: colors.successBg,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.success,
  },
  instacartButtonText: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    fontWeight: typography.fontMedium,
    color: colors.success,
  },
  bottomPadding: {
    height: spacing.space16,
  },
});

