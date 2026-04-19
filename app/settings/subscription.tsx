/**
 * Subscription Settings Screen
 * Complete subscription management with dashboard and history
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SubscriptionDashboard } from '../../components/SubscriptionDashboard';
import { TokenUsageHistory } from '../../components/TokenUsageHistory';
import { useSubscription } from '../../hooks/useSubscription';

type TabType = 'dashboard' | 'history';

export default function SubscriptionScreen() {
  const router = useRouter();
  const { refresh } = useSubscription();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };
  const handleViewHistory = () => {
    setActiveTab('history');
  };
  const handleUpgrade = () => {
    // Navigation handled by dashboard component
  };
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={['#4CAF50']}
          tintColor="#4CAF50"
        />
      }
    >
      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'dashboard' && styles.tabActive]}
            onPress={() => setActiveTab('dashboard')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'dashboard' }}
          >
            <Text style={[styles.tabText, activeTab === 'dashboard' && styles.tabTextActive]}>
              Dashboard
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.tabActive]}
            onPress={() => setActiveTab('history')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'history' }}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
              Usage History
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* Content */}
      {activeTab === 'dashboard' ? (
        <SubscriptionDashboard
          onViewHistory={handleViewHistory}
          onUpgrade={handleUpgrade}
        />
      ) : (
        <TokenUsageHistory showChart={true} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  tabContainer: {
    marginBottom: 16,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  tabTextActive: {
    color: '#4CAF50',
    fontWeight: '600',
  },
});
