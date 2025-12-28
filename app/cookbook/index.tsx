import React, { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCookbooks } from '../../hooks/useCookbooks';
import { useSavedRecipes } from '../../hooks/useSavedRecipes';
import { EmptyState } from '../../components/EmptyState';
import { Cookbook } from '../../lib/types';

export default function CookbooksIndexScreen() {
  const router = useRouter();
  const { cookbooks, loading, refreshCookbooks, getSmartCollections } = useCookbooks();
  const { savedRecipes } = useSavedRecipes();

  // Get smart collections
  const smartCollections = useMemo(
    () => getSmartCollections(savedRecipes),
    [savedRecipes, getSmartCollections]
  );

  // Combine smart and user cookbooks
  const allCookbooks = useMemo(() => {
    return [...smartCollections, ...cookbooks];
  }, [smartCollections, cookbooks]);

  const handleCookbookPress = (cookbook: Cookbook) => {
    if (cookbook.is_smart) {
      // For smart collections, we'll handle differently
      router.push({
        pathname: '/cookbook/[id]',
        params: { id: cookbook.id, smart: 'true', criteria: JSON.stringify(cookbook.smart_criteria) },
      });
    } else {
      router.push(`/cookbook/${cookbook.id}`);
    }
  };

  const getSmartIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'quick_meals':
        return 'time-outline';
      case 'highly_rated':
        return 'star';
      case 'recently_made':
        return 'calendar-outline';
      default:
        return 'folder-outline';
    }
  };

  const renderCookbookCard = ({ item }: { item: Cookbook }) => (
    <TouchableOpacity
      style={styles.cookbookCard}
      onPress={() => handleCookbookPress(item)}
      activeOpacity={0.8}
    >
      {item.cover_image_url ? (
        <Image source={{ uri: item.cover_image_url }} style={styles.coverImage} />
      ) : (
        <View style={[styles.coverImage, styles.placeholderCover]}>
          {item.is_smart ? (
            <Ionicons
              name={getSmartIcon(item.smart_criteria?.type || '')}
              size={32}
              color="#4CAF50"
            />
          ) : (
            <Ionicons name="book-outline" size={32} color="#4CAF50" />
          )}
        </View>
      )}
      <View style={styles.cardContent}>
        <View style={styles.titleRow}>
          <Text style={styles.cookbookName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.is_smart && (
            <View style={styles.smartBadge}>
              <Ionicons name="sparkles" size={12} color="#FF9800" />
            </View>
          )}
        </View>
        <Text style={styles.recipeCount}>
          {item.recipe_count || 0} recipe{(item.recipe_count || 0) !== 1 ? 's' : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      {smartCollections.length > 0 && (
        <Text style={styles.sectionLabel}>Smart Collections</Text>
      )}
    </View>
  );

  const renderSeparator = () => {
    if (smartCollections.length > 0 && cookbooks.length > 0) {
      return (
        <View style={styles.sectionSeparator}>
          <Text style={styles.sectionLabel}>My Cookbooks</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={allCookbooks}
        renderItem={renderCookbookCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[
          styles.listContent,
          allCookbooks.length === 0 && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refreshCookbooks}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
        ListHeaderComponent={smartCollections.length > 0 ? renderHeader : null}
        ListEmptyComponent={
          <EmptyState
            icon="book-outline"
            title="No cookbooks yet"
            description="Create cookbooks to organize your saved recipes into collections"
            actionLabel="Create Cookbook"
            onAction={() => router.push('/cookbook/create')}
          />
        }
      />

      {/* Create Cookbook FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/cookbook/create')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    padding: 12,
    paddingBottom: 80,
  },
  emptyListContent: {
    flex: 1,
  },
  header: {
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionSeparator: {
    marginTop: 16,
    marginBottom: 8,
  },
  row: {
    justifyContent: 'space-between',
  },
  cookbookCard: {
    width: '48%',
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
  coverImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  placeholderCover: {
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    padding: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cookbookName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  smartBadge: {
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 4,
  },
  recipeCount: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});
