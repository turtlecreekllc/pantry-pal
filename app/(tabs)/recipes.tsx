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
import { colors, typography, spacing, borderRadius, shadows } from '../../lib/theme';

type SearchMode = 'text' | 'pantry';

export default function RecipesScreen(): React.ReactElement {
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

  const handleTextSearch = useCallback((): void => {
    Keyboard.dismiss();
    if (searchQuery.trim()) {
      searchRecipes(searchQuery.trim(), true);
    }
  }, [searchQuery, searchRecipes]);

  const handleClear = useCallback((): void => {
    setSearchQuery('');
    clearRecipes();
  }, [clearRecipes]);

  const handleRecipePress = useCallback((recipe: RecipePreview | ScoredRecipe): void => {
    router.push(`/recipe/${recipe.id}`);
  }, [router]);

  const handleToggleIngredient = useCallback((id: string): void => {
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

  const handleSelectAll = useCallback((): void => {
    setSelectedIngredientIds(new Set(pantryItems.map(item => item.id)));
  }, [pantryItems]);

  const handleClearSelection = useCallback((): void => {
    setSelectedIngredientIds(new Set());
    setScoredRecipes([]);
  }, []);

  const handleFindRecipes = useCallback(async (): Promise<void> => {
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

  const handleMagicSuggestion = useCallback(async (): Promise<void> => {
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
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Mode Toggle */}
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeButton, searchMode === 'pantry' && styles.modeButtonActive]}
          onPress={() => setSearchMode('pantry')}
          accessibilityLabel="Search by pantry ingredients"
          accessibilityRole="button"
          accessibilityState={{ selected: searchMode === 'pantry' }}
        >
          <Ionicons
            name="basket"
            size={18}
            color={searchMode === 'pantry' ? colors.brown : colors.brownMuted}
          />
          <Text style={[styles.modeButtonText, searchMode === 'pantry' && styles.modeButtonTextActive]}>
            My Pantry
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, searchMode === 'text' && styles.modeButtonActive]}
          onPress={() => setSearchMode('text')}
          accessibilityLabel="Search recipes by text"
          accessibilityRole="button"
          accessibilityState={{ selected: searchMode === 'text' }}
        >
          <Ionicons
            name="search"
            size={18}
            color={searchMode === 'text' ? colors.brown : colors.brownMuted}
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
                <Ionicons name="restaurant" size={18} color={colors.brown} />
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
              <Ionicons name="search" size={20} color={colors.brownMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by ingredient..."
                placeholderTextColor={colors.brownMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleTextSearch}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableWithoutFeedback onPress={handleClear}>
                  <Ionicons name="close-circle" size={20} color={colors.brownMuted} />
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
              <LoadingSkeleton height={180} borderRadiusSize={borderRadius.lg} />
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
          accessibilityLabel="Find recipes using all pantry items"
          accessibilityRole="button"
        >
          <Ionicons name="sparkles" size={24} color={colors.brown} />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    padding: spacing.space3,
    gap: spacing.space2,
    borderBottomWidth: 2,
    borderBottomColor: colors.brown,
  },
  modeButton: {
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
  modeButtonActive: {
    backgroundColor: colors.primary,
  },
  modeButtonText: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    fontWeight: typography.fontMedium,
    color: colors.brownMuted,
  },
  modeButtonTextActive: {
    color: colors.brown,
    fontFamily: 'Nunito-SemiBold',
    fontWeight: typography.fontSemibold,
  },
  findButtonContainer: {
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space3,
    backgroundColor: colors.white,
    borderBottomWidth: 2,
    borderBottomColor: colors.brown,
  },
  findButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.space2,
    backgroundColor: colors.primary,
    paddingVertical: spacing.space3,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  findButtonText: {
    fontFamily: 'Nunito-SemiBold',
    color: colors.brown,
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
  },
  searchContainer: {
    padding: spacing.space4,
    backgroundColor: colors.white,
    borderBottomWidth: 2,
    borderBottomColor: colors.brown,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cream,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.space4,
    height: 48,
    borderWidth: 2,
    borderColor: colors.brownMuted,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.space2,
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textBase,
    color: colors.brown,
  },
  listContent: {
    padding: spacing.space3,
  },
  cardWrapper: {
    flex: 0.5,
    padding: spacing.space1,
  },
  loadingContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.space3,
  },
  magicFab: {
    position: 'absolute',
    right: spacing.space4,
    bottom: spacing.space4,
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.brown,
    ...shadows.md,
  },
});
