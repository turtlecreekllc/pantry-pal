import React from 'react';
import { View, Text, TouchableOpacity, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../lib/theme';
import { styles } from '../styles';
import type { RecipePreview } from '../../../lib/types';

interface FirstSuggestionStepProps {
  fadeAnim: Animated.Value;
  loading: boolean;
  suggestedRecipe: RecipePreview | null;
  onShowAnother: () => void;
  onLetsCook: () => void;
  onWantBetterSuggestions: () => void;
  onMaybeLater: () => void;
}

export function FirstSuggestionStep({
  fadeAnim,
  loading,
  suggestedRecipe,
  onShowAnother,
  onLetsCook,
  onWantBetterSuggestions,
  onMaybeLater,
}: FirstSuggestionStepProps): React.ReactElement {
  return (
    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
      <Text style={styles.suggestionIntro}>
        Perfect! Here's what families like yours are loving this week...
      </Text>

      {loading ? (
        <View style={styles.loadingCard}>
          <Text style={styles.loadingText}>Finding something delicious...</Text>
        </View>
      ) : suggestedRecipe ? (
        <View style={styles.recipeCard}>
          <Image
            source={{ uri: suggestedRecipe.thumbnail }}
            style={styles.recipeImage}
          />
          <View style={styles.recipeContent}>
            <Text style={styles.recipeTitle}>{suggestedRecipe.name}</Text>
            <View style={styles.recipeMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={16} color={colors.brownMuted} />
                <Text style={styles.metaText}>40 min</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="people-outline" size={16} color={colors.brownMuted} />
                <Text style={styles.metaText}>Serves 4</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="star" size={16} color={colors.warning} />
                <Text style={styles.metaText}>4.9</Text>
              </View>
            </View>
            <Text style={styles.recipeTagline}>
              "Simple, healthy, and a crowd pleaser!"
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.suggestionActions}>
        <TouchableOpacity style={styles.actionButtonOutline} onPress={onShowAnother}>
          <Ionicons name="refresh" size={18} color={colors.brown} />
          <Text style={styles.actionButtonOutlineText}>Show Another</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButtonFilled} onPress={onLetsCook}>
          <Ionicons name="restaurant" size={18} color={colors.brown} />
          <Text style={styles.actionButtonFilledText}>Let's Cook</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      <View style={styles.betterSuggestionsPrompt}>
        <Ionicons name="bulb-outline" size={24} color={colors.primary} />
        <Text style={styles.betterSuggestionsTitle}>
          Want suggestions based on what's in YOUR kitchen?
        </Text>
      </View>

      <View style={styles.promptActions}>
        <TouchableOpacity style={styles.primaryButton} onPress={onWantBetterSuggestions}>
          <Text style={styles.primaryButtonText}>Yes, let's do it!</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipLink} onPress={onMaybeLater}>
          <Text style={styles.skipLinkText}>Maybe later</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
