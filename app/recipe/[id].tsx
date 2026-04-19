/**
 * Recipe Details Screen
 * Full recipe view with ingredients, instructions, ratings, and actions
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRecipes } from '../../hooks/useRecipes';
import { useSavedRecipes } from '../../hooks/useSavedRecipes';
import { useUserPreferences } from '../../hooks/useUserPreferences';
import { EmptyState } from '../../components/EmptyState';
import { StarRating } from '../../components/ui/StarRating';
import { AddToCookbookModal } from '../../components/AddToCookbookModal';
import { AddReviewModal } from '../../components/AddReviewModal';
import { RecipeSource, RecipeReview, RecipeRatingStats } from '../../lib/types';
import { shareRecipeAsText, shareRecipeAsPDF, printRecipe } from '../../lib/sharingService';
import { getReviewsForRecipe, getRecipeRatingStats } from '../../lib/reviewService';
import { convertMeasurement, convertInstructionsTemperature } from '../../lib/measurementConverter';
import { colors, typography, spacing, borderRadius, shadows } from '../../lib/theme';

export default function RecipeDetailsScreen() {
  const { id, action } = useLocalSearchParams<{ id: string; action?: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const { selectedRecipe, loading, error, fetchRecipeDetails, clearSelectedRecipe } = useRecipes();
  const { savedRecipes, isRecipeSaved, saveRecipe, unsaveRecipe, updateRecipeRating } = useSavedRecipes();
  const { measurementSystem } = useUserPreferences();
  // Track if we've initialized fetching to prevent brief "not found" flash
  const [hasInitialized, setHasInitialized] = useState(false);
  // Animation for save button
  const saveScale = useState(new Animated.Value(1))[0];

  // Get saved recipe data for rating - detect source from ID prefix
  const recipeSource: RecipeSource = useMemo(() => {
    if (id?.startsWith('imported-')) return 'imported';
    if (id?.startsWith('spoonacular-')) return 'spoonacular';
    return 'themealdb';
  }, [id]);
  const savedRecipe = useMemo(() => {
    return savedRecipes.find(
      (r) => r.recipe_id === id && r.recipe_source === recipeSource
    );
  }, [savedRecipes, id, recipeSource]);

  const isSaved = id ? isRecipeSaved(id, recipeSource) : false;
  const [showCookbookModal, setShowCookbookModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState<RecipeReview[]>([]);
  const [ratingStats, setRatingStats] = useState<RecipeRatingStats | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Demo reviews from web/API (simulated external data)
  const demoReviews = useMemo(() => [
    {
      id: 'demo-1',
      author_display_name: 'S. Martinez',
      rating: 5,
      review_text: 'Made this for my family last night and everyone loved it! The kids even asked for seconds. Will definitely make again!',
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      isDemo: true,
    },
    {
      id: 'demo-2',
      author_display_name: 'J. Davis',
      rating: 4,
      review_text: 'Easy to follow recipe with great results. I added a bit more seasoning to taste.',
      created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      isDemo: true,
    },
  ], []);

  // Combined rating stats (user reviews + demo reviews)
  const combinedRatingStats = useMemo(() => {
    const userCount = ratingStats?.totalReviews || 0;
    const userSum = userCount > 0 ? (ratingStats?.averageRating || 0) * userCount : 0;
    const demoSum = demoReviews.reduce((acc, r) => acc + r.rating, 0);
    const totalCount = userCount + demoReviews.length;
    const totalSum = userSum + demoSum;
    const avgRating = totalCount > 0 ? totalSum / totalCount : 0;
    return {
      averageRating: Math.round(avgRating * 10) / 10,
      totalReviews: totalCount,
    };
  }, [ratingStats, demoReviews]);

  /**
   * Fetches reviews and rating stats for the recipe
   */
  const fetchReviews = useCallback(async (): Promise<void> => {
    if (!id) return;
    setReviewsLoading(true);
    try {
      const [fetchedReviews, stats] = await Promise.all([
        getReviewsForRecipe(id, recipeSource),
        getRecipeRatingStats(id, recipeSource),
      ]);
      setReviews(fetchedReviews);
      setRatingStats(stats);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setReviewsLoading(false);
    }
  }, [id, recipeSource]);

  // Fetch reviews when recipe loads
  useEffect(() => {
    if (id) {
      fetchReviews();
    }
  }, [id, fetchReviews]);

  const handleShare = () => {
    if (!selectedRecipe) return;

    Alert.alert(
      'Share Recipe',
      'How would you like to share this recipe?',
      [
        {
          text: 'Share as Text',
          onPress: async () => {
            // Convert measurements based on user preference
            const convertedIngredients = selectedRecipe.ingredients.map(ing => ({
              ...ing,
              measure: ing.measure ? convertMeasurement(ing.measure, measurementSystem) : '',
            }));
            const convertedInstructions = convertInstructionsTemperature(
              selectedRecipe.instructions,
              measurementSystem
            );
            const success = await shareRecipeAsText({
              name: selectedRecipe.name,
              ingredients: convertedIngredients,
              instructions: convertedInstructions,
              source: selectedRecipe.source || undefined,
            });
            if (!success) {
              Alert.alert('Error', 'Failed to share recipe');
            }
          },
        },
        {
          text: 'Share as PDF',
          onPress: async () => {
            // Convert measurements based on user preference
            const convertedIngredients = selectedRecipe.ingredients.map(ing => ({
              ...ing,
              measure: ing.measure ? convertMeasurement(ing.measure, measurementSystem) : '',
            }));
            const convertedInstructions = convertInstructionsTemperature(
              selectedRecipe.instructions,
              measurementSystem
            );
            const success = await shareRecipeAsPDF({
              name: selectedRecipe.name,
              description: selectedRecipe.category ? `${selectedRecipe.category} cuisine` : undefined,
              ingredients: convertedIngredients,
              instructions: convertedInstructions,
              source: selectedRecipe.source || undefined,
              imageUrl: selectedRecipe.thumbnail,
            });
            if (!success) {
              Alert.alert('Error', 'Failed to create PDF');
            }
          },
        },
        {
          text: 'Print',
          onPress: async () => {
            // Convert measurements based on user preference
            const convertedIngredients = selectedRecipe.ingredients.map(ing => ({
              ...ing,
              measure: ing.measure ? convertMeasurement(ing.measure, measurementSystem) : '',
            }));
            const convertedInstructions = convertInstructionsTemperature(
              selectedRecipe.instructions,
              measurementSystem
            );
            await printRecipe({
              name: selectedRecipe.name,
              ingredients: convertedIngredients,
              instructions: convertedInstructions,
              source: selectedRecipe.source || undefined,
              imageUrl: selectedRecipe.thumbnail,
            });
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  useEffect(() => {
    const loadRecipe = async (): Promise<void> => {
      if (id) {
        await fetchRecipeDetails(id);
        setHasInitialized(true);
      }
    };
    loadRecipe();
    return () => {
      clearSelectedRecipe();
      setHasInitialized(false);
    };
  }, [id]);

  useEffect(() => {
    if (selectedRecipe) {
      navigation.setOptions({ title: selectedRecipe.name });
    }
  }, [selectedRecipe, navigation]);

  const handleWatchVideo = () => {
    if (selectedRecipe?.youtubeUrl) {
      Linking.openURL(selectedRecipe.youtubeUrl);
    }
  };

  const handleViewSource = () => {
    if (selectedRecipe?.source) {
      Linking.openURL(selectedRecipe.source);
    }
  };

  const handleToggleSave = async () => {
    if (!selectedRecipe || !id) return;
    
    // Animate button
    Animated.sequence([
      Animated.spring(saveScale, {
        toValue: 1.3,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.spring(saveScale, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();
    
    try {
      if (isSaved) {
        await unsaveRecipe(id, recipeSource);
      } else {
        await saveRecipe({ ...selectedRecipe, recipeSource }, recipeSource);
      }
    } catch (error) {
      console.error('Error toggling save:', error);
    }
  };

  const handleRatingChange = async (rating: number) => {
    if (!savedRecipe) return;
    try {
      await updateRecipeRating(savedRecipe.id, rating === 0 ? null as any : rating);
    } catch (error) {
      console.error('Error updating rating:', error);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Ionicons key={i} name="star" size={16} color={colors.warning} />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<Ionicons key={i} name="star-half" size={16} color={colors.warning} />);
      } else {
        stars.push(<Ionicons key={i} name="star-outline" size={16} color={colors.warning} />);
      }
    }
    return stars;
  };

  // Show loading state while fetching OR before initialization completes
  if (loading || !hasInitialized) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading recipe...</Text>
        </View>
      </SafeAreaView>
    );
  }
  // Only show error state after initialization has completed
  if (error || !selectedRecipe) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          icon="alert-circle-outline"
          title="Recipe not found"
          description="We couldn't find this recipe. Please try again."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <Stack.Screen
        options={{
          title: selectedRecipe.name,
          headerStyle: {
            backgroundColor: colors.primary,
          },
          headerTintColor: colors.brown,
          headerTitleStyle: {
            fontFamily: 'Quicksand-Bold',
            fontWeight: '700',
            fontSize: typography.textLg,
          },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={28} color={colors.brown} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={styles.headerRight}>
              <TouchableOpacity
                onPress={handleShare}
                style={styles.headerButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="share-outline" size={22} color={colors.brown} />
              </TouchableOpacity>
              <Animated.View style={{ transform: [{ scale: saveScale }] }}>
                <TouchableOpacity
                  onPress={handleToggleSave}
                  style={styles.headerButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={isSaved ? 'heart' : 'heart-outline'}
                    size={24}
                    color={isSaved ? colors.coral : colors.brown}
                  />
                </TouchableOpacity>
              </Animated.View>
            </View>
          ),
        }}
      />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {selectedRecipe.thumbnail ? (
          <Image source={{ uri: selectedRecipe.thumbnail }} style={styles.heroImage} />
        ) : (
          <View style={[styles.heroImage, styles.heroImagePlaceholder]}>
            <Ionicons name="restaurant-outline" size={64} color={colors.brownMuted} />
            <Text style={styles.placeholderText}>No image available</Text>
          </View>
        )}

        <View style={styles.content}>
          <Text style={styles.title}>{selectedRecipe.name}</Text>

          {/* Rating Section */}
          <View style={styles.ratingContainer}>
            <View style={styles.ratingStars}>
              {renderStars(combinedRatingStats.averageRating)}
            </View>
            <Text style={styles.ratingValue}>
              {combinedRatingStats.averageRating.toFixed(1)}
            </Text>
            <Text style={styles.ratingCount}>
              ({combinedRatingStats.totalReviews} review{combinedRatingStats.totalReviews !== 1 ? 's' : ''})
            </Text>
          </View>

          {/* User Rating (if saved) */}
          {isSaved && savedRecipe && (
            <View style={styles.userRatingSection}>
              <Text style={styles.userRatingLabel}>Your Rating</Text>
              <StarRating
                rating={savedRecipe?.rating || null}
                onChange={handleRatingChange}
                size={28}
              />
            </View>
          )}

          <View style={styles.badges}>
            {selectedRecipe.category && (
              <View style={styles.badge}>
                <Ionicons name="restaurant-outline" size={14} color={colors.brown} />
                <Text style={styles.badgeText}>{selectedRecipe.category}</Text>
              </View>
            )}
            {selectedRecipe.area && (
              <View style={styles.badge}>
                <Ionicons name="globe-outline" size={14} color={colors.brown} />
                <Text style={styles.badgeText}>{selectedRecipe.area}</Text>
              </View>
            )}
            {selectedRecipe.readyInMinutes && (
              <View style={styles.badge}>
                <Ionicons name="time-outline" size={14} color={colors.brown} />
                <Text style={styles.badgeText}>{selectedRecipe.readyInMinutes} min</Text>
              </View>
            )}
            {selectedRecipe.servings && (
              <View style={styles.badge}>
                <Ionicons name="people-outline" size={14} color={colors.brown} />
                <Text style={styles.badgeText}>Serves {selectedRecipe.servings}</Text>
              </View>
            )}
          </View>

          {/* Start Cooking Button */}
          <TouchableOpacity
            style={styles.cookButton}
            onPress={() => router.push(`/recipe/cook/${id}`)}
          >
            <Ionicons name="restaurant" size={20} color={colors.brown} />
            <Text style={styles.cookButtonText}>Start Cooking</Text>
          </TouchableOpacity>

          {/* Save to Cookbook button */}
          {isSaved && savedRecipe && (
            <TouchableOpacity
              style={styles.cookbookButton}
              onPress={() => setShowCookbookModal(true)}
            >
              <Ionicons name="book-outline" size={18} color={colors.coral} />
              <Text style={styles.cookbookButtonText}>Add to Cookbook</Text>
            </TouchableOpacity>
          )}

          {selectedRecipe.youtubeUrl && (
            <TouchableOpacity style={styles.videoButton} onPress={handleWatchVideo}>
              <Ionicons name="logo-youtube" size={20} color="#FF0000" />
              <Text style={styles.videoButtonText}>Watch Video</Text>
            </TouchableOpacity>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ingredients</Text>
            <View style={styles.ingredientsList}>
              {selectedRecipe.ingredients.map((ing, index) => (
                <View key={index} style={styles.ingredientRow}>
                  <View style={styles.bulletPoint} />
                  <Text style={styles.ingredientText}>
                    {ing.measure ? `${convertMeasurement(ing.measure, measurementSystem)} ` : ''}{ing.ingredient}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Instructions</Text>
            {convertInstructionsTemperature(selectedRecipe.instructions, measurementSystem).split('\n').filter(Boolean).map((step, index) => {
              // Remove leading step numbers (e.g., "1.", "1)", "Step 1:", etc.)
              const cleanedStep = step.trim().replace(/^(\d+[.):\-]?\s*|step\s*\d+[.:)]\s*)/i, '');
              return (
                <View key={index} style={styles.instructionRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.instructionText}>{cleanedStep}</Text>
                </View>
              );
            })}
          </View>

          {/* Reviews Section */}
          <View style={styles.section}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>Reviews</Text>
              <TouchableOpacity
                style={styles.writeReviewButton}
                onPress={() => setShowReviewModal(true)}
                accessibilityLabel="Write a review"
                accessibilityRole="button"
              >
                <Ionicons name="create-outline" size={16} color={colors.brown} />
                <Text style={styles.writeReviewText}>Write Review</Text>
              </TouchableOpacity>
            </View>

            {reviewsLoading ? (
              <View style={styles.reviewsLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : (
              <>
                {/* User Reviews */}
                {reviews.length > 0 && (
                  <Text style={styles.reviewSectionLabel}>Your Community</Text>
                )}
                {reviews.map((review) => (
                  <View key={review.id} style={styles.feedbackCard}>
                    <View style={styles.feedbackHeader}>
                      <View style={[
                        styles.feedbackAvatar,
                        { backgroundColor: review.rating >= 4 ? colors.primary : colors.coral }
                      ]}>
                        <Text style={styles.feedbackInitial}>
                          {review.author_display_name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.feedbackMeta}>
                        <Text style={styles.feedbackName}>{review.author_display_name}</Text>
                        <View style={styles.feedbackStars}>
                          {renderStars(review.rating)}
                        </View>
                      </View>
                      <Text style={styles.reviewDate}>
                        {new Date(review.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    {review.review_text && (
                      <Text style={styles.feedbackText}>"{review.review_text}"</Text>
                    )}
                  </View>
                ))}

                {/* Demo/Web Reviews */}
                <Text style={styles.reviewSectionLabel}>From the Web</Text>
                {demoReviews.map((review) => (
                  <View key={review.id} style={styles.feedbackCard}>
                    <View style={styles.feedbackHeader}>
                      <View style={[
                        styles.feedbackAvatar,
                        { backgroundColor: review.rating >= 4 ? colors.primary : colors.coral }
                      ]}>
                        <Text style={styles.feedbackInitial}>
                          {review.author_display_name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.feedbackMeta}>
                        <Text style={styles.feedbackName}>{review.author_display_name}</Text>
                        <View style={styles.feedbackStars}>
                          {renderStars(review.rating)}
                        </View>
                      </View>
                      <Text style={styles.reviewDate}>
                        {new Date(review.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    {review.review_text && (
                      <Text style={styles.feedbackText}>"{review.review_text}"</Text>
                    )}
                  </View>
                ))}
              </>
            )}
          </View>

          {selectedRecipe.source && (
            <TouchableOpacity style={styles.sourceButton} onPress={handleViewSource}>
              <Ionicons name="link-outline" size={18} color={colors.coral} />
              <Text style={styles.sourceButtonText}>View Original Recipe</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Add to Cookbook Modal */}
      {savedRecipe && (
        <AddToCookbookModal
          visible={showCookbookModal}
          onClose={() => setShowCookbookModal(false)}
          savedRecipeId={savedRecipe.id}
          recipeName={selectedRecipe.name}
        />
      )}

      {/* Add Review Modal */}
      <AddReviewModal
        visible={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onReviewSubmitted={fetchReviews}
        recipeId={id || ''}
        recipeSource={recipeSource}
        recipeName={selectedRecipe.name}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: -8,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textBase,
    color: colors.brownMuted,
  },
  scrollView: {
    flex: 1,
  },
  heroImage: {
    width: '100%',
    height: 280,
    resizeMode: 'cover',
  },
  heroImagePlaceholder: {
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.brown,
  },
  placeholderText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textBase,
    color: colors.brownMuted,
    marginTop: spacing.space2,
  },
  content: {
    padding: spacing.space4,
    backgroundColor: colors.cream,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    marginTop: -spacing.space6,
  },
  title: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.text2xl,
    fontWeight: typography.fontBold,
    color: colors.brown,
    marginBottom: spacing.space3,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
    marginBottom: spacing.space4,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingValue: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  ratingCount: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
  },
  userRatingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    padding: spacing.space3,
    borderRadius: borderRadius.md,
    marginBottom: spacing.space4,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  userRatingLabel: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    fontWeight: typography.fontMedium,
    color: colors.brownMuted,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.space2,
    marginBottom: spacing.space4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingVertical: spacing.space2,
    paddingHorizontal: spacing.space3,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.brown,
    gap: spacing.space1,
  },
  badgeText: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    color: colors.brown,
    fontWeight: typography.fontMedium,
  },
  cookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.space4,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.brown,
    gap: spacing.space2,
    marginBottom: spacing.space3,
    ...shadows.sm,
  },
  cookButtonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: typography.textBase,
    fontWeight: typography.fontBold,
    color: colors.brown,
  },
  cookbookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.space2,
    padding: spacing.space3,
    backgroundColor: colors.coralLight,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.coral,
    marginBottom: spacing.space3,
  },
  cookbookButtonText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textSm,
    fontWeight: typography.fontSemibold,
    color: colors.coral,
  },
  videoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    paddingVertical: spacing.space3,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.brown,
    gap: spacing.space2,
    marginBottom: spacing.space6,
  },
  videoButtonText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  section: {
    marginBottom: spacing.space6,
  },
  sectionTitle: {
    fontFamily: 'Quicksand-SemiBold',
    fontSize: typography.textLg,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
    marginBottom: spacing.space4,
  },
  ingredientsList: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.brown,
    padding: spacing.space4,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.space2,
  },
  bulletPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.coral,
    marginTop: 6,
    marginRight: spacing.space3,
  },
  ingredientText: {
    flex: 1,
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textBase,
    color: colors.brown,
    lineHeight: typography.textBase * 1.4,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.space4,
    backgroundColor: colors.white,
    padding: spacing.space4,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.space3,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  stepNumberText: {
    fontFamily: 'Nunito-Bold',
    fontSize: typography.textSm,
    fontWeight: typography.fontBold,
    color: colors.white,
  },
  instructionText: {
    flex: 1,
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textBase,
    color: colors.brown,
    lineHeight: typography.textBase * 1.5,
  },
  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.space4,
  },
  writeReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space1,
    paddingVertical: spacing.space2,
    paddingHorizontal: spacing.space3,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  writeReviewText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textSm,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  reviewsLoading: {
    padding: spacing.space6,
    alignItems: 'center',
  },
  noReviewsContainer: {
    alignItems: 'center',
    padding: spacing.space6,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  noReviewsText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
    marginTop: spacing.space3,
  },
  noReviewsSubtext: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    marginTop: spacing.space1,
  },
  reviewSectionLabel: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textSm,
    fontWeight: typography.fontSemibold,
    color: colors.brownMuted,
    marginBottom: spacing.space2,
    marginTop: spacing.space2,
  },
  feedbackCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.brown,
    padding: spacing.space4,
    marginBottom: spacing.space3,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.space3,
  },
  reviewDate: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textXs,
    color: colors.brownMuted,
  },
  feedbackAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.space3,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  feedbackInitial: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.textLg,
    fontWeight: typography.fontBold,
    color: colors.brown,
  },
  feedbackMeta: {
    flex: 1,
  },
  feedbackName: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textSm,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
    marginBottom: 2,
  },
  feedbackStars: {
    flexDirection: 'row',
    gap: 2,
  },
  feedbackText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brown,
    lineHeight: typography.textSm * 1.5,
    fontStyle: 'italic',
  },
  sourceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.space3,
    borderWidth: 2,
    borderColor: colors.coral,
    borderRadius: borderRadius.md,
    gap: spacing.space2,
    marginBottom: spacing.space4,
  },
  sourceButtonText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.coral,
  },
});
