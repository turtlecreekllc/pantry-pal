import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCookbooks } from '../hooks/useCookbooks';
import { Cookbook } from '../lib/types';

interface AddToCookbookModalProps {
  visible: boolean;
  onClose: () => void;
  savedRecipeId: string;
  recipeName: string;
}

export function AddToCookbookModal({
  visible,
  onClose,
  savedRecipeId,
  recipeName,
}: AddToCookbookModalProps) {
  const {
    cookbooks,
    loading,
    createCookbook,
    addRecipeToCookbook,
    removeRecipeFromCookbook,
    getRecipeCookbooks,
  } = useCookbooks();

  const [recipeCookbooks, setRecipeCookbooks] = useState<string[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newCookbookName, setNewCookbookName] = useState('');
  const [creating, setCreating] = useState(false);
  const [loadingCookbooks, setLoadingCookbooks] = useState(true);

  // Fetch which cookbooks this recipe is in
  useEffect(() => {
    if (visible) {
      setLoadingCookbooks(true);
      getRecipeCookbooks(savedRecipeId)
        .then((cbs) => {
          setRecipeCookbooks(cbs.map((c) => c.id));
        })
        .finally(() => {
          setLoadingCookbooks(false);
        });
    }
  }, [visible, savedRecipeId]);

  const handleToggleCookbook = async (cookbook: Cookbook) => {
    const isInCookbook = recipeCookbooks.includes(cookbook.id);

    try {
      if (isInCookbook) {
        await removeRecipeFromCookbook(cookbook.id, savedRecipeId);
        setRecipeCookbooks((prev) => prev.filter((id) => id !== cookbook.id));
      } else {
        await addRecipeToCookbook(cookbook.id, savedRecipeId);
        setRecipeCookbooks((prev) => [...prev, cookbook.id]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update cookbook');
    }
  };

  const handleCreateCookbook = async () => {
    if (!newCookbookName.trim()) {
      Alert.alert('Error', 'Please enter a cookbook name');
      return;
    }

    setCreating(true);

    try {
      const newCookbook = await createCookbook(newCookbookName.trim());
      // Automatically add recipe to the new cookbook
      await addRecipeToCookbook(newCookbook.id, savedRecipeId);
      setRecipeCookbooks((prev) => [...prev, newCookbook.id]);
      setNewCookbookName('');
      setShowCreate(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to create cookbook');
    } finally {
      setCreating(false);
    }
  };

  const userCookbooks = cookbooks.filter((c) => !c.is_smart);

  const renderCookbookItem = ({ item }: { item: Cookbook }) => {
    const isSelected = recipeCookbooks.includes(item.id);

    return (
      <TouchableOpacity
        style={styles.cookbookItem}
        onPress={() => handleToggleCookbook(item)}
      >
        <View style={styles.cookbookInfo}>
          <View
            style={[
              styles.cookbookIcon,
              isSelected && styles.cookbookIconSelected,
            ]}
          >
            <Ionicons
              name={isSelected ? 'book' : 'book-outline'}
              size={20}
              color={isSelected ? '#fff' : '#4CAF50'}
            />
          </View>
          <View style={styles.cookbookText}>
            <Text style={styles.cookbookName}>{item.name}</Text>
            <Text style={styles.cookbookCount}>
              {item.recipe_count || 0} recipe{(item.recipe_count || 0) !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        <Ionicons
          name={isSelected ? 'checkmark-circle' : 'add-circle-outline'}
          size={24}
          color={isSelected ? '#4CAF50' : '#999'}
        />
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Add to Cookbook</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <Text style={styles.recipeName} numberOfLines={1}>
            {recipeName}
          </Text>

          {/* Cookbook List */}
          {loadingCookbooks || loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
            </View>
          ) : (
            <FlatList
              data={userCookbooks}
              renderItem={renderCookbookItem}
              keyExtractor={(item) => item.id}
              style={styles.list}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="book-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>No cookbooks yet</Text>
                  <Text style={styles.emptySubtext}>
                    Create one below to organize your recipes
                  </Text>
                </View>
              }
            />
          )}

          {/* Create New Cookbook */}
          {showCreate ? (
            <View style={styles.createForm}>
              <TextInput
                style={styles.createInput}
                value={newCookbookName}
                onChangeText={setNewCookbookName}
                placeholder="New cookbook name"
                placeholderTextColor="#999"
                autoFocus
              />
              <View style={styles.createButtons}>
                <TouchableOpacity
                  style={styles.createCancelButton}
                  onPress={() => {
                    setShowCreate(false);
                    setNewCookbookName('');
                  }}
                >
                  <Text style={styles.createCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.createConfirmButton,
                    (!newCookbookName.trim() || creating) &&
                      styles.createConfirmButtonDisabled,
                  ]}
                  onPress={handleCreateCookbook}
                  disabled={!newCookbookName.trim() || creating}
                >
                  {creating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.createConfirmText}>Create & Add</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowCreate(true)}
            >
              <Ionicons name="add" size={20} color="#4CAF50" />
              <Text style={styles.createButtonText}>Create New Cookbook</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  recipeName: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    padding: 48,
    alignItems: 'center',
  },
  list: {
    maxHeight: 300,
  },
  cookbookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cookbookInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  cookbookIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cookbookIconSelected: {
    backgroundColor: '#4CAF50',
  },
  cookbookText: {
    flex: 1,
  },
  cookbookName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  cookbookCount: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    margin: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4CAF50',
  },
  createForm: {
    padding: 16,
    gap: 12,
  },
  createInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#333',
  },
  createButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  createCancelButton: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  createCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  createConfirmButton: {
    flex: 2,
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
  },
  createConfirmButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  createConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
