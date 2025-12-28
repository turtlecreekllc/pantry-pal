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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useGroceryList } from '../../hooks/useGroceryList';
import { useHouseholdContext } from '../../context/HouseholdContext';
import { GroceryItem, UNITS, Unit, Aisle, AISLES } from '../../lib/types';
import { EmptyState } from '../../components/EmptyState';
import { classifyAisle, getAisleSortOrder } from '../../lib/aisleClassifier';

type ViewMode = 'list' | 'aisle';

const AISLE_ICONS: Record<Aisle, string> = {
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

export default function GroceryScreen() {
  const { activeHousehold } = useHouseholdContext();
  const {
    groceryItems,
    groceryItemsByAisle,
    loading,
    addGroceryItem,
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

  // Prepare sections for aisle view
  const aisleSections = useMemo(() => {
    const aisleOrder = getAisleSortOrder();
    const sections: { title: Aisle; data: GroceryItem[] }[] = [];

    for (const aisle of aisleOrder) {
      const items = groceryItemsByAisle.get(aisle);
      if (items && items.length > 0) {
        // Sort: unchecked first, then checked
        const sorted = [...items].sort((a, b) => {
          if (a.is_checked === b.is_checked) return 0;
          return a.is_checked ? 1 : -1;
        });
        sections.push({ title: aisle, data: sorted });
      }
    }

    return sections;
  }, [groceryItemsByAisle]);

  const handleAddItem = async () => {
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

  const handleClearChecked = () => {
    if (checkedItems.length === 0) return;

    Alert.alert(
      'Clear Checked Items',
      `Remove ${checkedItems.length} checked item(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: clearCheckedItems,
        },
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
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => deleteGroceryItem(item.id),
            },
          ]);
        }}
      >
        <Ionicons
          name={item.is_checked ? 'checkbox' : 'square-outline'}
          size={24}
          color={item.is_checked ? '#4CAF50' : '#666'}
        />
        <View style={styles.groceryItemContent}>
          <Text
            style={[styles.groceryItemName, item.is_checked && styles.groceryItemNameChecked]}
          >
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
          <Ionicons
            name={AISLE_ICONS[section.title] as any}
            size={18}
            color="#4CAF50"
          />
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionCount}>
            {checkedCount}/{totalCount}
          </Text>
        </View>
      );
    },
    []
  );

  const renderListView = () => (
    <FlatList
      data={[...uncheckedItems, ...checkedItems]}
      renderItem={renderGroceryItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[
        styles.listContent,
        groceryItems.length === 0 && styles.emptyListContent,
      ]}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={refreshGroceryList}
          colors={['#4CAF50']}
          tintColor="#4CAF50"
        />
      }
      ListEmptyComponent={
        <EmptyState
          icon="cart-outline"
          title="Your grocery list is empty"
          description="Add items you need to buy, or generate a list from your meal plan."
        />
      }
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
    />
  );

  const renderAisleView = () => (
    <SectionList
      sections={aisleSections}
      renderItem={renderGroceryItem}
      renderSectionHeader={renderSectionHeader}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[
        styles.listContent,
        aisleSections.length === 0 && styles.emptyListContent,
      ]}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={refreshGroceryList}
          colors={['#4CAF50']}
          tintColor="#4CAF50"
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
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      SectionSeparatorComponent={() => <View style={{ height: 16 }} />}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* View Mode Toggle */}
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.viewToggleButton, viewMode === 'list' && styles.viewToggleButtonActive]}
          onPress={() => setViewMode('list')}
        >
          <Ionicons
            name="list-outline"
            size={18}
            color={viewMode === 'list' ? '#fff' : '#666'}
          />
          <Text
            style={[
              styles.viewToggleText,
              viewMode === 'list' && styles.viewToggleTextActive,
            ]}
          >
            List
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewToggleButton, viewMode === 'aisle' && styles.viewToggleButtonActive]}
          onPress={() => setViewMode('aisle')}
        >
          <Ionicons
            name="storefront-outline"
            size={18}
            color={viewMode === 'aisle' ? '#fff' : '#666'}
          />
          <Text
            style={[
              styles.viewToggleText,
              viewMode === 'aisle' && styles.viewToggleTextActive,
            ]}
          >
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
            value={newItemName}
            onChangeText={setNewItemName}
            autoFocus
          />
          <View style={styles.addFormRow}>
            <TextInput
              style={styles.quantityInput}
              placeholder="Qty"
              value={newItemQuantity}
              onChangeText={setNewItemQuantity}
              keyboardType="decimal-pad"
            />
            <View style={styles.unitPicker}>
              {['item', 'oz', 'lb', 'cup'].map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[styles.unitOption, newItemUnit === u && styles.unitOptionActive]}
                  onPress={() => setNewItemUnit(u as Unit)}
                >
                  <Text
                    style={[
                      styles.unitOptionText,
                      newItemUnit === u && styles.unitOptionTextActive,
                    ]}
                  >
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.addFormButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowAddForm(false)}
            >
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

      {/* Footer Actions */}
      <View style={styles.footer}>
        {checkedItems.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={handleClearChecked}>
            <Ionicons name="trash-outline" size={18} color="#f44336" />
            <Text style={styles.clearButtonText}>Clear Checked ({checkedItems.length})</Text>
          </TouchableOpacity>
        )}
        {!showAddForm && (
          <TouchableOpacity style={styles.fabButton} onPress={() => setShowAddForm(true)}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  viewToggle: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  viewToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  viewToggleButtonActive: {
    backgroundColor: '#4CAF50',
  },
  viewToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  viewToggleTextActive: {
    color: '#fff',
  },
  addForm: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  addInput: {
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  addFormRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  quantityInput: {
    width: 60,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    textAlign: 'center',
  },
  unitPicker: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  unitOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  unitOptionActive: {
    backgroundColor: '#4CAF50',
  },
  unitOptionText: {
    fontSize: 14,
    color: '#666',
  },
  unitOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  addFormButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  addButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#4CAF50',
  },
  addButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  emptyListContent: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: '#f5f5f5',
  },
  sectionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  sectionCount: {
    fontSize: 13,
    color: '#666',
  },
  groceryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  groceryItemChecked: {
    opacity: 0.6,
  },
  groceryItemContent: {
    flex: 1,
  },
  groceryItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  groceryItemNameChecked: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  groceryItemQuantity: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  aisleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
  },
  aisleBadgeText: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  clearButtonText: {
    color: '#f44336',
    fontSize: 14,
    fontWeight: '500',
  },
  fabButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
});
