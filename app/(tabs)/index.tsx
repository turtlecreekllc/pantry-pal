import React, { useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePantry } from '../../hooks/usePantry';
import { PantryItemCard } from '../../components/PantryItemCard';
import { EmptyState } from '../../components/EmptyState';
import { PantryListSkeleton } from '../../components/LoadingSkeleton';
import { ExpandableFAB } from '../../components/ExpandableFAB';
import { PantryItem } from '../../lib/types';

export default function PantryScreen() {
  const router = useRouter();
  const { pantryItems, loading, error, refreshPantry } = usePantry();

  const handleItemPress = useCallback((item: PantryItem) => {
    router.push(`/item/${item.id}`);
  }, [router]);

  const handleScanPress = useCallback(() => {
    router.push('/(tabs)/scan');
  }, [router]);

  const handleManualAdd = useCallback(() => {
    router.push('/item/manual');
  }, [router]);

  const handleReceiptScan = useCallback(() => {
    router.push('/scan/receipt');
  }, [router]);

  const handlePhotoScan = useCallback(() => {
    router.push('/scan/photo');
  }, [router]);

  const renderItem = useCallback(({ item }: { item: PantryItem }) => (
    <PantryItemCard item={item} onPress={() => handleItemPress(item)} />
  ), [handleItemPress]);

  const keyExtractor = useCallback((item: PantryItem) => item.id, []);

  const fabActions = [
    {
      icon: 'pencil' as const,
      label: 'Add Manually',
      onPress: handleManualAdd,
    },
    {
      icon: 'barcode-outline' as const,
      label: 'Scan Barcode',
      onPress: handleScanPress,
    },
    {
      icon: 'receipt-outline' as const,
      label: 'Scan Receipt',
      onPress: handleReceiptScan,
    },
    {
      icon: 'image-outline' as const,
      label: 'Photo Scanner',
      onPress: handlePhotoScan,
    },
  ];

  if (loading && pantryItems.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <PantryListSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
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

      <ExpandableFAB actions={fabActions} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
});
