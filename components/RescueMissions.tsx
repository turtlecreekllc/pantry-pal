import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usePantry } from '../hooks/usePantry';
import { useHouseholdContext } from '../context/HouseholdContext';
import { PantryItem } from '../lib/types';

export function RescueMissions() {
  const router = useRouter();
  const { activeHousehold } = useHouseholdContext();
  const { pantryItems } = usePantry({ householdId: activeHousehold?.id });

  const expiringItems = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    return pantryItems.filter(item => {
      if (!item.expiration_date) return false;
      const expDate = new Date(item.expiration_date);
      expDate.setHours(0, 0, 0, 0);
      
      // Filter items expiring today, tomorrow, or within 3 days
      // And strictly not already expired (unless we want to show expired items as "Failed Mission" - PRD says "Rescue" so future tense)
      return expDate >= today && expDate <= threeDaysFromNow;
    }).sort((a, b) => new Date(a.expiration_date!).getTime() - new Date(b.expiration_date!).getTime());
  }, [pantryItems]);

  if (expiringItems.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.emoji}>🦸</Text>
          <Text style={styles.title}>
            {expiringItems.length} Rescue Mission{expiringItems.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(tabs)/recipes')}>
          <Text style={styles.linkText}>Find Recipes →</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.list}>
        {expiringItems.slice(0, 3).map((item) => (
          <TouchableOpacity 
            key={item.id} 
            style={styles.itemRow}
            onPress={() => router.push(`/item/${item.id}`)}
          >
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.expiryText}>
                Expires {new Date(item.expiration_date!).toLocaleDateString(undefined, { weekday: 'short' })}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#ccc" />
          </TouchableOpacity>
        ))}
        {expiringItems.length > 3 && (
          <Text style={styles.moreText}>+ {expiringItems.length - 3} more items to rescue</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF3E0', // Light orange/amber background
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE0B2',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emoji: {
    fontSize: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E65100',
  },
  linkText: {
    fontSize: 12,
    color: '#E65100',
    fontWeight: '600',
  },
  list: {
    padding: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 8,
    marginBottom: 4,
  },
  itemInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginRight: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  expiryText: {
    fontSize: 12,
    color: '#D84315',
    fontWeight: '500',
  },
  moreText: {
    fontSize: 12,
    color: '#E65100',
    textAlign: 'center',
    marginTop: 4,
  },
});

