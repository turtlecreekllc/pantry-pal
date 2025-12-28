import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePantry } from '../../hooks/usePantry';
import { useHouseholdContext } from '../../context/HouseholdContext';
import { useImportedRecipes } from '../../hooks/useImportedRecipes';
import {
  generateRecipeFromIngredients,
  prioritizeExpiringRecipes,
  GenerateRecipeOptions,
} from '../../lib/aiRecipeGenerator';
import { PantryItem } from '../../lib/types';

const CUISINES = [
  'Any',
  'Italian',
  'Mexican',
  'Asian',
  'Mediterranean',
  'American',
  'Indian',
  'French',
  'Thai',
  'Japanese',
];

const MEAL_TYPES = [
  { label: 'Any', value: undefined },
  { label: 'Breakfast', value: 'breakfast' as const },
  { label: 'Lunch', value: 'lunch' as const },
  { label: 'Dinner', value: 'dinner' as const },
  { label: 'Snack', value: 'snack' as const },
  { label: 'Dessert', value: 'dessert' as const },
];

const DIFFICULTIES = [
  { label: 'Any', value: undefined },
  { label: 'Easy', value: 'easy' as const },
  { label: 'Medium', value: 'medium' as const },
  { label: 'Hard', value: 'hard' as const },
];

const DIETARY_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Keto',
  'Low-Carb',
  'Paleo',
];

export default function GenerateRecipeScreen() {
  const router = useRouter();
  const { activeHousehold } = useHouseholdContext();
  const { pantryItems, loading: pantryLoading } = usePantry({
    householdId: activeHousehold?.id,
  });
  const { saveImportedRecipe } = useImportedRecipes();

  // Selection state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [cuisine, setCuisine] = useState<string>('Any');
  const [mealType, setMealType] = useState<typeof MEAL_TYPES[number]>(MEAL_TYPES[0]);
  const [difficulty, setDifficulty] = useState<typeof DIFFICULTIES[number]>(DIFFICULTIES[0]);
  const [dietary, setDietary] = useState<Set<string>>(new Set());
  const [maxTime, setMaxTime] = useState<number | null>(null);
  const [prioritizeExpiring, setPrioritizeExpiring] = useState(true);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<any>(null);
  const [usedIngredients, setUsedIngredients] = useState<string[]>([]);
  const [additionalNeeded, setAdditionalNeeded] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Get expiring items info
  const { expiringItems, urgency } = useMemo(() => {
    return prioritizeExpiringRecipes(pantryItems, 7);
  }, [pantryItems]);

  // Auto-select expiring items when prioritize is enabled
  const handleTogglePrioritizeExpiring = () => {
    const newValue = !prioritizeExpiring;
    setPrioritizeExpiring(newValue);

    if (newValue && expiringItems.length > 0) {
      const expiringIds = new Set(expiringItems.map(item => item.id));
      setSelectedItems(prev => {
        const newSet = new Set(prev);
        expiringIds.forEach(id => newSet.add(id));
        return newSet;
      });
    }
  };

  const toggleItem = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const toggleDietary = (option: string) => {
    setDietary(prev => {
      const newSet = new Set(prev);
      if (newSet.has(option)) {
        newSet.delete(option);
      } else {
        newSet.add(option);
      }
      return newSet;
    });
  };

  const selectAllItems = () => {
    setSelectedItems(new Set(pantryItems.map(item => item.id)));
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  const handleGenerate = async () => {
    if (selectedItems.size === 0) {
      Alert.alert('No Ingredients', 'Please select at least one ingredient from your pantry.');
      return;
    }

    const selectedPantryItems = pantryItems.filter(item => selectedItems.has(item.id));

    const options: GenerateRecipeOptions = {
      prioritizeExpiring,
    };

    if (cuisine !== 'Any') {
      options.cuisine = cuisine;
    }
    if (mealType.value) {
      options.mealType = mealType.value;
    }
    if (difficulty.value) {
      options.difficulty = difficulty.value;
    }
    if (dietary.size > 0) {
      options.dietary = Array.from(dietary);
    }
    if (maxTime) {
      options.maxTime = maxTime;
    }

    setGenerating(true);
    setGeneratedRecipe(null);

    try {
      const result = await generateRecipeFromIngredients(selectedPantryItems, options);

      if (result.success && result.recipe) {
        setGeneratedRecipe(result.recipe);
        setUsedIngredients(result.usedIngredients);
        setAdditionalNeeded(result.additionalIngredientsNeeded);
      } else {
        Alert.alert('Generation Failed', result.error || 'Failed to generate recipe. Please try again.');
      }
    } catch (error) {
      console.error('Error generating recipe:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveRecipe = async () => {
    if (!generatedRecipe) return;

    setSaving(true);
    try {
      const importedRecipe = {
        title: generatedRecipe.title,
        description: generatedRecipe.description,
        ingredients: generatedRecipe.ingredients,
        instructions: generatedRecipe.instructions,
        prep_time: generatedRecipe.prep_time,
        cook_time: generatedRecipe.cook_time,
        total_time: generatedRecipe.total_time,
        servings: generatedRecipe.servings,
        cuisine: generatedRecipe.cuisine,
        category: generatedRecipe.category,
        difficulty: generatedRecipe.difficulty,
        diets: generatedRecipe.diets,
        tags: generatedRecipe.tags,
        source_platform: 'text' as const,
        import_metadata: generatedRecipe.import_metadata,
      };

      await saveImportedRecipe(importedRecipe);
      Alert.alert(
        'Recipe Saved!',
        'Your AI-generated recipe has been saved to your collection.',
        [
          {
            text: 'View Saved Recipes',
            onPress: () => router.push('/(tabs)/saved'),
          },
          {
            text: 'Generate Another',
            onPress: () => {
              setGeneratedRecipe(null);
              setUsedIngredients([]);
              setAdditionalNeeded([]);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error saving recipe:', error);
      Alert.alert('Error', 'Failed to save recipe. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderIngredientItem = (item: PantryItem) => {
    const isSelected = selectedItems.has(item.id);
    const isExpiring = expiringItems.some(exp => exp.id === item.id);

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.ingredientItem,
          isSelected && styles.ingredientItemSelected,
          isExpiring && styles.ingredientItemExpiring,
        ]}
        onPress={() => toggleItem(item.id)}
      >
        <View style={styles.ingredientContent}>
          <Text style={[styles.ingredientName, isSelected && styles.ingredientNameSelected]}>
            {item.name}
          </Text>
          <Text style={styles.ingredientQuantity}>
            {item.quantity} {item.unit}
          </Text>
          {isExpiring && (
            <View style={styles.expiringBadge}>
              <Ionicons name="time-outline" size={10} color="#fff" />
              <Text style={styles.expiringText}>Expiring</Text>
            </View>
          )}
        </View>
        <Ionicons
          name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={isSelected ? '#4CAF50' : '#ccc'}
        />
      </TouchableOpacity>
    );
  };

  if (generatedRecipe) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen
          options={{
            title: 'Generated Recipe',
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => {
                  setGeneratedRecipe(null);
                  setUsedIngredients([]);
                  setAdditionalNeeded([]);
                }}
                style={styles.headerButton}
              >
                <Ionicons name="chevron-back" size={28} color="#fff" />
              </TouchableOpacity>
            ),
          }}
        />
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.recipeCard}>
            <Text style={styles.recipeTitle}>{generatedRecipe.title}</Text>
            <Text style={styles.recipeDescription}>{generatedRecipe.description}</Text>

            <View style={styles.recipeMeta}>
              {generatedRecipe.prep_time && (
                <View style={styles.metaItem}>
                  <Ionicons name="timer-outline" size={16} color="#666" />
                  <Text style={styles.metaText}>Prep: {generatedRecipe.prep_time}min</Text>
                </View>
              )}
              {generatedRecipe.cook_time && (
                <View style={styles.metaItem}>
                  <Ionicons name="flame-outline" size={16} color="#666" />
                  <Text style={styles.metaText}>Cook: {generatedRecipe.cook_time}min</Text>
                </View>
              )}
              {generatedRecipe.servings && (
                <View style={styles.metaItem}>
                  <Ionicons name="people-outline" size={16} color="#666" />
                  <Text style={styles.metaText}>{generatedRecipe.servings} servings</Text>
                </View>
              )}
            </View>

            {usedIngredients.length > 0 && (
              <View style={styles.usedSection}>
                <Text style={styles.usedTitle}>Using from your pantry:</Text>
                <Text style={styles.usedText}>{usedIngredients.join(', ')}</Text>
              </View>
            )}

            {additionalNeeded.length > 0 && (
              <View style={styles.neededSection}>
                <Text style={styles.neededTitle}>You may need:</Text>
                <Text style={styles.neededText}>{additionalNeeded.join(', ')}</Text>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ingredients</Text>
              {generatedRecipe.ingredients?.map((ing: any, index: number) => (
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
              {generatedRecipe.instructions?.split('\n').filter(Boolean).map((step: string, index: number) => (
                <View key={index} style={styles.instructionRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.instructionText}>{step.trim()}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.regenerateButton}
            onPress={() => {
              setGeneratedRecipe(null);
              handleGenerate();
            }}
          >
            <Ionicons name="refresh-outline" size={20} color="#4CAF50" />
            <Text style={styles.regenerateText}>Regenerate</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSaveRecipe}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="bookmark-outline" size={20} color="#fff" />
                <Text style={styles.saveText}>Save Recipe</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'AI Recipe Generator',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.headerButton}
            >
              <Ionicons name="chevron-back" size={28} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Expiring Items Alert */}
        {expiringItems.length > 0 && (
          <View style={[
            styles.expiringAlert,
            urgency === 'high' && styles.expiringAlertHigh,
          ]}>
            <Ionicons
              name="alert-circle"
              size={20}
              color={urgency === 'high' ? '#d32f2f' : '#ff9800'}
            />
            <Text style={styles.expiringAlertText}>
              {expiringItems.length} item{expiringItems.length !== 1 ? 's' : ''} expiring soon!
            </Text>
          </View>
        )}

        {/* Prioritize Expiring Toggle */}
        <TouchableOpacity
          style={styles.prioritizeToggle}
          onPress={handleTogglePrioritizeExpiring}
        >
          <View style={styles.prioritizeContent}>
            <Ionicons
              name="leaf-outline"
              size={20}
              color={prioritizeExpiring ? '#4CAF50' : '#666'}
            />
            <View>
              <Text style={styles.prioritizeTitle}>Prioritize Expiring Items</Text>
              <Text style={styles.prioritizeSubtitle}>
                Generate recipes using items expiring soon
              </Text>
            </View>
          </View>
          <Ionicons
            name={prioritizeExpiring ? 'checkbox' : 'square-outline'}
            size={24}
            color={prioritizeExpiring ? '#4CAF50' : '#ccc'}
          />
        </TouchableOpacity>

        {/* Ingredient Selection */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Select Ingredients</Text>
            <View style={styles.selectionButtons}>
              <TouchableOpacity onPress={selectAllItems} style={styles.selectionButton}>
                <Text style={styles.selectionButtonText}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={clearSelection} style={styles.selectionButton}>
                <Text style={styles.selectionButtonText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>

          {pantryLoading ? (
            <ActivityIndicator size="large" color="#4CAF50" style={styles.loader} />
          ) : pantryItems.length === 0 ? (
            <View style={styles.emptyPantry}>
              <Ionicons name="basket-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>Your pantry is empty</Text>
              <Text style={styles.emptySubtext}>Add items to generate recipes</Text>
            </View>
          ) : (
            <View style={styles.ingredientsList}>
              {pantryItems.map(renderIngredientItem)}
            </View>
          )}
        </View>

        {/* Preferences */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Preferences</Text>

          {/* Cuisine */}
          <Text style={styles.filterLabel}>Cuisine</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {CUISINES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.filterChip, cuisine === c && styles.filterChipSelected]}
                onPress={() => setCuisine(c)}
              >
                <Text style={[styles.filterChipText, cuisine === c && styles.filterChipTextSelected]}>
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Meal Type */}
          <Text style={styles.filterLabel}>Meal Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {MEAL_TYPES.map((m) => (
              <TouchableOpacity
                key={m.label}
                style={[styles.filterChip, mealType.label === m.label && styles.filterChipSelected]}
                onPress={() => setMealType(m)}
              >
                <Text style={[styles.filterChipText, mealType.label === m.label && styles.filterChipTextSelected]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Difficulty */}
          <Text style={styles.filterLabel}>Difficulty</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {DIFFICULTIES.map((d) => (
              <TouchableOpacity
                key={d.label}
                style={[styles.filterChip, difficulty.label === d.label && styles.filterChipSelected]}
                onPress={() => setDifficulty(d)}
              >
                <Text style={[styles.filterChipText, difficulty.label === d.label && styles.filterChipTextSelected]}>
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Dietary */}
          <Text style={styles.filterLabel}>Dietary Preferences</Text>
          <View style={styles.dietaryGrid}>
            {DIETARY_OPTIONS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.filterChip, dietary.has(d) && styles.filterChipSelected]}
                onPress={() => toggleDietary(d)}
              >
                <Text style={[styles.filterChipText, dietary.has(d) && styles.filterChipTextSelected]}>
                  {d}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Max Time */}
          <Text style={styles.filterLabel}>Max Total Time</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {[
              { label: 'Any', value: null },
              { label: '15 min', value: 15 },
              { label: '30 min', value: 30 },
              { label: '45 min', value: 45 },
              { label: '60 min', value: 60 },
            ].map((t) => (
              <TouchableOpacity
                key={t.label}
                style={[styles.filterChip, maxTime === t.value && styles.filterChipSelected]}
                onPress={() => setMaxTime(t.value)}
              >
                <Text style={[styles.filterChipText, maxTime === t.value && styles.filterChipTextSelected]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Generate Button */}
      <View style={styles.generateContainer}>
        <TouchableOpacity
          style={[
            styles.generateButton,
            (selectedItems.size === 0 || generating) && styles.generateButtonDisabled,
          ]}
          onPress={handleGenerate}
          disabled={selectedItems.size === 0 || generating}
        >
          {generating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="sparkles" size={20} color="#fff" />
              <Text style={styles.generateText}>
                Generate Recipe ({selectedItems.size} ingredient{selectedItems.size !== 1 ? 's' : ''})
              </Text>
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
    backgroundColor: '#fff',
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  scrollView: {
    flex: 1,
  },
  expiringAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 16,
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#ff9800',
  },
  expiringAlertHigh: {
    backgroundColor: '#ffebee',
    borderLeftColor: '#d32f2f',
  },
  expiringAlertText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  prioritizeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  prioritizeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  prioritizeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  prioritizeSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  sectionContainer: {
    padding: 16,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  selectionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  selectionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e8f5e9',
    borderRadius: 16,
  },
  selectionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
  },
  loader: {
    marginVertical: 32,
  },
  emptyPantry: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  ingredientsList: {
    gap: 8,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  ingredientItemSelected: {
    backgroundColor: '#e8f5e9',
    borderColor: '#4CAF50',
  },
  ingredientItemExpiring: {
    borderLeftWidth: 3,
    borderLeftColor: '#ff9800',
  },
  ingredientContent: {
    flex: 1,
    gap: 2,
  },
  ingredientName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  ingredientNameSelected: {
    color: '#2e7d32',
  },
  ingredientQuantity: {
    fontSize: 13,
    color: '#666',
  },
  expiringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ff9800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  expiringText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipSelected: {
    backgroundColor: '#4CAF50',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
  },
  filterChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  dietaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  generateContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
  },
  generateButtonDisabled: {
    backgroundColor: '#a5d6a7',
  },
  generateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Generated recipe styles
  recipeCard: {
    padding: 16,
  },
  recipeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  recipeDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 16,
  },
  recipeMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
  },
  usedSection: {
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  usedTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: 4,
  },
  usedText: {
    fontSize: 14,
    color: '#333',
  },
  neededSection: {
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  neededTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e65100',
    marginBottom: 4,
  },
  neededText: {
    fontSize: 14,
    color: '#333',
  },
  section: {
    marginBottom: 24,
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
  actionBar: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  regenerateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  regenerateText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4CAF50',
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
  },
  saveButtonDisabled: {
    backgroundColor: '#a5d6a7',
  },
  saveText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
