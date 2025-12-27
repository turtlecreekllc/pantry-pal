import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSavedRecipes } from '../../hooks/useSavedRecipes';
import { useMealPlans } from '../../hooks/useMealPlans';
import { useRecipes } from '../../hooks/useRecipes';
import { usePantry } from '../../hooks/usePantry';
import { useGroceryList } from '../../hooks/useGroceryList';
import { MealIngredientMatcher } from '../../components/MealIngredientMatcher';
import { getRecipeDetails } from '../../lib/recipeService';
import { SavedRecipe, MealType, RecipePreview, RecipeSource, ExtendedRecipe, IngredientDeduction } from '../../lib/types';

export default function AddMealScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date: string; mealType: string }>();
  const { savedRecipes } = useSavedRecipes();
  const { addMealPlan } = useMealPlans();
  const { recipes, searchRecipes, loading } = useRecipes();
  const { pantryItems, useItem } = usePantry();
  const { addGroceryItem } = useGroceryList();

  const [searchText, setSearchText] = useState('');
  const [servings, setServings] = useState(1);
  const [activeTab, setActiveTab] = useState<'saved' | 'search'>('saved');
  const [showMatcher, setShowMatcher] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<ExtendedRecipe | null>(null);
  const [pendingMealData, setPendingMealData] = useState<{
    recipe_id: string;
    recipe_source: RecipeSource;
    recipe_name: string;
    recipe_thumbnail: string;
  } | null>(null);
  const [loadingRecipe, setLoadingRecipe] = useState(false);

  const mealType = params.mealType as MealType;
  const date = params.date;

  const filteredSavedRecipes = useMemo(() => {
    if (!searchText.trim()) return savedRecipes;
    const searchLower = searchText.toLowerCase();
    return savedRecipes.filter((r) =>
      r.recipe_data.name.toLowerCase().includes(searchLower)
    );
  }, [savedRecipes, searchText]);

  const handleSearch = () => {
    if (searchText.trim()) {
      searchRecipes(searchText, true);
    }
  };

  const handleSelectSavedRecipe = async (recipe: SavedRecipe) => {
    // Use the saved recipe data directly since it has ingredients
    setSelectedRecipe(recipe.recipe_data);
    setPendingMealData({
      recipe_id: recipe.recipe_id,
      recipe_source: recipe.recipe_source,
      recipe_name: recipe.recipe_data.name,
      recipe_thumbnail: recipe.recipe_data.thumbnail,
    });
    setShowMatcher(true);
  };

  const handleSelectSearchRecipe = async (recipe: RecipePreview) => {
    const source: RecipeSource = recipe.id.startsWith('spoonacular-')
      ? 'spoonacular'
      : 'themealdb';

    // Fetch full recipe details to get ingredients
    setLoadingRecipe(true);
    try {
      const fullRecipe = await getRecipeDetails(recipe.id);
      if (fullRecipe) {
        setSelectedRecipe(fullRecipe);
        setPendingMealData({
          recipe_id: recipe.id,
          recipe_source: source,
          recipe_name: recipe.name,
          recipe_thumbnail: recipe.thumbnail,
        });
        setShowMatcher(true);
      } else {
        Alert.alert('Error', 'Could not load recipe details');
      }
    } catch (error) {
      console.error('Error loading recipe:', error);
      Alert.alert('Error', 'Failed to load recipe details');
    } finally {
      setLoadingRecipe(false);
    }
  };

  const handleConfirmDeductions = async (deductions: IngredientDeduction[]) => {
    if (!pendingMealData) return;

    try {
      await addMealPlan(
        {
          date,
          meal_type: mealType,
          recipe_id: pendingMealData.recipe_id,
          recipe_source: pendingMealData.recipe_source,
          recipe_name: pendingMealData.recipe_name,
          recipe_thumbnail: pendingMealData.recipe_thumbnail,
          servings,
          notes: null,
          is_completed: false,
          completed_at: null,
          ingredient_deductions: deductions.length > 0 ? deductions : null,
        },
        {
          deductions,
          onDeduct: useItem,
        }
      );
      setShowMatcher(false);
      router.back();
    } catch (error) {
      console.error('Error adding meal:', error);
      Alert.alert('Error', 'Failed to add meal to plan');
    }
  };

  const handleAddToGrocery = async (ingredient: string, amount: string) => {
    try {
      // Parse amount string like "1.5 cup" into quantity and unit
      const match = amount.match(/^([\d.]+)\s*(.*)$/);
      const quantity = match ? parseFloat(match[1]) : 1;
      const unit = match ? match[2].trim() || 'item' : 'item';

      await addGroceryItem({
        name: ingredient,
        quantity,
        unit,
        recipe_id: pendingMealData?.recipe_id || null,
        recipe_name: pendingMealData?.recipe_name || null,
        is_checked: false,
      });
      Alert.alert('Added', `${ingredient} added to grocery list`);
    } catch (error) {
      console.error('Error adding to grocery:', error);
    }
  };

  const handleCancelMatcher = () => {
    setShowMatcher(false);
    setSelectedRecipe(null);
    setPendingMealData(null);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  const renderSavedRecipe = ({ item }: { item: SavedRecipe }) => (
    <TouchableOpacity
      style={styles.recipeCard}
      onPress={() => handleSelectSavedRecipe(item)}
    >
      <Image source={{ uri: item.recipe_data.thumbnail }} style={styles.recipeImage} />
      <View style={styles.recipeInfo}>
        <Text style={styles.recipeName} numberOfLines={2}>
          {item.recipe_data.name}
        </Text>
        {item.recipe_data.category && (
          <Text style={styles.recipeCategory}>{item.recipe_data.category}</Text>
        )}
      </View>
      <Ionicons name="add-circle" size={28} color="#4CAF50" />
    </TouchableOpacity>
  );

  const renderSearchRecipe = ({ item }: { item: RecipePreview }) => (
    <TouchableOpacity
      style={styles.recipeCard}
      onPress={() => handleSelectSearchRecipe(item)}
    >
      <Image source={{ uri: item.thumbnail }} style={styles.recipeImage} />
      <View style={styles.recipeInfo}>
        <Text style={styles.recipeName} numberOfLines={2}>
          {item.name}
        </Text>
      </View>
      <Ionicons name="add-circle" size={28} color="#4CAF50" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: `Add ${mealType.charAt(0).toUpperCase() + mealType.slice(1)}`,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={28} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.header}>
        <Text style={styles.dateText}>{formatDate(date)}</Text>

        <View style={styles.servingsRow}>
          <Text style={styles.servingsLabel}>Servings:</Text>
          <TouchableOpacity
            onPress={() => setServings(Math.max(1, servings - 1))}
            style={styles.servingsButton}
          >
            <Ionicons name="remove" size={20} color="#4CAF50" />
          </TouchableOpacity>
          <Text style={styles.servingsValue}>{servings}</Text>
          <TouchableOpacity
            onPress={() => setServings(servings + 1)}
            style={styles.servingsButton}
          >
            <Ionicons name="add" size={20} color="#4CAF50" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'saved' && styles.tabActive]}
          onPress={() => setActiveTab('saved')}
        >
          <Ionicons
            name="heart"
            size={18}
            color={activeTab === 'saved' ? '#4CAF50' : '#666'}
          />
          <Text
            style={[styles.tabText, activeTab === 'saved' && styles.tabTextActive]}
          >
            Saved
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'search' && styles.tabActive]}
          onPress={() => setActiveTab('search')}
        >
          <Ionicons
            name="search"
            size={18}
            color={activeTab === 'search' ? '#4CAF50' : '#666'}
          />
          <Text
            style={[styles.tabText, activeTab === 'search' && styles.tabTextActive]}
          >
            Search
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder={
            activeTab === 'saved' ? 'Filter saved recipes...' : 'Search for recipes...'
          }
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={activeTab === 'search' ? handleSearch : undefined}
          returnKeyType={activeTab === 'search' ? 'search' : 'done'}
          placeholderTextColor="#999"
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {activeTab === 'saved' ? (
        <FlatList
          data={filteredSavedRecipes}
          renderItem={renderSavedRecipe}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="heart-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>
                {searchText ? 'No matching saved recipes' : 'No saved recipes yet'}
              </Text>
              <Text style={styles.emptySubtext}>
                Save recipes from the Recipes tab first
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={recipes}
          renderItem={renderSearchRecipe}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>
                {loading ? 'Searching...' : 'Search for a recipe'}
              </Text>
              <Text style={styles.emptySubtext}>
                Type a recipe name and press search
              </Text>
            </View>
          }
        />
      )}

      {/* Loading overlay */}
      {loadingRecipe && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading recipe...</Text>
        </View>
      )}

      {/* Ingredient Matcher Modal */}
      <MealIngredientMatcher
        visible={showMatcher}
        recipe={selectedRecipe}
        pantryItems={pantryItems}
        servings={servings}
        onConfirm={handleConfirmDeductions}
        onCancel={handleCancelMatcher}
        onAddToGrocery={handleAddToGrocery}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  servingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  servingsLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 12,
  },
  servingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  servingsValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 16,
    minWidth: 24,
    textAlign: 'center',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#4CAF50',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
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
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  recipeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 12,
  },
  recipeImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
  },
  recipeInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  recipeName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  recipeCategory: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
});
