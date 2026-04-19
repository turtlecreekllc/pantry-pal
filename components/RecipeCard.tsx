import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ImageSourcePropType } from 'react-native';
import { RecipePreview } from '../lib/types';
import { colors, typography, spacing, borderRadius, shadows } from '../lib/theme';
import { Ionicons } from '@expo/vector-icons';

// Default placeholder for recipes without images
const PLACEHOLDER_IMAGE = 'https://www.themealdb.com/images/media/meals/default.jpg';

interface RecipeCardProps {
  recipe: RecipePreview;
  onPress: () => void;
}

/**
 * Brand-styled recipe card component with image and title overlay
 */
export function RecipeCard({ recipe, onPress }: RecipeCardProps): React.ReactElement {
  // Handle empty/null thumbnails
  const imageSource: ImageSourcePropType = recipe.thumbnail 
    ? { uri: recipe.thumbnail }
    : { uri: PLACEHOLDER_IMAGE };
  const hasValidImage = Boolean(recipe.thumbnail);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={recipe.name}
    >
      {hasValidImage ? (
        <Image source={imageSource} style={styles.image} />
      ) : (
        <View style={styles.placeholderContainer}>
          <Ionicons name="restaurant-outline" size={48} color={colors.brownMuted} />
        </View>
      )}
      <View style={styles.overlay}>
        <Text style={styles.name} numberOfLines={2}>{recipe.name}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: spacing.space2,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.cream,
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: colors.brown,
    ...shadows.sm,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.creamLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.primary,
    paddingVertical: spacing.space3,
    paddingHorizontal: spacing.space3,
    borderTopWidth: 2,
    borderTopColor: colors.brown,
  },
  name: {
    fontFamily: 'Nunito-SemiBold',
    color: colors.brown,
    fontSize: typography.textSm,
    fontWeight: typography.fontSemibold,
    lineHeight: typography.textSm * 1.2,
  },
});
