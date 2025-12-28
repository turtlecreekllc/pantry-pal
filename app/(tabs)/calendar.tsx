import React, { useState } from 'react';
import { StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MealCalendar } from '../../components/MealCalendar';
import { MealCompletionModal } from '../../components/MealCompletionModal';
import { useMealPlans } from '../../hooks/useMealPlans';
import { usePantry } from '../../hooks/usePantry';
import { useCalendar } from '../../hooks/useCalendar';
import { useHealth } from '../../context/HealthContext';
import { useHouseholdContext } from '../../context/HouseholdContext';
import { saveNutritionToHealth } from '../../lib/healthService';
import { MealPlan, MealType, ExtendedRecipe, IngredientDeduction } from '../../lib/types';
import { getRecipeDetails } from '../../lib/recipeService';

export default function CalendarScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [completingMeal, setCompletingMeal] = useState<MealPlan | null>(null);
  const [recipeForCompletion, setRecipeForCompletion] = useState<ExtendedRecipe | null>(null);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);

  const { activeHousehold } = useHouseholdContext();
  const { mealPlans, completeMeal, deleteMealPlan, refreshMealPlans } = useMealPlans({
    householdId: activeHousehold?.id,
  });
  const { pantryItems, restoreItem, refreshPantry } = usePantry({
    householdId: activeHousehold?.id,
  });
  const { removeMealEvent } = useCalendar();
  const { isHealthSyncEnabled } = useHealth();

  const handleAddMeal = (date: string, mealType: MealType) => {
    router.push({
      pathname: '/meal/add',
      params: { date, mealType },
    });
  };

  const handleMealPress = async (meal: MealPlan) => {
    if (meal.is_completed) {
      // View completed meal details
      Alert.alert(
        'Meal Completed',
        `${meal.recipe_name} was completed on ${new Date(meal.completed_at!).toLocaleDateString()}.`,
        [
          { text: 'OK' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => handleDeleteMeal(meal),
          },
        ]
      );
    } else {
      // Start completion flow
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

  const handleDeleteMeal = async (meal: MealPlan) => {
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
              await deleteMealPlan(meal.id, {
                onRestore: restoreItem,
              });
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

  const handleCompleteMeal = async (deductions: IngredientDeduction[]) => {
    if (!completingMeal) return;

    try {
      await completeMeal(completingMeal.id, deductions);
      await refreshPantry();

      // Sync to Health if enabled
      let syncMessage = '';
      if (isHealthSyncEnabled && recipeForCompletion?.nutrition) {
        // Use the planned date but current time, or just current time?
        // Let's use current time as "consumed at"
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

  const handleCancelCompletion = () => {
    setCompletingMeal(null);
    setRecipeForCompletion(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <MealCalendar
        mealPlans={mealPlans}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onAddMeal={handleAddMeal}
        onMealPress={handleMealPress}
      />

      <MealCompletionModal
        visible={completingMeal !== null}
        mealPlan={completingMeal}
        recipe={recipeForCompletion}
        pantryItems={pantryItems}
        onComplete={handleCompleteMeal}
        onCancel={handleCancelCompletion}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});
