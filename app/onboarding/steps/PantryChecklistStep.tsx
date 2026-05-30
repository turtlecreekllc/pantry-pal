import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../lib/theme';
import { styles } from '../styles';
import { COMMON_INGREDIENTS } from '../constants';

interface PantryChecklistStepProps {
  fadeAnim: Animated.Value;
  selectedIngredients: Set<string>;
  onToggleIngredient: (ingredient: string) => void;
  onDone: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  proteins: '🥩 PROTEINS',
  produce: '🥬 PRODUCE',
  dairy: '🧀 DAIRY',
  pantry: '🥫 PANTRY STAPLES',
};

export function PantryChecklistStep({
  fadeAnim,
  selectedIngredients,
  onToggleIngredient,
  onDone,
}: PantryChecklistStepProps): React.ReactElement {
  return (
    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.checklistTitle}>
          Tap what you usually have on hand:
        </Text>

        {Object.entries(COMMON_INGREDIENTS).map(([category, items]) => (
          <View key={category} style={styles.ingredientCategory}>
            <Text style={styles.categoryTitle}>
              {CATEGORY_LABELS[category] ?? category.toUpperCase()}
            </Text>
            <View style={styles.ingredientGrid}>
              {items.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.ingredientChip,
                    selectedIngredients.has(item) && styles.ingredientChipSelected,
                  ]}
                  onPress={() => onToggleIngredient(item)}
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
          <TouchableOpacity style={styles.primaryButton} onPress={onDone}>
            <Text style={styles.primaryButtonText}>Done</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.brown} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Animated.View>
  );
}
