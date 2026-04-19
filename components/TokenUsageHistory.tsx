/**
 * TokenUsageHistory Component
 * Displays token transaction history and usage statistics
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '../hooks/useSubscription';
import {
  TokenTransaction,
  AIFeatureType,
  AI_FEATURE_TYPES,
} from '../lib/types';
import * as tokenService from '../lib/tokenService';

type DateRange = '7d' | '30d' | '90d' | 'all';

interface TokenUsageHistoryProps {
  showChart?: boolean;
  limit?: number;
}

export function TokenUsageHistory({ showChart = true, limit }: TokenUsageHistoryProps) {
  const { getTokenHistory, getTokenStats } = useSubscription();
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [stats, setStats] = useState<{
    totalUsed: number;
    byFeature: Record<AIFeatureType, number>;
    dailyUsage: { date: string; tokens: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [selectedFeature, setSelectedFeature] = useState<AIFeatureType | null>(null);
  const daysMap: Record<DateRange, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    'all': 365,
  };
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [txns, statsData] = await Promise.all([
        getTokenHistory(limit || 50),
        getTokenStats(daysMap[dateRange]),
      ]);
      setTransactions(txns);
      setStats(statsData);
    } finally {
      setLoading(false);
    }
  }, [getTokenHistory, getTokenStats, dateRange, limit, daysMap]);
  useEffect(() => {
    loadData();
  }, [loadData]);
  const filteredTransactions = selectedFeature
    ? transactions.filter(t => t.feature_type === selectedFeature)
    : transactions;
  const renderDateRangeSelector = () => (
    <View style={styles.dateRangeContainer}>
      {(['7d', '30d', '90d', 'all'] as DateRange[]).map(range => (
        <TouchableOpacity
          key={range}
          style={[
            styles.dateRangeButton,
            dateRange === range && styles.dateRangeButtonActive,
          ]}
          onPress={() => setDateRange(range)}
        >
          <Text
            style={[
              styles.dateRangeText,
              dateRange === range && styles.dateRangeTextActive,
            ]}
          >
            {range === 'all' ? 'All Time' : range.replace('d', ' Days')}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
  const renderUsageChart = () => {
    if (!stats?.dailyUsage || stats.dailyUsage.length === 0) {
      return null;
    }
    const maxUsage = Math.max(...stats.dailyUsage.map(d => d.tokens), 1);
    const lastDays = stats.dailyUsage.slice(-14);
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Daily Usage</Text>
        <View style={styles.chart}>
          {lastDays.map((day, index) => (
            <View key={day.date} style={styles.chartBar}>
              <View
                style={[
                  styles.chartBarFill,
                  {
                    height: `${(day.tokens / maxUsage) * 100}%`,
                  },
                ]}
              />
              {index % 2 === 0 && (
                <Text style={styles.chartBarLabel}>
                  {new Date(day.date).getDate()}
                </Text>
              )}
            </View>
          ))}
        </View>
      </View>
    );
  };
  const renderFeatureBreakdown = () => {
    if (!stats?.byFeature) return null;
    const features = Object.entries(stats.byFeature)
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a);
    if (features.length === 0) return null;
    return (
      <View style={styles.breakdownContainer}>
        <Text style={styles.breakdownTitle}>Usage by Feature</Text>
        {features.map(([feature, count]) => (
          <TouchableOpacity
            key={feature}
            style={[
              styles.breakdownRow,
              selectedFeature === feature && styles.breakdownRowActive,
            ]}
            onPress={() =>
              setSelectedFeature(
                selectedFeature === feature ? null : (feature as AIFeatureType)
              )
            }
          >
            <View style={styles.breakdownInfo}>
              <Ionicons
                name={getFeatureIcon(feature as AIFeatureType) as any}
                size={20}
                color={selectedFeature === feature ? '#4CAF50' : '#666'}
              />
              <Text
                style={[
                  styles.breakdownLabel,
                  selectedFeature === feature && styles.breakdownLabelActive,
                ]}
              >
                {tokenService.getFeatureDisplayName(feature as AIFeatureType)}
              </Text>
            </View>
            <View style={styles.breakdownValue}>
              <Text style={styles.breakdownCount}>{count}</Text>
              <Text style={styles.breakdownUnit}>tokens</Text>
            </View>
          </TouchableOpacity>
        ))}
        {selectedFeature && (
          <TouchableOpacity
            style={styles.clearFilterButton}
            onPress={() => setSelectedFeature(null)}
          >
            <Text style={styles.clearFilterText}>Clear Filter</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };
  const renderTransaction = ({ item }: { item: TokenTransaction }) => {
    const isUsage = item.transaction_type === 'usage';
    const isGrant = item.transaction_type === 'subscription_grant' || item.transaction_type === 'purchase';
    return (
      <View style={styles.transactionRow}>
        <View style={styles.transactionIcon}>
          <Ionicons
            name={isUsage ? 'remove-circle' : 'add-circle'}
            size={24}
            color={isUsage ? '#FF5722' : '#4CAF50'}
          />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionTitle}>
            {isUsage && item.feature_type
              ? tokenService.getFeatureDisplayName(item.feature_type)
              : tokenService.getTransactionTypeDisplay(item.transaction_type)}
          </Text>
          <Text style={styles.transactionDate}>
            {new Date(item.created_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        <View style={styles.transactionAmount}>
          <Text
            style={[
              styles.transactionAmountText,
              isUsage ? styles.transactionAmountNegative : styles.transactionAmountPositive,
            ]}
          >
            {tokenService.formatTokenAmount(item.amount)}
          </Text>
          <Text style={styles.transactionBalance}>
            Balance: {item.balance_after}
          </Text>
        </View>
      </View>
    );
  };
  const renderSummary = () => (
    <View style={styles.summaryContainer}>
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{stats?.totalUsed || 0}</Text>
        <Text style={styles.summaryLabel}>Tokens Used</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{transactions.length}</Text>
        <Text style={styles.summaryLabel}>Transactions</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>
          {Object.keys(stats?.byFeature || {}).length}
        </Text>
        <Text style={styles.summaryLabel}>Features Used</Text>
      </View>
    </View>
  );
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }
  return (
    <View style={styles.container}>
      {renderDateRangeSelector()}
      {renderSummary()}
      {showChart && renderUsageChart()}
      {renderFeatureBreakdown()}
      <View style={styles.transactionsSection}>
        <Text style={styles.sectionTitle}>
          {selectedFeature ? 'Filtered Transactions' : 'Recent Transactions'}
        </Text>
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No transactions yet</Text>
          </View>
        ) : (
          <FlatList
            data={filteredTransactions}
            keyExtractor={item => item.id}
            renderItem={renderTransaction}
            scrollEnabled={false}
          />
        )}
      </View>
    </View>
  );
}

function getFeatureIcon(feature: AIFeatureType): string {
  const icons: Record<AIFeatureType, string> = {
    quick_recipe_suggestion: 'flash',
    detailed_recipe_generation: 'restaurant',
    weekly_meal_plan: 'calendar',
    ingredient_substitution: 'swap-horizontal',
    nutritional_analysis: 'nutrition',
    smart_grocery_list: 'cart',
    recipe_modification: 'create',
    use_it_up_plan: 'time',
    chat_query: 'chatbubble',
  };
  return icons[feature] || 'help-circle';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dateRangeContainer: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  dateRangeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  dateRangeButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dateRangeText: {
    fontSize: 13,
    color: '#666',
  },
  dateRangeTextActive: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  summaryContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 8,
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  chart: {
    flexDirection: 'row',
    height: 100,
    alignItems: 'flex-end',
    gap: 4,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
  },
  chartBarFill: {
    width: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
    minHeight: 4,
  },
  chartBarLabel: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
  },
  breakdownContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  breakdownRowActive: {
    backgroundColor: '#E8F5E9',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  breakdownInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
  },
  breakdownLabelActive: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  breakdownValue: {
    alignItems: 'flex-end',
  },
  breakdownCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  breakdownUnit: {
    fontSize: 11,
    color: '#999',
  },
  clearFilterButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  clearFilterText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  transactionsSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  transactionIcon: {
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionAmountText: {
    fontSize: 16,
    fontWeight: '600',
  },
  transactionAmountPositive: {
    color: '#4CAF50',
  },
  transactionAmountNegative: {
    color: '#FF5722',
  },
  transactionBalance: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
});

