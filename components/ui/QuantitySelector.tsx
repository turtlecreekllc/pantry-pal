import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Unit } from '../../lib/types';

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

// Units that support decimal values
const DECIMAL_UNITS = ['oz', 'lb', 'g', 'kg', 'ml', 'l', 'cup', 'tbsp', 'tsp'];

export function QuantitySelector({
  value,
  onChange,
  min = 0,
  max = 9999,
  unit = 'item',
}: QuantitySelectorProps) {
  const [showInput, setShowInput] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());

  const supportsDecimals = DECIMAL_UNITS.includes(unit);
  const step = supportsDecimals ? 0.5 : 1;
  const effectiveMin = supportsDecimals ? 0.1 : 1;

  const handleDecrement = () => {
    const newValue = Math.max(effectiveMin, value - step);
    onChange(Number(newValue.toFixed(2)));
  };

  const handleIncrement = () => {
    const newValue = Math.min(max, value + step);
    onChange(Number(newValue.toFixed(2)));
  };

  const handleInputSubmit = () => {
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed) && parsed >= effectiveMin && parsed <= max) {
      onChange(Number(parsed.toFixed(2)));
    } else {
      setInputValue(value.toString());
    }
    setShowInput(false);
  };

  const formatValue = (val: number) => {
    if (Number.isInteger(val)) {
      return val.toString();
    }
    return val.toFixed(1);
  };

  const getUnitLabel = () => {
    const label = UNIT_LABELS[unit] || unit;
    // Add plural 's' for items and cups when value > 1
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
      >
        <Ionicons
          name="remove"
          size={20}
          color={value <= effectiveMin ? '#ccc' : '#4CAF50'}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.valueContainer}
        onPress={() => {
          setInputValue(value.toString());
          setShowInput(true);
        }}
      >
        <Text style={styles.value}>{formatValue(value)}</Text>
        <Text style={styles.unit}>{getUnitLabel()}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, value >= max && styles.buttonDisabled]}
        onPress={handleIncrement}
        disabled={value >= max}
      >
        <Ionicons
          name="add"
          size={20}
          color={value >= max ? '#ccc' : '#4CAF50'}
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
              onChangeText={setInputValue}
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
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 4,
  },
  button: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 6,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  valueContainer: {
    paddingHorizontal: 16,
    alignItems: 'center',
    minWidth: 80,
  },
  value: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  unit: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: 280,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  input: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#4CAF50',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  modalButtonTextPrimary: {
    color: '#fff',
  },
});
