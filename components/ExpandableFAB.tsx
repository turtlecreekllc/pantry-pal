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

interface FABAction {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

interface ExpandableFABProps {
  actions: FABAction[];
}

export function ExpandableFAB({ actions }: ExpandableFABProps) {
  const [expanded, setExpanded] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  const toggleExpanded = () => {
    const toValue = expanded ? 0 : 1;

    Animated.spring(animation, {
      toValue,
      friction: 6,
      tension: 40,
      useNativeDriver: true,
    }).start();

    setExpanded(!expanded);
  };

  const handleActionPress = (action: FABAction) => {
    toggleExpanded();
    // Small delay to allow menu to close before navigation
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
        <Animated.View
          style={[styles.backdrop, { opacity: backdropOpacity }]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={toggleExpanded}
          />
        </Animated.View>
      )}

      <View style={styles.container} pointerEvents="box-none">
        {/* Main FAB button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={toggleExpanded}
          activeOpacity={0.8}
        >
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <Ionicons name="add" size={32} color="#fff" />
          </Animated.View>
        </TouchableOpacity>

        {/* Action buttons - rendered in separate container above FAB */}
        {expanded && (
          <View style={styles.actionsWrapper} pointerEvents="box-none">
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
                    {
                      transform: [{ translateY }, { scale }],
                      opacity,
                    },
                  ]}
                >
                  <Pressable
                    style={styles.actionRow}
                    onPress={() => handleActionPress(action)}
                  >
                    <View style={styles.labelContainer}>
                      <Text style={styles.actionLabel}>{action.label}</Text>
                    </View>
                    <View style={styles.actionButton}>
                      <Ionicons name={action.icon} size={22} color="#fff" />
                    </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 1,
  },
  container: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    alignItems: 'flex-end',
    zIndex: 2,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  actionsWrapper: {
    position: 'absolute',
    bottom: 56,
    right: 0,
    alignItems: 'flex-end',
  },
  actionContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  labelContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
});
