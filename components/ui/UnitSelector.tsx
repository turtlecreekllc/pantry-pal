import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Unit, UNITS } from '../../lib/types';
import { colors, typography, spacing, borderRadius } from '../../lib/theme';

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

export function UnitSelector({ value, onChange }: UnitSelectorProps): React.ReactElement {
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
            accessibilityLabel={`Select ${UNIT_LABELS[unit]} as unit`}
            accessibilityRole="button"
            accessibilityState={{ selected: value === unit }}
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
    marginBottom: spacing.space4,
  },
  scrollContent: {
    paddingHorizontal: spacing.space1,
    gap: spacing.space2,
  },
  unitButton: {
    minHeight: 44,
    paddingVertical: spacing.space3,
    paddingHorizontal: spacing.space5,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.brown,
    justifyContent: 'center',
  },
  unitButtonActive: {
    backgroundColor: colors.primary,
  },
  unitText: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    color: colors.brown,
    fontWeight: typography.fontMedium,
  },
  unitTextActive: {
    fontFamily: 'Nunito-SemiBold',
    fontWeight: typography.fontSemibold,
  },
});
