import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePantry } from '../../hooks/usePantry';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { QuantitySelector } from '../../components/ui/QuantitySelector';
import { DatePicker } from '../../components/ui/DatePicker';
import { Location, NutritionInfo } from '../../lib/types';

export default function AddItemScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    barcode: string;
    name: string;
    brand: string;
    imageUrl: string;
    nutrition: string;
  }>();

  const { addItem } = usePantry();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState(params.name || '');
  const [quantity, setQuantity] = useState(1);
  const [location, setLocation] = useState<Location>('pantry');
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);

  const nutrition: NutritionInfo | null = params.nutrition
    ? JSON.parse(params.nutrition)
    : null;

  const handleAddItem = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name for the item');
      return;
    }

    setLoading(true);

    try {
      await addItem({
        barcode: params.barcode || null,
        name: name.trim(),
        brand: params.brand || null,
        category: null,
        quantity,
        unit: 'item',
        expiration_date: expirationDate?.toISOString().split('T')[0] || null,
        image_url: params.imageUrl || null,
        nutrition_json: nutrition,
        location,
      });

      Alert.alert('Success', 'Item added to your pantry!', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (error) {
      console.error('Error adding item:', error);
      Alert.alert('Error', 'Failed to add item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualEntry = () => {
    router.replace({
      pathname: '/item/manual',
      params: { barcode: params.barcode },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {params.imageUrl ? (
            <Image source={{ uri: params.imageUrl }} style={styles.productImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="nutrition" size={48} color="#ccc" />
            </View>
          )}

          <View style={styles.productInfo}>
            <Text style={styles.productName}>{params.name || 'Unknown Product'}</Text>
            {params.brand && <Text style={styles.productBrand}>{params.brand}</Text>}
          </View>

          <View style={styles.form}>
            <Input
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="Product name"
            />

            <Text style={styles.label}>Quantity</Text>
            <QuantitySelector value={quantity} onChange={setQuantity} />

            <Text style={[styles.label, { marginTop: 16 }]}>Location</Text>
            <View style={styles.locationButtons}>
              {(['pantry', 'fridge', 'freezer'] as Location[]).map((loc) => (
                <Button
                  key={loc}
                  title={loc.charAt(0).toUpperCase() + loc.slice(1)}
                  variant={location === loc ? 'primary' : 'secondary'}
                  onPress={() => setLocation(loc)}
                  style={styles.locationButton}
                />
              ))}
            </View>

            <DatePicker
              label="Expiration Date (optional)"
              value={expirationDate}
              onChange={setExpirationDate}
              placeholder="No expiration date"
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
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="Add to Pantry"
            onPress={handleAddItem}
            loading={loading}
            style={styles.addButton}
          />
          <Button
            title="Not the right product? Enter manually"
            variant="secondary"
            onPress={handleManualEntry}
            style={styles.manualButton}
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
  productInfo: {
    alignItems: 'center',
    marginVertical: 16,
  },
  productName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  productBrand: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  form: {
    marginTop: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
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
    marginTop: 16,
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
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  addButton: {
    marginBottom: 8,
  },
  manualButton: {
    paddingVertical: 10,
  },
});
