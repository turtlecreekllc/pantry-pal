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
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { usePantry } from '../../hooks/usePantry';
import { useHouseholdContext } from '../../context/HouseholdContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { QuantitySelector } from '../../components/ui/QuantitySelector';
import { DatePicker } from '../../components/ui/DatePicker';
import { VolumeGraph } from '../../components/VolumeGraph';
import { UsageHistory } from '../../components/UsageHistory';
import { Location, PantryItem, NutritionInfo, Unit } from '../../lib/types';
import { colors, typography, spacing, borderRadius, shadows } from '../../lib/theme';
import { removeBackground, isBackgroundRemovalAvailable } from '../../lib/backgroundRemovalService';
import { searchProductImages, ImageSearchResult } from '../../lib/imageSearchService';

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

export default function ItemDetailsScreen(): React.ReactElement {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeHousehold } = useHouseholdContext();
  const { pantryItems, updateItem, deleteItem } = usePantry({
    householdId: activeHousehold?.id,
  });

  const [item, setItem] = useState<PantryItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState<Unit>('item');
  const [originalQuantity, setOriginalQuantity] = useState<number | null>(null);
  const [itemCount, setItemCount] = useState(1);
  const [location, setLocation] = useState<Location>('pantry');
  const [locationNotes, setLocationNotes] = useState('');
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const [showImageSearch, setShowImageSearch] = useState(false);
  const [imageSearchResults, setImageSearchResults] = useState<ImageSearchResult[]>([]);
  const [isSearchingImages, setIsSearchingImages] = useState(false);

  useEffect(() => {
    const foundItem = pantryItems.find((i) => i.id === id);
    if (foundItem) {
      setItem(foundItem);
      setName(foundItem.name);
      setQuantity(foundItem.quantity);
      setUnit((foundItem.unit as Unit) || 'item');
      setOriginalQuantity(foundItem.original_quantity ?? foundItem.quantity);
      const countMatch = foundItem.name.match(/^(\d+)x\s/);
      setItemCount(countMatch ? parseInt(countMatch[1], 10) : 1);
      setLocation(foundItem.location);
      setLocationNotes(foundItem.location_notes || '');
      setExpirationDate(
        foundItem.expiration_date ? new Date(foundItem.expiration_date) : null
      );
      setImageUrl(foundItem.image_url || null);
    }
  }, [id, pantryItems]);

  const handleUpdate = async (): Promise<void> => {
    if (!item || !name.trim()) return;
    setLoading(true);
    try {
      let formattedName = name.trim();
      formattedName = formattedName.replace(/^\d+x\s/, '');
      if (itemCount > 1) {
        formattedName = `${itemCount}x ${formattedName}`;
      }
      await updateItem(item.id, {
        name: formattedName,
        quantity,
        unit,
        original_quantity: originalQuantity,
        location,
        location_notes: locationNotes.trim() || null,
        expiration_date: expirationDate?.toISOString().split('T')[0] || null,
        image_url: imageUrl,
      });
      setHasChanges(false);
      router.back();
    } catch (error) {
      console.error('Error updating item:', error);
      Alert.alert('Error', 'Failed to update item.');
    } finally {
      setLoading(false);
    }
  };

  const handleReplacePhoto = async (): Promise<void> => {
    const showOptions = (): void => {
      const options = ['Take Photo', 'Choose from Library', 'Search Internet', 'Remove Photo', 'Cancel'];
      const cancelButtonIndex = 4;
      const destructiveButtonIndex = 3;
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          { options, cancelButtonIndex, destructiveButtonIndex },
          (buttonIndex) => {
            if (buttonIndex === 0) takePhoto();
            else if (buttonIndex === 1) pickImage();
            else if (buttonIndex === 2) searchInternetPhoto();
            else if (buttonIndex === 3) removePhoto();
          }
        );
      } else {
        Alert.alert('Change Photo', 'Select an option', [
          { text: 'Take Photo', onPress: takePhoto },
          { text: 'Choose from Library', onPress: pickImage },
          { text: 'Search Internet', onPress: searchInternetPhoto },
          { text: 'Remove Photo', onPress: removePhoto, style: 'destructive' },
          { text: 'Cancel', style: 'cancel' },
        ]);
      }
    };
    showOptions();
  };

  const searchInternetPhoto = async (): Promise<void> => {
    if (!name.trim()) {
      Alert.alert('Enter Name', 'Please enter a product name first to search for images.');
      return;
    }
    setShowImageSearch(true);
    setIsSearchingImages(true);
    setImageSearchResults([]);
    try {
      const results = await searchProductImages(name);
      setImageSearchResults(results);
      if (results.length === 0) {
        Alert.alert('No Results', 'No images found for this product. Try a different name.');
        setShowImageSearch(false);
      }
    } catch (error) {
      console.error('Image search error:', error);
      Alert.alert('Error', 'Failed to search for images. Please try again.');
      setShowImageSearch(false);
    } finally {
      setIsSearchingImages(false);
    }
  };

  const selectInternetImage = (imageUrl: string): void => {
    handleFieldChange(setImageUrl, imageUrl);
    setShowImageSearch(false);
    setImageSearchResults([]);
  };

  const processImageWithBackgroundRemoval = async (uri: string): Promise<void> => {
    if (isBackgroundRemovalAvailable()) {
      setIsRemovingBackground(true);
      const result = await removeBackground(uri);
      setIsRemovingBackground(false);
      if (result.success && result.imageUri) {
        handleFieldChange(setImageUrl, result.imageUri);
      } else {
        handleFieldChange(setImageUrl, uri);
        if (result.error) {
          Alert.alert('Note', 'Could not remove background. Original photo saved.');
        }
      }
    } else {
      handleFieldChange(setImageUrl, uri);
    }
  };

  const takePhoto = async (): Promise<void> => {
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
      await processImageWithBackgroundRemoval(result.assets[0].uri);
    }
  };

  const pickImage = async (): Promise<void> => {
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

  const removePhoto = (): void => {
    handleFieldChange(setImageUrl, null);
  };

  const handleCancel = (): void => {
    router.back();
  };

  const handleUnitSelect = (): void => {
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

  const handleDelete = (): void => {
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

  const handleFindRecipes = (): void => {
    if (item) {
      router.push({ pathname: '/(tabs)/recipes' });
    }
  };

  const handleFieldChange = <T,>(setter: (value: T) => void, value: T): void => {
    setter(value);
    setHasChanges(true);
  };

  if (!item) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notFound}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.brownMuted} />
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
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.brown,
          headerTitleStyle: {
            fontFamily: 'Quicksand-Bold',
            fontWeight: typography.fontBold,
            color: colors.brown,
          },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={28} color={colors.brown} />
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
          <TouchableOpacity onPress={handleReplacePhoto} style={styles.imageContainer} disabled={isRemovingBackground}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.productImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="nutrition" size={48} color={colors.brownMuted} />
              </View>
            )}
            {isRemovingBackground ? (
              <View style={styles.imageOverlayLoading}>
                <ActivityIndicator size="small" color={colors.white} />
                <Text style={styles.imageOverlayText}>Removing background...</Text>
              </View>
            ) : (
              <View style={styles.imageOverlay}>
                <Ionicons name="camera" size={20} color={colors.white} />
                <Text style={styles.imageOverlayText}>Change Photo</Text>
              </View>
            )}
          </TouchableOpacity>

          {item.brand && (
            <Text style={styles.brand}>{item.brand}</Text>
          )}

          {/* Volume Graph */}
          <VolumeGraph
            currentQuantity={quantity}
            originalQuantity={originalQuantity}
            unit={unit}
            onQuantityChange={(newQuantity) => {
              handleFieldChange(setQuantity, newQuantity);
            }}
            onOriginalQuantityChange={(newOriginal) => {
              handleFieldChange(setOriginalQuantity, newOriginal);
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

            {/* Item Count Row */}
            <View style={styles.itemCountRow}>
              <Text style={styles.label}>Item Count</Text>
              <View style={styles.itemCountControls}>
                <TouchableOpacity
                  style={[styles.itemCountButton, itemCount <= 1 && styles.itemCountButtonDisabled]}
                  onPress={() => {
                    if (itemCount > 1) {
                      handleFieldChange(setItemCount, itemCount - 1);
                    }
                  }}
                  disabled={itemCount <= 1}
                >
                  <Ionicons name="remove" size={20} color={itemCount <= 1 ? colors.brownMuted : colors.brown} />
                </TouchableOpacity>
                <Text style={styles.itemCountValue}>{itemCount}</Text>
                <TouchableOpacity
                  style={styles.itemCountButton}
                  onPress={() => handleFieldChange(setItemCount, itemCount + 1)}
                >
                  <Ionicons name="add" size={20} color={colors.brown} />
                </TouchableOpacity>
                <Text style={styles.itemCountLabel}>
                  {itemCount === 1 ? 'item' : 'items'} of {quantity} {unit} each
                </Text>
              </View>
            </View>

            <View style={styles.compactRow}>
              <View style={styles.compactFieldQuantity}>
                <Text style={styles.label}>Volume per Item</Text>
                <View style={styles.quantityUnitRow}>
                  <QuantitySelector
                    value={quantity}
                    onChange={(value) => {
                      handleFieldChange(setQuantity, value);
                      handleFieldChange(setOriginalQuantity, value);
                    }}
                    unit={unit}
                  />
                  <TouchableOpacity
                    style={styles.unitDropdown}
                    onPress={handleUnitSelect}
                  >
                    <Text style={styles.unitDropdownText}>
                      {UNIT_OPTIONS.find(u => u.value === unit)?.label || unit}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={colors.brown} />
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
            <UsageHistory history={item.usage_history ?? null} unit={unit} />
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
              keyExtractor={(unitItem) => unitItem.value}
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
                    <Ionicons name="checkmark" size={20} color={colors.success} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </Pressable>
      </Modal>

      {/* Image Search Modal */}
      <Modal
        visible={showImageSearch}
        transparent
        animationType="slide"
        onRequestClose={() => setShowImageSearch(false)}
      >
        <View style={styles.imageSearchBackdrop}>
          <View style={styles.imageSearchContainer}>
            <View style={styles.imageSearchHeader}>
              <Text style={styles.imageSearchTitle}>Select an Image</Text>
              <TouchableOpacity
                onPress={() => setShowImageSearch(false)}
                style={styles.imageSearchClose}
              >
                <Ionicons name="close" size={24} color={colors.brown} />
              </TouchableOpacity>
            </View>
            {isSearchingImages ? (
              <View style={styles.imageSearchLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.imageSearchLoadingText}>Searching for "{name}"...</Text>
              </View>
            ) : (
              <FlatList
                data={imageSearchResults}
                keyExtractor={(searchItem, index) => `${searchItem.url}-${index}`}
                numColumns={2}
                contentContainerStyle={styles.imageSearchGrid}
                renderItem={({ item: searchResult }) => (
                  <TouchableOpacity
                    style={styles.imageSearchItem}
                    onPress={() => selectInternetImage(searchResult.url)}
                  >
                    <Image
                      source={{ uri: searchResult.url }}
                      style={styles.imageSearchThumb}
                      resizeMode="cover"
                    />
                    <Text style={styles.imageSearchItemTitle} numberOfLines={2}>
                      {searchResult.title || 'Product Image'}
                    </Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.imageSearchEmpty}>
                    <Ionicons name="images-outline" size={48} color={colors.brownMuted} />
                    <Text style={styles.imageSearchEmptyText}>No images found</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

interface NutritionItemProps {
  label: string;
  value: string;
}

function NutritionItem({ label, value }: NutritionItemProps): React.ReactElement {
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
    backgroundColor: colors.cream,
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
    padding: spacing.space4,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.brown,
  },
  productImage: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.lg - 2,
    resizeMode: 'cover',
    backgroundColor: colors.creamDark,
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: colors.creamDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(61, 35, 20, 0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.space2,
    gap: spacing.space2,
  },
  imageOverlayLoading: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(61, 35, 20, 0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.space3,
    gap: spacing.space2,
  },
  imageOverlayText: {
    fontFamily: 'Nunito-Medium',
    color: colors.white,
    fontSize: typography.textSm,
    fontWeight: typography.fontMedium,
  },
  brand: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textBase,
    color: colors.brownMuted,
    textAlign: 'center',
    marginTop: spacing.space3,
  },
  form: {
    marginTop: spacing.space4,
  },
  label: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    fontWeight: typography.fontMedium,
    color: colors.brown,
    marginBottom: spacing.space2,
  },
  compactRow: {
    flexDirection: 'row',
    gap: spacing.space3,
    marginBottom: spacing.space3,
    alignItems: 'flex-end',
  },
  compactFieldQuantity: {
    flex: 2.5,
    minWidth: 0,
  },
  compactFieldExpires: {
    flex: 1,
    minWidth: 0,
  },
  quantityUnitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
  },
  unitDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cream,
    paddingHorizontal: spacing.space3,
    paddingVertical: spacing.space3,
    borderRadius: borderRadius.md,
    gap: spacing.space1,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  unitDropdownText: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    fontWeight: typography.fontMedium,
    color: colors.brown,
  },
  locationButtons: {
    flexDirection: 'row',
    gap: spacing.space2,
    marginBottom: spacing.space4,
  },
  locationButton: {
    flex: 1,
    paddingVertical: spacing.space2,
  },
  nutritionSection: {
    marginTop: spacing.space2,
    padding: spacing.space4,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  nutritionTitle: {
    fontFamily: 'Quicksand-SemiBold',
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
    marginBottom: spacing.space3,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.space4,
  },
  nutritionItem: {
    width: '45%',
  },
  nutritionValue: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textLg,
    fontWeight: typography.fontSemibold,
    color: colors.success,
  },
  nutritionLabel: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textXs,
    color: colors.brownMuted,
    marginTop: 2,
  },
  recipesButton: {
    marginTop: spacing.space4,
  },
  footer: {
    padding: spacing.space4,
    backgroundColor: colors.white,
    borderTopWidth: 2,
    borderTopColor: colors.brown,
  },
  saveButton: {
    marginBottom: spacing.space2,
  },
  footerButtonRow: {
    flexDirection: 'row',
    gap: spacing.space3,
  },
  cancelButton: {
    flex: 1,
  },
  deleteButton: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(61, 35, 20, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    width: '80%',
    maxHeight: '60%',
    padding: spacing.space4,
    borderWidth: 2,
    borderColor: colors.brown,
    ...shadows.lg,
  },
  modalTitle: {
    fontFamily: 'Quicksand-SemiBold',
    fontSize: typography.textLg,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
    marginBottom: spacing.space3,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.space4,
    paddingHorizontal: spacing.space3,
    borderRadius: borderRadius.md,
  },
  modalOptionSelected: {
    backgroundColor: colors.successBg,
  },
  modalOptionText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textBase,
    color: colors.brown,
  },
  modalOptionTextSelected: {
    color: colors.success,
    fontFamily: 'Nunito-SemiBold',
    fontWeight: typography.fontSemibold,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.space8,
  },
  notFoundText: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textLg,
    color: colors.brownMuted,
    marginVertical: spacing.space4,
  },
  itemCountRow: {
    marginBottom: spacing.space4,
  },
  itemCountControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space3,
  },
  itemCountButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.brown,
  },
  itemCountButtonDisabled: {
    borderColor: colors.brownMuted,
  },
  itemCountValue: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textLg,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
    minWidth: 30,
    textAlign: 'center',
  },
  itemCountLabel: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    marginLeft: spacing.space1,
  },
  imageSearchBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(61, 35, 20, 0.5)',
    justifyContent: 'flex-end',
  },
  imageSearchContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: colors.brown,
  },
  imageSearchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.space4,
    borderBottomWidth: 2,
    borderBottomColor: colors.brown,
    backgroundColor: colors.primary,
    borderTopLeftRadius: borderRadius.xl - 2,
    borderTopRightRadius: borderRadius.xl - 2,
  },
  imageSearchTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.textLg,
    fontWeight: typography.fontBold,
    color: colors.brown,
  },
  imageSearchClose: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageSearchLoading: {
    padding: spacing.space8,
    alignItems: 'center',
  },
  imageSearchLoadingText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textBase,
    color: colors.brownMuted,
    marginTop: spacing.space3,
  },
  imageSearchGrid: {
    padding: spacing.space3,
  },
  imageSearchItem: {
    flex: 1,
    margin: spacing.space2,
    backgroundColor: colors.cream,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.brown,
    overflow: 'hidden',
  },
  imageSearchThumb: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.creamDark,
  },
  imageSearchItemTitle: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textXs,
    color: colors.brownMuted,
    padding: spacing.space2,
    textAlign: 'center',
  },
  imageSearchEmpty: {
    padding: spacing.space8,
    alignItems: 'center',
  },
  imageSearchEmptyText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textBase,
    color: colors.brownMuted,
    marginTop: spacing.space3,
  },
});
