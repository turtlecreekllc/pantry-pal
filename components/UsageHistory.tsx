import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { UsageHistoryEntry } from '../lib/types';

interface UsageHistoryProps {
  history: UsageHistoryEntry[] | null;
  unit: string;
}

export function UsageHistory({ history, unit }: UsageHistoryProps) {
  const router = useRouter();

  if (!history || history.length === 0) {
    return null;
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Sort by timestamp descending (most recent first)
  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Usage History</Text>

      {sortedHistory.slice(0, 5).map((entry, index) => (
        <TouchableOpacity
          key={`${entry.timestamp}-${index}`}
          style={styles.historyItem}
          onPress={() => {
            if (entry.recipe_id) {
              router.push(`/recipe/${entry.recipe_id}`);
            }
          }}
          disabled={!entry.recipe_id}
        >
          <View style={styles.historyIcon}>
            <Ionicons
              name={entry.recipe_id ? 'restaurant-outline' : 'remove-circle-outline'}
              size={18}
              color="#666"
            />
          </View>
          <View style={styles.historyContent}>
            <Text style={styles.historyAmount}>
              -{entry.amount.toFixed(entry.amount % 1 === 0 ? 0 : 1)} {unit}
            </Text>
            {entry.recipe_name && (
              <Text style={styles.historyRecipe} numberOfLines={1}>
                {entry.recipe_name}
              </Text>
            )}
            {entry.note && !entry.recipe_name && (
              <Text style={styles.historyNote} numberOfLines={1}>
                {entry.note}
              </Text>
            )}
            <Text style={styles.historyDate}>{formatDate(entry.timestamp)}</Text>
          </View>
          {entry.recipe_id && (
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          )}
        </TouchableOpacity>
      ))}

      {history.length > 5 && (
        <Text style={styles.moreText}>
          +{history.length - 5} more entries
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  historyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f44336',
  },
  historyRecipe: {
    fontSize: 13,
    color: '#4CAF50',
    marginTop: 2,
  },
  historyNote: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  historyDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  moreText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
  },
});
