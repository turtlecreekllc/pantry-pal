import React from 'react';
import { View, Text, TouchableOpacity, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../lib/theme';
import { styles } from '../styles';

const MascotImage = require('../../../assets/icon.png');

interface WelcomeStepProps {
  fadeAnim: Animated.Value;
  onContinue: () => void;
}

export function WelcomeStep({ fadeAnim, onContinue }: WelcomeStepProps): React.ReactElement {
  return (
    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
      <View style={styles.welcomeContent}>
        <View style={styles.mascotContainer}>
          <Image source={MascotImage} style={styles.mascotImage} resizeMode="contain" />
        </View>

        <Text style={styles.welcomeTitle}>Hi! I'm your Chef! 👋</Text>
        <Text style={styles.welcomeSubtitle}>
          I'm here to end the "what's for dinner?" question forever.
        </Text>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={onContinue}>
        <Text style={styles.primaryButtonText}>Let's Go!</Text>
        <Ionicons name="arrow-forward" size={20} color={colors.brown} />
      </TouchableOpacity>
    </Animated.View>
  );
}
