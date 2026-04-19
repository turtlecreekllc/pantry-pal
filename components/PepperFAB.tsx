/**
 * Pepper FAB - Floating Action Button
 * The persistent AI assistant button that appears on every screen.
 * Features the cute honey pot chef mascot with playful animations.
 * Opens a contextual floating chat overlay instead of navigating away.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Text,
  Pressable,
  Image,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius, shadows } from '../lib/theme';
import { PepperSuggestion, PepperQuickAction, ScreenContext } from '../lib/pepperContext';
import { FloatingChat } from './FloatingChat';
import { PantryItem, MealPlan } from '../lib/types';

// Import the mascot image
const MascotImage = require('../assets/icon.png');

interface PepperFABProps {
  /** Current screen context for contextual suggestions */
  context?: ScreenContext;
  /** Current suggestion to display */
  suggestion?: PepperSuggestion | null;
  /** Quick actions for long-press menu */
  quickActions?: PepperQuickAction[];
  /** Callback when suggestion is tapped */
  onSuggestionPress?: (suggestion: PepperSuggestion) => void;
  /** Callback when chat is opened */
  onChatOpen?: () => void;
  /** Whether to show pulse animation (has pending suggestion) */
  hasSuggestion?: boolean;
  /** Size variant - 'default' (64px) or 'small' (48px) */
  size?: 'default' | 'small';
  /** Optional contextual data for the floating chat */
  contextData?: {
    mealPlans?: MealPlan[];
    pantryItems?: PantryItem[];
    currentRecipe?: { name: string; id: string };
    selectedDate?: string;
  };
}

/**
 * Persistent floating action button for Pepper AI assistant
 * Appears on every screen with contextual help
 */
export function PepperFAB({
  context = 'tonight',
  suggestion,
  quickActions = [],
  onSuggestionPress,
  onChatOpen,
  hasSuggestion = false,
  size = 'default',
  contextData,
}: PepperFABProps): React.ReactElement {
  const isSmall = size === 'small';
  const router = useRouter();
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [showFloatingChat, setShowFloatingChat] = useState(false);
  
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const menuAnim = useRef(new Animated.Value(0)).current;
  const suggestionAnim = useRef(new Animated.Value(0)).current;
  const wiggleAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  
  // Idle wiggle/bounce animation
  useEffect(() => {
    const wiggle = Animated.loop(
      Animated.sequence([
        Animated.timing(wiggleAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(wiggleAnim, {
          toValue: -1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(wiggleAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(2000), // Pause between wiggles
      ])
    );
    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -4,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.in(Easing.bounce),
          useNativeDriver: true,
        }),
        Animated.delay(3000), // Pause between bounces
      ])
    );
    wiggle.start();
    bounce.start();
    return () => {
      wiggle.stop();
      bounce.stop();
    };
  }, [wiggleAnim, bounceAnim]);
  
  // Pulse animation when there's a suggestion
  useEffect(() => {
    if (hasSuggestion) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.12,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [hasSuggestion, pulseAnim]);
  
  // Toggle quick actions menu
  const toggleQuickActions = useCallback((): void => {
    const toValue = showQuickActions ? 0 : 1;
    Animated.spring(menuAnim, {
      toValue,
      friction: 6,
      tension: 40,
      useNativeDriver: true,
    }).start();
    setShowQuickActions(!showQuickActions);
  }, [showQuickActions, menuAnim]);
  
  // Handle FAB press - open floating chat or show suggestion
  const handlePress = useCallback((): void => {
    if (suggestion) {
      setShowSuggestion(true);
      Animated.spring(suggestionAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }).start();
    } else {
      // Open floating chat overlay
      onChatOpen?.();
      setShowFloatingChat(true);
    }
  }, [suggestion, onChatOpen, suggestionAnim]);
  // Handle closing the floating chat
  const handleCloseChat = useCallback((): void => {
    setShowFloatingChat(false);
  }, []);
  
  // Handle long press - show quick actions
  const handleLongPress = useCallback((): void => {
    toggleQuickActions();
  }, [toggleQuickActions]);
  
  // Handle suggestion action
  const handleSuggestionAction = useCallback((): void => {
    if (suggestion && onSuggestionPress) {
      onSuggestionPress(suggestion);
    }
    setShowSuggestion(false);
    suggestionAnim.setValue(0);
  }, [suggestion, onSuggestionPress, suggestionAnim]);
  
  // Close suggestion bubble
  const closeSuggestion = useCallback((): void => {
    Animated.timing(suggestionAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setShowSuggestion(false));
  }, [suggestionAnim]);
  
  // Handle quick action press
  const handleQuickAction = useCallback((action: PepperQuickAction): void => {
    toggleQuickActions();
    setTimeout(() => action.action(), 100);
  }, [toggleQuickActions]);
  
  const rotation = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });
  
  const backdropOpacity = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  
  // Wiggle rotation interpolation
  const wiggleRotation = wiggleAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-8deg', '0deg', '8deg'],
  });
  
  return (
    <>
      {/* Backdrop for quick actions */}
      {showQuickActions && (
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={toggleQuickActions} />
        </Animated.View>
      )}
      
      {/* Suggestion bubble */}
      {showSuggestion && suggestion && (
        <Animated.View
          style={[
            styles.suggestionBubble,
            {
              opacity: suggestionAnim,
              transform: [
                {
                  translateY: suggestionAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Pressable onPress={closeSuggestion} style={styles.suggestionClose}>
            <Ionicons name="close" size={16} color={colors.brownMuted} />
          </Pressable>
          <View style={styles.suggestionContent}>
            <View style={styles.mascotAvatarContainer}>
              <Image source={MascotImage} style={styles.mascotAvatar} resizeMode="contain" />
            </View>
            <View style={styles.suggestionTextContainer}>
              <Text style={styles.suggestionText}>{suggestion.message}</Text>
              {suggestion.actionLabel && (
                <TouchableOpacity
                  style={styles.suggestionAction}
                  onPress={handleSuggestionAction}
                >
                  <Text style={styles.suggestionActionText}>{suggestion.actionLabel}</Text>
                  <Ionicons name="arrow-forward" size={14} color={colors.coral} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Animated.View>
      )}
      
      {/* Main FAB container */}
      <View style={styles.container} pointerEvents="box-none">
        {/* Quick actions menu */}
        {showQuickActions && quickActions.length > 0 && (
          <View style={styles.actionsWrapper} pointerEvents="box-none">
            {quickActions.map((action, index) => {
              const translateY = menuAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -((index + 1) * 60)],
              });
              const scale = menuAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 0.5, 1],
              });
              const opacity = menuAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 0, 1],
              });
              return (
                <Animated.View
                  key={action.id}
                  style={[
                    styles.actionContainer,
                    { transform: [{ translateY }, { scale }], opacity },
                  ]}
                >
                  <Pressable
                    style={styles.actionRow}
                    onPress={() => handleQuickAction(action)}
                  >
                    <View style={styles.labelContainer}>
                      <Text style={styles.actionLabel}>{action.label}</Text>
                    </View>
                    <View style={styles.actionButton}>
                      <Ionicons name={action.icon as keyof typeof Ionicons.glyphMap} size={20} color={colors.brown} />
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        )}
        
        {/* Main FAB button */}
        <Animated.View 
          style={[
            styles.fabContainer, 
            { 
              transform: [
                { scale: pulseAnim },
                { translateY: bounceAnim },
                { rotate: showQuickActions ? '0deg' : wiggleRotation },
              ] 
            }
          ]}
        >
          {hasSuggestion && (
            <View style={[styles.badge, isSmall && styles.badgeSmall]}>
              <View style={styles.badgeDot} />
            </View>
          )}
          <TouchableOpacity
            style={[styles.fab, isSmall && styles.fabSmall]}
            onPress={handlePress}
            onLongPress={handleLongPress}
            activeOpacity={0.9}
            accessibilityLabel="Chat with your AI assistant"
            accessibilityHint="Double tap to open AI assistant, long press for quick actions"
            accessibilityRole="button"
          >
            {showQuickActions ? (
              <Animated.View style={{ transform: [{ rotate: rotation }] }}>
                <Ionicons name="close" size={isSmall ? 22 : 28} color={colors.brown} />
              </Animated.View>
            ) : (
              <Image 
                source={MascotImage} 
                style={[styles.mascotIcon, isSmall && styles.mascotIconSmall]} 
                resizeMode="contain"
              />
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
      {/* Floating Chat Overlay */}
      <FloatingChat
        visible={showFloatingChat}
        onClose={handleCloseChat}
        context={context}
        contextData={contextData}
      />
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
    right: spacing.space4,
    bottom: spacing.space4,
    alignItems: 'flex-end',
    zIndex: 999,
  },
  fabContainer: {
    position: 'relative',
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.brown,
    ...shadows.md,
    overflow: 'hidden',
  },
  fabSmall: {
    width: 48,
    height: 48,
    borderWidth: 2,
  },
  mascotIcon: {
    width: 56,
    height: 56,
  },
  mascotIconSmall: {
    width: 42,
    height: 42,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.brown,
    zIndex: 1,
  },
  badgeSmall: {
    width: 16,
    height: 16,
    borderRadius: 8,
    top: -2,
    right: -2,
  },
  badgeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.white,
  },
  actionsWrapper: {
    position: 'absolute',
    bottom: 64,
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
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
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
  actionLabel: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    fontWeight: typography.fontMedium,
    color: colors.brown,
  },
  suggestionBubble: {
    position: 'absolute',
    right: spacing.space4,
    bottom: spacing.space4 + 72, // Above FAB
    maxWidth: 300,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.space4,
    borderWidth: 2,
    borderColor: colors.brown,
    zIndex: 1000,
    ...shadows.md,
  },
  suggestionClose: {
    position: 'absolute',
    top: spacing.space2,
    right: spacing.space2,
    padding: spacing.space1,
  },
  suggestionContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.space3,
  },
  mascotAvatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.brown,
    overflow: 'hidden',
  },
  mascotAvatar: {
    width: 36,
    height: 36,
  },
  suggestionTextContainer: {
    flex: 1,
    paddingRight: spacing.space4,
  },
  suggestionText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brown,
    lineHeight: typography.textSm * 1.4,
  },
  suggestionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space1,
    marginTop: spacing.space2,
  },
  suggestionActionText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textSm,
    color: colors.coral,
    fontWeight: typography.fontSemibold,
  },
});

export default PepperFAB;
