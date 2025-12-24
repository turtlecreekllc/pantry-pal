import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRecipes } from '../../hooks/useRecipes';
import { EmptyState } from '../../components/EmptyState';

export default function RecipeDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { selectedRecipe, loading, error, fetchRecipeDetails, clearSelectedRecipe } = useRecipes();

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
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Image source={{ uri: selectedRecipe.thumbnail }} style={styles.heroImage} />

        <View style={styles.content}>
          <Text style={styles.title}>{selectedRecipe.name}</Text>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
