/**
 * Pantry Screen - Inventory Management
 * Browse and manage pantry inventory—but never as a required first step.
 * Demoted from home per the PRD's "problem-first" approach.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePantry } from '../../hooks/usePantry';
import { useHouseholdContext } from '../../context/HouseholdContext';
import { PantryItemCard } from '../../components/PantryItemCard';
import { PendingInvites } from '../../components/PendingInvites';
import { EmptyState } from '../../components/EmptyState';
import { PantryListSkeleton } from '../../components/LoadingSkeleton';
import { ExpandableFAB } from '../../components/ExpandableFAB';
import { ImpactDashboard } from '../../components/ImpactDashboard';
import { RescueMissions } from '../../components/RescueMissions';
import { PantryItem } from '../../lib/types';
import { colors, typography, spacing, borderRadius, shadows } from '../../lib/theme';

type FilterCategory = 'all' | 'expiring' | 'proteins' | 'produce' | 'dairy' | 'pantry' | 'frozen';

const FILTER_OPTIONS: { id: FilterCategory; label: string; icon?: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'expiring', label: 'Expiring ⚠️' },
  { id: 'proteins', label: 'Proteins' },
  { id: 'produce', label: 'Produce' },
  { id: 'dairy', label: 'Dairy' },
  { id: 'pantry', label: 'Pantry' },
  { id: 'frozen', label: 'Frozen' },
];

export default function PantryScreen(): React.ReactElement {
  const router = useRouter();
  const { activeHousehold } = useHouseholdContext();
  const { pantryItems, loading, error, refreshPantry } = usePantry({
    householdId: activeHousehold?.id,
  });
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Silently refresh on focus so the skeleton doesn't flash on every navigation.
  useFocusEffect(
    useCallback(() => {
      refreshPantry(true);
    }, [refreshPantry])
  );

  // Filter items based on active filter
  const filteredItems = pantryItems.filter((item) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'expiring') {
      if (!item.expiration_date) return false;
      const daysUntilExpiration = Math.ceil(
        (new Date(item.expiration_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilExpiration <= 5;
    }
    const category = item.category?.toLowerCase() || '';
    return category.includes(activeFilter);
  });

  // Get expiring items for the banner
  const expiringItems = pantryItems.filter((item) => {
    if (!item.expiration_date) return false;
    const daysUntilExpiration = Math.ceil(
      (new Date(item.expiration_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiration <= 5 && daysUntilExpiration >= 0;
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

  const handleVoiceAdd = useCallback(() => {
    router.push('/(tabs)/chat');
  }, [router]);

  const handleRecipeCardScan = useCallback(() => {
    router.push('/scan/recipe-card');
  }, [router]);

  const handleMagicRecipe = useCallback(() => {
    router.push('/recipe/generate');
  }, [router]);

  const handleExpiringRecipes = useCallback(() => {
    const ingredientNames = expiringItems.map((item) => item.name);
    router.push({
      pathname: '/recipe/generate',
      params: { ingredients: ingredientNames.join(',') },
    });
  }, [router, expiringItems]);

  // FAB actions for adding items
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

  const renderItem = useCallback(({ item }: { item: PantryItem }) => (
    <PantryItemCard item={item} onPress={() => handleItemPress(item)} />
  ), [handleItemPress]);

  const keyExtractor = useCallback((item: PantryItem) => item.id, []);

  if (loading && pantryItems.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <PantryListSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTER_OPTIONS.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterChip,
                activeFilter === filter.id && styles.filterChipActive,
              ]}
              onPress={() => setActiveFilter(filter.id)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === filter.id && styles.filterChipTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refreshPantry}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          <View>
            <PendingInvites />
            <ImpactDashboard />
            <RescueMissions />

            {/* Expiring Items Banner */}
            {expiringItems.length > 0 && activeFilter !== 'expiring' && (
              <TouchableOpacity style={styles.expiringBanner} onPress={handleExpiringRecipes}>
                <View style={styles.expiringBannerContent}>
                  <View style={styles.expiringIconContainer}>
                    <Ionicons name="warning" size={20} color={colors.warning} />
                  </View>
                  <View style={styles.expiringTextContainer}>
                    <Text style={styles.expiringTitle}>EXPIRING SOON</Text>
                    <Text style={styles.expiringItemsList} numberOfLines={1}>
                      {expiringItems.slice(0, 3).map((item) => item.name).join(' • ')}
                      {expiringItems.length > 3 && ` +${expiringItems.length - 3} more`}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.brownMuted} />
                </View>
                <TouchableOpacity style={styles.findRecipesButton} onPress={handleExpiringRecipes}>
                  <Ionicons name="restaurant-outline" size={16} color={colors.brown} />
                  <Text style={styles.findRecipesText}>Find recipes using these</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            )}

            {/* Item Count */}
            <View style={styles.itemCountContainer}>
              <Ionicons name="file-tray-stacked-outline" size={18} color={colors.brownMuted} />
              <Text style={styles.itemCountText}>
                {activeFilter === 'all'
                  ? `ALL ITEMS (${pantryItems.length})`
                  : `${activeFilter.toUpperCase()} (${filteredItems.length})`}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="file-tray-outline"
            title={activeFilter === 'all' ? 'Your pantry is empty' : `No ${activeFilter} items`}
            description={
              activeFilter === 'all'
                ? "Add items to your pantry to get personalized recipe suggestions!"
                : 'Try selecting a different category or adding new items.'
            }
            actionLabel="Add Items"
            onAction={handleManualAdd}
          />
        }
        ListFooterComponent={<View style={styles.footerSpacer} />}
        contentContainerStyle={filteredItems.length === 0 ? styles.emptyListContent : styles.listContent}
      />

      <ExpandableFAB actions={fabActions} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  errorBanner: {
    backgroundColor: colors.errorBg,
    paddingVertical: spacing.space2,
    paddingHorizontal: spacing.space4,
    borderBottomWidth: 1,
    borderBottomColor: colors.error,
  },
  errorText: {
    fontFamily: 'Nunito-Medium',
    color: colors.error,
    fontSize: typography.textSm,
    textAlign: 'center',
  },
  filterContainer: {
    backgroundColor: colors.white,
    borderBottomWidth: 2,
    borderBottomColor: colors.brown,
  },
  filterScroll: {
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space3,
    gap: spacing.space2,
  },
  filterChip: {
    paddingVertical: spacing.space2,
    paddingHorizontal: spacing.space3,
    backgroundColor: colors.cream,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.brownMuted,
    marginRight: spacing.space2,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.brown,
    borderWidth: 2,
  },
  filterChipText: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    fontWeight: typography.fontMedium,
  },
  filterChipTextActive: {
    color: colors.brown,
    fontFamily: 'Nunito-SemiBold',
    fontWeight: typography.fontSemibold,
  },
  expiringBanner: {
    marginHorizontal: spacing.space4,
    marginTop: spacing.space4,
    padding: spacing.space4,
    backgroundColor: colors.warningBg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.warning,
  },
  expiringBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expiringIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.space3,
  },
  expiringTextContainer: {
    flex: 1,
  },
  expiringTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: typography.textXs,
    fontWeight: typography.fontBold,
    color: colors.warning,
    letterSpacing: 0.5,
  },
  expiringItemsList: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brown,
    marginTop: 2,
  },
  findRecipesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.space2,
    marginTop: spacing.space3,
    paddingVertical: spacing.space2,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  findRecipesText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textSm,
    color: colors.brown,
    fontWeight: typography.fontSemibold,
  },
  itemCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
    marginHorizontal: spacing.space4,
    marginTop: spacing.space4,
    marginBottom: spacing.space2,
  },
  itemCountText: {
    fontFamily: 'Nunito-Bold',
    fontSize: typography.textXs,
    fontWeight: typography.fontBold,
    color: colors.brownMuted,
    letterSpacing: 0.5,
  },
  listContent: {
    paddingVertical: spacing.space2,
    paddingBottom: 100, // Space for FAB
  },
  emptyListContent: {
    flex: 1,
  },
  footerSpacer: {
    height: 72, // Space for FAB (56px) + margin
  },
});
