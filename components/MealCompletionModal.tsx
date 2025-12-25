import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MealPlan, PantryItem, ExtendedRecipe, IngredientDeduction } from '../lib/types';

interface MealCompletionModalProps {
  visible: boolean;
  mealPlan: MealPlan | null;
  recipe: ExtendedRecipe | null;
  pantryItems: PantryItem[];
  onComplete: (deductions: IngredientDeduction[]) => void;
  onCancel: () => void;
}

// Normalize ingredient name for matching
function normalizeIngredient(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

// Parse amount from measure string like "2 cups" or "1/2 tsp"
function parseAmount(measure: string): number {
  // Handle fractions
  const fractionMatch = measure.match(/(\d+)\/(\d+)/);
  if (fractionMatch) {
    return parseInt(fractionMatch[1], 10) / parseInt(fractionMatch[2], 10);
  }

  // Handle decimals and whole numbers
  const numberMatch = measure.match(/(\d+(?:\.\d+)?)/);
  if (numberMatch) {
    return parseFloat(numberMatch[1]);
  }

  return 1;
}

export function MealCompletionModal({
  visible,
  mealPlan,
  recipe,
  pantryItems,
  onComplete,
  onCancel,
}: MealCompletionModalProps) {
  const [deductions, setDeductions] = useState<IngredientDeduction[]>([]);

  // Match recipe ingredients to pantry items
  useEffect(() => {
    if (!recipe || !visible) return;

    const suggestedDeductions: IngredientDeduction[] = [];

    for (const ingredient of recipe.ingredients) {
      // Find matching pantry item
      const normalizedIngredient = normalizeIngredient(ingredient.ingredient);

      const matchedItem = pantryItems.find((item) => {
        const normalizedItem = normalizeIngredient(item.name);
        return (
          normalizedItem.includes(normalizedIngredient) ||
          normalizedIngredient.includes(normalizedItem)
        );
      });

      if (matchedItem) {
        const amount = parseAmount(ingredient.measure);

        suggestedDeductions.push({
          pantry_item_id: matchedItem.id,
          pantry_item_name: matchedItem.name,
          amount_to_deduct: Math.min(amount, matchedItem.quantity),
          unit: matchedItem.unit,
          confirmed: true,
        });
      }
    }

    setDeductions(suggestedDeductions);
  }, [recipe, pantryItems, visible]);

  const toggleDeduction = (index: number) => {
    setDeductions((prev) =>
      prev.map((d, i) => (i === index ? { ...d, confirmed: !d.confirmed } : d))
    );
  };

  const updateAmount = (index: number, delta: number) => {
    setDeductions((prev) =>
      prev.map((d, i) => {
        if (i !== index) return d;
        const newAmount = Math.max(0.1, d.amount_to_deduct + delta);
        return { ...d, amount_to_deduct: Number(newAmount.toFixed(2)) };
      })
    );
  };

  const handleComplete = () => {
    const confirmedCount = deductions.filter((d) => d.confirmed).length;
    if (confirmedCount === 0) {
      Alert.alert(
        'Complete Without Deductions?',
        'No ingredients will be deducted from your pantry. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Complete', onPress: () => onComplete(deductions) },
        ]
      );
    } else {
      onComplete(deductions);
    }
  };

  if (!mealPlan) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.headerButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Complete Meal</Text>
          <TouchableOpacity onPress={handleComplete} style={styles.headerButton}>
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mealInfo}>
          <Text style={styles.mealName}>{mealPlan.recipe_name}</Text>
          <Text style={styles.subtitle}>
            Adjust the ingredients to deduct from your pantry:
          </Text>
        </View>

        <ScrollView style={styles.list}>
          {deductions.length > 0 ? (
            deductions.map((deduction, index) => (
              <View key={index} style={styles.deductionRow}>
                <TouchableOpacity
                  onPress={() => toggleDeduction(index)}
                  style={styles.checkbox}
                >
                  <Ionicons
                    name={deduction.confirmed ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={deduction.confirmed ? '#4CAF50' : '#999'}
                  />
                </TouchableOpacity>

                <View style={styles.deductionInfo}>
                  <Text
                    style={[
                      styles.ingredientName,
                      !deduction.confirmed && styles.ingredientNameDisabled,
                    ]}
                  >
                    {deduction.pantry_item_name}
                  </Text>
                  <View style={styles.amountRow}>
                    <TouchableOpacity
                      onPress={() => updateAmount(index, -0.5)}
                      disabled={!deduction.confirmed || deduction.amount_to_deduct <= 0.1}
                      style={styles.amountButton}
                    >
                      <Ionicons
                        name="remove-circle"
                        size={28}
                        color={
                          deduction.confirmed && deduction.amount_to_deduct > 0.1
                            ? '#666'
                            : '#ccc'
                        }
                      />
                    </TouchableOpacity>
                    <Text
                      style={[
                        styles.amountText,
                        !deduction.confirmed && styles.amountTextDisabled,
                      ]}
                    >
                      {deduction.amount_to_deduct} {deduction.unit}
                    </Text>
                    <TouchableOpacity
                      onPress={() => updateAmount(index, 0.5)}
                      disabled={!deduction.confirmed}
                      style={styles.amountButton}
                    >
                      <Ionicons
                        name="add-circle"
                        size={28}
                        color={deduction.confirmed ? '#666' : '#ccc'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="basket-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>
                No matching pantry items found for this recipe.
              </Text>
              <Text style={styles.emptySubtext}>
                The meal will be marked as complete without deducting any items.
              </Text>
            </View>
          )}
        </ScrollView>

        {deductions.length > 0 && (
          <View style={styles.summary}>
            <Text style={styles.summaryText}>
              {deductions.filter((d) => d.confirmed).length} of {deductions.length} items
              will be deducted
            </Text>
          </View>
        )}
      </View>
    </Modal>
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerButton: {
    minWidth: 60,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
  },
  doneText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
    textAlign: 'right',
  },
  mealInfo: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  mealName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  list: {
    flex: 1,
  },
  deductionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  checkbox: {
    marginRight: 12,
    padding: 4,
  },
  deductionInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  ingredientNameDisabled: {
    color: '#999',
    textDecorationLine: 'line-through',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  amountButton: {
    padding: 4,
  },
  amountText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '500',
    minWidth: 80,
    textAlign: 'center',
  },
  amountTextDisabled: {
    color: '#999',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  summary: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f5f5f5',
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
