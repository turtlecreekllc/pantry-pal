import React from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../lib/theme';
import { styles } from '../styles';
import { HOUSEHOLD_OPTIONS, DIETARY_OPTIONS } from '../constants';
import type { HouseholdSize, DietaryNeed } from '../types';

interface PersonalizeStepProps {
  fadeAnim: Animated.Value;
  householdSize: HouseholdSize | null;
  dietaryNeeds: Set<DietaryNeed>;
  onSelectHouseholdSize: (size: HouseholdSize) => void;
  onToggleDietaryNeed: (need: DietaryNeed) => void;
  onContinue: () => void;
}

export function PersonalizeStep({
  fadeAnim,
  householdSize,
  dietaryNeeds,
  onSelectHouseholdSize,
  onToggleDietaryNeed,
  onContinue,
}: PersonalizeStepProps): React.ReactElement {
  return (
    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
      <Text style={styles.questionText}>Quick question—who am I cooking for?</Text>

      <View style={styles.householdGrid}>
        {HOUSEHOLD_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.householdOption,
              householdSize === option.id && styles.householdOptionSelected,
            ]}
            onPress={() => onSelectHouseholdSize(option.id)}
          >
            <Text style={styles.householdEmoji}>{option.emoji}</Text>
            <Text style={[
              styles.householdLabel,
              householdSize === option.id && styles.householdLabelSelected,
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.questionText}>Any dietary needs?</Text>

      <View style={styles.dietaryGrid}>
        {DIETARY_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.dietaryChip,
              dietaryNeeds.has(option.id) && styles.dietaryChipSelected,
            ]}
            onPress={() => onToggleDietaryNeed(option.id)}
          >
            <Text style={[
              styles.dietaryChipText,
              dietaryNeeds.has(option.id) && styles.dietaryChipTextSelected,
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.primaryButton} onPress={onContinue}>
          <Text style={styles.primaryButtonText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.brown} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipLink} onPress={onContinue}>
          <Text style={styles.skipLinkText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
