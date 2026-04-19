/**
 * Usage History Screen
 * Shows aggregated pantry item usage history across all items
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePantry } from '../../hooks/usePantry';
import { useHouseholdContext } from '../../context/HouseholdContext';
import { UsageHistoryEntry, PantryItem } from '../../lib/types';
import { colors, typography, spacing, borderRadius, shadows } from '../../lib/theme';

interface AggregatedUsageEntry extends UsageHistoryEntry {
  itemId: string;
  itemName: string;
  itemUnit: string;
}

type DateRange = '7d' | '30d' | '90d' | 'all';

const DATE_RANGE_OPTIONS: { key: DateRange; label: string }[] = [
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
  { key: 'all', label: 'All Time' },
];

/**
 * Formats a date string into a human-readable format
 */
function formatDate(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Groups usage entries by date (day)
 */
function groupByDate(entries: AggregatedUsageEntry[]): Record<string, AggregatedUsageEntry[]> {
  return entries.reduce((groups, entry) => {
    const date = new Date(entry.timestamp).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(entry);
    return groups;
  }, {} as Record<string, AggregatedUsageEntry[]>);
}

export default function UsageHistoryScreen(): React.ReactElement {
  const router = useRouter();
  const { activeHousehold } = useHouseholdContext();
  const { pantryItems, loading: pantryLoading, refreshPantry } = usePantry({
    householdId: activeHousehold?.id,
  });
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!pantryLoading && !initialLoadDone) {
      setInitialLoadDone(true);
    }
  }, [pantryLoading, initialLoadDone]);

  const aggregatedHistory = useMemo((): AggregatedUsageEntry[] => {
    const allEntries: AggregatedUsageEntry[] = [];
    const now = new Date();
    const daysMap: Record<DateRange, number> = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      'all': 365 * 10,
    };
    const cutoffDate = new Date(now.getTime() - daysMap[dateRange] * 24 * 60 * 60 * 1000);
    pantryItems.forEach((item: PantryItem) => {
      if (!item.usage_history) return;
      item.usage_history.forEach((entry: UsageHistoryEntry) => {
        const entryDate = new Date(entry.timestamp);
        if (entryDate >= cutoffDate) {
          allEntries.push({
            ...entry,
            itemId: item.id,
            itemName: item.name,
            itemUnit: item.unit || 'item',
          });
        }
      });
    });
    return allEntries.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [pantryItems, dateRange]);

  const groupedHistory = useMemo(() => groupByDate(aggregatedHistory), [aggregatedHistory]);
  const dateGroups = useMemo(() => Object.keys(groupedHistory), [groupedHistory]);

  const stats = useMemo(() => {
    const totalUsage = aggregatedHistory.reduce((sum, entry) => sum + entry.amount, 0);
    const uniqueItems = new Set(aggregatedHistory.map(e => e.itemId)).size;
    const recipesUsed = aggregatedHistory.filter(e => e.recipe_id).length;
    return { totalUsage, uniqueItems, recipesUsed };
  }, [aggregatedHistory]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshPantry();
    if (mountedRef.current) {
      setRefreshing(false);
    }
  }, [refreshPantry]);

  const handleEntryPress = useCallback((entry: AggregatedUsageEntry) => {
    if (entry.recipe_id) {
      router.push(`/recipe/${entry.recipe_id}`);
    } else {
      router.push(`/item/${entry.itemId}`);
    }
  }, [router]);

  const renderDateRangeSelector = useCallback(() => (
    <View style={styles.dateRangeContainer}>
      {DATE_RANGE_OPTIONS.map(({ key, label }) => (
        <TouchableOpacity
          key={key}
          style={[
            styles.dateRangeButton,
            dateRange === key && styles.dateRangeButtonActive,
          ]}
          onPress={() => setDateRange(key)}
          accessibilityRole="button"
          accessibilityLabel={`Filter by ${label}`}
          accessibilityState={{ selected: dateRange === key }}
        >
          <Text
            style={[
              styles.dateRangeText,
              dateRange === key && styles.dateRangeTextActive,
            ]}
          >
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  ), [dateRange]);

  const renderSummary = useCallback(() => (
    <View style={styles.summaryContainer}>
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{stats.totalUsage.toFixed(1)}</Text>
        <Text style={styles.summaryLabel}>Total Used</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{stats.uniqueItems}</Text>
        <Text style={styles.summaryLabel}>Items</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{stats.recipesUsed}</Text>
        <Text style={styles.summaryLabel}>For Recipes</Text>
      </View>
    </View>
  ), [stats]);

  const renderUsageEntry = useCallback(({ item: entry }: { item: AggregatedUsageEntry }) => (
    <TouchableOpacity
      style={styles.entryRow}
      onPress={() => handleEntryPress(entry)}
      accessibilityRole="button"
      accessibilityLabel={`${entry.itemName}, used ${entry.amount} ${entry.itemUnit}`}
    >
      <View style={styles.entryIcon}>
        <Ionicons
          name={entry.recipe_id ? 'restaurant' : 'remove-circle'}
          size={20}
          color={entry.recipe_id ? colors.success : colors.coral}
        />
      </View>
      <View style={styles.entryContent}>
        <Text style={styles.entryItemName} numberOfLines={1}>
          {entry.itemName}
        </Text>
        {entry.recipe_name && (
          <Text style={styles.entryRecipeName} numberOfLines={1}>
            Used in: {entry.recipe_name}
          </Text>
        )}
        {entry.note && !entry.recipe_name && (
          <Text style={styles.entryNote} numberOfLines={1}>
            {entry.note}
          </Text>
        )}
        <Text style={styles.entryTime}>{formatDate(entry.timestamp)}</Text>
      </View>
      <View style={styles.entryAmount}>
        <Text style={styles.entryAmountText}>
          -{entry.amount.toFixed(entry.amount % 1 === 0 ? 0 : 1)}
        </Text>
        <Text style={styles.entryUnit}>{entry.itemUnit}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.brownMuted} />
    </TouchableOpacity>
  ), [handleEntryPress]);

  const renderDateGroup = useCallback(({ item: dateKey }: { item: string }) => (
    <View style={styles.dateGroup}>
      <Text style={styles.dateGroupTitle}>{dateKey}</Text>
      {groupedHistory[dateKey].map((entry, index) => (
        <View key={`${entry.itemId}-${entry.timestamp}-${index}`}>
          {renderUsageEntry({ item: entry })}
        </View>
      ))}
    </View>
  ), [groupedHistory, renderUsageEntry]);

  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyState}>
      <Ionicons name="time-outline" size={64} color={colors.brownMuted} />
      <Text style={styles.emptyStateTitle}>No Usage History</Text>
      <Text style={styles.emptyStateText}>
        When you use items from your pantry, they'll appear here.
      </Text>
    </View>
  ), []);

  const renderHeader = useCallback(() => (
    <View>
      {renderDateRangeSelector()}
      {renderSummary()}
      <Text style={styles.sectionTitle}>Usage History</Text>
    </View>
  ), [renderDateRangeSelector, renderSummary]);

  if (!initialLoadDone && pantryLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading usage history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={dateGroups}
        keyExtractor={(item) => item}
        renderItem={renderDateGroup}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.cream,
    padding: spacing.space6,
  },
  loadingText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textBase,
    color: colors.brownMuted,
    marginTop: spacing.space3,
  },
  listContent: {
    padding: spacing.space4,
    paddingBottom: spacing.space8,
  },
  dateRangeContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.space1,
    marginBottom: spacing.space4,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  dateRangeButton: {
    flex: 1,
    paddingVertical: spacing.space2,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  dateRangeButtonActive: {
    backgroundColor: colors.primary,
  },
  dateRangeText: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    color: colors.brownMuted,
  },
  dateRangeTextActive: {
    fontFamily: 'Nunito-SemiBold',
    color: colors.brown,
    fontWeight: typography.fontSemibold,
  },
  summaryContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.space4,
    marginBottom: spacing.space4,
    borderWidth: 2,
    borderColor: colors.brown,
    ...shadows.sm,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.text2xl,
    fontWeight: typography.fontBold,
    color: colors.brown,
  },
  summaryLabel: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textXs,
    color: colors.brownMuted,
    marginTop: spacing.space1,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.creamDark,
    marginHorizontal: spacing.space2,
  },
  sectionTitle: {
    fontFamily: 'Quicksand-SemiBold',
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
    marginBottom: spacing.space3,
  },
  dateGroup: {
    marginBottom: spacing.space4,
  },
  dateGroupTitle: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textSm,
    fontWeight: typography.fontSemibold,
    color: colors.brownMuted,
    marginBottom: spacing.space2,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.space3,
    marginBottom: spacing.space2,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  entryIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.space3,
  },
  entryContent: {
    flex: 1,
    marginRight: spacing.space2,
  },
  entryItemName: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  entryRecipeName: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.success,
    marginTop: 2,
  },
  entryNote: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    marginTop: 2,
  },
  entryTime: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textXs,
    color: colors.brownMuted,
    marginTop: 2,
  },
  entryAmount: {
    alignItems: 'flex-end',
    marginRight: spacing.space2,
  },
  entryAmountText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.coral,
  },
  entryUnit: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textXs,
    color: colors.brownMuted,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.space8,
  },
  emptyStateTitle: {
    fontFamily: 'Quicksand-SemiBold',
    fontSize: typography.textLg,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
    marginTop: spacing.space4,
  },
  emptyStateText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textBase,
    color: colors.brownMuted,
    textAlign: 'center',
    marginTop: spacing.space2,
    maxWidth: 280,
  },
});

