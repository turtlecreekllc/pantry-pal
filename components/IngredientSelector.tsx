import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PantryItem, Unit } from '../lib/types';

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

export function IngredientSelector({
  pantryItems,
  selectedIds,
  onToggle,
  onSelectAll,
  onClearAll,
}: IngredientSelectorProps) {
  const hasSelection = selectedIds.size > 0;
  const allSelected = selectedIds.size === pantryItems.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Select Ingredients</Text>
        <View style={styles.headerActions}>
          {hasSelection && onClearAll && (
            <TouchableOpacity onPress={onClearAll} style={styles.headerButton}>
              <Text style={styles.headerButtonText}>Clear</Text>
            </TouchableOpacity>
          )}
          {!allSelected && onSelectAll && (
            <TouchableOpacity onPress={onSelectAll} style={styles.headerButton}>
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
            >
              <View style={styles.chipContent}>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={16} color="#fff" style={styles.checkIcon} />
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
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  headerButtonText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  chip: {
    backgroundColor: '#f5f5f5',
    borderRadius: 22,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minWidth: 100,
    maxWidth: 180,
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  checkIcon: {
    marginRight: 2,
  },
  chipName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  chipQuantity: {
    fontSize: 12,
    color: '#666',
  },
  chipTextSelected: {
    color: '#fff',
  },
  selectionCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
});
