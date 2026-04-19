import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Share, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { gamificationService } from '../lib/gamificationService';
import { UserImpactSummary } from '../lib/types';

export function LifetimeImpact() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<UserImpactSummary | null>(null);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    const data = await gamificationService.getImpactSummary(user.id, 'all_time');
    setSummary(data);
  };

  const handleShare = async () => {
    if (!summary) return;
    try {
      const weightLbs = (summary.weight_saved_g / 453.6).toFixed(1);
      const money = (summary.money_saved_cents / 100).toFixed(2);
      
      await Share.share({
        message: `I've saved ${weightLbs} lbs of food and $${money} with DinnerPlans! 🌱 #FoodWaste #Sustainability`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (!summary) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🌱 Your Impact Since Joining</Text>
      <View style={styles.divider} />
      
      <View style={styles.row}>
        <Text style={styles.label}>Items Rescued:</Text>
        <Text style={styles.value}>{summary.items_rescued}</Text>
      </View>
      
      <View style={styles.row}>
        <Text style={styles.label}>Money Saved:</Text>
        <Text style={styles.value}>${(summary.money_saved_cents / 100).toFixed(2)}</Text>
      </View>
      
      <View style={styles.row}>
        <Text style={styles.label}>Food Saved:</Text>
        <Text style={styles.value}>{(summary.weight_saved_g / 453.6).toFixed(1)} lbs</Text>
      </View>
      
      <View style={styles.divider} />
      
      <TouchableOpacity 
        style={styles.shareButton}
        onPress={handleShare}
      >
        <Ionicons name="share-outline" size={18} color="#4CAF50" />
        <Text style={styles.shareButtonText}>Share My Impact</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F1F8E9',
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
  },
  header: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#C8E6C9',
    marginVertical: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  label: {
    fontSize: 14,
    color: '#558B2F',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  shareButton: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
    gap: 8,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
});

