import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PantryItem, RecipeIngredient, IngredientDeduction, ExtendedRecipe } from '../lib/types';
import { Button } from './ui/Button';

interface MealIngredientMatcherProps {
  visible: boolean;
  recipe: ExtendedRecipe | null;
  pantryItems: PantryItem[];
  servings: number;
  onConfirm: (deductions: IngredientDeduction[]) => void;
  onCancel: () => void;
  onAddToGrocery?: (ingredient: string, amount: string) => void;
}

interface MatchedIngredient {
  recipeIngredient: RecipeIngredient;
  pantryItem: PantryItem | null;
  parsedAmount: number;
  adjustedAmount: number;
  confirmed: boolean;
  needsGrocery: boolean;
}

// Parse amount from measure string like "2 cups", "1/2 tsp", "1 kg"
function parseAmount(measure: string): number {
  if (!measure) return 1;

  const cleaned = measure.trim().toLowerCase();

  // Handle fractions
  const fractionMatch = cleaned.match(/^(\d+)?\s*(\d+)\/(\d+)/);
  if (fractionMatch) {
    const whole = fractionMatch[1] ? parseInt(fractionMatch[1]) : 0;
    const numerator = parseInt(fractionMatch[2]);
    const denominator = parseInt(fractionMatch[3]);
    return whole + numerator / denominator;
  }

  // Handle decimal numbers
  const decimalMatch = cleaned.match(/^(\d+(?:\.\d+)?)/);
  if (decimalMatch) {
    return parseFloat(decimalMatch[1]);
  }

  return 1;
}

// Normalize ingredient name for matching
function normalizeIngredient(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

// Check if two ingredients match
function ingredientMatches(recipeIngredient: string, pantryItem: string): boolean {
  const normalized1 = normalizeIngredient(recipeIngredient);
  const normalized2 = normalizeIngredient(pantryItem);

  if (normalized1 === normalized2) return true;
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) return true;

  const words1 = normalized1.split(/\s+/).filter((w) => w.length >= 3);
  const words2 = normalized2.split(/\s+/).filter((w) => w.length >= 3);

  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1.includes(word2) || word2.includes(word1)) {
        return true;
      }
    }
  }

  return false;
}

export function MealIngredientMatcher({
  visible,
  recipe,
  pantryItems,
  servings,
  onConfirm,
  onCancel,
  onAddToGrocery,
}: MealIngredientMatcherProps) {
  const [matches, setMatches] = useState<MatchedIngredient[]>([]);

  // Match recipe ingredients to pantry items
  useEffect(() => {
    if (!recipe) {
      setMatches([]);
      return;
    }

    const baseServings = recipe.servings || 1;
    const servingsMultiplier = servings / baseServings;

    const newMatches: MatchedIngredient[] = recipe.ingredients.map((ing) => {
      const parsedAmount = parseAmount(ing.measure);
      const adjustedAmount = parsedAmount * servingsMultiplier;

      // Find matching pantry item
      const matchingPantryItem = pantryItems.find((item) =>
        ingredientMatches(ing.ingredient, item.name)
      );

      const needsGrocery = matchingPantryItem
        ? matchingPantryItem.quantity < adjustedAmount
        : true;

      return {
        recipeIngredient: ing,
        pantryItem: matchingPantryItem || null,
        parsedAmount,
        adjustedAmount: Math.round(adjustedAmount * 100) / 100,
        confirmed: matchingPantryItem !== null && !needsGrocery,
        needsGrocery,
      };
    });

    setMatches(newMatches);
  }, [recipe, pantryItems, servings]);

  const handleToggleConfirm = (index: number) => {
    setMatches((prev) =>
      prev.map((m, i) =>
        i === index ? { ...m, confirmed: !m.confirmed } : m
      )
    );
  };

  const handleAdjustAmount = (index: number, newAmount: number) => {
    setMatches((prev) =>
      prev.map((m, i) =>
        i === index ? { ...m, adjustedAmount: newAmount } : m
      )
    );
  };

  const handleConfirm = () => {
    const deductions: IngredientDeduction[] = matches
      .filter((m) => m.pantryItem && m.confirmed)
      .map((m) => ({
        pantry_item_id: m.pantryItem!.id,
        pantry_item_name: m.pantryItem!.name,
        amount_to_deduct: m.adjustedAmount,
        unit: m.pantryItem!.unit,
        confirmed: m.confirmed,
      }));

    onConfirm(deductions);
  };

  const handleAddToGrocery = (match: MatchedIngredient) => {
    if (onAddToGrocery) {
      const neededAmount = match.pantryItem
        ? match.adjustedAmount - match.pantryItem.quantity
        : match.adjustedAmount;
      onAddToGrocery(
        match.recipeIngredient.ingredient,
        `${neededAmount} ${match.recipeIngredient.measure.replace(/[\d./\s]+/, '').trim() || 'unit'}`
      );
    }
  };

  const matchedCount = matches.filter((m) => m.pantryItem).length;
  const confirmedCount = matches.filter((m) => m.confirmed).length;
  const groceryNeededCount = matches.filter((m) => m.needsGrocery).length;

  if (!recipe) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Confirm Ingredients</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.summary}>
          <Text style={styles.recipeName}>{recipe.name}</Text>
          <Text style={styles.summaryText}>
            {matchedCount} of {matches.length} ingredients matched
          </Text>
          {groceryNeededCount > 0 && (
            <Text style={styles.groceryWarning}>
              {groceryNeededCount} item{groceryNeededCount !== 1 ? 's' : ''} may need to be purchased
            </Text>
          )}
        </View>

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {matches.map((match, index) => (
            <View key={index} style={styles.ingredientRow}>
              <TouchableOpacity
                style={[
                  styles.checkbox,
                  match.confirmed && styles.checkboxChecked,
                  !match.pantryItem && styles.checkboxDisabled,
                ]}
                onPress={() => match.pantryItem && handleToggleConfirm(index)}
                disabled={!match.pantryItem}
              >
                {match.confirmed && (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
              </TouchableOpacity>

              <View style={styles.ingredientInfo}>
                <Text style={styles.ingredientName}>
                  {match.recipeIngredient.ingredient}
                </Text>
                <Text style={styles.ingredientMeasure}>
                  {match.adjustedAmount.toFixed(match.adjustedAmount % 1 === 0 ? 0 : 1)}{' '}
                  {match.recipeIngredient.measure.replace(/[\d./\s]+/, '').trim() || 'unit'}
                </Text>
                {match.pantryItem ? (
                  <Text style={styles.pantryMatch}>
                    Have: {match.pantryItem.quantity} {match.pantryItem.unit}
                    {match.needsGrocery && (
                      <Text style={styles.needMore}> (need more)</Text>
                    )}
                  </Text>
                ) : (
                  <Text style={styles.noMatch}>Not in pantry</Text>
                )}
              </View>

              {match.needsGrocery && onAddToGrocery && (
                <TouchableOpacity
                  style={styles.groceryButton}
                  onPress={() => handleAddToGrocery(match)}
                >
                  <Ionicons name="cart-outline" size={20} color="#4CAF50" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {confirmedCount} item{confirmedCount !== 1 ? 's' : ''} will be deducted from pantry
          </Text>
          <View style={styles.footerButtons}>
            <Button
              title="Skip Deductions"
              variant="secondary"
              onPress={() => onConfirm([])}
              style={styles.skipButton}
            />
            <Button
              title="Confirm"
              onPress={handleConfirm}
              style={styles.confirmButton}
            />
          </View>
        </View>
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  summary: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  recipeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
  },
  groceryWarning: {
    fontSize: 13,
    color: '#FFC107',
    marginTop: 4,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#4CAF50',
  },
  checkboxDisabled: {
    borderColor: '#ccc',
    backgroundColor: '#f5f5f5',
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  ingredientMeasure: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  pantryMatch: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 2,
  },
  needMore: {
    color: '#FFC107',
  },
  noMatch: {
    fontSize: 12,
    color: '#f44336',
    marginTop: 2,
  },
  groceryButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  footerText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    flex: 1,
  },
  confirmButton: {
    flex: 1,
  },
});
