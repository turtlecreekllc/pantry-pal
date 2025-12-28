import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Achievement, UserAchievement } from '../lib/types';

interface AchievementsListProps {
  limit?: number;
  horizontal?: boolean;
}

export function AchievementsList({ limit, horizontal = false }: AchievementsListProps) {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      // Load all achievements
      const { data: allAchievements } = await supabase
        .from('achievements')
        .select('*')
        .order('threshold_value', { ascending: true });
      
      if (allAchievements) setAchievements(allAchievements);

      // Load user unlocked
      const { data: unlocked } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', user!.id);
      
      if (unlocked) {
        setUserAchievements(new Set(unlocked.map(u => u.achievement_id)));
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Achievement }) => {
    const isUnlocked = userAchievements.has(item.id);
    
    return (
      <View style={[styles.card, horizontal && styles.cardHorizontal, !isUnlocked && styles.cardLocked]}>
        <View style={[styles.iconContainer, isUnlocked ? styles.iconUnlocked : styles.iconLocked]}>
          <Ionicons 
            name={isUnlocked ? "trophy" : "lock-closed"} 
            size={24} 
            color={isUnlocked ? "#FFD700" : "#999"} 
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.name, !isUnlocked && styles.textLocked]}>{item.name}</Text>
          <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
          {isUnlocked && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Earned</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) return null;

  const displayData = limit ? achievements.slice(0, limit) : achievements;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Achievements</Text>
      <FlatList
        data={displayData}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        horizontal={horizontal}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    marginLeft: 16,
    color: '#333',
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 8,
  },
  cardHorizontal: {
    width: 200,
    marginRight: 12,
    marginBottom: 0,
  },
  cardLocked: {
    backgroundColor: '#f5f5f5',
    opacity: 0.8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconUnlocked: {
    backgroundColor: '#FFF8E1',
  },
  iconLocked: {
    backgroundColor: '#e0e0e0',
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  textLocked: {
    color: '#666',
  },
  description: {
    fontSize: 12,
    color: '#666',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  badgeText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '600',
  },
});

