import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useImportedRecipes } from '../../hooks/useImportedRecipes';
import { useSavedRecipes } from '../../hooks/useSavedRecipes';
import { ImportedRecipe, RecipeIngredient, ImportPlatform } from '../../lib/types';
import { getPlatformDisplayName, getPlatformIcon } from '../../lib/recipeImporter';

export default function ImportReviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    recipe: string;
    confidence: string;
    platform: string;
    warnings: string;
  }>();
  // Ref to prevent multiple navigations
  const hasNavigatedRef = useRef(false);
  const { saveImportedRecipe, convertToExtendedRecipe } = useImportedRecipes();
  const { saveRecipe } = useSavedRecipes();
  const [saving, setSaving] = useState(false);

  // Parse the recipe data from params
  const initialRecipe = useMemo(() => {
    try {
      return JSON.parse(params.recipe || '{}') as Partial<ImportedRecipe>;
    } catch {
      return {} as Partial<ImportedRecipe>;
    }
  }, [params.recipe]);

  const confidence = parseFloat(params.confidence || '0');
  const platform = (params.platform || 'web') as ImportPlatform;
  const warnings = useMemo(() => {
    try {
      return JSON.parse(params.warnings || '[]') as string[];
    } catch {
      return [];
    }
  }, [params.warnings]);

  // Editable state
  const [title, setTitle] = useState(initialRecipe.title || '');
  const [description, setDescription] = useState(initialRecipe.description || '');
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(
    initialRecipe.ingredients || []
  );
  const [instructions, setInstructions] = useState(initialRecipe.instructions || '');
  const [prepTime, setPrepTime] = useState(initialRecipe.prep_time?.toString() || '');
  const [cookTime, setCookTime] = useState(initialRecipe.cook_time?.toString() || '');
  const [servings, setServings] = useState(initialRecipe.servings?.toString() || '');
  const [cuisine, setCuisine] = useState(initialRecipe.cuisine || '');
  const [category, setCategory] = useState(initialRecipe.category || '');

  const updateIngredient = (index: number, field: 'ingredient' | 'measure', value: string) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { ingredient: '', measure: '' }]);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a recipe title');
      return;
    }

    if (ingredients.filter((i) => i.ingredient.trim()).length === 0) {
      Alert.alert('Error', 'Please add at least one ingredient');
      return;
    }

    if (!instructions.trim()) {
      Alert.alert('Error', 'Please add cooking instructions');
      return;
    }

    setSaving(true);

    try {
      // Clean up ingredients (remove empty ones)
      const cleanIngredients = ingredients.filter((i) => i.ingredient.trim());

      // Build the recipe object
      const recipeData: Partial<ImportedRecipe> = {
        ...initialRecipe,
        title: title.trim(),
        description: description.trim() || null,
        ingredients: cleanIngredients,
        instructions: instructions.trim(),
        prep_time: prepTime ? parseInt(prepTime, 10) : null,
        cook_time: cookTime ? parseInt(cookTime, 10) : null,
        total_time: prepTime || cookTime
          ? (parseInt(prepTime || '0', 10) || 0) + (parseInt(cookTime || '0', 10) || 0)
          : null,
        servings: servings ? parseInt(servings, 10) : null,
        cuisine: cuisine.trim() || null,
        category: category.trim() || null,
        source_platform: platform,
      };

      // Save to imported_recipes table
      const savedImported = await saveImportedRecipe(recipeData);

      // Also save to saved_recipes for easy access
      const extendedRecipe = convertToExtendedRecipe(savedImported);
      await saveRecipe(extendedRecipe, 'imported');

      Alert.alert(
        'Recipe Saved!',
        'Your recipe has been imported and saved to your collection.',
        [
          {
            text: 'View Recipe',
            onPress: () => {
              if (hasNavigatedRef.current) return;
              hasNavigatedRef.current = true;
              router.replace(`/recipe/${extendedRecipe.id}`);
            },
          },
          {
            text: 'Import Another',
            onPress: () => {
              if (hasNavigatedRef.current) return;
              hasNavigatedRef.current = true;
              router.replace('/import');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Save error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Recipe save failed with:', {
        title: title.trim(),
        hasIngredients: ingredients.length > 0,
        hasInstructions: instructions.length > 0,
        hasImage: !!initialRecipe.image_url,
        error: errorMessage,
      });
      Alert.alert(
        'Save Failed',
        `Unable to save recipe: ${errorMessage}\n\nPlease try again or contact support if the issue persists.`
      );
    } finally {
      setSaving(false);
    }
  };

  const confidenceColor =
    confidence >= 0.8 ? '#4CAF50' : confidence >= 0.6 ? '#FF9800' : '#f44336';
  const confidenceLabel =
    confidence >= 0.8 ? 'High' : confidence >= 0.6 ? 'Medium' : 'Low';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        {/* Confidence Badge */}
        <View style={styles.confidenceSection}>
          <View style={styles.platformBadge}>
            <Ionicons
              name={getPlatformIcon(platform) as any}
              size={16}
              color="#666"
            />
            <Text style={styles.platformText}>
              Imported from {getPlatformDisplayName(platform)}
            </Text>
          </View>
          <View style={[styles.confidenceBadge, { backgroundColor: confidenceColor }]}>
            <Text style={styles.confidenceText}>
              {confidenceLabel} Confidence ({Math.round(confidence * 100)}%)
            </Text>
          </View>
        </View>

        {/* Warnings */}
        {warnings.length > 0 && (
          <View style={styles.warningsSection}>
            {warnings.map((warning, index) => (
              <View key={index} style={styles.warningItem}>
                <Ionicons name="warning" size={16} color="#FF9800" />
                <Text style={styles.warningText}>{warning}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recipe Image */}
        {initialRecipe.image_url && (
          <Image
            source={{ uri: initialRecipe.image_url }}
            style={styles.recipeImage}
            resizeMode="cover"
          />
        )}

        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Recipe name"
            placeholderTextColor="#999"
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Brief description of the dish"
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Time and Servings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Prep (min)</Text>
              <TextInput
                style={styles.detailInput}
                value={prepTime}
                onChangeText={setPrepTime}
                placeholder="15"
                placeholderTextColor="#999"
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Cook (min)</Text>
              <TextInput
                style={styles.detailInput}
                value={cookTime}
                onChangeText={setCookTime}
                placeholder="30"
                placeholderTextColor="#999"
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Servings</Text>
              <TextInput
                style={styles.detailInput}
                value={servings}
                onChangeText={setServings}
                placeholder="4"
                placeholderTextColor="#999"
                keyboardType="number-pad"
              />
            </View>
          </View>
          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Cuisine</Text>
              <TextInput
                style={styles.detailInput}
                value={cuisine}
                onChangeText={setCuisine}
                placeholder="Italian"
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Category</Text>
              <TextInput
                style={styles.detailInput}
                value={category}
                onChangeText={setCategory}
                placeholder="Dinner"
                placeholderTextColor="#999"
              />
            </View>
          </View>
        </View>

        {/* Ingredients */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ingredients *</Text>
            <TouchableOpacity onPress={addIngredient} style={styles.addButton}>
              <Ionicons name="add-circle" size={24} color="#4CAF50" />
            </TouchableOpacity>
          </View>
          {ingredients.map((ing, index) => (
            <View key={index} style={styles.ingredientRow}>
              <TextInput
                style={styles.measureInput}
                value={ing.measure}
                onChangeText={(v) => updateIngredient(index, 'measure', v)}
                placeholder="1 cup"
                placeholderTextColor="#999"
              />
              <TextInput
                style={styles.ingredientInput}
                value={ing.ingredient}
                onChangeText={(v) => updateIngredient(index, 'ingredient', v)}
                placeholder="Ingredient name"
                placeholderTextColor="#999"
              />
              <TouchableOpacity
                onPress={() => removeIngredient(index)}
                style={styles.removeButton}
              >
                <Ionicons name="close-circle" size={22} color="#f44336" />
              </TouchableOpacity>
            </View>
          ))}
          {ingredients.length === 0 && (
            <TouchableOpacity onPress={addIngredient} style={styles.emptyAdd}>
              <Ionicons name="add" size={20} color="#4CAF50" />
              <Text style={styles.emptyAddText}>Add ingredient</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instructions *</Text>
          <TextInput
            style={[styles.input, styles.instructionsInput]}
            value={instructions}
            onChangeText={setInstructions}
            placeholder="1. First step...
2. Second step..."
            placeholderTextColor="#999"
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={saving}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Save Recipe</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  confidenceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  platformText: {
    fontSize: 13,
    color: '#666',
  },
  confidenceBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  warningsSection: {
    backgroundColor: '#FFF8E1',
    padding: 12,
    gap: 8,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  warningText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  recipeImage: {
    width: '100%',
    height: 200,
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#333',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  instructionsInput: {
    minHeight: 200,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  detailInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#333',
  },
  addButton: {
    padding: 4,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  measureInput: {
    width: 80,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#333',
  },
  ingredientInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#333',
  },
  removeButton: {
    padding: 4,
  },
  emptyAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
  },
  emptyAddText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  bottomPadding: {
    height: 32,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
  },
  saveButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
