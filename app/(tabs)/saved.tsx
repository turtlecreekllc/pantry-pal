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
import { colors, typography, spacing, borderRadius, shadows } from '../../lib/theme';

export default function SavedRecipesScreen(): React.ReactElement {
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

  const handleRecipePress = (recipe: SavedRecipe): void => {
    router.push(`/recipe/${recipe.recipe_id}`);
  };

  const renderRecipeCard = ({ item }: { item: SavedRecipe }): React.ReactElement => (
    <TouchableOpacity
      style={styles.recipeCard}
      onPress={() => handleRecipePress(item)}
      activeOpacity={0.8}
      accessibilityLabel={item.recipe_data.name}
      accessibilityRole="button"
    >
      {item.recipe_data.thumbnail ? (
        <Image
          source={{ uri: item.recipe_data.thumbnail }}
          style={styles.recipeImage}
        />
      ) : (
        <View style={[styles.recipeImage, styles.recipeImagePlaceholder]}>
          <Ionicons name="restaurant-outline" size={48} color={colors.brownMuted} />
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
              <Ionicons name="star" size={12} color={colors.primary} />
              <Text style={styles.ratingText}>{item.rating}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.savedBadge}>
        <Ionicons name="heart" size={16} color={colors.coral} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={colors.brownMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search saved recipes..."
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor={colors.brownMuted}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={18} color={colors.brownMuted} />
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
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="heart-outline"
            title={searchText ? 'No matches found' : 'No saved recipes'}
            description={
              searchText
                ? 'Try a different search term'
                : 'Save recipes from the Recipes tab or import your own!'
            }
            actionLabel={searchText ? undefined : 'Import Recipe'}
            onAction={searchText ? undefined : () => router.push('/import')}
          />
        }
      />

      {/* Import FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/import')}
        activeOpacity={0.8}
        accessibilityLabel="Import recipe"
        accessibilityRole="button"
      >
        <Ionicons name="add" size={28} color={colors.brown} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    margin: spacing.space4,
    paddingHorizontal: spacing.space3,
    paddingVertical: spacing.space3,
    borderRadius: borderRadius.lg,
    gap: spacing.space2,
    borderWidth: 2,
    borderColor: colors.brownMuted,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textBase,
    color: colors.brown,
  },
  listContent: {
    paddingHorizontal: spacing.space3,
    paddingBottom: spacing.space4,
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
    marginBottom: spacing.space3,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.brown,
    ...shadows.sm,
  },
  recipeImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  recipeImagePlaceholder: {
    backgroundColor: colors.creamLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.space3,
    backgroundColor: colors.primary,
    borderTopWidth: 2,
    borderTopColor: colors.brown,
  },
  recipeName: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textSm,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  recipeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.space1,
  },
  recipeCategory: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textXs,
    color: colors.brownLight,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space1,
  },
  ratingText: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textXs,
    color: colors.brown,
    fontWeight: typography.fontMedium,
  },
  savedBadge: {
    position: 'absolute',
    top: spacing.space2,
    right: spacing.space2,
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    padding: spacing.space1,
    borderWidth: 1,
    borderColor: colors.brown,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.space6,
    right: spacing.space6,
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.brown,
    ...shadows.md,
  },
});
