import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { RecipePreview } from '../lib/types';

interface RecipeCardProps {
  recipe: RecipePreview;
  onPress: () => void;
}

export function RecipeCard({ recipe, onPress }: RecipeCardProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <Image source={{ uri: recipe.thumbnail }} style={styles.image} />
      <View style={styles.overlay}>
        <Text style={styles.name} numberOfLines={2}>
          {recipe.name}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: 4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    aspectRatio: 1,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  name: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 16,
  },
});
