import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCookbooks } from '../../hooks/useCookbooks';
import { useSavedRecipes } from '../../hooks/useSavedRecipes';
import { EmptyState } from '../../components/EmptyState';
import { Cookbook, SavedRecipe, SmartCriteria } from '../../lib/types';

export default function CookbookDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    smart?: string;
    criteria?: string;
  }>();

  const { getCookbookWithRecipes, deleteCookbook, removeRecipeFromCookbook } = useCookbooks();
  const { savedRecipes } = useSavedRecipes();

  const [cookbook, setCookbook] = useState<Cookbook | null>(null);
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [loading, setLoading] = useState(true);

  const isSmart = params.smart === 'true';

  // For smart collections, filter recipes based on criteria
  const smartRecipes = useMemo(() => {
    if (!isSmart || !params.criteria) return [];

    try {
      const criteria: SmartCriteria = JSON.parse(params.criteria);
      const now = new Date();

      switch (criteria.type) {
        case 'quick_meals':
          return savedRecipes.filter(
            (r) =>
              r.recipe_data.readyInMinutes &&
              r.recipe_data.readyInMinutes <= (criteria.maxTime || 30)
          );

        case 'highly_rated':
          return savedRecipes.filter(
            (r) => r.rating && r.rating >= (criteria.minRating || 4)
          );

        case 'recently_made':
          const daysCutoff = criteria.daysSince || 30;
          return savedRecipes.filter((r) => {
            if (!r.last_made_at) return false;
            const madeDate = new Date(r.last_made_at);
            const diffDays = (now.getTime() - madeDate.getTime()) / (1000 * 60 * 60 * 24);
            return diffDays <= daysCutoff;
          });

        default:
          return [];
      }
    } catch {
      return [];
    }
  }, [isSmart, params.criteria, savedRecipes]);

  // Fetch cookbook data
  useEffect(() => {
    const fetchData = async () => {
      if (isSmart) {
        // For smart collections, create a virtual cookbook
        try {
          const criteria: SmartCriteria = JSON.parse(params.criteria || '{}');
          const name =
            criteria.type === 'quick_meals'
              ? 'Quick Meals'
              : criteria.type === 'highly_rated'
              ? 'Highly Rated'
              : criteria.type === 'recently_made'
              ? 'Recently Made'
              : 'Smart Collection';

          setCookbook({
            id: params.id,
            user_id: '',
            name,
            description: null,
            cover_image_url: smartRecipes[0]?.recipe_data.thumbnail || null,
            is_public: false,
            is_smart: true,
            smart_criteria: criteria,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            recipe_count: smartRecipes.length,
          });
          setRecipes(smartRecipes);
        } catch (err) {
          console.error('Error parsing smart criteria:', err);
        }
        setLoading(false);
      } else {
        // Fetch regular cookbook
        setLoading(true);
        const result = await getCookbookWithRecipes(params.id);
        if (result) {
          setCookbook(result);
          setRecipes(result.recipes);
        }
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id, isSmart, params.criteria, smartRecipes.length]);

  const handleRecipePress = (recipe: SavedRecipe) => {
    router.push(`/recipe/${recipe.recipe_id}`);
  };

  const handleRemoveRecipe = (recipe: SavedRecipe) => {
    if (isSmart) return; // Can't remove from smart collections

    Alert.alert(
      'Remove Recipe',
      `Remove "${recipe.recipe_data.name}" from this cookbook?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeRecipeFromCookbook(params.id, recipe.id);
              setRecipes((prev) => prev.filter((r) => r.id !== recipe.id));
            } catch (error) {
              Alert.alert('Error', 'Failed to remove recipe');
            }
          },
        },
      ]
    );
  };

  const handleDeleteCookbook = () => {
    if (isSmart) return;

    Alert.alert(
      'Delete Cookbook',
      `Delete "${cookbook?.name}"? This won't delete the recipes themselves.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCookbook(params.id);
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete cookbook');
            }
          },
        },
      ]
    );
  };

  const renderRecipeCard = ({ item }: { item: SavedRecipe }) => (
    <TouchableOpacity
      style={styles.recipeCard}
      onPress={() => handleRecipePress(item)}
      onLongPress={() => handleRemoveRecipe(item)}
      activeOpacity={0.8}
    >
      {item.recipe_data.thumbnail ? (
        <Image
          source={{ uri: item.recipe_data.thumbnail }}
          style={styles.recipeImage}
        />
      ) : (
        <View style={[styles.recipeImage, styles.recipeImagePlaceholder]}>
          <Ionicons name="restaurant-outline" size={48} color="#999" />
        </View>
      )}
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
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      </SafeAreaView>
    );
  }

  if (!cookbook) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          icon="book-outline"
          title="Cookbook not found"
          description="This cookbook may have been deleted"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: cookbook.name,
          headerRight: () =>
            !isSmart ? (
              <TouchableOpacity
                onPress={handleDeleteCookbook}
                style={styles.headerButton}
              >
                <Ionicons name="trash-outline" size={24} color="#fff" />
              </TouchableOpacity>
            ) : null,
        }}
      />

      {/* Cookbook Header */}
      <View style={styles.header}>
        {cookbook.cover_image_url && (
          <Image source={{ uri: cookbook.cover_image_url }} style={styles.headerImage} />
        )}
        <View style={styles.headerContent}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>{cookbook.name}</Text>
            {cookbook.is_smart && (
              <View style={styles.smartBadge}>
                <Ionicons name="sparkles" size={14} color="#FF9800" />
                <Text style={styles.smartBadgeText}>Smart</Text>
              </View>
            )}
          </View>
          <Text style={styles.headerCount}>
            {recipes.length} recipe{recipes.length !== 1 ? 's' : ''}
          </Text>
          {cookbook.description && (
            <Text style={styles.headerDescription}>{cookbook.description}</Text>
          )}
        </View>
      </View>

      {/* Recipe List */}
      <FlatList
        data={recipes}
        renderItem={renderRecipeCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[
          styles.listContent,
          recipes.length === 0 && styles.emptyListContent,
        ]}
        ListEmptyComponent={
          <EmptyState
            icon="restaurant-outline"
            title="No recipes yet"
            description={
              isSmart
                ? 'Recipes will appear here automatically when they match the criteria'
                : 'Add recipes to this cookbook from the recipe detail screen'
            }
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButton: {
    padding: 8,
    marginRight: 8,
  },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  headerContent: {
    padding: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  smartBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF8E1',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  smartBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FF9800',
  },
  headerCount: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  headerDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    lineHeight: 20,
  },
  listContent: {
    padding: 12,
    paddingBottom: 24,
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
  recipeImagePlaceholder: {
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
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
});
