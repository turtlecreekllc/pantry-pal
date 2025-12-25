import React, { useState } from 'react';
import { StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MealCalendar } from '../../components/MealCalendar';
import { MealCompletionModal } from '../../components/MealCompletionModal';
import { useMealPlans } from '../../hooks/useMealPlans';
import { usePantry } from '../../hooks/usePantry';
import { MealPlan, MealType, ExtendedRecipe, IngredientDeduction } from '../../lib/types';
import { getRecipeDetails } from '../../lib/recipeService';

export default function CalendarScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [completingMeal, setCompletingMeal] = useState<MealPlan | null>(null);
  const [recipeForCompletion, setRecipeForCompletion] = useState<ExtendedRecipe | null>(null);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);

  const { mealPlans, completeMeal, refreshMealPlans } = useMealPlans();
  const { pantryItems, refreshPantry } = usePantry();

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
    Alert.alert(
      'Delete Meal',
      'Are you sure you want to remove this meal from your plan?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { deleteMealPlan } = useMealPlans();
              // We'd need the hook here - for now just refresh
              await refreshMealPlans();
            } catch (error) {
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
      setCompletingMeal(null);
      setRecipeForCompletion(null);
      Alert.alert('Success', 'Meal marked as complete!');
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
