import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Achievement, UserAchievement, AchievementCategory } from '../../lib/types';

interface CategoryGroup {
  title: string;
  key: AchievementCategory;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const CATEGORY_GROUPS: CategoryGroup[] = [
  { title: 'Getting Started', key: 'getting_started', icon: 'rocket-outline', color: '#2196F3' },
  { title: 'Consistency', key: 'consistency', icon: 'calendar-outline', color: '#9C27B0' },
  { title: 'Impact', key: 'impact', icon: 'leaf-outline', color: '#4CAF50' },
  { title: 'Rescue Heroes', key: 'rescue', icon: 'flash-outline', color: '#FF9800' },
  { title: 'Exploration', key: 'exploration', icon: 'compass-outline', color: '#00BCD4' },
];

export default function AchievementsScreen() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<Map<string, UserAchievement>>(
    new Map()
  );
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
      // Load user's unlocked achievements
      const { data: unlocked } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user!.id);
      if (unlocked) {
        const map = new Map<string, UserAchievement>();
        unlocked.forEach((ua) => map.set(ua.achievement_id, ua));
        setUserAchievements(map);
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAchievementsByCategory = (category: AchievementCategory): Achievement[] => {
    return achievements.filter((a) => a.category === category);
  };

  const getUnlockedCount = (category: AchievementCategory): number => {
    const categoryAchievements = getAchievementsByCategory(category);
    return categoryAchievements.filter((a) => userAchievements.has(a.id)).length;
  };

  const getTotalUnlocked = (): number => {
    return userAchievements.size;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.summary}>
        <View style={styles.summaryIcon}>
          <Ionicons name="trophy" size={32} color="#FFD700" />
        </View>
        <Text style={styles.summaryTitle}>
          {getTotalUnlocked()} of {achievements.length}
        </Text>
        <Text style={styles.summarySubtitle}>Achievements Unlocked</Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(getTotalUnlocked() / achievements.length) * 100}%` },
            ]}
          />
        </View>
      </View>

      {CATEGORY_GROUPS.map((category) => {
        const categoryAchievements = getAchievementsByCategory(category.key);
        const unlockedCount = getUnlockedCount(category.key);
        if (categoryAchievements.length === 0) return null;
        return (
          <View key={category.key} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.categoryIcon, { backgroundColor: `${category.color}20` }]}>
                <Ionicons name={category.icon} size={20} color={category.color} />
              </View>
              <View style={styles.sectionTitleContainer}>
                <Text style={styles.sectionTitle}>{category.title}</Text>
                <Text style={styles.sectionCount}>
                  {unlockedCount} / {categoryAchievements.length}
                </Text>
              </View>
            </View>
            <View style={styles.achievementsList}>
              {categoryAchievements.map((achievement) => {
                const isUnlocked = userAchievements.has(achievement.id);
                const userAchievement = userAchievements.get(achievement.id);
                return (
                  <View
                    key={achievement.id}
                    style={[
                      styles.achievementCard,
                      !isUnlocked && styles.achievementCardLocked,
                    ]}
                  >
                    <View
                      style={[
                        styles.achievementIconContainer,
                        isUnlocked
                          ? styles.achievementIconUnlocked
                          : styles.achievementIconLocked,
                      ]}
                    >
                      <Ionicons
                        name={isUnlocked ? 'trophy' : 'lock-closed'}
                        size={24}
                        color={isUnlocked ? '#FFD700' : '#999'}
                      />
                    </View>
                    <View style={styles.achievementInfo}>
                      <Text
                        style={[
                          styles.achievementName,
                          !isUnlocked && styles.textLocked,
                        ]}
                      >
                        {achievement.name}
                      </Text>
                      <Text style={styles.achievementDescription}>
                        {achievement.description}
                      </Text>
                      {isUnlocked && userAchievement && (
                        <View style={styles.unlockedBadge}>
                          <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                          <Text style={styles.unlockedText}>
                            Unlocked{' '}
                            {new Date(userAchievement.unlocked_at).toLocaleDateString()}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.tierBadge}>
                      <Text
                        style={[
                          styles.tierText,
                          achievement.tier === 'gold' && styles.tierGold,
                          achievement.tier === 'silver' && styles.tierSilver,
                          achievement.tier === 'bronze' && styles.tierBronze,
                        ]}
                      >
                        {achievement.tier.charAt(0).toUpperCase() +
                          achievement.tier.slice(1)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  summaryIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF8E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
  },
  summarySubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  sectionCount: {
    fontSize: 14,
    color: '#666',
  },
  achievementsList: {
    gap: 12,
  },
  achievementCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementCardLocked: {
    backgroundColor: '#fafafa',
    opacity: 0.8,
  },
  achievementIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  achievementIconUnlocked: {
    backgroundColor: '#FFF8E1',
  },
  achievementIconLocked: {
    backgroundColor: '#f0f0f0',
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  textLocked: {
    color: '#666',
  },
  achievementDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  unlockedText: {
    fontSize: 12,
    color: '#4CAF50',
    marginLeft: 4,
  },
  tierBadge: {
    marginLeft: 8,
  },
  tierText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tierGold: {
    color: '#FFD700',
  },
  tierSilver: {
    color: '#9E9E9E',
  },
  tierBronze: {
    color: '#CD7F32',
  },
});

