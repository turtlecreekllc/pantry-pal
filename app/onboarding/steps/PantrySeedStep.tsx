import React from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../lib/theme';
import { styles } from '../styles';
import type { PantrySeedOption } from '../types';

interface PantrySeedStepProps {
  fadeAnim: Animated.Value;
  onSelectOption: (option: PantrySeedOption) => void;
}

export function PantrySeedStep({ fadeAnim, onSelectOption }: PantrySeedStepProps): React.ReactElement {
  return (
    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
      <Text style={styles.seedTitle}>
        Awesome! Pick the fastest way to tell me what's in your kitchen:
      </Text>

      <TouchableOpacity
        style={styles.seedOption}
        onPress={() => onSelectOption('photo')}
      >
        <View style={styles.seedOptionIcon}>
          <Ionicons name="camera" size={28} color={colors.coral} />
        </View>
        <View style={styles.seedOptionContent}>
          <Text style={styles.seedOptionTitle}>📸 SNAP YOUR FRIDGE</Text>
          <Text style={styles.seedOptionSubtitle}>
            Take a quick photo—I'll identify what I see
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.brownMuted} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.seedOption}
        onPress={() => onSelectOption('voice')}
      >
        <View style={styles.seedOptionIcon}>
          <Ionicons name="mic" size={28} color={colors.coral} />
        </View>
        <View style={styles.seedOptionContent}>
          <Text style={styles.seedOptionTitle}>🎤 TELL ME OUT LOUD</Text>
          <Text style={styles.seedOptionSubtitle}>
            "I have chicken, rice, broccoli, and cheese"
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.brownMuted} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.seedOption}
        onPress={() => onSelectOption('checklist')}
      >
        <View style={styles.seedOptionIcon}>
          <Ionicons name="list" size={28} color={colors.coral} />
        </View>
        <View style={styles.seedOptionContent}>
          <Text style={styles.seedOptionTitle}>📋 PICK FROM COMMON ITEMS</Text>
          <Text style={styles.seedOptionSubtitle}>
            Quick checklist of typical ingredients
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.brownMuted} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipLink} onPress={() => onSelectOption('skip')}>
        <Text style={styles.skipLinkText}>Skip for now</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
