import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHousehold } from '../hooks/useHousehold';
import { useHouseholdContext } from '../context/HouseholdContext';
import { HouseholdActivity } from '../lib/types';

interface ActivityFeedProps {
  /** Maximum number of items to show */
  limit?: number;
  /** Show as compact card (for dashboard) or full list */
  compact?: boolean;
  /** Called when user wants to see more */
  onSeeAll?: () => void;
}

interface ActivityItemConfig {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  formatMessage: (data: Record<string, unknown>, email?: string) => string;
}

const ACTIVITY_CONFIG: Record<HouseholdActivity['action_type'], ActivityItemConfig> = {
  item_added: {
    icon: 'add-circle',
    color: '#4CAF50',
    bgColor: '#e8f5e9',
    formatMessage: (data, email) => {
      const name = (data.item_name as string) || 'an item';
      const user = email?.split('@')[0] || 'Someone';
      return `${user} added ${name} to the pantry`;
    },
  },
  item_updated: {
    icon: 'create',
    color: '#2196F3',
    bgColor: '#e3f2fd',
    formatMessage: (data, email) => {
      const name = (data.item_name as string) || 'an item';
      const user = email?.split('@')[0] || 'Someone';
      return `${user} updated ${name}`;
    },
  },
  item_deleted: {
    icon: 'trash',
    color: '#f44336',
    bgColor: '#ffebee',
    formatMessage: (data, email) => {
      const name = (data.item_name as string) || 'an item';
      const user = email?.split('@')[0] || 'Someone';
      return `${user} removed ${name} from the pantry`;
    },
  },
  meal_planned: {
    icon: 'calendar',
    color: '#9C27B0',
    bgColor: '#f3e5f5',
    formatMessage: (data, email) => {
      const recipe = (data.recipe_name as string) || 'a meal';
      const user = email?.split('@')[0] || 'Someone';
      return `${user} planned ${recipe}`;
    },
  },
  meal_completed: {
    icon: 'checkmark-circle',
    color: '#FF9800',
    bgColor: '#fff3e0',
    formatMessage: (data, email) => {
      const recipe = (data.recipe_name as string) || 'a meal';
      const user = email?.split('@')[0] || 'Someone';
      return `${user} completed ${recipe}`;
    },
  },
  member_joined: {
    icon: 'person-add',
    color: '#00BCD4',
    bgColor: '#e0f7fa',
    formatMessage: (data, email) => {
      const user = email?.split('@')[0] || 'A new member';
      return `${user} joined the household`;
    },
  },
  member_left: {
    icon: 'person-remove',
    color: '#607D8B',
    bgColor: '#eceff1',
    formatMessage: (data, email) => {
      const user = email?.split('@')[0] || 'Someone';
      return `${user} left the household`;
    },
  },
};

/**
 * Formats a timestamp into a relative time string
 */
function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * Displays household activity feed showing recent actions by members
 */
export function ActivityFeed({ limit = 20, compact = false, onSeeAll }: ActivityFeedProps) {
  const { activeHousehold } = useHouseholdContext();
  const { fetchActivity } = useHousehold();
  const [activities, setActivities] = useState<HouseholdActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadActivity = useCallback(async () => {
    if (!activeHousehold) {
      setActivities([]);
      setLoading(false);
      return;
    }
    try {
      const data = await fetchActivity(limit);
      setActivities(data);
    } catch (err) {
      console.error('Failed to load activity:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeHousehold, fetchActivity, limit]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadActivity();
  };

  const renderActivityItem = ({ item }: { item: HouseholdActivity }) => {
    const config = ACTIVITY_CONFIG[item.action_type];
    if (!config) return null;
    return (
      <View style={styles.activityItem}>
        <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
          <Ionicons name={config.icon} size={20} color={config.color} />
        </View>
        <View style={styles.activityContent}>
          <Text style={styles.activityMessage}>
            {config.formatMessage(item.action_data, item.user_email)}
          </Text>
          <Text style={styles.activityTime}>{formatRelativeTime(item.created_at)}</Text>
        </View>
      </View>
    );
  };

  if (!activeHousehold) {
    return null;
  }

  if (loading) {
    return (
      <View style={[styles.container, compact && styles.compactContainer]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#4CAF50" />
        </View>
      </View>
    );
  }

  if (compact) {
    const displayActivities = activities.slice(0, 5);
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactHeader}>
          <View style={styles.headerLeft}>
            <Ionicons name="pulse" size={18} color="#4CAF50" />
            <Text style={styles.compactTitle}>Recent Activity</Text>
          </View>
          {onSeeAll && activities.length > 0 && (
            <TouchableOpacity onPress={onSeeAll}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          )}
        </View>
        {displayActivities.length === 0 ? (
          <View style={styles.emptyCompact}>
            <Text style={styles.emptyText}>No recent activity</Text>
          </View>
        ) : (
          displayActivities.map((activity) => (
            <View key={activity.id}>{renderActivityItem({ item: activity })}</View>
          ))
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={activities}
        renderItem={renderActivityItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
        contentContainerStyle={activities.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="pulse-outline" size={48} color="#ccc" />
            <Text style={styles.emptyTitle}>No Activity Yet</Text>
            <Text style={styles.emptyDescription}>
              Actions taken by household members will appear here
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  compactContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  seeAllText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityMessage: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  emptyCompact: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
});

