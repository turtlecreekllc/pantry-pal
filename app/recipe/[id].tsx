import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRecipes } from '../../hooks/useRecipes';
import { useSavedRecipes } from '../../hooks/useSavedRecipes';
import { EmptyState } from '../../components/EmptyState';
import { StarRating } from '../../components/ui/StarRating';
import { AddToCookbookModal } from '../../components/AddToCookbookModal';
import { RecipeSource } from '../../lib/types';
import { shareRecipeAsText, shareRecipeAsPDF, printRecipe } from '../../lib/sharingService';

export default function RecipeDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const { selectedRecipe, loading, error, fetchRecipeDetails, clearSelectedRecipe } = useRecipes();
  const { savedRecipes, isRecipeSaved, saveRecipe, unsaveRecipe, updateRecipeRating } = useSavedRecipes();

  // Get saved recipe data for rating
  const recipeSource: RecipeSource = id?.startsWith('spoonacular-') ? 'spoonacular' : 'themealdb';
  const savedRecipe = useMemo(() => {
    return savedRecipes.find(
      (r) => r.recipe_id === id && r.recipe_source === recipeSource
    );
  }, [savedRecipes, id, recipeSource]);

  const isSaved = id ? isRecipeSaved(id, recipeSource) : false;
  const [showCookbookModal, setShowCookbookModal] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  const handleShare = () => {
    if (!selectedRecipe) return;

    Alert.alert(
      'Share Recipe',
      'How would you like to share this recipe?',
      [
        {
          text: 'Share as Text',
          onPress: async () => {
            const success = await shareRecipeAsText({
              name: selectedRecipe.name,
              ingredients: selectedRecipe.ingredients,
              instructions: selectedRecipe.instructions,
              source: selectedRecipe.source || undefined,
            });
            if (!success) {
              Alert.alert('Error', 'Failed to share recipe');
            }
          },
        },
        {
          text: 'Share as PDF',
          onPress: async () => {
            const success = await shareRecipeAsPDF({
              name: selectedRecipe.name,
              description: selectedRecipe.category ? `${selectedRecipe.category} cuisine` : undefined,
              ingredients: selectedRecipe.ingredients,
              instructions: selectedRecipe.instructions,
              source: selectedRecipe.source || undefined,
              imageUrl: selectedRecipe.thumbnail,
            });
            if (!success) {
              Alert.alert('Error', 'Failed to create PDF');
            }
          },
        },
        {
          text: 'Print',
          onPress: async () => {
            await printRecipe({
              name: selectedRecipe.name,
              ingredients: selectedRecipe.ingredients,
              instructions: selectedRecipe.instructions,
              source: selectedRecipe.source || undefined,
              imageUrl: selectedRecipe.thumbnail,
            });
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  useEffect(() => {
    if (id) {
      fetchRecipeDetails(id);
    }
    return () => clearSelectedRecipe();
  }, [id]);

  useEffect(() => {
    if (selectedRecipe) {
      navigation.setOptions({ title: selectedRecipe.name });
    }
  }, [selectedRecipe, navigation]);

  const handleWatchVideo = () => {
    if (selectedRecipe?.youtubeUrl) {
      Linking.openURL(selectedRecipe.youtubeUrl);
    }
  };

  const handleViewSource = () => {
    if (selectedRecipe?.source) {
      Linking.openURL(selectedRecipe.source);
    }
  };

  const handleToggleSave = async () => {
    if (!selectedRecipe || !id) return;
    try {
      if (isSaved) {
        await unsaveRecipe(id, recipeSource);
      } else {
        await saveRecipe({ ...selectedRecipe, recipeSource }, recipeSource);
      }
    } catch (error) {
      console.error('Error toggling save:', error);
    }
  };

  const handleRatingChange = async (rating: number) => {
    if (!savedRecipe) return;
    try {
      await updateRecipeRating(savedRecipe.id, rating === 0 ? null as any : rating);
    } catch (error) {
      console.error('Error updating rating:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading recipe...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !selectedRecipe) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          icon="alert-circle-outline"
          title="Recipe not found"
          description="We couldn't find this recipe. Please try again."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: selectedRecipe.name,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={28} color="#fff" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={styles.headerRight}>
              <TouchableOpacity
                onPress={handleShare}
                style={styles.headerButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="share-outline" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleToggleSave}
                style={styles.headerButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={isSaved ? 'heart' : 'heart-outline'}
                  size={24}
                  color={isSaved ? '#f44336' : '#fff'}
                />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Image source={{ uri: selectedRecipe.thumbnail }} style={styles.heroImage} />

        <View style={styles.content}>
          <Text style={styles.title}>{selectedRecipe.name}</Text>

          {/* Rating and Cookbook section - only show when saved */}
          {isSaved && savedRecipe && (
            <>
              <View style={styles.ratingSection}>
                <Text style={styles.ratingLabel}>Your Rating</Text>
                <StarRating
                  rating={savedRecipe?.rating || null}
                  onChange={handleRatingChange}
                  size={28}
                />
              </View>

              <TouchableOpacity
                style={styles.cookbookButton}
                onPress={() => setShowCookbookModal(true)}
              >
                <Ionicons name="book-outline" size={18} color="#4CAF50" />
                <Text style={styles.cookbookButtonText}>Add to Cookbook</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.badges}>
            {selectedRecipe.category && (
              <View style={styles.badge}>
                <Ionicons name="restaurant-outline" size={14} color="#666" />
                <Text style={styles.badgeText}>{selectedRecipe.category}</Text>
              </View>
            )}
            {selectedRecipe.area && (
              <View style={styles.badge}>
                <Ionicons name="globe-outline" size={14} color="#666" />
                <Text style={styles.badgeText}>{selectedRecipe.area}</Text>
              </View>
            )}
          </View>

          {/* Start Cooking Button */}
          <TouchableOpacity
            style={styles.cookButton}
            onPress={() => router.push(`/recipe/cook/${id}`)}
          >
            <Ionicons name="restaurant" size={20} color="#fff" />
            <Text style={styles.cookButtonText}>Start Cooking</Text>
          </TouchableOpacity>

          {selectedRecipe.youtubeUrl && (
            <TouchableOpacity style={styles.videoButton} onPress={handleWatchVideo}>
              <Ionicons name="logo-youtube" size={20} color="#FF0000" />
              <Text style={styles.videoButtonText}>Watch Video</Text>
            </TouchableOpacity>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ingredients</Text>
            {selectedRecipe.ingredients.map((ing, index) => (
              <View key={index} style={styles.ingredientRow}>
                <View style={styles.bulletPoint} />
                <Text style={styles.ingredientText}>
                  {ing.measure ? `${ing.measure} ` : ''}{ing.ingredient}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Instructions</Text>
            {selectedRecipe.instructions.split('\n').filter(Boolean).map((step, index) => (
              <View key={index} style={styles.instructionRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.instructionText}>{step.trim()}</Text>
              </View>
            ))}
          </View>

          {selectedRecipe.source && (
            <TouchableOpacity style={styles.sourceButton} onPress={handleViewSource}>
              <Ionicons name="link-outline" size={18} color="#4CAF50" />
              <Text style={styles.sourceButtonText}>View Original Recipe</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Add to Cookbook Modal */}
      {savedRecipe && (
        <AddToCookbookModal
          visible={showCookbookModal}
          onClose={() => setShowCookbookModal(false)}
          savedRecipeId={savedRecipe.id}
          recipeName={selectedRecipe.name}
        />
      )}
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: -8,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -8,
  },
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  cookbookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    marginBottom: 16,
  },
  cookbookButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  heroImage: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 6,
  },
  badgeText: {
    fontSize: 13,
    color: '#666',
  },
  cookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
    marginBottom: 12,
  },
  cookButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  videoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 24,
  },
  videoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
    marginTop: 7,
    marginRight: 12,
  },
  ingredientText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    lineHeight: 20,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  sourceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 8,
    gap: 8,
    marginBottom: 24,
  },
  sourceButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
});
