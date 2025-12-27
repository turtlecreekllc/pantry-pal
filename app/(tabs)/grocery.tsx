import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
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
import { GroceryItem, UNITS, Unit } from '../../lib/types';
import { EmptyState } from '../../components/EmptyState';

export default function GroceryScreen() {
  const {
    groceryItems,
    loading,
    addGroceryItem,
    toggleChecked,
    deleteGroceryItem,
    clearCheckedItems,
    refreshGroceryList,
  } = useGroceryList();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState<Unit>('item');

  const uncheckedItems = groceryItems.filter((item) => !item.is_checked);
  const checkedItems = groceryItems.filter((item) => item.is_checked);

  const handleAddItem = async () => {
    if (!newItemName.trim()) {
      Alert.alert('Error', 'Please enter an item name');
      return;
    }

    try {
      await addGroceryItem({
        name: newItemName.trim(),
        quantity: parseFloat(newItemQuantity) || 1,
        unit: newItemUnit,
        recipe_id: null,
        recipe_name: null,
        is_checked: false,
      });
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
      </TouchableOpacity>
    ),
    [toggleChecked, deleteGroceryItem]
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
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
            description="Add items you need to buy, or they'll be added automatically when recipes need ingredients you don't have."
          />
        }
        ListHeaderComponent={
          checkedItems.length > 0 && uncheckedItems.length > 0 ? (
            <View style={styles.sectionDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Checked</Text>
              <View style={styles.dividerLine} />
            </View>
          ) : null
        }
        stickyHeaderIndices={checkedItems.length > 0 && uncheckedItems.length > 0 ? [uncheckedItems.length] : undefined}
      />

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
  groceryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
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
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 12,
    color: '#999',
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
