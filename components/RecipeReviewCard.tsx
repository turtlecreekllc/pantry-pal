import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Keyboard,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ImportedRecipe, RecipeIngredient } from '../lib/types';

interface RecipeReviewCardProps {
  recipe: Partial<ImportedRecipe>;
  confidence: number;
  onSave: (recipe: Partial<ImportedRecipe>) => void;
  onDiscard: () => void;
}

export function RecipeReviewCard({
  recipe,
  confidence,
  onSave,
  onDiscard,
}: RecipeReviewCardProps) {
  const [editedRecipe, setEditedRecipe] = useState<Partial<ImportedRecipe>>(recipe);
  const [activeTab, setActiveTab] = useState<'details' | 'ingredients' | 'instructions'>('details');

  useEffect(() => {
    setEditedRecipe(recipe);
  }, [recipe]);

  const confidenceColor =
    confidence >= 0.9 ? '#4CAF50' : confidence >= 0.7 ? '#FFC107' : '#f44336';

  const handleUpdate = (field: keyof ImportedRecipe, value: any) => {
    setEditedRecipe((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleIngredientUpdate = (index: number, field: keyof RecipeIngredient, value: string) => {
    const newIngredients = [...(editedRecipe.ingredients || [])];
    newIngredients[index] = {
      ...newIngredients[index],
      [field]: value,
    };
    handleUpdate('ingredients', newIngredients);
  };

  const handleAddIngredient = () => {
    const newIngredients = [...(editedRecipe.ingredients || []), { ingredient: '', measure: '' }];
    handleUpdate('ingredients', newIngredients);
  };

  const handleDeleteIngredient = (index: number) => {
    const newIngredients = [...(editedRecipe.ingredients || [])];
    newIngredients.splice(index, 1);
    handleUpdate('ingredients', newIngredients);
  };

  const renderDetailsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Recipe Title</Text>
        <TextInput
          style={styles.input}
          value={editedRecipe.title}
          onChangeText={(text) => handleUpdate('title', text)}
          placeholder="Recipe Title"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={editedRecipe.description || ''}
          onChangeText={(text) => handleUpdate('description', text)}
          placeholder="Brief description..."
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Attribution and Era */}
      <View style={styles.row}>
        <View style={[styles.formGroup, styles.halfWidth]}>
          <Text style={styles.label}>Attribution</Text>
          <TextInput
            style={styles.input}
            value={(editedRecipe.import_metadata?.attribution as string) || ''}
            onChangeText={(text) => handleUpdate('import_metadata', { ...editedRecipe.import_metadata, attribution: text })}
            placeholder="e.g. Grandma Rose"
          />
        </View>
        <View style={[styles.formGroup, styles.halfWidth]}>
          <Text style={styles.label}>Era / Date</Text>
          <TextInput
            style={styles.input}
            value={(editedRecipe.import_metadata?.era as string) || ''}
            onChangeText={(text) => handleUpdate('import_metadata', { ...editedRecipe.import_metadata, era: text })}
            placeholder="e.g. 1960s"
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.formGroup, styles.halfWidth]}>
          <Text style={styles.label}>Servings</Text>
          <TextInput
            style={styles.input}
            value={editedRecipe.servings?.toString() || ''}
            onChangeText={(text) => handleUpdate('servings', parseInt(text) || null)}
            keyboardType="numeric"
            placeholder="4"
          />
        </View>
        <View style={[styles.formGroup, styles.halfWidth]}>
          <Text style={styles.label}>Cuisine</Text>
          <TextInput
            style={styles.input}
            value={editedRecipe.cuisine || ''}
            onChangeText={(text) => handleUpdate('cuisine', text)}
            placeholder="e.g. Italian"
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.formGroup, styles.halfWidth]}>
          <Text style={styles.label}>Prep Time (mins)</Text>
          <TextInput
            style={styles.input}
            value={editedRecipe.prep_time?.toString() || ''}
            onChangeText={(text) => handleUpdate('prep_time', parseInt(text) || null)}
            keyboardType="numeric"
            placeholder="15"
          />
        </View>
        <View style={[styles.formGroup, styles.halfWidth]}>
          <Text style={styles.label}>Cook Time (mins)</Text>
          <TextInput
            style={styles.input}
            value={editedRecipe.cook_time?.toString() || ''}
            onChangeText={(text) => handleUpdate('cook_time', parseInt(text) || null)}
            keyboardType="numeric"
            placeholder="30"
          />
        </View>
      </View>
    </View>
  );

  const renderIngredientsTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.helperText}>Review extracted ingredients</Text>
      
      {editedRecipe.ingredients?.map((ing, index) => (
        <View key={index} style={styles.ingredientRow}>
          <View style={styles.measureInputContainer}>
            <TextInput
              style={styles.ingredientInput}
              value={ing.measure}
              onChangeText={(text) => handleIngredientUpdate(index, 'measure', text)}
              placeholder="Qty"
            />
          </View>
          <View style={styles.nameInputContainer}>
            <TextInput
              style={styles.ingredientInput}
              value={ing.ingredient}
              onChangeText={(text) => handleIngredientUpdate(index, 'ingredient', text)}
              placeholder="Ingredient"
            />
          </View>
          <TouchableOpacity 
            onPress={() => handleDeleteIngredient(index)}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={20} color="#ff5252" />
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity style={styles.addButton} onPress={handleAddIngredient}>
        <Ionicons name="add-circle-outline" size={20} color="#4CAF50" />
        <Text style={styles.addButtonText}>Add Ingredient</Text>
      </TouchableOpacity>
    </View>
  );

  const renderInstructionsTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.helperText}>Edit cooking instructions</Text>
      <TextInput
        style={[styles.input, styles.instructionsInput]}
        value={editedRecipe.instructions}
        onChangeText={(text) => handleUpdate('instructions', text)}
        multiline
        placeholder="Step 1..."
        textAlignVertical="top"
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.confidenceBadge}>
          <View style={[styles.confidenceDot, { backgroundColor: confidenceColor }]} />
          <Text style={styles.confidenceText}>
            {Math.round(confidence * 100)}% Match
          </Text>
        </View>
        <TouchableOpacity onPress={() => Keyboard.dismiss()}>
          <Ionicons name="keypad-outline" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'details' && styles.activeTab]}
          onPress={() => setActiveTab('details')}
        >
          <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>Details</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'ingredients' && styles.activeTab]}
          onPress={() => setActiveTab('ingredients')}
        >
          <Text style={[styles.tabText, activeTab === 'ingredients' && styles.activeTabText]}>Ingredients</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'instructions' && styles.activeTab]}
          onPress={() => setActiveTab('instructions')}
        >
          <Text style={[styles.tabText, activeTab === 'instructions' && styles.activeTabText]}>Instructions</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'details' && renderDetailsTab()}
        {activeTab === 'ingredients' && renderIngredientsTab()}
        {activeTab === 'instructions' && renderInstructionsTab()}
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.discardButton} onPress={onDiscard}>
          <Text style={styles.discardButtonText}>Discard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={() => onSave(editedRecipe)}>
          <Text style={styles.saveButtonText}>Save Recipe</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    margin: 16,
    marginBottom: 80, // Space for bottom actions
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  helperText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  ingredientRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  measureInputContainer: {
    width: 80,
  },
  nameInputContainer: {
    flex: 1,
  },
  ingredientInput: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 14,
  },
  deleteButton: {
    padding: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginTop: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: '#4CAF50',
    fontWeight: '600',
    fontSize: 14,
  },
  instructionsInput: {
    height: 300,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
    gap: 12,
  },
  discardButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff5252',
  },
  discardButtonText: {
    color: '#ff5252',
    fontWeight: '600',
    fontSize: 16,
  },
  saveButton: {
    flex: 2,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#4CAF50',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

