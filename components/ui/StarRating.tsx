import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../lib/theme';

interface StarRatingProps {
  rating: number | null;
  onChange?: (rating: number) => void;
  size?: number;
  color?: string;
  readonly?: boolean;
}

/**
 * Brand-styled star rating component
 * Uses honey gold for filled stars by default
 */
export function StarRating({
  rating,
  onChange,
  size = 24,
  color = colors.primary,
  readonly = false,
}: StarRatingProps): React.ReactElement {
  const handlePress = (star: number): void => {
    if (!readonly && onChange) {
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
            accessibilityLabel={`${star} star${star > 1 ? 's' : ''}`}
            accessibilityRole="button"
            accessibilityState={{ selected: filled }}
          >
            <Ionicons
              name={filled ? 'star' : 'star-outline'}
              size={size}
              color={filled ? color : colors.brownMuted}
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
    marginHorizontal: spacing.space1,
  },
});
