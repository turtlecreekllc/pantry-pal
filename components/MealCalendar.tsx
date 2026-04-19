/**
 * MealCalendar - Simplified Week View
 * Shows current week with meal options for the selected day below.
 */

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MealPlan, MEAL_TYPES, MealType } from '../lib/types';
import { colors, typography, spacing, borderRadius, shadows } from '../lib/theme';

interface MealCalendarProps {
  mealPlans: MealPlan[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onAddMeal: (date: string, mealType: MealType) => void;
  onMealPress: (meal: MealPlan) => void;
}

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MEAL_TYPE_ICONS: Record<MealType, string> = {
  breakfast: 'sunny-outline',
  lunch: 'restaurant-outline',
  dinner: 'moon-outline',
  snack: 'cafe-outline',
};

/**
 * Gets the week days (Sun-Sat) containing the given date
 */
function getWeekDays(date: Date): Date[] {
  const dayOfWeek = date.getDay();
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    days.push(day);
  }
  return days;
}

export function MealCalendar({
  mealPlans,
  selectedDate,
  onSelectDate,
  onAddMeal,
  onMealPress,
}: MealCalendarProps): React.ReactElement {
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);

  const getMealsForDay = (date: Date): MealPlan[] => {
    const dateStr = date.toISOString().split('T')[0];
    return mealPlans.filter((m) => m.date === dateStr);
  };

  const selectedDateMeals = getMealsForDay(selectedDate);
  const selectedDateStr = selectedDate.toISOString().split('T')[0];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <View style={styles.container}>
      {/* Week Strip */}
      <View style={styles.weekStrip}>
        {weekDays.map((day) => {
          const meals = getMealsForDay(day);
          const isSelected = day.toDateString() === selectedDate.toDateString();
          const isToday = day.toDateString() === today.toDateString();
          const hasMeals = meals.length > 0;
          const hasPlanned = meals.some((m) => !m.is_completed);
          const hasCompleted = meals.some((m) => m.is_completed);

          return (
            <TouchableOpacity
              key={day.toISOString()}
              style={[
                styles.dayCell,
                isSelected && styles.dayCellSelected,
                isToday && !isSelected && styles.dayCellToday,
              ]}
              onPress={() => onSelectDate(day)}
              accessibilityLabel={`${WEEKDAYS_SHORT[day.getDay()]} ${day.getDate()}${isToday ? ', today' : ''}${hasMeals ? ', has meals' : ''}`}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.dayName,
                  isSelected && styles.dayNameSelected,
                  isToday && !isSelected && styles.dayNameToday,
                ]}
              >
                {WEEKDAYS_SHORT[day.getDay()]}
              </Text>
              <Text
                style={[
                  styles.dayNumber,
                  isSelected && styles.dayNumberSelected,
                  isToday && !isSelected && styles.dayNumberToday,
                ]}
              >
                {day.getDate()}
              </Text>
              {hasMeals && (
                <View style={styles.mealIndicators}>
                  {hasPlanned && <View style={styles.mealDotPlanned} />}
                  {hasCompleted && <View style={styles.mealDotCompleted} />}
                </View>
              )}
              {!hasMeals && <View style={styles.mealIndicatorPlaceholder} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected Day Title */}
      <View style={styles.selectedDayHeader}>
        <Text style={styles.selectedDayTitle}>
          {selectedDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </View>

      {/* Meal Slots for Selected Day */}
      <View style={styles.mealSlotsContainer}>
        {MEAL_TYPES.map((mealType) => {
          const meal = selectedDateMeals.find((m) => m.meal_type === mealType);
          const iconName = MEAL_TYPE_ICONS[mealType];

          return (
            <View key={mealType} style={styles.mealSlot}>
              <View style={styles.mealTypeHeader}>
                <Ionicons name={iconName as keyof typeof Ionicons.glyphMap} size={18} color={colors.brownMuted} />
                <Text style={styles.mealTypeLabel}>
                  {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                </Text>
              </View>
              {meal ? (
                <TouchableOpacity
                  style={[styles.mealCard, meal.is_completed && styles.mealCardCompleted]}
                  onPress={() => onMealPress(meal)}
                  accessibilityLabel={`${meal.recipe_name}${meal.is_completed ? ', completed' : ''}`}
                  accessibilityRole="button"
                >
                  <View style={styles.mealCardContent}>
                    <Text
                      style={[
                        styles.mealName,
                        meal.is_completed && styles.mealNameCompleted,
                      ]}
                      numberOfLines={1}
                    >
                      {meal.recipe_name}
                    </Text>
                    {meal.servings > 1 && (
                      <Text style={styles.servingsText}>{meal.servings} servings</Text>
                    )}
                  </View>
                  {meal.is_completed ? (
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color={colors.brownMuted} />
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.addMealButton}
                  onPress={() => onAddMeal(selectedDateStr, mealType)}
                  accessibilityLabel={`Add ${mealType}`}
                  accessibilityRole="button"
                >
                  <Ionicons name="add" size={20} color={colors.primary} />
                  <Text style={styles.addMealText}>Add {mealType}</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.space4,
    marginTop: spacing.space3,
    borderWidth: 2,
    borderColor: colors.brown,
    ...shadows.sm,
  },
  weekStrip: {
    flexDirection: 'row',
    paddingVertical: spacing.space3,
    paddingHorizontal: spacing.space2,
    borderBottomWidth: 2,
    borderBottomColor: colors.brown,
    backgroundColor: colors.cream,
    borderTopLeftRadius: borderRadius.lg - 2,
    borderTopRightRadius: borderRadius.lg - 2,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.space2,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.space1,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  dayCellToday: {
    backgroundColor: colors.peachLight,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  dayName: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textXs,
    fontWeight: typography.fontMedium,
    color: colors.brownMuted,
    marginBottom: spacing.space1,
  },
  dayNameSelected: {
    color: colors.brown,
    fontWeight: typography.fontSemibold,
  },
  dayNameToday: {
    color: colors.brown,
  },
  dayNumber: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.textBase,
    fontWeight: typography.fontBold,
    color: colors.brown,
  },
  dayNumberSelected: {
    color: colors.brown,
  },
  dayNumberToday: {
    color: colors.brown,
  },
  mealIndicators: {
    flexDirection: 'row',
    gap: spacing.space1,
    marginTop: spacing.space1,
    minHeight: 8,
  },
  mealIndicatorPlaceholder: {
    minHeight: 8,
    marginTop: spacing.space1,
  },
  mealDotPlanned: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.warning,
  },
  mealDotCompleted: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  selectedDayHeader: {
    paddingHorizontal: spacing.space4,
    paddingTop: spacing.space4,
    paddingBottom: spacing.space2,
  },
  selectedDayTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.textLg,
    fontWeight: typography.fontBold,
    color: colors.brown,
  },
  mealSlotsContainer: {
    paddingHorizontal: spacing.space4,
    paddingBottom: spacing.space4,
  },
  mealSlot: {
    marginBottom: spacing.space4,
  },
  mealTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
    marginBottom: spacing.space2,
  },
  mealTypeLabel: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    fontWeight: typography.fontMedium,
    color: colors.brownMuted,
  },
  mealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.space3,
    backgroundColor: colors.cream,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  mealCardCompleted: {
    backgroundColor: colors.successBg,
    borderColor: colors.success,
  },
  mealCardContent: {
    flex: 1,
    marginRight: spacing.space2,
  },
  mealName: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  mealNameCompleted: {
    color: colors.success,
  },
  servingsText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textXs,
    color: colors.brownMuted,
    marginTop: spacing.space1,
  },
  addMealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
    padding: spacing.space3,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
  },
  addMealText: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    fontWeight: typography.fontMedium,
    color: colors.primary,
  },
});
