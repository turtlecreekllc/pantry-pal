import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSavedRecipes } from '../../hooks/useSavedRecipes';
import { EmptyState } from '../../components/EmptyState';
import { SavedRecipe } from '../../lib/types';

export default function SavedRecipesScreen() {
  const router = useRouter();
  const { savedRecipes, loading, refreshSavedRecipes } = useSavedRecipes();
  const [searchText, setSearchText] = useState('');

  const filteredRecipes = useMemo(() => {
    if (!searchText.trim()) return savedRecipes;
    const searchLower = searchText.toLowerCase();
    return savedRecipes.filter(
      (r) =>
        r.recipe_data.name.toLowerCase().includes(searchLower) ||
        r.recipe_data.category?.toLowerCase().includes(searchLower)
    );
  }, [savedRecipes, searchText]);

  const handleRecipePress = (recipe: SavedRecipe) => {
    router.push(`/recipe/${recipe.recipe_id}`);
  };

  const renderRecipeCard = ({ item }: { item: SavedRecipe }) => (
    <TouchableOpacity
      style={styles.recipeCard}
      onPress={() => handleRecipePress(item)}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: item.recipe_data.thumbnail }}
        style={styles.recipeImage}
      />
      <View style={styles.recipeOverlay}>
        <Text style={styles.recipeName} numberOfLines={2}>
          {item.recipe_data.name}
        </Text>
        <View style={styles.recipeFooter}>
          {item.recipe_data.category && (
            <Text style={styles.recipeCategory}>{item.recipe_data.category}</Text>
          )}
          {item.rating && (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color="#FFC107" />
              <Text style={styles.ratingText}>{item.rating}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.savedBadge}>
        <Ionicons name="heart" size={16} color="#ff4081" />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search saved recipes..."
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#999"
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredRecipes}
        renderItem={renderRecipeCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[
          styles.listContent,
          filteredRecipes.length === 0 && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refreshSavedRecipes}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="heart-outline"
            title={searchText ? 'No matches found' : 'No saved recipes'}
            description={
              searchText
                ? 'Try a different search term'
                : 'Save recipes from the Recipes tab to access them here!'
            }
            actionLabel={searchText ? undefined : 'Browse Recipes'}
            onAction={searchText ? undefined : () => router.push('/(tabs)/recipes')}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  emptyListContent: {
    flex: 1,
  },
  row: {
    justifyContent: 'space-between',
  },
  recipeCard: {
    width: '48%',
    aspectRatio: 0.9,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recipeImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  recipeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  recipeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  recipeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  recipeCategory: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  savedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 4,
  },
});
