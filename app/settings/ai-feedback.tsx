/**
 * AI Feedback Review Screen
 * Allows users (and admins) to view and manage feedback on AI responses.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMyFeedback, getFeedbackStats, deleteAIFeedback } from '../../lib/aiFeedbackService';
import { AIFeedback, AIFeedbackRating } from '../../lib/types';
import { colors, typography, spacing, borderRadius, shadows } from '../../lib/theme';

type FilterType = 'all' | 'positive' | 'negative';

/**
 * Format date to a readable string
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  return date.toLocaleDateString();
}

/**
 * Truncate text to a maximum length
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

export default function AIFeedbackScreen(): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [feedback, setFeedback] = useState<AIFeedback[]>([]);
  const [stats, setStats] = useState({ total: 0, positive: 0, negative: 0 });
  const [filter, setFilter] = useState<FilterType>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = useCallback(async (): Promise<void> => {
    try {
      const [feedbackData, statsData] = await Promise.all([
        getMyFeedback({ rating: filter === 'all' ? undefined : filter }),
        getFeedbackStats(),
      ]);
      setFeedback(feedbackData);
      setStats(statsData);
    } catch (error) {
      console.error('[AIFeedback] Error loading data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback((): void => {
    setIsRefreshing(true);
    loadData();
  }, [loadData]);

  const handleDelete = useCallback((item: AIFeedback): void => {
    Alert.alert(
      'Delete Feedback',
      'Are you sure you want to delete this feedback?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteAIFeedback(item.id);
            if (success) {
              setFeedback((prev) => prev.filter((f) => f.id !== item.id));
              setStats((prev) => ({
                total: prev.total - 1,
                positive: item.rating === 'positive' ? prev.positive - 1 : prev.positive,
                negative: item.rating === 'negative' ? prev.negative - 1 : prev.negative,
              }));
            }
          },
        },
      ]
    );
  }, []);

  const toggleExpand = useCallback((id: string): void => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const renderFeedbackItem = useCallback(({ item }: { item: AIFeedback }): React.ReactElement => {
    const isExpanded = expandedId === item.id;
    const isPositive = item.rating === 'positive';
    return (
      <TouchableOpacity
        style={styles.feedbackCard}
        onPress={() => toggleExpand(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.feedbackHeader}>
          <View style={[styles.ratingBadge, isPositive ? styles.positiveBadge : styles.negativeBadge]}>
            <Ionicons
              name={isPositive ? 'thumbs-up' : 'thumbs-down'}
              size={14}
              color={isPositive ? colors.success : colors.coral}
            />
          </View>
          <View style={styles.feedbackMeta}>
            <Text style={styles.feedbackDate}>{formatDate(item.created_at)}</Text>
            {item.screen_context && (
              <Text style={styles.feedbackContext}>• {item.screen_context}</Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item)}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Ionicons name="trash-outline" size={16} color={colors.brownMuted} />
          </TouchableOpacity>
        </View>
        <View style={styles.feedbackContent}>
          <Text style={styles.contentLabel}>You asked:</Text>
          <Text style={styles.userMessage} numberOfLines={isExpanded ? undefined : 2}>
            {item.user_message}
          </Text>
          <Text style={styles.contentLabel}>Pepper replied:</Text>
          <Text style={styles.aiResponse} numberOfLines={isExpanded ? undefined : 3}>
            {item.ai_response}
          </Text>
          {item.comment && (
            <>
              <Text style={styles.contentLabel}>Your comment:</Text>
              <Text style={styles.commentText}>{item.comment}</Text>
            </>
          )}
        </View>
        <View style={styles.expandHint}>
          <Text style={styles.expandHintText}>
            {isExpanded ? 'Tap to collapse' : 'Tap to expand'}
          </Text>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={colors.brownMuted}
          />
        </View>
      </TouchableOpacity>
    );
  }, [expandedId, toggleExpand, handleDelete]);

  const renderEmptyState = useCallback((): React.ReactElement => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="chatbubbles-outline" size={48} color={colors.brownMuted} />
      </View>
      <Text style={styles.emptyTitle}>No feedback yet</Text>
      <Text style={styles.emptySubtitle}>
        Rate AI responses with thumbs up or down to help improve Pepper's answers
      </Text>
    </View>
  ), []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={colors.brown} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Feedback</Text>
        <View style={styles.headerSpacer} />
      </View>
      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, styles.positiveCard]}>
          <View style={styles.statRow}>
            <Ionicons name="thumbs-up" size={16} color={colors.success} />
            <Text style={[styles.statValue, styles.positiveValue]}>{stats.positive}</Text>
          </View>
          <Text style={styles.statLabel}>Helpful</Text>
        </View>
        <View style={[styles.statCard, styles.negativeCard]}>
          <View style={styles.statRow}>
            <Ionicons name="thumbs-down" size={16} color={colors.coral} />
            <Text style={[styles.statValue, styles.negativeValue]}>{stats.negative}</Text>
          </View>
          <Text style={styles.statLabel}>Not Helpful</Text>
        </View>
      </View>
      {/* Filter tabs */}
      <View style={styles.filterContainer}>
        {(['all', 'positive', 'negative'] as FilterType[]).map((filterType) => (
          <TouchableOpacity
            key={filterType}
            style={[styles.filterTab, filter === filterType && styles.filterTabActive]}
            onPress={() => setFilter(filterType)}
          >
            <Text style={[styles.filterTabText, filter === filterType && styles.filterTabTextActive]}>
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* Feedback list */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={feedback}
          renderItem={renderFeedbackItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space3,
    borderBottomWidth: 2,
    borderBottomColor: colors.brown,
    backgroundColor: colors.white,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.textXl,
    fontWeight: typography.fontBold,
    color: colors.brown,
  },
  headerSpacer: {
    width: 40,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space3,
    gap: spacing.space2,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.space3,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.brown,
    ...shadows.sm,
  },
  positiveCard: {
    backgroundColor: colors.successBg,
  },
  negativeCard: {
    backgroundColor: colors.errorBg,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space1,
  },
  statValue: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.text2xl,
    fontWeight: typography.fontBold,
    color: colors.brown,
  },
  positiveValue: {
    color: colors.success,
  },
  negativeValue: {
    color: colors.coral,
  },
  statLabel: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textXs,
    color: colors.brownMuted,
    marginTop: spacing.space1,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.space4,
    marginBottom: spacing.space3,
    gap: spacing.space2,
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing.space2,
    paddingHorizontal: spacing.space3,
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.brownMuted,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.brown,
  },
  filterTabText: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    fontWeight: typography.fontMedium,
    color: colors.brownMuted,
  },
  filterTabTextActive: {
    color: colors.brown,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.space4,
    paddingBottom: spacing.space6,
  },
  feedbackCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.space3,
    marginBottom: spacing.space3,
    borderWidth: 2,
    borderColor: colors.brown,
    ...shadows.sm,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.space2,
  },
  ratingBadge: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  positiveBadge: {
    backgroundColor: colors.successBg,
    borderColor: colors.success,
  },
  negativeBadge: {
    backgroundColor: colors.errorBg,
    borderColor: colors.coral,
  },
  feedbackMeta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.space2,
    gap: spacing.space1,
  },
  feedbackDate: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textXs,
    fontWeight: typography.fontMedium,
    color: colors.brownMuted,
  },
  feedbackContext: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textXs,
    color: colors.brownMuted,
    textTransform: 'capitalize',
  },
  deleteButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackContent: {
    gap: spacing.space1,
  },
  contentLabel: {
    fontFamily: 'Nunito-Bold',
    fontSize: typography.textXs,
    fontWeight: typography.fontBold,
    color: colors.brownMuted,
    marginTop: spacing.space1,
  },
  userMessage: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brown,
    backgroundColor: colors.cream,
    padding: spacing.space2,
    borderRadius: borderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  aiResponse: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brown,
    backgroundColor: colors.creamLight,
    padding: spacing.space2,
    borderRadius: borderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.brownMuted,
  },
  commentText: {
    fontFamily: 'Nunito-Italic',
    fontSize: typography.textSm,
    color: colors.brownLight,
    fontStyle: 'italic',
    paddingLeft: spacing.space2,
  },
  expandHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.space2,
    gap: spacing.space1,
  },
  expandHintText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textXs,
    color: colors.brownMuted,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.space8,
    paddingHorizontal: spacing.space4,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.creamDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.space4,
  },
  emptyTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.textLg,
    fontWeight: typography.fontBold,
    color: colors.brown,
    marginBottom: spacing.space2,
  },
  emptySubtitle: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    textAlign: 'center',
    lineHeight: typography.textSm * 1.5,
  },
});

