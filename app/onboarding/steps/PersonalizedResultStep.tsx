import React from 'react';
import { View, Text, TouchableOpacity, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../lib/theme';
import { styles } from '../styles';
import type { RecipePreview } from '../../../lib/types';

interface PersonalizedResultStepProps {
  fadeAnim: Animated.Value;
  loading: boolean;
  personalizedRecipe: RecipePreview | null;
  selectedIngredientCount: number;
  onLetsMake: () => void;
  onEnterApp: () => void;
}

export function PersonalizedResultStep({
  fadeAnim,
  loading,
  personalizedRecipe,
  selectedIngredientCount,
  onLetsMake,
  onEnterApp,
}: PersonalizedResultStepProps): React.ReactElement {
  return (
    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
      <View style={styles.resultHeader}>
        <Text style={styles.resultEmoji}>✨</Text>
        <Text style={styles.resultTitle}>Now we're cooking!</Text>
      </View>

      <Text style={styles.resultSubtitle}>
        Based on what you have, here's tonight's perfect dinner:
      </Text>

      {loading ? (
        <View style={styles.loadingCard}>
          <Text style={styles.loadingText}>Finding your perfect match...</Text>
        </View>
      ) : personalizedRecipe ? (
        <View style={styles.recipeCard}>
          <Image
            source={{ uri: personalizedRecipe.thumbnail }}
            style={styles.recipeImage}
          />
          <View style={styles.recipeContent}>
            <Text style={styles.recipeTitle}>{personalizedRecipe.name}</Text>
            <View style={styles.recipeMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={16} color={colors.brownMuted} />
                <Text style={styles.metaText}>30 min</Text>
              </View>
              <View style={styles.matchBadge}>
                <Text style={styles.matchBadgeText}>
                  You have {Math.min(selectedIngredientCount, 9)}/10 ingredients!
                </Text>
              </View>
            </View>
          </View>
        </View>
      ) : null}

      <TouchableOpacity style={styles.cookButton} onPress={onLetsMake}>
        <Ionicons name="restaurant" size={20} color={colors.brown} />
        <Text style={styles.cookButtonText}>Let's Make This</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <TouchableOpacity style={styles.enterAppLink} onPress={onEnterApp}>
        <Text style={styles.enterAppText}>→ Enter DinnerPlans</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
