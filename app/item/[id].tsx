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
  ActionSheetIOS,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { usePantry } from '../../hooks/usePantry';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { QuantitySelector } from '../../components/ui/QuantitySelector';
import { DatePicker } from '../../components/ui/DatePicker';
import { VolumeGraph } from '../../components/VolumeGraph';
import { UsageHistory } from '../../components/UsageHistory';
import { Location, PantryItem, NutritionInfo, Unit } from '../../lib/types';

const UNIT_OPTIONS: { label: string; value: Unit }[] = [
  { label: 'items', value: 'item' },
  { label: 'oz', value: 'oz' },
  { label: 'lb', value: 'lb' },
  { label: 'g', value: 'g' },
  { label: 'kg', value: 'kg' },
  { label: 'ml', value: 'ml' },
  { label: 'L', value: 'l' },
  { label: 'cups', value: 'cup' },
  { label: 'tbsp', value: 'tbsp' },
  { label: 'tsp', value: 'tsp' },
];

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
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showUnitPicker, setShowUnitPicker] = useState(false);

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
      setImageUrl(foundItem.image_url || null);
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
        image_url: imageUrl,
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

  const handleReplacePhoto = async () => {
    const showOptions = () => {
      const options = ['Take Photo', 'Choose from Library', 'Remove Photo', 'Cancel'];
      const cancelButtonIndex = 3;
      const destructiveButtonIndex = 2;

      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          { options, cancelButtonIndex, destructiveButtonIndex },
          (buttonIndex) => {
            if (buttonIndex === 0) takePhoto();
            else if (buttonIndex === 1) pickImage();
            else if (buttonIndex === 2) removePhoto();
          }
        );
      } else {
        Alert.alert('Change Photo', 'Select an option', [
          { text: 'Take Photo', onPress: takePhoto },
          { text: 'Choose from Library', onPress: pickImage },
          { text: 'Remove Photo', onPress: removePhoto, style: 'destructive' },
          { text: 'Cancel', style: 'cancel' },
        ]);
      }
    };

    showOptions();
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      handleFieldChange(setImageUrl, result.assets[0].uri);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      handleFieldChange(setImageUrl, result.assets[0].uri);
    }
  };

  const removePhoto = () => {
    handleFieldChange(setImageUrl, null);
  };

  const handleCancel = () => {
    router.back();
  };

  const handleUnitSelect = () => {
    if (Platform.OS === 'ios') {
      const options = [...UNIT_OPTIONS.map(u => u.label), 'Cancel'];
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: options.length - 1 },
        (buttonIndex) => {
          if (buttonIndex < UNIT_OPTIONS.length) {
            handleFieldChange(setUnit, UNIT_OPTIONS[buttonIndex].value);
          }
        }
      );
    } else {
      setShowUnitPicker(true);
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
          <TouchableOpacity onPress={handleReplacePhoto} style={styles.imageContainer}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.productImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="nutrition" size={48} color="#ccc" />
              </View>
            )}
            <View style={styles.imageOverlay}>
              <Ionicons name="camera" size={20} color="#fff" />
              <Text style={styles.imageOverlayText}>Change Photo</Text>
            </View>
          </TouchableOpacity>

          {item.brand && (
            <Text style={styles.brand}>{item.brand}</Text>
          )}

          {/* Volume Graph */}
          <VolumeGraph
            currentQuantity={quantity}
            originalQuantity={item.original_quantity}
            unit={unit}
            onQuantityChange={(newQuantity) => {
              handleFieldChange(setQuantity, newQuantity);
            }}
            onScanForEstimate={() => {
              Alert.alert(
                'Coming Soon',
                'AI-powered volume estimation from photos will be available in a future update!'
              );
            }}
          />

          <View style={styles.form}>
            <Input
              label="Name"
              value={name}
              onChangeText={(value) => handleFieldChange(setName, value)}
              placeholder="Product name"
            />

            <View style={styles.compactRow}>
              <View style={styles.compactFieldQuantity}>
                <Text style={styles.label}>Quantity</Text>
                <View style={styles.quantityUnitRow}>
                  <QuantitySelector
                    value={quantity}
                    onChange={(value) => handleFieldChange(setQuantity, value)}
                    unit={unit}
                  />
                  <TouchableOpacity
                    style={styles.unitDropdown}
                    onPress={handleUnitSelect}
                  >
                    <Text style={styles.unitDropdownText}>
                      {UNIT_OPTIONS.find(u => u.value === unit)?.label || unit}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.compactFieldExpires}>
                <Text style={styles.label}>Expires</Text>
                <DatePicker
                  value={expirationDate}
                  onChange={(value) => handleFieldChange(setExpirationDate, value)}
                  placeholder="Not set"
                  compact
                />
              </View>
            </View>

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

            {/* Usage History */}
            <UsageHistory history={item.usage_history} unit={unit} />
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
          <View style={styles.footerButtonRow}>
            <Button
              title="Cancel"
              variant="secondary"
              onPress={handleCancel}
              disabled={loading}
              style={styles.cancelButton}
            />
            <Button
              title="Delete"
              variant="danger"
              onPress={handleDelete}
              disabled={loading}
              style={styles.deleteButton}
            />
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Unit Picker Modal for Android */}
      <Modal
        visible={showUnitPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUnitPicker(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowUnitPicker(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Unit</Text>
            <FlatList
              data={UNIT_OPTIONS}
              keyExtractor={(item) => item.value}
              renderItem={({ item: unitOption }) => (
                <TouchableOpacity
                  style={[
                    styles.modalOption,
                    unit === unitOption.value && styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    handleFieldChange(setUnit, unitOption.value);
                    setShowUnitPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      unit === unitOption.value && styles.modalOptionTextSelected,
                    ]}
                  >
                    {unitOption.label}
                  </Text>
                  {unit === unitOption.value && (
                    <Ionicons name="checkmark" size={20} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </Pressable>
      </Modal>
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
  imageContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
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
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  imageOverlayText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
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
    gap: 12,
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  compactFieldQuantity: {
    flex: 1.5,
    minWidth: 0,
  },
  compactFieldExpires: {
    flex: 1,
    minWidth: 0,
  },
  quantityUnitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unitDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  unitDropdownText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
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
  footerButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  deleteButton: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '80%',
    maxHeight: '60%',
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  modalOptionSelected: {
    backgroundColor: '#E8F5E9',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
  },
  modalOptionTextSelected: {
    color: '#4CAF50',
    fontWeight: '600',
  },
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
