import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScoredRecipe } from '../lib/mealDb';

interface ScoredRecipeCardProps {
  recipe: ScoredRecipe;
  onPress: () => void;
}

function getScoreColor(score: number): string {
  if (score >= 75) return '#4CAF50'; // Green - great match
  if (score >= 50) return '#8BC34A'; // Light green - good match
  if (score >= 25) return '#FFC107'; // Yellow - partial match
  return '#FF9800'; // Orange - few matches
}

export function ScoredRecipeCard({ recipe, onPress }: ScoredRecipeCardProps) {
  const scoreColor = getScoreColor(recipe.matchScore);
  const hasValidImage = Boolean(recipe.thumbnail);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      {hasValidImage ? (
        <Image source={{ uri: recipe.thumbnail }} style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Ionicons name="restaurant-outline" size={40} color="#ccc" />
        </View>
      )}

      {/* Score Badge */}
      <View style={[styles.scoreBadge, { backgroundColor: scoreColor }]}>
        <Text style={styles.scoreText}>{recipe.matchScore}%</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>
          {recipe.name}
        </Text>

        <View style={styles.matchInfo}>
          <View style={styles.matchRow}>
            <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
            <Text style={styles.matchText}>
              {recipe.matchedIngredients.length} matched
            </Text>
          </View>
          {recipe.missingIngredients.length > 0 && (
            <View style={styles.matchRow}>
              <Ionicons name="close-circle" size={14} color="#FF9800" />
              <Text style={styles.matchText}>
                {recipe.missingIngredients.length} missing
              </Text>
            </View>
          )}
        </View>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressBar,
              { width: `${recipe.matchScore}%`, backgroundColor: scoreColor },
            ]}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 120,
    backgroundColor: '#f5f5f5',
  },
  imagePlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoreText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    padding: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    lineHeight: 18,
  },
  matchInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchText: {
    fontSize: 11,
    color: '#666',
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
});
