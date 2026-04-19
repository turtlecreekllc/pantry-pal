import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Unit } from '../../lib/types';
import { colors, typography, spacing, borderRadius, shadows } from '../../lib/theme';

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  unit?: Unit | string;
}

const UNIT_LABELS: Record<string, string> = {
  item: 'item',
  oz: 'oz',
  lb: 'lb',
  g: 'g',
  kg: 'kg',
  ml: 'ml',
  l: 'L',
  cup: 'cup',
  tbsp: 'tbsp',
  tsp: 'tsp',
};

const DECIMAL_UNITS = ['oz', 'lb', 'g', 'kg', 'ml', 'l', 'cup', 'tbsp', 'tsp'];

export function QuantitySelector({
  value,
  onChange,
  min = 0,
  max = 9999,
  unit = 'item',
}: QuantitySelectorProps): React.ReactElement {
  const [showInput, setShowInput] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());

  const supportsDecimals = DECIMAL_UNITS.includes(unit);
  const step = supportsDecimals ? 0.5 : 1;
  const effectiveMin = supportsDecimals ? 0.1 : 1;

  const handleDecrement = (): void => {
    const newValue = Math.max(effectiveMin, value - step);
    onChange(Number(newValue.toFixed(2)));
  };

  const handleIncrement = (): void => {
    const newValue = Math.min(max, value + step);
    onChange(Number(newValue.toFixed(2)));
  };

  const handleInputSubmit = (): void => {
    const sanitizedInput = inputValue.replace(',', '.');
    const parsed = parseFloat(sanitizedInput);
    if (!isNaN(parsed) && parsed > 0 && parsed <= max) {
      const finalValue = supportsDecimals
        ? Number(parsed.toFixed(2))
        : Math.max(1, Math.round(parsed));
      onChange(finalValue);
      setInputValue(finalValue.toString());
    } else {
      setInputValue(value.toString());
    }
    setShowInput(false);
  };

  const formatValue = (val: number): string => {
    if (Number.isInteger(val)) {
      return val.toString();
    }
    return val.toFixed(2);
  };

  const getUnitLabel = (): string => {
    const label = UNIT_LABELS[unit] || unit;
    if (value !== 1 && (unit === 'item' || unit === 'cup')) {
      return label + 's';
    }
    return label;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, value <= effectiveMin && styles.buttonDisabled]}
        onPress={handleDecrement}
        disabled={value <= effectiveMin}
        accessibilityLabel="Decrease quantity"
        accessibilityRole="button"
      >
        <Ionicons
          name="remove"
          size={20}
          color={value <= effectiveMin ? colors.brownMuted : colors.brown}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.valueContainer}
        onPress={() => {
          setInputValue(value.toString());
          setShowInput(true);
        }}
        accessibilityLabel={`${formatValue(value)} ${getUnitLabel()}, tap to edit`}
        accessibilityRole="button"
      >
        <Text style={styles.value}>{formatValue(value)}</Text>
        <Text style={styles.unit}>{getUnitLabel()}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, value >= max && styles.buttonDisabled]}
        onPress={handleIncrement}
        disabled={value >= max}
        accessibilityLabel="Increase quantity"
        accessibilityRole="button"
      >
        <Ionicons
          name="add"
          size={20}
          color={value >= max ? colors.brownMuted : colors.brown}
        />
      </TouchableOpacity>

      <Modal
        visible={showInput}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInput(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowInput(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Quantity</Text>
            <TextInput
              style={styles.input}
              value={inputValue}
              onChangeText={(text) => {
                const filtered = text.replace(/[^0-9.,]/g, '');
                const parts = filtered.split(/[.,]/);
                if (parts.length > 2) {
                  setInputValue(parts[0] + '.' + parts.slice(1).join(''));
                } else {
                  setInputValue(filtered);
                }
              }}
              keyboardType="decimal-pad"
              autoFocus
              selectTextOnFocus
              onSubmitEditing={handleInputSubmit}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowInput(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleInputSubmit}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cream,
    borderRadius: borderRadius.md,
    padding: spacing.space1,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.brown,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  valueContainer: {
    paddingHorizontal: spacing.space4,
    alignItems: 'center',
    minWidth: 80,
  },
  value: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textLg,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  unit: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textXs,
    color: colors.brownMuted,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(61, 35, 20, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.brown,
    padding: spacing.space6,
    width: 280,
    alignItems: 'center',
    ...shadows.lg,
  },
  modalTitle: {
    fontFamily: 'Quicksand-SemiBold',
    fontSize: typography.textLg,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
    marginBottom: spacing.space4,
  },
  input: {
    width: '100%',
    height: 48,
    borderWidth: 2,
    borderColor: colors.brownMuted,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.space4,
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textLg,
    textAlign: 'center',
    marginBottom: spacing.space4,
    color: colors.brown,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.space3,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.space3,
    paddingHorizontal: spacing.space6,
    borderRadius: borderRadius.md,
    backgroundColor: colors.cream,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.brown,
  },
  modalButtonPrimary: {
    backgroundColor: colors.primary,
  },
  modalButtonText: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textBase,
    fontWeight: typography.fontMedium,
    color: colors.brownMuted,
  },
  modalButtonTextPrimary: {
    color: colors.brown,
    fontFamily: 'Nunito-SemiBold',
    fontWeight: typography.fontSemibold,
  },
});
