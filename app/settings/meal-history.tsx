import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Share,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useHouseholdContext } from '../../context/HouseholdContext';
import { supabase } from '../../lib/supabase';
import { gamificationService } from '../../lib/gamificationService';
import { MealPlan, UserImpactSummary } from '../../lib/types';
import { colors, spacing, borderRadius } from '../../lib/theme';

interface CompletedMealWithImpact extends MealPlan {
  estimatedSavings?: number;
}

/**
 * MealHistoryScreen - Displays completed meals and cost savings achievements
 */
export default function MealHistoryScreen(): React.ReactElement {
  const { user } = useAuth();
  const { activeHousehold } = useHouseholdContext();
  const [completedMeals, setCompletedMeals] = useState<CompletedMealWithImpact[]>([]);
  const [impactSummary, setImpactSummary] = useState<UserImpactSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (): Promise<void> => {
    if (!user) return;
    try {
      const summaryData = await gamificationService.getImpactSummary(user.id, 'all_time');
      setImpactSummary(summaryData);
      let query = supabase
        .from('meal_plans')
        .select('*')
        .eq('is_completed', true)
        .order('completed_at', { ascending: false })
        .limit(50);
      if (activeHousehold?.id) {
        query = query.eq('household_id', activeHousehold.id);
      } else {
        query = query.eq('user_id', user.id).is('household_id', null);
      }
      const { data: meals, error } = await query;
      if (error) throw error;
      const mealsWithImpact: CompletedMealWithImpact[] = (meals || []).map((meal) => {
        const deductions = meal.ingredient_deductions || [];
        const estimatedSavings = deductions.reduce((total: number, d: { amount_to_deduct: number; unit: string }) => {
          return total + gamificationService.calculateCost(d.amount_to_deduct, d.unit);
        }, 0);
        return { ...meal, estimatedSavings };
      });
      setCompletedMeals(mealsWithImpact);
    } catch (error) {
      console.error('Error loading meal history:', error);
    } finally {
      setLoading(false);
    }
  }, [user, activeHousehold?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleShare = async (): Promise<void> => {
    if (!impactSummary) return;
    try {
      const moneySaved = (impactSummary.money_saved_cents / 100).toFixed(2);
      const mealsCooked = completedMeals.length;
      const foodSaved = (impactSummary.weight_saved_g / 453.6).toFixed(1);
      await Share.share({
        message: `🍽️ I've cooked ${mealsCooked} home meals with DinnerPlans AI, saving $${moneySaved} and preventing ${foodSaved} lbs of food waste! 🌱 #SustainableCooking #HomeCooking`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  };

  const formatMealType = (mealType: string): string => {
    return mealType.charAt(0).toUpperCase() + mealType.slice(1);
  };

  if (!user) return <View style={styles.container} />;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your savings...</Text>
      </View>
    );
  }

  const totalSaved = impactSummary?.money_saved_cents || 0;
  const itemsRescued = impactSummary?.items_rescued || 0;
  const weightSavedLbs = impactSummary ? (impactSummary.weight_saved_g / 453.6).toFixed(1) : '0';
  const co2Saved = impactSummary ? (impactSummary.co2_avoided_g / 1000).toFixed(1) : '0';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Hero Savings Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroIconContainer}>
          <Ionicons name="wallet" size={40} color={colors.white} />
        </View>
        <Text style={styles.heroLabel}>Total Savings</Text>
        <Text style={styles.heroAmount}>
          ${(totalSaved / 100).toFixed(2)}
        </Text>
        <Text style={styles.heroSubtext}>
          by cooking at home with DinnerPlans
        </Text>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShare}
          accessibilityLabel="Share your savings"
          accessibilityRole="button"
        >
          <Ionicons name="share-outline" size={18} color={colors.primary} />
          <Text style={styles.shareButtonText}>Share Achievement</Text>
        </TouchableOpacity>
      </View>

      {/* Impact Breakdown */}
      <View style={styles.impactSection}>
        <Text style={styles.sectionTitle}>Your Impact</Text>
        <View style={styles.impactGrid}>
          <View style={styles.impactItem}>
            <View style={[styles.impactIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="nutrition" size={24} color="#4CAF50" />
            </View>
            <Text style={styles.impactValue}>{itemsRescued}</Text>
            <Text style={styles.impactLabel}>Items Rescued</Text>
          </View>
          <View style={styles.impactItem}>
            <View style={[styles.impactIcon, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="scale" size={24} color="#FF9800" />
            </View>
            <Text style={styles.impactValue}>{weightSavedLbs} lbs</Text>
            <Text style={styles.impactLabel}>Food Saved</Text>
          </View>
          <View style={styles.impactItem}>
            <View style={[styles.impactIcon, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="restaurant" size={24} color="#2196F3" />
            </View>
            <Text style={styles.impactValue}>{completedMeals.length}</Text>
            <Text style={styles.impactLabel}>Home Meals</Text>
          </View>
          <View style={styles.impactItem}>
            <View style={[styles.impactIcon, { backgroundColor: '#F3E5F5' }]}>
              <Ionicons name="planet" size={24} color="#9C27B0" />
            </View>
            <Text style={styles.impactValue}>{co2Saved} kg</Text>
            <Text style={styles.impactLabel}>CO₂ Avoided</Text>
          </View>
        </View>
      </View>

      {/* ROI Explanation */}
      <View style={styles.roiCard}>
        <Ionicons name="trending-up" size={24} color={colors.success} />
        <View style={styles.roiTextContainer}>
          <Text style={styles.roiTitle}>How You Save</Text>
          <Text style={styles.roiDescription}>
            Using ingredients before they expire and planning meals ahead saves 
            the average family $1,500/year in food waste and takeout costs.
          </Text>
        </View>
      </View>

      {/* Completed Meals History */}
      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Recent Meals</Text>
        {completedMeals.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={48} color={colors.brownMuted} />
            <Text style={styles.emptyTitle}>No meals completed yet</Text>
            <Text style={styles.emptyText}>
              Complete your first meal to start tracking your savings!
            </Text>
          </View>
        ) : (
          <View style={styles.mealsList}>
            {completedMeals.map((meal) => (
              <View key={meal.id} style={styles.mealCard}>
                {meal.recipe_thumbnail ? (
                  <Image
                    source={{ uri: meal.recipe_thumbnail }}
                    style={styles.mealThumbnail}
                    accessibilityLabel={`${meal.recipe_name} thumbnail`}
                  />
                ) : (
                  <View style={[styles.mealThumbnail, styles.mealThumbnailPlaceholder]}>
                    <Ionicons name="restaurant" size={20} color={colors.brownMuted} />
                  </View>
                )}
                <View style={styles.mealInfo}>
                  <Text style={styles.mealName} numberOfLines={1}>
                    {meal.recipe_name}
                  </Text>
                  <View style={styles.mealMeta}>
                    <Text style={styles.mealDate}>
                      {formatDate(meal.completed_at || meal.date)}
                    </Text>
                    <Text style={styles.mealType}>
                      • {formatMealType(meal.meal_type)}
                    </Text>
                  </View>
                  {meal.ingredient_deductions && meal.ingredient_deductions.length > 0 && (
                    <Text style={styles.mealIngredients}>
                      Used {meal.ingredient_deductions.length} pantry ingredient
                      {meal.ingredient_deductions.length !== 1 ? 's' : ''}
                    </Text>
                  )}
                </View>
                {(meal.estimatedSavings ?? 0) > 0 && (
                  <View style={styles.mealSavings}>
                    <Text style={styles.savingsAmount}>
                      +${((meal.estimatedSavings ?? 0) / 100).toFixed(2)}
                    </Text>
                    <Text style={styles.savingsLabel}>saved</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Motivational Footer */}
      {completedMeals.length > 0 && (
        <View style={styles.motivationCard}>
          <Text style={styles.motivationEmoji}>🏆</Text>
          <Text style={styles.motivationText}>
            You're making a real difference! Every home-cooked meal reduces food waste 
            and saves money compared to eating out or letting ingredients expire.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  content: {
    padding: spacing.space4,
    paddingBottom: spacing.space10,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream,
  },
  loadingText: {
    marginTop: spacing.space3,
    color: colors.brownMuted,
    fontSize: 14,
  },
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.space6,
    alignItems: 'center',
    marginBottom: spacing.space4,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  heroIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.space3,
  },
  heroLabel: {
    fontSize: 14,
    color: colors.brown,
    fontWeight: '500',
    marginBottom: spacing.space1,
  },
  heroAmount: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.brown,
    letterSpacing: -1,
  },
  heroSubtext: {
    fontSize: 14,
    color: colors.brownLight,
    marginTop: spacing.space1,
    textAlign: 'center',
  },
  shareButton: {
    marginTop: spacing.space4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingVertical: spacing.space2,
    paddingHorizontal: spacing.space4,
    borderRadius: borderRadius.full,
    gap: spacing.space2,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brown,
  },
  impactSection: {
    marginBottom: spacing.space4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.brown,
    marginBottom: spacing.space3,
  },
  impactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.space3,
  },
  impactItem: {
    width: '47%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.space4,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  impactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.space2,
  },
  impactValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.brown,
  },
  impactLabel: {
    fontSize: 12,
    color: colors.brownMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  roiCard: {
    backgroundColor: colors.successBg,
    borderRadius: borderRadius.lg,
    padding: spacing.space4,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.space4,
    gap: spacing.space3,
    borderWidth: 1,
    borderColor: colors.success,
  },
  roiTextContainer: {
    flex: 1,
  },
  roiTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brown,
    marginBottom: 4,
  },
  roiDescription: {
    fontSize: 13,
    color: colors.brownLight,
    lineHeight: 18,
  },
  historySection: {
    marginBottom: spacing.space4,
  },
  emptyState: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.space8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.brown,
    marginTop: spacing.space3,
  },
  emptyText: {
    fontSize: 14,
    color: colors.brownMuted,
    marginTop: spacing.space2,
    textAlign: 'center',
  },
  mealsList: {
    gap: spacing.space3,
  },
  mealCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.space3,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  mealThumbnail: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    marginRight: spacing.space3,
  },
  mealThumbnailPlaceholder: {
    backgroundColor: colors.creamDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.brown,
    marginBottom: 2,
  },
  mealMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealDate: {
    fontSize: 12,
    color: colors.brownMuted,
  },
  mealType: {
    fontSize: 12,
    color: colors.brownMuted,
    marginLeft: 4,
  },
  mealIngredients: {
    fontSize: 11,
    color: colors.success,
    marginTop: 2,
    fontWeight: '500',
  },
  mealSavings: {
    alignItems: 'flex-end',
    marginLeft: spacing.space2,
  },
  savingsAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.success,
  },
  savingsLabel: {
    fontSize: 10,
    color: colors.brownMuted,
  },
  motivationCard: {
    backgroundColor: colors.peachLight,
    borderRadius: borderRadius.lg,
    padding: spacing.space4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.peach,
  },
  motivationEmoji: {
    fontSize: 32,
    marginBottom: spacing.space2,
  },
  motivationText: {
    fontSize: 14,
    color: colors.brownLight,
    textAlign: 'center',
    lineHeight: 20,
  },
});


