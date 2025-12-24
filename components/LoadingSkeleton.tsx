import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface LoadingSkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: object;
}

export function LoadingSkeleton({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}: LoadingSkeletonProps) {
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
        { width, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

export function PantryItemSkeleton() {
  return (
    <View style={styles.itemContainer}>
      <LoadingSkeleton width={56} height={56} borderRadius={8} />
      <View style={styles.itemContent}>
        <LoadingSkeleton width="70%" height={16} />
        <LoadingSkeleton width="40%" height={14} style={{ marginTop: 6 }} />
        <LoadingSkeleton width="50%" height={12} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

export function PantryListSkeleton() {
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
    backgroundColor: '#e0e0e0',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
  },
  itemContent: {
    flex: 1,
    marginLeft: 12,
  },
  listContainer: {
    paddingVertical: 8,
  },
});
