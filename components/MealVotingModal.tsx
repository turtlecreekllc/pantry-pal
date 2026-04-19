/**
 * MealVotingModal Component
 * Allows household members to vote on proposed meals
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../lib/theme';
import {
  votingService,
  MealVote,
  VoteResponse,
  VoteSummary,
} from '../lib/votingService';
import { useAuth } from '../context/AuthContext';

interface MealVotingModalProps {
  readonly visible: boolean;
  readonly vote: MealVote | null;
  readonly onClose: () => void;
  readonly onVoteComplete?: () => void;
}

const VOTE_OPTIONS: readonly {
  readonly value: VoteResponse;
  readonly emoji: string;
  readonly label: string;
  readonly color: string;
}[] = [
  { value: 'yes', emoji: '👍', label: 'Yes!', color: colors.success },
  { value: 'maybe', emoji: '😐', label: 'Maybe', color: colors.warning },
  { value: 'no', emoji: '👎', label: 'Not this time', color: colors.error },
] as const;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Modal for voting on household meal proposals
 */
export function MealVotingModal({
  visible,
  vote,
  onClose,
  onVoteComplete,
}: MealVotingModalProps): React.ReactElement | null {
  const { user } = useAuth();
  const [selectedVote, setSelectedVote] = useState<VoteResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [summary, setSummary] = useState<VoteSummary | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(100));
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 100,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);
  useEffect(() => {
    const loadUserVote = async (): Promise<void> => {
      if (!vote || !user) return;
      const existingResponse = await votingService.getUserResponse(vote.id, user.id);
      if (existingResponse) {
        setSelectedVote(existingResponse);
        setHasVoted(true);
      }
      if (vote.responses) {
        setSummary(votingService.calculateSummary(vote.responses as unknown as Record<string, unknown>[]));
      }
    };
    loadUserVote();
  }, [vote, user]);
  const handleVote = useCallback(
    async (response: VoteResponse): Promise<void> => {
      if (!vote || !user || isSubmitting) return;
      setSelectedVote(response);
      setIsSubmitting(true);
      try {
        const success = await votingService.submitVote({
          voteId: vote.id,
          userId: user.id,
          response,
        });
        if (success) {
          setHasVoted(true);
          onVoteComplete?.();
        }
      } catch (error) {
        console.error('Failed to submit vote:', error);
        setSelectedVote(null);
      } finally {
        setIsSubmitting(false);
      }
    },
    [vote, user, isSubmitting, onVoteComplete],
  );
  const handleCancel = useCallback(async (): Promise<void> => {
    if (!vote || !user) return;
    const success = await votingService.cancelVote(vote.id, user.id);
    if (success) {
      onClose();
    }
  }, [vote, user, onClose]);
  if (!visible || !vote) {
    return null;
  }
  const isProposer = user?.id === vote.proposedBy;
  const voteDate = new Date(vote.proposedDate);
  const formattedDate = voteDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <Animated.View
        style={[
          styles.modalContainer,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.handle} />
        <View style={styles.header}>
          <View style={styles.voteIcon}>
            <Text style={styles.voteEmoji}>🗳️</Text>
          </View>
          <Text style={styles.title}>Vote on Dinner</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <View style={styles.recipeCard}>
          {vote.recipeImage ? (
            <Image
              source={{ uri: vote.recipeImage }}
              style={styles.recipeImage}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="restaurant" size={40} color={colors.textTertiary} />
            </View>
          )}
          <View style={styles.recipeInfo}>
            <Text style={styles.recipeName} numberOfLines={2}>
              {vote.recipeName}
            </Text>
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.dateText}>{formattedDate}</Text>
            </View>
          </View>
        </View>
        {hasVoted && summary ? (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Current Results</Text>
            <View style={styles.resultsBar}>
              {summary.yes > 0 && (
                <View
                  style={[
                    styles.resultSegment,
                    {
                      flex: summary.yes,
                      backgroundColor: colors.success,
                      borderTopLeftRadius: borderRadius.md,
                      borderBottomLeftRadius: borderRadius.md,
                    },
                  ]}
                />
              )}
              {summary.maybe > 0 && (
                <View
                  style={[
                    styles.resultSegment,
                    { flex: summary.maybe, backgroundColor: colors.warning },
                  ]}
                />
              )}
              {summary.no > 0 && (
                <View
                  style={[
                    styles.resultSegment,
                    {
                      flex: summary.no,
                      backgroundColor: colors.error,
                      borderTopRightRadius: borderRadius.md,
                      borderBottomRightRadius: borderRadius.md,
                    },
                  ]}
                />
              )}
            </View>
            <View style={styles.resultsLegend}>
              <View style={styles.legendItem}>
                <Text style={styles.legendEmoji}>👍</Text>
                <Text style={styles.legendCount}>{summary.yes}</Text>
              </View>
              <View style={styles.legendItem}>
                <Text style={styles.legendEmoji}>😐</Text>
                <Text style={styles.legendCount}>{summary.maybe}</Text>
              </View>
              <View style={styles.legendItem}>
                <Text style={styles.legendEmoji}>👎</Text>
                <Text style={styles.legendCount}>{summary.no}</Text>
              </View>
            </View>
            {selectedVote && (
              <View style={styles.yourVote}>
                <Text style={styles.yourVoteText}>
                  Your vote:{' '}
                  {VOTE_OPTIONS.find((o) => o.value === selectedVote)?.emoji}{' '}
                  {VOTE_OPTIONS.find((o) => o.value === selectedVote)?.label}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.votingContainer}>
            <Text style={styles.votingPrompt}>What do you think?</Text>
            <View style={styles.voteButtons}>
              {VOTE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.voteButton,
                    selectedVote === option.value && styles.voteButtonSelected,
                    selectedVote === option.value && { borderColor: option.color },
                  ]}
                  onPress={() => handleVote(option.value)}
                  disabled={isSubmitting}
                >
                  <Text style={styles.voteButtonEmoji}>{option.emoji}</Text>
                  <Text
                    style={[
                      styles.voteButtonLabel,
                      selectedVote === option.value && { color: option.color },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {isSubmitting && (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={styles.loader}
              />
            )}
          </View>
        )}
        {isProposer && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
          >
            <Text style={styles.cancelButtonText}>Cancel this vote</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl + 20,
    ...shadows.lg,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  voteIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  voteEmoji: {
    fontSize: 20,
  },
  title: {
    flex: 1,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold as '600',
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  recipeCard: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  recipeImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipeInfo: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  recipeName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold as '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dateText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  votingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  votingPrompt: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  voteButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
  },
  voteButton: {
    width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.md * 2) / 3,
    aspectRatio: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  voteButtonSelected: {
    backgroundColor: colors.surface,
    borderWidth: 2,
  },
  voteButtonEmoji: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  voteButtonLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium as '500',
  },
  loader: {
    marginTop: spacing.md,
  },
  resultsContainer: {
    paddingVertical: spacing.md,
  },
  resultsTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as '600',
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  resultsBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  resultSegment: {
    height: '100%',
  },
  resultsLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendEmoji: {
    fontSize: 16,
  },
  legendCount: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold as '600',
    color: colors.text,
  },
  yourVote: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    alignSelf: 'center',
  },
  yourVoteText: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: typography.weights.medium as '500',
  },
  cancelButton: {
    marginTop: spacing.md,
    padding: spacing.sm,
    alignSelf: 'center',
  },
  cancelButtonText: {
    fontSize: typography.sizes.sm,
    color: colors.error,
  },
});

