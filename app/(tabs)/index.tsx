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
import { useHouseholdContext } from '../../context/HouseholdContext';
import { PantryItemCard } from '../../components/PantryItemCard';
import { PendingInvites } from '../../components/PendingInvites';
import { EmptyState } from '../../components/EmptyState';
import { PantryListSkeleton } from '../../components/LoadingSkeleton';
import { ExpandableFAB } from '../../components/ExpandableFAB';
import { ImpactDashboard } from '../../components/ImpactDashboard';
import { RescueMissions } from '../../components/RescueMissions';

export default function PantryScreen() {
  const router = useRouter();
  const { activeHousehold } = useHouseholdContext();
  const { pantryItems, loading, error, refreshPantry } = usePantry({
    householdId: activeHousehold?.id,
  });

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

  const handleRecipeCardScan = useCallback(() => {
    router.push('/scan/recipe-card');
  }, [router]);

  const handleMagicRecipe = useCallback(() => {
    router.push('/recipe/generate');
  }, [router]);

  const renderItem = useCallback(({ item }: { item: PantryItem }) => (
    <PantryItemCard item={item} onPress={() => handleItemPress(item)} />
  ), [handleItemPress]);

  const keyExtractor = useCallback((item: PantryItem) => item.id, []);

  const fabActions = [
    {
      icon: 'sparkles' as const,
      label: 'Magic Recipe',
      onPress: handleMagicRecipe,
    },
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
      icon: 'document-text-outline' as const,
      label: 'Scan Recipe Card',
      onPress: handleRecipeCardScan,
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
        ListHeaderComponent={
          <View>
            <PendingInvites />
            <ImpactDashboard />
            <RescueMissions />
          </View>
        }
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
