import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { gamificationService } from '../lib/gamificationService';
import { UserImpactSummary } from '../lib/types';
import { useRouter } from 'expo-router';

export function ImpactDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<UserImpactSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'all_time'>('week');
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (user) {
      loadSummary();
    }
  }, [user, period]);

  const loadSummary = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await gamificationService.getImpactSummary(user.id, period);
      setSummary(data);
    } catch (error) {
      console.error('Error loading impact summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const getPeriodLabel = () => {
    switch (period) {
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'all_time': return 'All Time';
    }
  };

  const MetricItem = ({ icon, value, label, color }: { icon: any, value: string, label: string, color: string }) => (
    <View style={styles.metricItem}>
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View>
        <Text style={[styles.metricValue, { color }]}>{value}</Text>
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="leaf" size={20} color="#4CAF50" />
          <Text style={styles.title}>Your Impact</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.periodSelector}
            onPress={() => {
              const next = period === 'week' ? 'month' : period === 'month' ? 'all_time' : 'week';
              setPeriod(next);
            }}
          >
            <Text style={styles.periodText}>{getPeriodLabel()}</Text>
            <Ionicons name="chevron-down" size={12} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setCollapsed(!collapsed)}>
            <Ionicons name={collapsed ? "chevron-down" : "chevron-up"} size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {!collapsed && (
        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator size="small" color="#4CAF50" />
          ) : (
            <>
              {(!summary || (summary.items_rescued === 0 && summary.money_saved_cents === 0)) ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>
                    Track your pantry usage to see your positive impact here!
                  </Text>
                </View>
              ) : (
                <View style={styles.metricsGrid}>
                  <MetricItem 
                    icon="nutrition" 
                    value={`${summary.items_rescued}`} 
                    label="Items Rescued" 
                    color="#4CAF50" 
                  />
                  <MetricItem 
                    icon="cash" 
                    value={`$${(summary.money_saved_cents / 100).toFixed(2)}`} 
                    label="Money Saved" 
                    color="#2196F3" 
                  />
                  <MetricItem 
                    icon="scale" 
                    value={`${(summary.weight_saved_g / 453.6).toFixed(1)} lb`} 
                    label="Food Saved" 
                    color="#FF9800" 
                  />
                  <MetricItem 
                    icon="planet" 
                    value={`${(summary.co2_avoided_g / 1000).toFixed(1)} kg`} 
                    label="CO₂ Avoided" 
                    color="#9C27B0" 
                  />
                </View>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F1F8E9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  periodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  periodText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  content: {
    padding: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metricItem: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  emptyText: {
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

