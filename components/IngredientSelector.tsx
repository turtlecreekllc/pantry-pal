import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PantryItem, Unit } from '../lib/types';
import { colors, typography, spacing, borderRadius } from '../lib/theme';

interface IngredientSelectorProps {
  pantryItems: PantryItem[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll?: () => void;
  onClearAll?: () => void;
}

const UNIT_LABELS: Record<Unit, string> = {
  item: '',
  oz: 'oz',
  lb: 'lb',
  g: 'g',
  kg: 'kg',
  ml: 'ml',
  l: 'L',
  cup: 'cups',
  tbsp: 'tbsp',
  tsp: 'tsp',
};

function formatQuantity(quantity: number, unit: Unit): string {
  const unitLabel = UNIT_LABELS[unit] || unit;
  if (Number.isInteger(quantity)) {
    return unit === 'item' ? `${quantity}` : `${quantity} ${unitLabel}`;
  }
  return unit === 'item' ? `${quantity.toFixed(1)}` : `${quantity.toFixed(1)} ${unitLabel}`;
}

/**
 * Brand-styled ingredient selector component
 * Displays pantry items as selectable chips
 */
export function IngredientSelector({
  pantryItems,
  selectedIds,
  onToggle,
  onSelectAll,
  onClearAll,
}: IngredientSelectorProps): React.ReactElement {
  const hasSelection = selectedIds.size > 0;
  const allSelected = selectedIds.size === pantryItems.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Select Ingredients</Text>
        <View style={styles.headerActions}>
          {hasSelection && onClearAll && (
            <TouchableOpacity
              onPress={onClearAll}
              style={styles.headerButton}
              accessibilityLabel="Clear all selections"
              accessibilityRole="button"
            >
              <Text style={styles.headerButtonText}>Clear</Text>
            </TouchableOpacity>
          )}
          {!allSelected && onSelectAll && (
            <TouchableOpacity
              onPress={onSelectAll}
              style={styles.headerButton}
              accessibilityLabel="Select all ingredients"
              accessibilityRole="button"
            >
              <Text style={styles.headerButtonText}>Select All</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {pantryItems.map((item) => {
          const isSelected = selectedIds.has(item.id);
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => onToggle(item.id)}
              accessibilityLabel={`${item.name}, ${isSelected ? 'selected' : 'not selected'}`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
            >
              <View style={styles.chipContent}>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={16} color={colors.brown} style={styles.checkIcon} />
                )}
                <Text style={[styles.chipName, isSelected && styles.chipTextSelected]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.chipQuantity, isSelected && styles.chipTextSelected]}>
                  {formatQuantity(item.quantity, item.unit as Unit)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {hasSelection && (
        <Text style={styles.selectionCount}>
          {selectedIds.size} ingredient{selectedIds.size !== 1 ? 's' : ''} selected
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    paddingVertical: spacing.space3,
    borderBottomWidth: 2,
    borderBottomColor: colors.brown,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.space4,
    marginBottom: spacing.space3,
  },
  headerTitle: {
    fontFamily: 'Quicksand-SemiBold',
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.space3,
  },
  headerButton: {
    minHeight: 44,
    paddingHorizontal: spacing.space3,
    paddingVertical: spacing.space3,
    justifyContent: 'center',
  },
  headerButtonText: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    color: colors.coral,
    fontWeight: typography.fontMedium,
  },
  scrollContent: {
    paddingHorizontal: spacing.space3,
    gap: spacing.space2,
  },
  chip: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    minHeight: 44,
    paddingVertical: spacing.space3,
    paddingHorizontal: spacing.space4,
    borderWidth: 2,
    borderColor: colors.brown,
    minWidth: 100,
    maxWidth: 180,
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: colors.primary,
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space1,
  },
  checkIcon: {
    marginRight: 2,
  },
  chipName: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    color: colors.brown,
    fontWeight: typography.fontMedium,
    flex: 1,
  },
  chipQuantity: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textXs,
    color: colors.brownMuted,
  },
  chipTextSelected: {
    color: colors.brown,
  },
  selectionCount: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textXs,
    color: colors.brownMuted,
    textAlign: 'center',
    marginTop: spacing.space2,
  },
});
