import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { usePantry } from '../../hooks/usePantry';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { QuantitySelector } from '../../components/ui/QuantitySelector';
import { DatePicker } from '../../components/ui/DatePicker';
import { Location, Category, CATEGORIES, UNITS, Unit } from '../../lib/types';

export default function ManualEntryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ barcode?: string }>();

  const { addItem } = usePantry();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState<Unit>('item');
  const [location, setLocation] = useState<Location>('pantry');
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [barcode, setBarcode] = useState(params.barcode || '');

  const handleAddItem = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name for the item');
      return;
    }

    setLoading(true);

    try {
      await addItem({
        barcode: barcode.trim() || null,
        name: name.trim(),
        brand: brand.trim() || null,
        category: category || null,
        quantity,
        unit,
        expiration_date: expirationDate?.toISOString().split('T')[0] || null,
        image_url: null,
        nutrition_json: null,
        location,
        location_notes: null,
        original_quantity: quantity,
        usage_history: [],
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

  const handleCancel = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Add Item Manually',
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
          <Input
            label="Name *"
            value={name}
            onChangeText={setName}
            placeholder="Product name"
          />

          <Input
            label="Brand"
            value={brand}
            onChangeText={setBrand}
            placeholder="Brand name (optional)"
          />

          <Text style={styles.label}>Category</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={category}
              onValueChange={(value) => setCategory(value as Category | '')}
              style={styles.picker}
            >
              <Picker.Item label="Select a category..." value="" />
              {CATEGORIES.map((cat) => (
                <Picker.Item key={cat} label={cat} value={cat} />
              ))}
            </Picker>
          </View>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Quantity</Text>
              <QuantitySelector value={quantity} onChange={setQuantity} unit={unit} />
            </View>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Unit</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={unit}
                  onValueChange={(value) => setUnit(value as Unit)}
                  style={styles.picker}
                >
                  {UNITS.map((u) => (
                    <Picker.Item key={u} label={u} value={u} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          <Text style={styles.label}>Location</Text>
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

          <Input
            label="Barcode"
            value={barcode}
            onChangeText={setBarcode}
            placeholder="Barcode number (optional)"
            keyboardType="numeric"
          />
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="Add to Pantry"
            onPress={handleAddItem}
            loading={loading}
            style={styles.addButton}
          />
          <Button
            title="Cancel"
            variant="secondary"
            onPress={handleCancel}
            style={styles.cancelButton}
          />
        </View>
      </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
  },
  pickerContainer: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  halfWidth: {
    flex: 1,
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
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  addButton: {
    marginBottom: 8,
  },
  cancelButton: {
    paddingVertical: 10,
  },
});
