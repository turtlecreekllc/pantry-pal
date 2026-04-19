import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Linking,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useGroceryList } from '../../hooks/useGroceryList';
import { useHouseholdContext } from '../../context/HouseholdContext';
import { GroceryItem, Unit, Aisle } from '../../lib/types';
import { EmptyState } from '../../components/EmptyState';
import { PepperFAB } from '../../components/PepperFAB';
import { getAisleSortOrder } from '../../lib/aisleClassifier';
import { generateContextualSuggestions, getQuickActions } from '../../lib/pepperContext';
import { colors, typography, spacing, borderRadius, shadows } from '../../lib/theme';

type ViewMode = 'list' | 'aisle';

const AISLE_ICONS: Record<Aisle, keyof typeof Ionicons.glyphMap> = {
  Produce: 'leaf-outline',
  Dairy: 'water-outline',
  'Meat & Seafood': 'nutrition-outline',
  Bakery: 'pizza-outline',
  Frozen: 'snow-outline',
  'Canned Goods': 'cube-outline',
  'Pasta & Grains': 'restaurant-outline',
  Snacks: 'fast-food-outline',
  Beverages: 'wine-outline',
  Condiments: 'beaker-outline',
  Spices: 'flask-outline',
  Other: 'ellipsis-horizontal-outline',
};

export default function GroceryScreen(): React.ReactElement {
  const { activeHousehold } = useHouseholdContext();
  const {
    groceryItems,
    groceryItemsByAisle,
    loading,
    addGroceryItemWithAisle,
    toggleChecked,
    deleteGroceryItem,
    clearCheckedItems,
    refreshGroceryList,
  } = useGroceryList({ householdId: activeHousehold?.id });

  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState<Unit>('item');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const uncheckedItems = groceryItems.filter((item) => !item.is_checked);
  const checkedItems = groceryItems.filter((item) => item.is_checked);

  // Refresh grocery list when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshGroceryList();
    }, [refreshGroceryList])
  );

  const aisleSections = useMemo(() => {
    const aisleOrder = getAisleSortOrder();
    const sections: { title: Aisle; data: GroceryItem[] }[] = [];
    for (const aisle of aisleOrder) {
      const items = groceryItemsByAisle.get(aisle);
      if (items && items.length > 0) {
        const sorted = [...items].sort((a, b) => {
          if (a.is_checked === b.is_checked) return 0;
          return a.is_checked ? 1 : -1;
        });
        sections.push({ title: aisle, data: sorted });
      }
    }
    return sections;
  }, [groceryItemsByAisle]);

  const handleAddItem = async (): Promise<void> => {
    if (!newItemName.trim()) {
      Alert.alert('Error', 'Please enter an item name');
      return;
    }
    try {
      await addGroceryItemWithAisle(
        newItemName.trim(),
        parseFloat(newItemQuantity) || 1,
        newItemUnit
      );
      setNewItemName('');
      setNewItemQuantity('1');
      setShowAddForm(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to add item');
    }
  };

  const handleClearChecked = (): void => {
    if (checkedItems.length === 0) return;
    Alert.alert(
      'Clear Checked Items',
      `Remove ${checkedItems.length} checked item(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clearCheckedItems },
      ]
    );
  };

  const renderGroceryItem = useCallback(
    ({ item }: { item: GroceryItem }) => (
      <TouchableOpacity
        style={[styles.groceryItem, item.is_checked && styles.groceryItemChecked]}
        onPress={() => toggleChecked(item.id)}
        onLongPress={() => {
          Alert.alert('Delete Item', `Remove ${item.name}?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteGroceryItem(item.id) },
          ]);
        }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.is_checked }}
        accessibilityLabel={`${item.name}, ${item.quantity} ${item.unit}`}
      >
        <Ionicons
          name={item.is_checked ? 'checkbox' : 'square-outline'}
          size={24}
          color={item.is_checked ? colors.coral : colors.brownMuted}
        />
        <View style={styles.groceryItemContent}>
          <Text style={[styles.groceryItemName, item.is_checked && styles.groceryItemNameChecked]}>
            {item.name}
          </Text>
          <Text style={styles.groceryItemQuantity}>
            {item.quantity} {item.unit}
            {item.recipe_name && ` (for ${item.recipe_name})`}
          </Text>
        </View>
        {viewMode === 'list' && item.aisle && (
          <View style={styles.aisleBadge}>
            <Text style={styles.aisleBadgeText}>{item.aisle}</Text>
          </View>
        )}
      </TouchableOpacity>
    ),
    [toggleChecked, deleteGroceryItem, viewMode]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: { title: Aisle; data: GroceryItem[] } }) => {
      const checkedCount = section.data.filter((item) => item.is_checked).length;
      const totalCount = section.data.length;
      return (
        <View style={styles.sectionHeader}>
          <Ionicons name={AISLE_ICONS[section.title]} size={18} color={colors.primary} />
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionCount}>{checkedCount}/{totalCount}</Text>
        </View>
      );
    },
    []
  );

  const renderListView = (): React.ReactElement => (
    <FlatList
      data={[...uncheckedItems, ...checkedItems]}
      renderItem={renderGroceryItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[styles.listContent, groceryItems.length === 0 && styles.emptyListContent]}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={refreshGroceryList}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
      ListEmptyComponent={
        <EmptyState
          icon="cart-outline"
          title="Your grocery list is empty"
          description="Add items you need to buy, or generate a list from your meal plan."
        />
      }
      ItemSeparatorComponent={() => <View style={{ height: spacing.space2 }} />}
    />
  );

  const renderAisleView = (): React.ReactElement => (
    <SectionList
      sections={aisleSections}
      renderItem={renderGroceryItem}
      renderSectionHeader={renderSectionHeader}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[styles.listContent, aisleSections.length === 0 && styles.emptyListContent]}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={refreshGroceryList}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
      ListEmptyComponent={
        <EmptyState
          icon="cart-outline"
          title="Your grocery list is empty"
          description="Add items you need to buy, or generate a list from your meal plan."
        />
      }
      stickySectionHeadersEnabled
      ItemSeparatorComponent={() => <View style={{ height: spacing.space2 }} />}
      SectionSeparatorComponent={() => <View style={{ height: spacing.space4 }} />}
    />
  );

  // Pepper suggestions for grocery context
  const pepperSuggestions = generateContextualSuggestions('grocery', { groceryItems });
  const quickActions = getQuickActions('grocery');
  
  // Calculate estimated cost (simple estimation)
  const estimatedCost = useMemo(() => {
    // Basic estimation: $3 average per item
    return uncheckedItems.length * 3;
  }, [uncheckedItems]);
  
  // Handle Instacart order
  const handleInstacartOrder = async (): Promise<void> => {
    // Generate Instacart deep link with items
    // This would integrate with Instacart's API in production
    const itemNames = uncheckedItems.map((item) => item.name).join(',');
    const instacartUrl = `https://www.instacart.com/store/search?q=${encodeURIComponent(itemNames)}`;
    
    Alert.alert(
      'Order on Instacart',
      `Open Instacart with ${uncheckedItems.length} items?\n\nEstimated: $${estimatedCost + 10} with delivery`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Instacart',
          onPress: async () => {
            try {
              await Linking.openURL(instacartUrl);
            } catch (error) {
              Alert.alert('Error', 'Could not open Instacart. Please install the app first.');
            }
          },
        },
      ]
    );
  };
  
  // Handle share list
  const handleShareList = async (): Promise<void> => {
    const listText = uncheckedItems
      .map((item) => `☐ ${item.name} (${item.quantity} ${item.unit})`)
      .join('\n');
    
    const message = `🛒 Grocery List\n\n${listText}\n\n—Created with DinnerPlans.ai`;
    
    // Use share sheet
    Alert.alert('Share List', message);
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Header with count and estimated cost */}
      <View style={styles.headerBar}>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Grocery List</Text>
          <Text style={styles.headerMeta}>
            {uncheckedItems.length} items • Est. ${estimatedCost}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={handleShareList}>
            <Ionicons name="share-outline" size={20} color={colors.brown} />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* View Mode Toggle */}
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.viewToggleButton, viewMode === 'list' && styles.viewToggleButtonActive]}
          onPress={() => setViewMode('list')}
          accessibilityLabel="List view"
          accessibilityRole="button"
          accessibilityState={{ selected: viewMode === 'list' }}
        >
          <Ionicons
            name="list-outline"
            size={18}
            color={viewMode === 'list' ? colors.brown : colors.brownMuted}
          />
          <Text style={[styles.viewToggleText, viewMode === 'list' && styles.viewToggleTextActive]}>
            List
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewToggleButton, viewMode === 'aisle' && styles.viewToggleButtonActive]}
          onPress={() => setViewMode('aisle')}
          accessibilityLabel="Aisle view"
          accessibilityRole="button"
          accessibilityState={{ selected: viewMode === 'aisle' }}
        >
          <Ionicons
            name="storefront-outline"
            size={18}
            color={viewMode === 'aisle' ? colors.brown : colors.brownMuted}
          />
          <Text style={[styles.viewToggleText, viewMode === 'aisle' && styles.viewToggleTextActive]}>
            By Aisle
          </Text>
        </TouchableOpacity>
      </View>

      {/* Add Item Form */}
      {showAddForm && (
        <View style={styles.addForm}>
          <TextInput
            style={styles.addInput}
            placeholder="Item name"
            placeholderTextColor={colors.brownMuted}
            value={newItemName}
            onChangeText={setNewItemName}
            autoFocus
          />
          <View style={styles.addFormRow}>
            <TextInput
              style={styles.quantityInput}
              placeholder="Qty"
              placeholderTextColor={colors.brownMuted}
              value={newItemQuantity}
              onChangeText={setNewItemQuantity}
              keyboardType="decimal-pad"
            />
            <View style={styles.unitPicker}>
              {(['item', 'oz', 'lb', 'cup'] as Unit[]).map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[styles.unitOption, newItemUnit === u && styles.unitOptionActive]}
                  onPress={() => setNewItemUnit(u)}
                >
                  <Text style={[styles.unitOptionText, newItemUnit === u && styles.unitOptionTextActive]}>
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.addFormButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAddForm(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addButton} onPress={handleAddItem}>
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* List */}
      {viewMode === 'list' ? renderListView() : renderAisleView()}

      {/* Instacart CTA */}
      {uncheckedItems.length >= 3 && (
        <View style={styles.instacartCard}>
          <View style={styles.instacartContent}>
            <Ionicons name="storefront" size={24} color={colors.success} />
            <View style={styles.instacartText}>
              <Text style={styles.instacartTitle}>Order on Instacart</Text>
              <Text style={styles.instacartSubtitle}>
                Get these items delivered in as fast as 2 hrs
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.instacartButton} onPress={handleInstacartOrder}>
            <Text style={styles.instacartButtonText}>
              Order Now — Est. ${estimatedCost + 10}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Footer Actions */}
      <View style={styles.footer}>
        {checkedItems.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={handleClearChecked}>
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={styles.clearButtonText}>Clear Checked ({checkedItems.length})</Text>
          </TouchableOpacity>
        )}
        <View style={styles.footerButtons}>
          {!showAddForm && (
            <TouchableOpacity
              style={styles.fabButton}
              onPress={() => setShowAddForm(true)}
              accessibilityLabel="Add item"
              accessibilityRole="button"
            >
              <Ionicons name="add" size={24} color={colors.brown} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShareList}
            accessibilityLabel="Share list"
            accessibilityRole="button"
          >
            <Ionicons name="share-social" size={24} color={colors.brown} />
          </TouchableOpacity>
        </View>
      </View>
      
      <PepperFAB
        context="grocery"
        suggestion={pepperSuggestions[0]}
        quickActions={quickActions}
        hasSuggestion={uncheckedItems.length >= 5}
        size="small"
        contextData={{
          pantryItems: [],
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  viewToggle: {
    flexDirection: 'row',
    padding: spacing.space3,
    gap: spacing.space2,
    backgroundColor: colors.white,
    borderBottomWidth: 2,
    borderBottomColor: colors.brown,
  },
  viewToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.space2,
    paddingVertical: spacing.space3,
    borderRadius: borderRadius.md,
    backgroundColor: colors.cream,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  viewToggleButtonActive: {
    backgroundColor: colors.primary,
  },
  viewToggleText: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    fontWeight: typography.fontMedium,
    color: colors.brownMuted,
  },
  viewToggleTextActive: {
    color: colors.brown,
    fontFamily: 'Nunito-SemiBold',
    fontWeight: typography.fontSemibold,
  },
  addForm: {
    backgroundColor: colors.white,
    padding: spacing.space4,
    borderBottomWidth: 2,
    borderBottomColor: colors.brown,
  },
  addInput: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textBase,
    borderWidth: 2,
    borderColor: colors.brownMuted,
    borderRadius: borderRadius.md,
    padding: spacing.space3,
    marginBottom: spacing.space3,
    color: colors.brown,
  },
  addFormRow: {
    flexDirection: 'row',
    gap: spacing.space3,
    marginBottom: spacing.space3,
  },
  quantityInput: {
    width: 60,
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textBase,
    borderWidth: 2,
    borderColor: colors.brownMuted,
    borderRadius: borderRadius.md,
    padding: spacing.space3,
    textAlign: 'center',
    color: colors.brown,
  },
  unitPicker: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.space2,
  },
  unitOption: {
    flex: 1,
    paddingVertical: spacing.space3,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.cream,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  unitOptionActive: {
    backgroundColor: colors.primary,
  },
  unitOptionText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
  },
  unitOptionTextActive: {
    color: colors.brown,
    fontFamily: 'Nunito-SemiBold',
    fontWeight: typography.fontSemibold,
  },
  addFormButtons: {
    flexDirection: 'row',
    gap: spacing.space3,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.space3,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.cream,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  cancelButtonText: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textBase,
    color: colors.brownMuted,
  },
  addButton: {
    flex: 1,
    paddingVertical: spacing.space3,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  addButtonText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textBase,
    color: colors.brown,
    fontWeight: typography.fontSemibold,
  },
  listContent: {
    padding: spacing.space4,
  },
  emptyListContent: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
    paddingVertical: spacing.space2,
    paddingHorizontal: spacing.space1,
    backgroundColor: colors.cream,
  },
  sectionTitle: {
    flex: 1,
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textSm,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  sectionCount: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
  },
  groceryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space3,
    padding: spacing.space4,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.brown,
    ...shadows.sm,
  },
  groceryItemChecked: {
    opacity: 0.6,
  },
  groceryItemContent: {
    flex: 1,
  },
  groceryItemName: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textBase,
    fontWeight: typography.fontMedium,
    color: colors.brown,
  },
  groceryItemNameChecked: {
    textDecorationLine: 'line-through',
    color: colors.brownMuted,
  },
  groceryItemQuantity: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    marginTop: 2,
  },
  aisleBadge: {
    paddingHorizontal: spacing.space2,
    paddingVertical: spacing.space1,
    backgroundColor: colors.peach,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.brown,
  },
  aisleBadgeText: {
    fontFamily: 'Nunito-Medium',
    fontSize: 11,
    color: colors.brown,
    fontWeight: typography.fontMedium,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.space4,
    backgroundColor: colors.white,
    borderTopWidth: 2,
    borderTopColor: colors.brown,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
    paddingVertical: spacing.space2,
    paddingHorizontal: spacing.space3,
  },
  clearButtonText: {
    fontFamily: 'Nunito-Medium',
    color: colors.error,
    fontSize: typography.textSm,
    fontWeight: typography.fontMedium,
  },
  fabButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.brown,
    ...shadows.sm,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space3,
    backgroundColor: colors.white,
    borderBottomWidth: 2,
    borderBottomColor: colors.brown,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.textLg,
    fontWeight: typography.fontBold,
    color: colors.brown,
  },
  headerMeta: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.space2,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.brown,
  },
  instacartCard: {
    margin: spacing.space4,
    padding: spacing.space4,
    backgroundColor: colors.successBg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.success,
  },
  instacartContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space3,
    marginBottom: spacing.space3,
  },
  instacartText: {
    flex: 1,
  },
  instacartTitle: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  instacartSubtitle: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    marginTop: 2,
  },
  instacartButton: {
    backgroundColor: colors.success,
    paddingVertical: spacing.space3,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.brown,
  },
  instacartButtonText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.white,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: spacing.space3,
    marginLeft: 'auto',
    marginRight: 56, // Make room for small PepperFAB (48px + spacing)
  },
  shareButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.brown,
    ...shadows.sm,
  },
});
