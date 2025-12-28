import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRecipes } from '../../hooks/useRecipes';
import { usePantry } from '../../hooks/usePantry';
import { useHouseholdContext } from '../../context/HouseholdContext';
import { RecipeCard } from '../../components/RecipeCard';
import { ScoredRecipeCard } from '../../components/ScoredRecipeCard';
import { IngredientSelector } from '../../components/IngredientSelector';
import { EmptyState } from '../../components/EmptyState';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { RecipePreview } from '../../lib/types';
import { searchAndScoreRecipes, ScoredRecipe } from '../../lib/mealDb';

type SearchMode = 'text' | 'pantry';

export default function RecipesScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('pantry');
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<Set<string>>(new Set());
  const [scoredRecipes, setScoredRecipes] = useState<ScoredRecipe[]>([]);
  const [scoredLoading, setScoredLoading] = useState(false);

  const { activeHousehold } = useHouseholdContext();
  const { recipes, loading, searchRecipes, clearRecipes } = useRecipes();
  const { pantryItems } = usePantry({ householdId: activeHousehold?.id });

  const selectedPantryItems = useMemo(() =>
    pantryItems.filter(item => selectedIngredientIds.has(item.id)),
    [pantryItems, selectedIngredientIds]
  );

  const handleTextSearch = useCallback(() => {
    Keyboard.dismiss();
    if (searchQuery.trim()) {
      searchRecipes(searchQuery.trim(), true);
    }
  }, [searchQuery, searchRecipes]);

  const handleClear = useCallback(() => {
    setSearchQuery('');
    clearRecipes();
  }, [clearRecipes]);

  const handleRecipePress = useCallback((recipe: RecipePreview | ScoredRecipe) => {
    router.push(`/recipe/${recipe.id}`);
  }, [router]);

  const handleToggleIngredient = useCallback((id: string) => {
    setSelectedIngredientIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIngredientIds(new Set(pantryItems.map(item => item.id)));
  }, [pantryItems]);

  const handleClearSelection = useCallback(() => {
    setSelectedIngredientIds(new Set());
    setScoredRecipes([]);
  }, []);

  const handleFindRecipes = useCallback(async () => {
    if (selectedPantryItems.length === 0) return;

    setScoredLoading(true);
    try {
      const scored = await searchAndScoreRecipes(selectedPantryItems, pantryItems);
      setScoredRecipes(scored);
    } catch (error) {
      console.error('Error finding recipes:', error);
    } finally {
      setScoredLoading(false);
    }
  }, [selectedPantryItems, pantryItems]);

  const handleMagicSuggestion = useCallback(async () => {
    if (pantryItems.length === 0) return;

    setScoredLoading(true);
    setSearchMode('pantry');
    setSelectedIngredientIds(new Set(pantryItems.map(item => item.id)));
    try {
      const scored = await searchAndScoreRecipes(pantryItems, pantryItems);
      setScoredRecipes(scored);
    } catch (error) {
      console.error('Error finding recipes:', error);
    } finally {
      setScoredLoading(false);
    }
  }, [pantryItems]);

  const renderTextSearchItem = useCallback(({ item }: { item: RecipePreview }) => (
    <View style={styles.cardWrapper}>
      <RecipeCard recipe={item} onPress={() => handleRecipePress(item)} />
    </View>
  ), [handleRecipePress]);

  const renderScoredItem = useCallback(({ item }: { item: ScoredRecipe }) => (
    <View style={styles.cardWrapper}>
      <ScoredRecipeCard recipe={item} onPress={() => handleRecipePress(item)} />
    </View>
  ), [handleRecipePress]);

  const keyExtractor = useCallback((item: RecipePreview | ScoredRecipe) => item.id, []);

  const isLoading = searchMode === 'text' ? loading : scoredLoading;
  const hasResults = searchMode === 'text' ? recipes.length > 0 : scoredRecipes.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Mode Toggle */}
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeButton, searchMode === 'pantry' && styles.modeButtonActive]}
          onPress={() => setSearchMode('pantry')}
        >
          <Ionicons
            name="basket"
            size={18}
            color={searchMode === 'pantry' ? '#fff' : '#666'}
          />
          <Text style={[styles.modeButtonText, searchMode === 'pantry' && styles.modeButtonTextActive]}>
            My Pantry
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, searchMode === 'text' && styles.modeButtonActive]}
          onPress={() => setSearchMode('text')}
        >
          <Ionicons
            name="search"
            size={18}
            color={searchMode === 'text' ? '#fff' : '#666'}
          />
          <Text style={[styles.modeButtonText, searchMode === 'text' && styles.modeButtonTextActive]}>
            Search
          </Text>
        </TouchableOpacity>
      </View>

      {/* Pantry Mode: Ingredient Selector */}
      {searchMode === 'pantry' && pantryItems.length > 0 && (
        <>
          <IngredientSelector
            pantryItems={pantryItems}
            selectedIds={selectedIngredientIds}
            onToggle={handleToggleIngredient}
            onSelectAll={handleSelectAll}
            onClearAll={handleClearSelection}
          />
          {selectedIngredientIds.size > 0 && (
            <View style={styles.findButtonContainer}>
              <TouchableOpacity
                style={styles.findButton}
                onPress={handleFindRecipes}
                disabled={scoredLoading}
              >
                <Ionicons name="restaurant" size={18} color="#fff" />
                <Text style={styles.findButtonText}>
                  Find Recipes ({selectedIngredientIds.size} ingredients)
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* Text Search Mode */}
      {searchMode === 'text' && (
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
                onSubmitEditing={handleTextSearch}
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
      )}

      {/* Results */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View key={i} style={styles.cardWrapper}>
              <LoadingSkeleton height={180} borderRadius={12} />
            </View>
          ))}
        </View>
      ) : hasResults ? (
        searchMode === 'text' ? (
          <FlatList
            data={recipes}
            renderItem={renderTextSearchItem}
            keyExtractor={keyExtractor}
            numColumns={2}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <FlatList
            data={scoredRecipes}
            renderItem={renderScoredItem}
            keyExtractor={keyExtractor}
            numColumns={2}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : searchMode === 'text' && searchQuery.trim() ? (
        <EmptyState
          icon="search-outline"
          title="No recipes found"
          description={`No recipes found with "${searchQuery}". Try a different ingredient.`}
        />
      ) : searchMode === 'pantry' && pantryItems.length === 0 ? (
        <EmptyState
          icon="basket-outline"
          title="Your pantry is empty"
          description="Scan or add items to your pantry to find recipes based on what you have!"
        />
      ) : searchMode === 'pantry' && selectedIngredientIds.size === 0 ? (
        <EmptyState
          icon="restaurant-outline"
          title="Select ingredients"
          description="Choose ingredients from your pantry above to find matching recipes!"
        />
      ) : searchMode === 'pantry' && scoredRecipes.length === 0 && selectedIngredientIds.size > 0 ? (
        <EmptyState
          icon="search-outline"
          title="No matching recipes"
          description="Try selecting different ingredients or adding more items to your pantry."
        />
      ) : (
        <EmptyState
          icon="restaurant-outline"
          title="Search for recipes"
          description="Enter an ingredient to find delicious recipes you can make!"
        />
      )}

      {/* Magic Suggestion FAB */}
      {pantryItems.length > 0 && (
        <TouchableOpacity
          style={styles.magicFab}
          onPress={handleMagicSuggestion}
          activeOpacity={0.8}
          disabled={scoredLoading}
        >
          <Ionicons name="sparkles" size={24} color="#fff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  modeButtonActive: {
    backgroundColor: '#4CAF50',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  findButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  findButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
  },
  findButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  magicFab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#9C27B0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});
