import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MealPlan, MEAL_TYPES, MealType } from '../lib/types';

interface MealCalendarProps {
  mealPlans: MealPlan[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onAddMeal: (date: string, mealType: MealType) => void;
  onMealPress: (meal: MealPlan) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MEAL_TYPE_ICONS: Record<MealType, string> = {
  breakfast: 'sunny-outline',
  lunch: 'restaurant-outline',
  dinner: 'moon-outline',
  snack: 'cafe-outline',
};

export function MealCalendar({
  mealPlans,
  selectedDate,
  onSelectDate,
  onAddMeal,
  onMealPress,
}: MealCalendarProps) {
  const [viewMonth, setViewMonth] = useState(new Date(selectedDate));

  const calendarDays = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Padding for days before month starts
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }

    // All days of the month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }

    return days;
  }, [viewMonth]);

  const getMealsForDay = (date: Date): MealPlan[] => {
    const dateStr = date.toISOString().split('T')[0];
    return mealPlans.filter((m) => m.date === dateStr);
  };

  const goToPrevMonth = () => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1));
  };

  const goToToday = () => {
    const today = new Date();
    setViewMonth(today);
    onSelectDate(today);
  };

  const selectedDateMeals = getMealsForDay(selectedDate);
  const selectedDateStr = selectedDate.toISOString().split('T')[0];

  return (
    <View style={styles.container}>
      {/* Month Navigation */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton}>
          <Ionicons name="chevron-back" size={24} color="#4CAF50" />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={24} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      {/* Today Button */}
      <TouchableOpacity style={styles.todayButton} onPress={goToToday}>
        <Ionicons name="today-outline" size={16} color="#4CAF50" />
        <Text style={styles.todayButtonText}>Today</Text>
      </TouchableOpacity>

      {/* Weekday Headers */}
      <View style={styles.weekHeader}>
        {WEEKDAYS.map((day) => (
          <Text key={day} style={styles.weekDay}>
            {day}
          </Text>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.grid}>
        {calendarDays.map((date, index) => {
          if (!date) {
            return <View key={`empty-${index}`} style={styles.dayCellWrapper} />;
          }

          const meals = getMealsForDay(date);
          const isSelected = date.toDateString() === selectedDate.toDateString();
          const isToday = date.toDateString() === new Date().toDateString();
          const hasMeals = meals.length > 0;
          const hasCompleted = meals.some((m) => m.is_completed);
          const hasPlanned = meals.some((m) => !m.is_completed);

          return (
            <View key={date.toISOString()} style={styles.dayCellWrapper}>
              <TouchableOpacity
                style={[
                  styles.dayCell,
                  isSelected && styles.selectedDay,
                  isToday && !isSelected && styles.today,
                ]}
                onPress={() => onSelectDate(date)}
              >
                <Text
                  style={[
                    styles.dayNumber,
                    isSelected && styles.selectedDayText,
                    isToday && !isSelected && styles.todayText,
                  ]}
                >
                  {date.getDate()}
                </Text>
                {hasMeals && (
                  <View style={styles.mealIndicators}>
                    {hasPlanned && <View style={styles.mealDotPlanned} />}
                    {hasCompleted && <View style={styles.mealDotCompleted} />}
                  </View>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* Selected Day Detail */}
      <ScrollView style={styles.dayDetail}>
        <Text style={styles.dayDetailTitle}>
          {selectedDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </Text>

        {MEAL_TYPES.map((mealType) => {
          const meal = selectedDateMeals.find((m) => m.meal_type === mealType);
          const iconName = MEAL_TYPE_ICONS[mealType];

          return (
            <View key={mealType} style={styles.mealSlot}>
              <View style={styles.mealTypeHeader}>
                <Ionicons name={iconName as any} size={18} color="#666" />
                <Text style={styles.mealTypeLabel}>
                  {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                </Text>
              </View>
              {meal ? (
                <TouchableOpacity
                  style={[styles.mealCard, meal.is_completed && styles.mealCardCompleted]}
                  onPress={() => onMealPress(meal)}
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
                    <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color="#999" />
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.addMealButton}
                  onPress={() => onAddMeal(selectedDateStr, mealType)}
                >
                  <Ionicons name="add" size={20} color="#4CAF50" />
                  <Text style={styles.addMealText}>Add {mealType}</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  navButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e8f5e9',
    borderRadius: 16,
    marginBottom: 8,
  },
  todayButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
  },
  weekHeader: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
    paddingVertical: 8,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  dayCellWrapper: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCell: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  selectedDay: {
    backgroundColor: '#4CAF50',
  },
  today: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  dayNumber: {
    fontSize: 14,
    color: '#333',
  },
  selectedDayText: {
    color: '#fff',
    fontWeight: '600',
  },
  todayText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  mealIndicators: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  mealDotPlanned: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFC107',
  },
  mealDotCompleted: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
  },
  dayDetail: {
    flex: 1,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  dayDetailTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  mealSlot: {
    marginBottom: 16,
  },
  mealTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  mealTypeLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  mealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  mealCardCompleted: {
    backgroundColor: '#e8f5e9',
  },
  mealCardContent: {
    flex: 1,
    marginRight: 8,
  },
  mealName: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  mealNameCompleted: {
    color: '#4CAF50',
  },
  servingsText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  addMealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  addMealText: {
    color: '#4CAF50',
    fontSize: 14,
  },
});
