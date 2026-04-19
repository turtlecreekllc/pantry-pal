import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, StyleProp, ViewStyle } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '../lib/theme';

interface LoadingSkeletonProps {
  width?: number | string;
  height?: number;
  borderRadiusSize?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Brand-styled loading skeleton with warm shimmer animation
 */
export function LoadingSkeleton({
  width = '100%',
  height = 20,
  borderRadiusSize = borderRadius.sm,
  style,
}: LoadingSkeletonProps): React.ReactElement {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius: borderRadiusSize, opacity },
        style,
      ]}
    />
  );
}

/**
 * Brand-styled pantry item skeleton
 */
export function PantryItemSkeleton(): React.ReactElement {
  return (
    <View style={styles.itemContainer}>
      <LoadingSkeleton width={56} height={56} borderRadiusSize={borderRadius.sm} />
      <View style={styles.itemContent}>
        <LoadingSkeleton width="70%" height={16} />
        <LoadingSkeleton width="40%" height={14} style={{ marginTop: spacing.space2 }} />
        <LoadingSkeleton width="50%" height={12} style={{ marginTop: spacing.space2 }} />
      </View>
    </View>
  );
}

/**
 * Brand-styled pantry list skeleton
 */
export function PantryListSkeleton(): React.ReactElement {
  return (
    <View style={styles.listContainer}>
      {[1, 2, 3, 4, 5].map((i) => (
        <PantryItemSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.peach,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.space3,
    marginHorizontal: spacing.space4,
    marginVertical: spacing.space1,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.creamDark,
    ...shadows.sm,
  },
  itemContent: {
    flex: 1,
    marginLeft: spacing.space3,
  },
  listContainer: {
    paddingVertical: spacing.space2,
  },
});
