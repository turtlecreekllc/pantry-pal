import React, { useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePantry } from '../../hooks/usePantry';
import { useAuth } from '../../context/AuthContext';
import { PantryItemCard } from '../../components/PantryItemCard';
import { EmptyState } from '../../components/EmptyState';
import { PantryListSkeleton } from '../../components/LoadingSkeleton';
import { PantryItem } from '../../lib/types';

export default function PantryScreen() {
  const router = useRouter();
  const { pantryItems, loading, error, refreshPantry } = usePantry();
  const { signOut } = useAuth();

  const handleItemPress = useCallback((item: PantryItem) => {
    router.push(`/item/${item.id}`);
  }, [router]);

  const handleScanPress = useCallback(() => {
    router.push('/(tabs)/scan');
  }, [router]);

  const handleManualAdd = useCallback(() => {
    router.push('/item/manual');
  }, [router]);

  const renderItem = useCallback(({ item }: { item: PantryItem }) => (
    <PantryItemCard item={item} onPress={() => handleItemPress(item)} />
  ), [handleItemPress]);

  const keyExtractor = useCallback((item: PantryItem) => item.id, []);

  if (loading && pantryItems.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <PantryListSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleManualAdd} style={styles.headerButton}>
          <Ionicons name="add" size={24} color="#4CAF50" />
        </TouchableOpacity>
        <TouchableOpacity onPress={signOut} style={styles.headerButton}>
          <Ionicons name="log-out-outline" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={pantryItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.listContent,
          pantryItems.length === 0 && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refreshPantry}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="file-tray-outline"
            title="Your pantry is empty"
            description="Scan items with the camera or add them manually to get started!"
            actionLabel="Scan Item"
            onAction={handleScanPress}
          />
        }
      />

      <TouchableOpacity style={styles.fab} onPress={handleScanPress} activeOpacity={0.8}>
        <Ionicons name="scan" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  headerButton: {
    padding: 8,
  },
  errorBanner: {
    backgroundColor: '#ffebee',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  errorText: {
    color: '#f44336',
    fontSize: 14,
    textAlign: 'center',
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyListContent: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});
