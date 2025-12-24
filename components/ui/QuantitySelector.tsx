import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  unit?: string;
}

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 999,
  unit = 'item',
}: QuantitySelectorProps) {
  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, value <= min && styles.buttonDisabled]}
        onPress={handleDecrement}
        disabled={value <= min}
      >
        <Ionicons
          name="remove"
          size={20}
          color={value <= min ? '#ccc' : '#4CAF50'}
        />
      </TouchableOpacity>
      <View style={styles.valueContainer}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.unit}>{unit}{value !== 1 && unit !== 'oz' && unit !== 'ml' ? 's' : ''}</Text>
      </View>
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
});
