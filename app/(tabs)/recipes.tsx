import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRecipes } from '../../hooks/useRecipes';
import { RecipeCard } from '../../components/RecipeCard';
import { EmptyState } from '../../components/EmptyState';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { RecipePreview } from '../../lib/types';

export default function RecipesScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const { recipes, loading, error, searchRecipes, clearRecipes } = useRecipes();

  const handleSearch = useCallback(() => {
    Keyboard.dismiss();
    if (searchQuery.trim()) {
      searchRecipes(searchQuery.trim(), true);
    }
  }, [searchQuery, searchRecipes]);

  const handleClear = useCallback(() => {
    setSearchQuery('');
    clearRecipes();
  }, [clearRecipes]);

  const handleRecipePress = useCallback((recipe: RecipePreview) => {
    router.push(`/recipe/${recipe.id}`);
  }, [router]);

  const renderItem = useCallback(({ item, index }: { item: RecipePreview; index: number }) => {
    // Add padding for odd-indexed items in last row if odd total
    return (
      <View style={styles.cardWrapper}>
        <RecipeCard recipe={item} onPress={() => handleRecipePress(item)} />
      </View>
    );
  }, [handleRecipePress]);

  const keyExtractor = useCallback((item: RecipePreview) => item.id, []);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by ingredient..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableWithoutFeedback onPress={handleClear}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableWithoutFeedback>
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>

      {loading ? (
        <View style={styles.loadingContainer}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View key={i} style={styles.cardWrapper}>
              <LoadingSkeleton height={150} borderRadius={12} />
            </View>
          ))}
        </View>
      ) : recipes.length > 0 ? (
        <FlatList
          data={recipes}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : searchQuery.trim() && !loading ? (
        <EmptyState
          icon="search-outline"
          title="No recipes found"
          description={`No recipes found with "${searchQuery}". Try a different ingredient.`}
        />
      ) : (
        <EmptyState
          icon="restaurant-outline"
          title="Search for recipes"
          description="Enter an ingredient to find delicious recipes you can make!"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  listContent: {
    padding: 12,
  },
  cardWrapper: {
    flex: 0.5,
    padding: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
  },
});
