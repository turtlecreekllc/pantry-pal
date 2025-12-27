import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StarRatingProps {
  rating: number | null;
  onChange?: (rating: number) => void;
  size?: number;
  color?: string;
  readonly?: boolean;
}

export function StarRating({
  rating,
  onChange,
  size = 24,
  color = '#FFC107',
  readonly = false,
}: StarRatingProps) {
  const handlePress = (star: number) => {
    if (!readonly && onChange) {
      // If tapping the same star, clear the rating
      if (rating === star) {
        onChange(0);
      } else {
        onChange(star);
      }
    }
  };

  return (
    <View style={styles.container}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = rating !== null && star <= rating;
        return (
          <TouchableOpacity
            key={star}
            onPress={() => handlePress(star)}
            disabled={readonly}
            style={styles.star}
            hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
          >
            <Ionicons
              name={filled ? 'star' : 'star-outline'}
              size={size}
              color={filled ? color : '#ccc'}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    marginHorizontal: 2,
  },
});
