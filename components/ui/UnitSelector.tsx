import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Unit, UNITS } from '../../lib/types';

interface UnitSelectorProps {
  value: Unit;
  onChange: (unit: Unit) => void;
}

const UNIT_LABELS: Record<Unit, string> = {
  item: 'Items',
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

const UNIT_CATEGORIES = {
  count: ['item'] as Unit[],
  weight: ['oz', 'lb', 'g', 'kg'] as Unit[],
  volume: ['ml', 'l', 'cup', 'tbsp', 'tsp'] as Unit[],
};

export function UnitSelector({ value, onChange }: UnitSelectorProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {UNITS.map((unit) => (
          <TouchableOpacity
            key={unit}
            style={[
              styles.unitButton,
              value === unit && styles.unitButtonActive,
            ]}
            onPress={() => onChange(unit)}
          >
            <Text
              style={[
                styles.unitText,
                value === unit && styles.unitTextActive,
              ]}
            >
              {UNIT_LABELS[unit]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  scrollContent: {
    paddingHorizontal: 4,
    gap: 8,
  },
  unitButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  unitButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  unitText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  unitTextActive: {
    color: '#fff',
  },
});
