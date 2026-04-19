/**
 * SwipeableRecipeCard Component
 * A recipe card with swipe navigation, double-tap to like, and long-press to save
 * Includes animations for each interaction and user ratings display
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  Vibration,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { EnhancedScoredRecipe } from '../lib/types';
import { colors, typography, spacing, borderRadius, shadows } from '../lib/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const SWIPE_VELOCITY_THRESHOLD = 800; // Velocity threshold for quick swipes
const SWIPE_OUT_DURATION = 300;

interface SwipeableRecipeCardProps {
  readonly recipe: EnhancedScoredRecipe;
  readonly personalizedIntro: string;
  readonly onSwipeLeft?: () => void;
  readonly onSwipeRight?: () => void;
  readonly onLike?: (recipe: EnhancedScoredRecipe) => void;
  readonly onSave?: (recipe: EnhancedScoredRecipe) => void;
  readonly isLiked?: boolean;
  readonly isSaved?: boolean;
  readonly rating?: number;
  readonly ratingCount?: number;
}

/**
 * Animated recipe card with gesture support
 */
export function SwipeableRecipeCard({
  recipe,
  personalizedIntro,
  onSwipeLeft,
  onSwipeRight,
  onLike,
  onSave,
  isLiked = false,
  isSaved = false,
  rating = 4.5,
  ratingCount = 128,
}: SwipeableRecipeCardProps): React.ReactElement {
  const router = useRouter();
  const position = useRef(new Animated.ValueXY()).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const likeScale = useRef(new Animated.Value(0)).current;
  const saveScale = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  
  const [liked, setLiked] = useState(isLiked);
  const [saved, setSaved] = useState(isSaved);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const [showSaveAnimation, setShowSaveAnimation] = useState(false);
  
  // Track double tap
  const lastTap = useRef<number>(0);
  const tapTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Long press handling
  const longPressTimeout = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);
  
  // Pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Lower threshold for more responsive feel
        return Math.abs(gestureState.dx) > 5;
      },
      onPanResponderGrant: () => {
        isLongPress.current = false;
        // Subtle scale down on touch for tactile feedback
        Animated.spring(cardScale, {
          toValue: 0.98,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }).start();
        // Start long press timer
        longPressTimeout.current = setTimeout(() => {
          isLongPress.current = true;
          handleLongPress();
        }, 500);
      },
      onPanResponderMove: (_, gestureState) => {
        // Cancel long press if moving
        if (Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5) {
          if (longPressTimeout.current) {
            clearTimeout(longPressTimeout.current);
          }
        }
        // Direct position update for immediate response
        position.setValue({ x: gestureState.dx, y: gestureState.dy * 0.1 });
      },
      onPanResponderRelease: (_, gestureState) => {
        // Clear long press timer
        if (longPressTimeout.current) {
          clearTimeout(longPressTimeout.current);
        }
        // Reset scale
        Animated.spring(cardScale, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }).start();
        if (isLongPress.current) {
          // Reset position after long press
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            friction: 6,
            tension: 40,
            useNativeDriver: true,
          }).start();
          return;
        }
        // Check for swipe by position OR velocity (whichever triggers first)
        const isSwipeRight = gestureState.dx > SWIPE_THRESHOLD || gestureState.vx > SWIPE_VELOCITY_THRESHOLD;
        const isSwipeLeft = gestureState.dx < -SWIPE_THRESHOLD || gestureState.vx < -SWIPE_VELOCITY_THRESHOLD;
        if (isSwipeRight) {
          swipeRight(gestureState.vx);
        } else if (isSwipeLeft) {
          swipeLeft(gestureState.vx);
        } else {
          resetPosition();
        }
      },
      onPanResponderTerminate: () => {
        if (longPressTimeout.current) {
          clearTimeout(longPressTimeout.current);
        }
        Animated.spring(cardScale, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }).start();
        resetPosition();
      },
    })
  ).current;
  
  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (tapTimeout.current) clearTimeout(tapTimeout.current);
      if (longPressTimeout.current) clearTimeout(longPressTimeout.current);
    };
  }, []);
  
  const swipeRight = useCallback((velocity = 0) => {
    // Use spring with velocity for natural momentum-based animation
    const springVelocity = Math.max(velocity / 1000, 1);
    Animated.parallel([
      Animated.spring(position.x, {
        toValue: SCREEN_WIDTH + 100,
        friction: 8,
        tension: 40,
        velocity: springVelocity,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: SWIPE_OUT_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onSwipeRight?.();
      resetCard();
    });
  }, [onSwipeRight, position.x, cardOpacity]);
  
  const swipeLeft = useCallback((velocity = 0) => {
    // Use spring with velocity for natural momentum-based animation
    const springVelocity = Math.min(velocity / 1000, -1);
    Animated.parallel([
      Animated.spring(position.x, {
        toValue: -SCREEN_WIDTH - 100,
        friction: 8,
        tension: 40,
        velocity: springVelocity,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: SWIPE_OUT_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onSwipeLeft?.();
      resetCard();
    });
  }, [onSwipeLeft, position.x, cardOpacity]);
  
  const resetPosition = useCallback(() => {
    // Smooth bounce-back with optimized spring physics
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      friction: 6,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }, [position]);
  
  const resetCard = useCallback(() => {
    position.setValue({ x: 0, y: 0 });
    cardOpacity.setValue(1);
    cardScale.setValue(1);
  }, [position, cardOpacity, cardScale]);
  
  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (lastTap.current && now - lastTap.current < DOUBLE_TAP_DELAY) {
      // Double tap detected
      if (tapTimeout.current) {
        clearTimeout(tapTimeout.current);
      }
      
      // Toggle like
      setLiked(!liked);
      setShowLikeAnimation(true);
      
      // Haptic feedback
      if (Platform.OS === 'ios') {
        Vibration.vibrate(10);
      }
      
      // Animate heart with snappy spring
      Animated.sequence([
        Animated.spring(likeScale, {
          toValue: 1.2,
          friction: 4,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.spring(likeScale, {
          toValue: 0,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowLikeAnimation(false);
      });
      
      onLike?.(recipe);
      lastTap.current = 0;
    } else {
      // Single tap - wait to see if it's a double tap
      lastTap.current = now;
      tapTimeout.current = setTimeout(() => {
        // Single tap - navigate to recipe
        router.push(`/recipe/${recipe.id}`);
        lastTap.current = 0;
      }, DOUBLE_TAP_DELAY);
    }
  }, [liked, recipe, onLike, router, likeScale]);
  
  const handleLongPress = useCallback(() => {
    // Toggle save
    setSaved(!saved);
    setShowSaveAnimation(true);
    
    // Haptic feedback
    if (Platform.OS === 'ios') {
      Vibration.vibrate([0, 50, 50, 50]);
    } else {
      Vibration.vibrate(100);
    }
    
    // Animate bookmark with snappy spring
    Animated.sequence([
      Animated.spring(saveScale, {
        toValue: 1.3,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.spring(saveScale, {
        toValue: 0,
        friction: 6,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowSaveAnimation(false);
    });
    
    onSave?.(recipe);
  }, [saved, recipe, onSave, saveScale]);
  
  // Card rotation based on swipe position
  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-8deg', '0deg', '8deg'],
    extrapolate: 'clamp',
  });
  
  // Swipe indicator opacity - show much sooner (at 15% of threshold)
  const INDICATOR_SHOW_DISTANCE = SWIPE_THRESHOLD * 0.15;
  const likeOpacity = position.x.interpolate({
    inputRange: [0, INDICATOR_SHOW_DISTANCE, SWIPE_THRESHOLD * 0.5],
    outputRange: [0, 0.6, 1],
    extrapolate: 'clamp',
  });
  
  const nopeOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD * 0.5, -INDICATOR_SHOW_DISTANCE, 0],
    outputRange: [1, 0.6, 0],
    extrapolate: 'clamp',
  });
  
  // Scale indicators as they appear
  const likeIndicatorScale = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD * 0.5],
    outputRange: [0.8, 1],
    extrapolate: 'clamp',
  });
  
  const nopeIndicatorScale = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD * 0.5, 0],
    outputRange: [1, 0.8],
    extrapolate: 'clamp',
  });
  
  const cardStyle = {
    transform: [
      { translateX: position.x },
      { translateY: position.y },
      { rotate },
      { scale: cardScale },
    ],
    opacity: cardOpacity,
  };
  
  // Generate star rating display
  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Ionicons key={i} name="star" size={14} color={colors.warning} />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <Ionicons key={i} name="star-half" size={14} color={colors.warning} />
        );
      } else {
        stars.push(
          <Ionicons key={i} name="star-outline" size={14} color={colors.warning} />
        );
      }
    }
    return stars;
  };
  
  return (
    <Animated.View
      style={[styles.cardContainer, cardStyle]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleDoubleTap}
        style={styles.card}
      >
        {/* Recipe Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: recipe.thumbnail }}
            style={styles.image}
            resizeMode="cover"
          />
          
          {/* Swipe indicators - appear early with scale animation */}
          <Animated.View style={[
            styles.swipeIndicator, 
            styles.likeIndicator, 
            { opacity: likeOpacity, transform: [{ scale: likeIndicatorScale }] }
          ]}>
            <View style={styles.indicatorBadge}>
              <Ionicons name="heart" size={32} color={colors.coral} />
              <Text style={styles.indicatorText}>LIKE</Text>
            </View>
          </Animated.View>
          
          <Animated.View style={[
            styles.swipeIndicator, 
            styles.nopeIndicator, 
            { opacity: nopeOpacity, transform: [{ scale: nopeIndicatorScale }] }
          ]}>
            <View style={[styles.indicatorBadge, styles.nopeBadge]}>
              <Ionicons name="close" size={32} color={colors.brownMuted} />
              <Text style={[styles.indicatorText, styles.nopeText]}>SKIP</Text>
            </View>
          </Animated.View>
          
          {/* Double-tap heart animation */}
          {showLikeAnimation && (
            <Animated.View
              style={[
                styles.centerAnimation,
                { transform: [{ scale: likeScale }] },
              ]}
            >
              <Ionicons name="heart" size={80} color={colors.coral} />
            </Animated.View>
          )}
          
          {/* Long-press save animation */}
          {showSaveAnimation && (
            <Animated.View
              style={[
                styles.centerAnimation,
                { transform: [{ scale: saveScale }] },
              ]}
            >
              <Ionicons name="bookmark" size={80} color={colors.primary} />
            </Animated.View>
          )}
          
          {/* Match badge */}
          <View style={styles.matchBadge}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <Text style={styles.matchText}>{recipe.matchScore ?? recipe.matchPercentage ?? 0}% match</Text>
          </View>
          
          {/* Status badges */}
          <View style={styles.statusBadges}>
            {liked && (
              <View style={styles.statusBadge}>
                <Ionicons name="heart" size={16} color={colors.coral} />
              </View>
            )}
            {saved && (
              <View style={styles.statusBadge}>
                <Ionicons name="bookmark" size={16} color={colors.primary} />
              </View>
            )}
          </View>
        </View>
        
        {/* Recipe Info */}
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>{recipe.name}</Text>
          
          {/* User Ratings */}
          <View style={styles.ratingRow}>
            <View style={styles.stars}>
              {renderStars()}
            </View>
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
            <Text style={styles.ratingCount}>({ratingCount.toLocaleString()} reviews)</Text>
          </View>
          
          {/* Recipe Meta */}
          <View style={styles.metaRow}>
            {recipe.readyInMinutes && (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color={colors.brownMuted} />
                <Text style={styles.metaText}>{recipe.readyInMinutes} min</Text>
              </View>
            )}
            {recipe.servings && (
              <View style={styles.metaItem}>
                <Ionicons name="people-outline" size={14} color={colors.brownMuted} />
                <Text style={styles.metaText}>Serves {recipe.servings}</Text>
              </View>
            )}
          </View>
          
          {/* Personalized Intro */}
          <View style={styles.introContainer}>
            <Text style={styles.introText}>{personalizedIntro}</Text>
          </View>
          
          {/* Missing ingredients */}
          {(recipe.missingIngredients?.length ?? 0) > 0 && (
            <View style={styles.missingContainer}>
              <Text style={styles.missingLabel}>
                Missing: {(recipe.missingIngredients ?? []).slice(0, 3).join(', ')}
                {(recipe.missingIngredients?.length ?? 0) > 3 && ` +${recipe.missingIngredients.length - 3} more`}
              </Text>
            </View>
          )}
        </View>
        
        {/* Gesture hints */}
        <View style={styles.gestureHints}>
          <View style={styles.hintItem}>
            <Ionicons name="hand-left-outline" size={12} color={colors.brownMuted} />
            <Text style={styles.hintText}>Swipe to browse</Text>
          </View>
          <View style={styles.hintItem}>
            <Ionicons name="heart-outline" size={12} color={colors.brownMuted} />
            <Text style={styles.hintText}>Double-tap to like</Text>
          </View>
          <View style={styles.hintItem}>
            <Ionicons name="bookmark-outline" size={12} color={colors.brownMuted} />
            <Text style={styles.hintText}>Hold to save</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: SCREEN_WIDTH - spacing.space8,
    alignSelf: 'center',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.brown,
    overflow: 'hidden',
    ...shadows.lg,
  },
  imageContainer: {
    position: 'relative',
    height: 220,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  swipeIndicator: {
    position: 'absolute',
    top: 20,
    zIndex: 10,
  },
  likeIndicator: {
    left: 20,
  },
  nopeIndicator: {
    right: 20,
  },
  indicatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space1,
    paddingHorizontal: spacing.space3,
    paddingVertical: spacing.space2,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.coral,
  },
  nopeBadge: {
    borderColor: colors.brownMuted,
  },
  indicatorText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.textSm,
    fontWeight: typography.fontBold,
    color: colors.coral,
  },
  nopeText: {
    color: colors.brownMuted,
  },
  centerAnimation: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -40,
    marginLeft: -40,
    zIndex: 20,
  },
  matchBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space1,
    paddingHorizontal: spacing.space2,
    paddingVertical: spacing.space1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: borderRadius.full,
  },
  matchText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textXs,
    fontWeight: typography.fontSemibold,
    color: colors.success,
  },
  statusBadges: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: spacing.space2,
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.space4,
  },
  title: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.textXl,
    fontWeight: typography.fontBold,
    color: colors.brown,
    marginBottom: spacing.space2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
    marginBottom: spacing.space3,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textSm,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  ratingCount: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.space4,
    marginBottom: spacing.space3,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space1,
  },
  metaText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
  },
  introContainer: {
    backgroundColor: colors.peachLight,
    padding: spacing.space3,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.coral,
    marginBottom: spacing.space3,
  },
  introText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brown,
    lineHeight: typography.textSm * 1.5,
    fontStyle: 'italic',
  },
  missingContainer: {
    backgroundColor: colors.cream,
    padding: spacing.space2,
    borderRadius: borderRadius.sm,
  },
  missingLabel: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textXs,
    color: colors.brownMuted,
  },
  gestureHints: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.space3,
    paddingHorizontal: spacing.space4,
    backgroundColor: colors.cream,
    borderTopWidth: 1,
    borderTopColor: colors.creamDark,
  },
  hintItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space1,
  },
  hintText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textXs,
    color: colors.brownMuted,
  },
});

export default SwipeableRecipeCard;

