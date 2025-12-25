import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePantry } from '../../hooks/usePantry';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { QuantitySelector } from '../../components/ui/QuantitySelector';
import { DatePicker } from '../../components/ui/DatePicker';
import { UnitSelector } from '../../components/ui/UnitSelector';
import { Location, PantryItem, NutritionInfo, Unit } from '../../lib/types';

export default function ItemDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { pantryItems, updateItem, deleteItem } = usePantry();

  const [item, setItem] = useState<PantryItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState<Unit>('item');
  const [location, setLocation] = useState<Location>('pantry');
  const [locationNotes, setLocationNotes] = useState('');
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);

  useEffect(() => {
    const foundItem = pantryItems.find((i) => i.id === id);
    if (foundItem) {
      setItem(foundItem);
      setName(foundItem.name);
      setQuantity(foundItem.quantity);
      setUnit((foundItem.unit as Unit) || 'item');
      setLocation(foundItem.location);
      setLocationNotes(foundItem.location_notes || '');
      setExpirationDate(
        foundItem.expiration_date ? new Date(foundItem.expiration_date) : null
      );
    }
  }, [id, pantryItems]);

  const handleUpdate = async () => {
    if (!item || !name.trim()) return;

    setLoading(true);

    try {
      await updateItem(item.id, {
        name: name.trim(),
        quantity,
        unit,
        location,
        location_notes: locationNotes.trim() || null,
        expiration_date: expirationDate?.toISOString().split('T')[0] || null,
      });
      setHasChanges(false);
      Alert.alert('Success', 'Item updated!');
    } catch (error) {
      console.error('Error updating item:', error);
      Alert.alert('Error', 'Failed to update item.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item from your pantry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!item) return;
            setLoading(true);
            try {
              await deleteItem(item.id);
              router.back();
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert('Error', 'Failed to delete item.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleFindRecipes = () => {
    if (item) {
      router.push({
        pathname: '/(tabs)/recipes',
      });
    }
  };

  const handleFieldChange = (setter: (value: any) => void, value: any) => {
    setter(value);
    setHasChanges(true);
  };

  if (!item) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notFound}>
          <Ionicons name="alert-circle-outline" size={64} color="#ccc" />
          <Text style={styles.notFoundText}>Item not found</Text>
          <Button title="Go Back" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const nutrition = item.nutrition_json as NutritionInfo | null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Item Details',
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.productImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="nutrition" size={48} color="#ccc" />
            </View>
          )}

          {item.brand && (
            <Text style={styles.brand}>{item.brand}</Text>
          )}

          <View style={styles.form}>
            <Input
              label="Name"
              value={name}
              onChangeText={(value) => handleFieldChange(setName, value)}
              placeholder="Product name"
            />

            <View style={styles.compactRow}>
              <View style={styles.compactField}>
                <Text style={styles.label}>Quantity</Text>
                <QuantitySelector
                  value={quantity}
                  onChange={(value) => handleFieldChange(setQuantity, value)}
                  unit={unit}
                />
              </View>
              <View style={styles.compactField}>
                <Text style={styles.label}>Expires</Text>
                <DatePicker
                  value={expirationDate}
                  onChange={(value) => handleFieldChange(setExpirationDate, value)}
                  placeholder="Not set"
                  compact
                />
              </View>
            </View>

            <Text style={[styles.label, { marginTop: 12 }]}>Unit</Text>
            <UnitSelector
              value={unit}
              onChange={(value) => handleFieldChange(setUnit, value)}
            />

            <Text style={styles.label}>Location</Text>
            <View style={styles.locationButtons}>
              {(['pantry', 'fridge', 'freezer'] as Location[]).map((loc) => (
                <Button
                  key={loc}
                  title={loc.charAt(0).toUpperCase() + loc.slice(1)}
                  variant={location === loc ? 'primary' : 'secondary'}
                  onPress={() => handleFieldChange(setLocation, loc)}
                  style={styles.locationButton}
                />
              ))}
            </View>

            <Input
              label="Location Notes (optional)"
              value={locationNotes}
              onChangeText={(value) => handleFieldChange(setLocationNotes, value)}
              placeholder="e.g., Top shelf, behind the milk"
            />

            {nutrition && (
              <View style={styles.nutritionSection}>
                <Text style={styles.nutritionTitle}>Nutrition Info</Text>
                <View style={styles.nutritionGrid}>
                  {nutrition.energy_kcal !== undefined && (
                    <NutritionItem label="Calories" value={`${Math.round(nutrition.energy_kcal)} kcal`} />
                  )}
                  {nutrition.proteins !== undefined && (
                    <NutritionItem label="Protein" value={`${nutrition.proteins.toFixed(1)}g`} />
                  )}
                  {nutrition.carbohydrates !== undefined && (
                    <NutritionItem label="Carbs" value={`${nutrition.carbohydrates.toFixed(1)}g`} />
                  )}
                  {nutrition.fat !== undefined && (
                    <NutritionItem label="Fat" value={`${nutrition.fat.toFixed(1)}g`} />
                  )}
                </View>
              </View>
            )}

            <Button
              title="Find Recipes with this ingredient"
              variant="secondary"
              onPress={handleFindRecipes}
              style={styles.recipesButton}
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          {hasChanges && (
            <Button
              title="Save Changes"
              onPress={handleUpdate}
              loading={loading}
              style={styles.saveButton}
            />
          )}
          <Button
            title="Delete Item"
            variant="danger"
            onPress={handleDelete}
            disabled={loading}
            style={styles.deleteButton}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function NutritionItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.nutritionItem}>
      <Text style={styles.nutritionValue}>{value}</Text>
      <Text style={styles.nutritionLabel}>{label}</Text>
    </View>
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
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  productImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    resizeMode: 'cover',
    backgroundColor: '#f5f5f5',
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
  },
  form: {
    marginTop: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
  },
  compactRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  compactField: {
    flex: 0,
  },
  locationButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  locationButton: {
    flex: 1,
    paddingVertical: 10,
  },
  nutritionSection: {
    marginTop: 8,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  nutritionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  nutritionItem: {
    width: '45%',
  },
  nutritionValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4CAF50',
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  recipesButton: {
    marginTop: 16,
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  saveButton: {
    marginBottom: 8,
  },
  deleteButton: {},
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  notFoundText: {
    fontSize: 18,
    color: '#666',
    marginVertical: 16,
  },
});
