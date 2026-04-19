/**
 * Add Review Modal
 * Allows users to rate recipes and leave reviews
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../lib/theme';
import { StarRating } from './ui/StarRating';
import { RecipeReview, RecipeSource } from '../lib/types';
import { createOrUpdateReview, getUserReviewForRecipe } from '../lib/reviewService';

interface AddReviewModalProps {
  visible: boolean;
  onClose: () => void;
  onReviewSubmitted: () => void;
  recipeId: string;
  recipeSource: RecipeSource;
  recipeName: string;
}

export function AddReviewModal({
  visible,
  onClose,
  onReviewSubmitted,
  recipeId,
  recipeSource,
  recipeName,
}: AddReviewModalProps): React.ReactElement {
  const [rating, setRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFetchingExisting, setIsFetchingExisting] = useState<boolean>(true);
  const [existingReview, setExistingReview] = useState<RecipeReview | null>(null);

  useEffect(() => {
    if (visible) {
      loadExistingReview();
    }
  }, [visible, recipeId, recipeSource]);

  const loadExistingReview = async (): Promise<void> => {
    setIsFetchingExisting(true);
    try {
      const review = await getUserReviewForRecipe(recipeId, recipeSource);
      if (review) {
        setExistingReview(review);
        setRating(review.rating);
        setReviewText(review.review_text || '');
      } else {
        setExistingReview(null);
        setRating(0);
        setReviewText('');
      }
    } catch (error) {
      console.error('Error loading existing review:', error);
    } finally {
      setIsFetchingExisting(false);
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating before submitting.');
      return;
    }
    setIsLoading(true);
    try {
      const result = await createOrUpdateReview({
        recipeId,
        recipeSource,
        rating,
        reviewText: reviewText.trim() || undefined,
      });
      if (result.success) {
        onReviewSubmitted();
        onClose();
        setRating(0);
        setReviewText('');
        setExistingReview(null);
      } else {
        Alert.alert('Error', result.error || 'Failed to submit review');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = (): void => {
    if (!isLoading) {
      onClose();
      if (!existingReview) {
        setRating(0);
        setReviewText('');
      }
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <View style={styles.overlay}>
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>
                {existingReview ? 'Edit Your Review' : 'Write a Review'}
              </Text>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
                disabled={isLoading}
                accessibilityLabel="Close modal"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={24} color={colors.brown} />
              </TouchableOpacity>
            </View>

            {isFetchingExisting ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <ScrollView
                style={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Recipe Name */}
                <Text style={styles.recipeName} numberOfLines={2}>
                  {recipeName}
                </Text>

                {/* Rating Section */}
                <View style={styles.ratingSection}>
                  <Text style={styles.ratingLabel}>Your Rating</Text>
                  <View style={styles.starContainer}>
                    <StarRating
                      rating={rating}
                      onChange={setRating}
                      size={36}
                      color={colors.warning}
                    />
                  </View>
                  <Text style={styles.ratingHint}>
                    {rating === 0 && 'Tap a star to rate'}
                    {rating === 1 && 'Poor'}
                    {rating === 2 && 'Fair'}
                    {rating === 3 && 'Good'}
                    {rating === 4 && 'Very Good'}
                    {rating === 5 && 'Excellent!'}
                  </Text>
                </View>

                {/* Review Text */}
                <View style={styles.reviewSection}>
                  <Text style={styles.reviewLabel}>Your Review (Optional)</Text>
                  <TextInput
                    style={styles.reviewInput}
                    value={reviewText}
                    onChangeText={setReviewText}
                    placeholder="Share your experience with this recipe..."
                    placeholderTextColor={colors.brownMuted}
                    multiline
                    numberOfLines={4}
                    maxLength={500}
                    textAlignVertical="top"
                    accessibilityLabel="Review text input"
                  />
                  <Text style={styles.characterCount}>
                    {reviewText.length}/500
                  </Text>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (rating === 0 || isLoading) && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={rating === 0 || isLoading}
                  accessibilityLabel={existingReview ? 'Update review' : 'Submit review'}
                  accessibilityRole="button"
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={colors.brown} />
                  ) : (
                    <>
                      <Ionicons name="send" size={18} color={colors.brown} />
                      <Text style={styles.submitButtonText}>
                        {existingReview ? 'Update Review' : 'Submit Review'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(61, 35, 20, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.cream,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '85%',
    paddingBottom: spacing.space8,
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.space4,
    borderBottomWidth: 2,
    borderBottomColor: colors.brown,
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  headerTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.textLg,
    fontWeight: typography.fontBold,
    color: colors.brown,
  },
  closeButton: {
    padding: spacing.space1,
  },
  loadingContainer: {
    padding: spacing.space12,
    alignItems: 'center',
  },
  scrollContent: {
    padding: spacing.space4,
  },
  recipeName: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
    backgroundColor: colors.peachLight,
    padding: spacing.space3,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.brown,
    marginBottom: spacing.space4,
  },
  ratingSection: {
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.space4,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.brown,
    marginBottom: spacing.space4,
    ...shadows.sm,
  },
  ratingLabel: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    fontWeight: typography.fontMedium,
    color: colors.brownMuted,
    marginBottom: spacing.space3,
  },
  starContainer: {
    marginVertical: spacing.space2,
  },
  ratingHint: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    fontWeight: typography.fontMedium,
    color: colors.coral,
    marginTop: spacing.space2,
  },
  reviewSection: {
    marginBottom: spacing.space4,
  },
  reviewLabel: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    fontWeight: typography.fontMedium,
    color: colors.brownMuted,
    marginBottom: spacing.space2,
  },
  reviewInput: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.brown,
    borderRadius: borderRadius.md,
    padding: spacing.space3,
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textBase,
    color: colors.brown,
    minHeight: 120,
  },
  characterCount: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textXs,
    color: colors.brownMuted,
    textAlign: 'right',
    marginTop: spacing.space1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.space4,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.brown,
    gap: spacing.space2,
    ...shadows.sm,
  },
  submitButtonDisabled: {
    backgroundColor: colors.peach,
    opacity: 0.7,
  },
  submitButtonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: typography.textBase,
    fontWeight: typography.fontBold,
    color: colors.brown,
  },
});

