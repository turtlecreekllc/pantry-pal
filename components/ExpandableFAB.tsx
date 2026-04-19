import React, { useState, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Text,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../lib/theme';

interface FABAction {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

type FABPosition = 'left' | 'right';

interface ExpandableFABProps {
  actions: FABAction[];
  /** Position of the FAB on the screen */
  position?: FABPosition;
}

/**
 * Brand-styled expandable floating action button
 * Expands to show multiple action options
 */
export function ExpandableFAB({ actions, position = 'right' }: ExpandableFABProps): React.ReactElement {
  const [expanded, setExpanded] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;
  const isLeft = position === 'left';

  const toggleExpanded = (): void => {
    const toValue = expanded ? 0 : 1;
    Animated.spring(animation, {
      toValue,
      friction: 6,
      tension: 40,
      useNativeDriver: true,
    }).start();
    setExpanded(!expanded);
  };

  const handleActionPress = (action: FABAction): void => {
    toggleExpanded();
    setTimeout(() => {
      action.onPress();
    }, 100);
  };

  const rotation = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const backdropOpacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <>
      {expanded && (
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={toggleExpanded} />
        </Animated.View>
      )}

      <View style={[styles.container, isLeft ? styles.containerLeft : styles.containerRight]} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.fab}
          onPress={toggleExpanded}
          activeOpacity={0.8}
          accessibilityLabel={expanded ? 'Close menu' : 'Open add menu'}
          accessibilityRole="button"
        >
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <Ionicons name="add" size={32} color={colors.brown} />
          </Animated.View>
        </TouchableOpacity>

        {expanded && (
          <View style={[styles.actionsWrapper, isLeft ? styles.actionsWrapperLeft : styles.actionsWrapperRight]} pointerEvents="box-none">
            {actions.map((action, index) => {
              const translateY = animation.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -((index + 1) * 64)],
              });
              const scale = animation.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 0.5, 1],
              });
              const opacity = animation.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 0, 1],
              });
              return (
                <Animated.View
                  key={action.label}
                  style={[
                    styles.actionContainer,
                    isLeft ? styles.actionContainerLeft : styles.actionContainerRight,
                    { transform: [{ translateY }, { scale }], opacity },
                  ]}
                >
                  <Pressable
                    style={[styles.actionRow, isLeft && styles.actionRowLeft]}
                    onPress={() => handleActionPress(action)}
                  >
                    {isLeft ? (
                      <>
                        <View style={styles.actionButton}>
                          <Ionicons name={action.icon} size={22} color={colors.brown} />
                        </View>
                        <View style={[styles.labelContainer, styles.labelContainerLeft]}>
                          <Text style={styles.actionLabel}>{action.label}</Text>
                        </View>
                      </>
                    ) : (
                      <>
                        <View style={styles.labelContainer}>
                          <Text style={styles.actionLabel}>{action.label}</Text>
                        </View>
                        <View style={styles.actionButton}>
                          <Ionicons name={action.icon} size={22} color={colors.brown} />
                        </View>
                      </>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(61, 35, 20, 0.3)',
    zIndex: 998,
  },
  container: {
    position: 'absolute',
    bottom: spacing.space4,
    zIndex: 999,
  },
  containerRight: {
    right: spacing.space4,
    alignItems: 'flex-end',
  },
  containerLeft: {
    left: spacing.space4,
    alignItems: 'flex-start',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.brown,
    ...shadows.md,
  },
  actionsWrapper: {
    position: 'absolute',
    bottom: 56,
  },
  actionsWrapperRight: {
    right: 0,
    alignItems: 'flex-end',
  },
  actionsWrapperLeft: {
    left: 0,
    alignItems: 'flex-start',
  },
  actionContainer: {
    position: 'absolute',
    bottom: 0,
  },
  actionContainerRight: {
    right: 0,
  },
  actionContainerLeft: {
    left: 0,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionRowLeft: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.peach,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.brown,
    ...shadows.sm,
  },
  labelContainer: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.space3,
    paddingVertical: spacing.space2,
    borderRadius: borderRadius.sm,
    marginRight: spacing.space3,
    borderWidth: 2,
    borderColor: colors.brown,
    ...shadows.sm,
  },
  labelContainerLeft: {
    marginRight: 0,
    marginLeft: spacing.space3,
  },
  actionLabel: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    fontWeight: typography.fontMedium,
    color: colors.brown,
  },
});
