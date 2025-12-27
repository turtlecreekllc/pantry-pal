import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  ActionSheetIOS,
  Alert,
  ScrollView,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ScannedItem, Unit, Location, FillLevel } from '../lib/types';

interface ScanReviewCardProps {
  item: ScannedItem;
  currentIndex: number;
  totalItems: number;
  onAccept: (item: ScannedItem) => void;
  onReject: (item: ScannedItem) => void;
  onEdit: (item: ScannedItem) => void;
  onPrevious: () => void;
  onNext: () => void;
  location?: Location;
  onLocationChange?: (location: Location) => void;
}

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

const VOLUME_UNIT_OPTIONS: { label: string; value: Unit }[] = [
  { label: 'oz', value: 'oz' },
  { label: 'lb', value: 'lb' },
  { label: 'g', value: 'g' },
  { label: 'kg', value: 'kg' },
  { label: 'ml', value: 'ml' },
  { label: 'L', value: 'l' },
  { label: 'cups', value: 'cup' },
];

const LOCATION_OPTIONS: { label: string; value: Location }[] = [
  { label: 'Pantry', value: 'pantry' },
  { label: 'Fridge', value: 'fridge' },
  { label: 'Freezer', value: 'freezer' },
];

const FILL_LEVEL_OPTIONS: { label: string; value: FillLevel }[] = [
  { label: 'Full', value: 'full' },
  { label: '3/4 Full', value: '3/4' },
  { label: 'Half Full', value: '1/2' },
  { label: '1/4 Full', value: '1/4' },
  { label: 'Almost Empty', value: 'almost-empty' },
];

export function ScanReviewCard({
  item,
  currentIndex,
  totalItems,
  onAccept,
  onReject,
  onEdit,
  onPrevious,
  onNext,
  location = 'pantry',
  onLocationChange,
}: ScanReviewCardProps) {
  const [editMode, setEditMode] = useState(false);
  const [editedName, setEditedName] = useState(item.name);
  const [editedBrand, setEditedBrand] = useState(item.brand || '');
  const [editedUnitCount, setEditedUnitCount] = useState(
    (item.unitCount || item.quantity || 1).toString()
  );
  const [editedVolumeQuantity, setEditedVolumeQuantity] = useState(
    (item.volumeQuantity || '').toString()
  );
  const [editedVolumeUnit, setEditedVolumeUnit] = useState<Unit>(item.volumeUnit || 'oz');
  const [editedLocation, setEditedLocation] = useState<Location>(location);
  const [editedFillLevel, setEditedFillLevel] = useState<FillLevel | undefined>(item.fillLevel);
  const [editedExpirationDate, setEditedExpirationDate] = useState<Date | undefined>(
    item.expirationDate ? new Date(item.expirationDate) : undefined
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');

  // Reset edit state when item changes (navigating between items)
  useEffect(() => {
    setEditedName(item.name);
    setEditedBrand(item.brand || '');
    setEditedUnitCount((item.unitCount || item.quantity || 1).toString());
    setEditedVolumeQuantity((item.volumeQuantity || '').toString());
    setEditedVolumeUnit(item.volumeUnit || 'oz');
    setEditedFillLevel(item.fillLevel);
    setEditedExpirationDate(item.expirationDate ? new Date(item.expirationDate) : undefined);
    setShowDatePicker(false);
    setEditMode(false);
    setVoiceText('');
  }, [item.id]);

  // Reset location when it changes from parent
  useEffect(() => {
    setEditedLocation(location);
  }, [location]);

  const confidenceColor =
    item.confidence >= 0.9 ? '#4CAF50' : item.confidence >= 0.7 ? '#FFC107' : '#f44336';

  const handleSaveEdit = () => {
    const unitCount = parseFloat(editedUnitCount) || 1;
    const volumeQty = parseFloat(editedVolumeQuantity) || 0;

    // Calculate total quantity
    const totalQuantity = volumeQty > 0 ? unitCount * volumeQty : unitCount;
    const finalUnit = volumeQty > 0 ? editedVolumeUnit : 'item';

    const editedItem: ScannedItem = {
      ...item,
      name: editedName.trim(),
      quantity: totalQuantity,
      unit: finalUnit,
      unitCount: unitCount,
      volumeQuantity: volumeQty > 0 ? volumeQty : undefined,
      volumeUnit: volumeQty > 0 ? editedVolumeUnit : undefined,
      brand: editedBrand.trim() || undefined,
      fillLevel: editedFillLevel,
      expirationDate: editedExpirationDate
        ? editedExpirationDate.toISOString().split('T')[0]
        : undefined,
      status: 'edited',
    };
    onEdit(editedItem);
    if (onLocationChange && editedLocation !== location) {
      onLocationChange(editedLocation);
    }
    setEditMode(false);
  };

  const handleCancelEdit = () => {
    setEditedName(item.name);
    setEditedBrand(item.brand || '');
    setEditedUnitCount((item.unitCount || item.quantity || 1).toString());
    setEditedVolumeQuantity((item.volumeQuantity || '').toString());
    setEditedVolumeUnit(item.volumeUnit || 'oz');
    setEditedLocation(location);
    setEditedFillLevel(item.fillLevel);
    setEditedExpirationDate(item.expirationDate ? new Date(item.expirationDate) : undefined);
    setShowDatePicker(false);
    setEditMode(false);
    setVoiceText('');
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setEditedExpirationDate(selectedDate);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const clearExpirationDate = () => {
    setEditedExpirationDate(undefined);
    setShowDatePicker(false);
  };

  const handleVolumeUnitSelect = () => {
    if (Platform.OS === 'ios') {
      const options = [...VOLUME_UNIT_OPTIONS.map((u) => u.label), 'Cancel'];
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: options.length - 1 },
        (buttonIndex) => {
          if (buttonIndex < VOLUME_UNIT_OPTIONS.length) {
            setEditedVolumeUnit(VOLUME_UNIT_OPTIONS[buttonIndex].value);
          }
        }
      );
    } else {
      Alert.alert(
        'Select Unit',
        undefined,
        [
          ...VOLUME_UNIT_OPTIONS.map((u) => ({
            text: u.label,
            onPress: () => setEditedVolumeUnit(u.value),
          })),
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const handleLocationSelect = () => {
    if (Platform.OS === 'ios') {
      const options = [...LOCATION_OPTIONS.map((l) => l.label), 'Cancel'];
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: options.length - 1 },
        (buttonIndex) => {
          if (buttonIndex < LOCATION_OPTIONS.length) {
            setEditedLocation(LOCATION_OPTIONS[buttonIndex].value);
          }
        }
      );
    } else {
      Alert.alert(
        'Select Location',
        undefined,
        [
          ...LOCATION_OPTIONS.map((l) => ({
            text: l.label,
            onPress: () => setEditedLocation(l.value),
          })),
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const handleFillLevelSelect = () => {
    if (Platform.OS === 'ios') {
      const options = [...FILL_LEVEL_OPTIONS.map((f) => f.label), 'Not Applicable', 'Cancel'];
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: options.length - 1 },
        (buttonIndex) => {
          if (buttonIndex < FILL_LEVEL_OPTIONS.length) {
            setEditedFillLevel(FILL_LEVEL_OPTIONS[buttonIndex].value);
          } else if (buttonIndex === FILL_LEVEL_OPTIONS.length) {
            setEditedFillLevel(undefined);
          }
        }
      );
    } else {
      Alert.alert(
        'Select Fill Level',
        'For container items (oils, spices, etc.)',
        [
          ...FILL_LEVEL_OPTIONS.map((f) => ({
            text: f.label,
            onPress: () => setEditedFillLevel(f.value),
          })),
          { text: 'Not Applicable', onPress: () => setEditedFillLevel(undefined) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const parseVoiceInput = (text: string) => {
    const lower = text.toLowerCase();

    // Parse patterns like "3 cans of 12 oz" or "2 bottles 16 ounces each"
    const patterns = [
      /(\d+)\s*(cans?|bottles?|boxes?|bags?|packages?|jars?|containers?)\s*(?:of\s*)?(\d+(?:\.\d+)?)\s*(oz|ounces?|lb|pounds?|g|grams?|ml|liters?|l|cups?)/i,
      /(\d+)\s*(?:x\s*)?(\d+(?:\.\d+)?)\s*(oz|ounces?|lb|pounds?|g|grams?|ml|liters?|l|cups?)/i,
    ];

    for (const pattern of patterns) {
      const match = lower.match(pattern);
      if (match) {
        const unitCount = match[1];
        const volumeQty = match[3] || match[2];
        let volumeUnit = (match[4] || match[3] || '').toLowerCase();

        // Normalize unit names
        if (volumeUnit.includes('ounce')) volumeUnit = 'oz';
        if (volumeUnit.includes('pound')) volumeUnit = 'lb';
        if (volumeUnit.includes('gram')) volumeUnit = 'g';
        if (volumeUnit.includes('liter')) volumeUnit = 'l';
        if (volumeUnit.includes('cup')) volumeUnit = 'cup';

        setEditedUnitCount(unitCount);
        setEditedVolumeQuantity(volumeQty);
        if (['oz', 'lb', 'g', 'kg', 'ml', 'l', 'cup'].includes(volumeUnit)) {
          setEditedVolumeUnit(volumeUnit as Unit);
        }
        return true;
      }
    }

    // Simple quantity pattern "3 items" or just "3"
    const simpleMatch = lower.match(/^(\d+)\s*(items?)?$/i);
    if (simpleMatch) {
      setEditedUnitCount(simpleMatch[1]);
      return true;
    }

    // Date patterns
    const datePatterns = [
      /expires?\s*(?:on\s*)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/i,
      /expires?\s*(?:on\s*)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(\d{1,2})(?:[,\s]+(\d{4}))?/i,
    ];

    for (const pattern of datePatterns) {
      const match = lower.match(pattern);
      if (match) {
        try {
          let date: Date;
          if (match[1].match(/^\d+$/)) {
            // MM/DD format
            const month = parseInt(match[1]) - 1;
            const day = parseInt(match[2]);
            const year = match[3] ? parseInt(match[3]) : new Date().getFullYear();
            date = new Date(year < 100 ? 2000 + year : year, month, day);
          } else {
            // Month name format
            const months: Record<string, number> = {
              jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
              jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
            };
            const month = months[match[1].substring(0, 3)];
            const day = parseInt(match[2]);
            const year = match[3] ? parseInt(match[3]) : new Date().getFullYear();
            date = new Date(year, month, day);
          }
          if (!isNaN(date.getTime())) {
            setEditedExpirationDate(date);
            return true;
          }
        } catch {
          // Continue to next pattern
        }
      }
    }

    // Location patterns
    if (lower.includes('pantry')) {
      setEditedLocation('pantry');
      return true;
    } else if (lower.includes('fridge') || lower.includes('refrigerator')) {
      setEditedLocation('fridge');
      return true;
    } else if (lower.includes('freezer')) {
      setEditedLocation('freezer');
      return true;
    }

    return false;
  };

  const handleVoiceInput = () => {
    // Show a prompt for voice-like text input (actual voice would require expo-speech)
    Alert.prompt(
      'Voice Input',
      'Say something like:\n• "3 cans of 12 oz"\n• "expires 12/25"\n• "put in fridge"',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: (text: string | undefined) => {
            if (text) {
              setVoiceText(text);
              const parsed = parseVoiceInput(text);
              if (!parsed) {
                Alert.alert('Could not understand', 'Please try again with a different phrase.');
              }
            }
          },
        },
      ],
      'plain-text',
      voiceText
    );
  };

  const handleAccept = () => {
    // Calculate quantity values from form state
    const unitCount = parseFloat(editedUnitCount) || 1;
    const volumeQty = parseFloat(editedVolumeQuantity) || 0;

    // Determine final quantity and unit
    // If user specified a volume quantity, use the dual quantity system
    // Otherwise, preserve the original item's quantity and unit from AI scan
    let totalQuantity: number;
    let finalUnit: string;

    if (volumeQty > 0) {
      // User set up dual quantity (e.g., 3 cans of 12 oz)
      totalQuantity = unitCount * volumeQty;
      finalUnit = editedVolumeUnit;
    } else if (item.volumeQuantity && item.volumeUnit) {
      // Item already had dual quantity from AI
      totalQuantity = unitCount * item.volumeQuantity;
      finalUnit = item.volumeUnit;
    } else {
      // Simple quantity - preserve original unit from AI scan
      totalQuantity = unitCount;
      finalUnit = item.unit;
    }

    const acceptedItem: ScannedItem = {
      ...item,
      name: editedName.trim() || item.name,
      quantity: totalQuantity,
      unit: finalUnit as any,
      unitCount: unitCount,
      volumeQuantity: volumeQty > 0 ? volumeQty : item.volumeQuantity,
      volumeUnit: volumeQty > 0 ? editedVolumeUnit : item.volumeUnit,
      brand: editedBrand.trim() || item.brand,
      fillLevel: editedFillLevel,
      expirationDate: editedExpirationDate
        ? editedExpirationDate.toISOString().split('T')[0]
        : undefined,
      status: 'accepted',
    };

    // Notify parent of location change if different
    if (onLocationChange && editedLocation !== location) {
      onLocationChange(editedLocation);
    }

    onAccept(acceptedItem);
  };

  const handleReject = () => {
    const rejectedItem: ScannedItem = {
      ...item,
      status: 'rejected',
    };
    onReject(rejectedItem);
  };

  // Format display string for quantity
  const getQuantityDisplay = () => {
    if (item.unitCount && item.volumeQuantity && item.volumeUnit) {
      const unitLabel = VOLUME_UNIT_OPTIONS.find((u) => u.value === item.volumeUnit)?.label || item.volumeUnit;
      return `${item.unitCount} × ${item.volumeQuantity} ${unitLabel}`;
    }
    const unitLabel = UNIT_OPTIONS.find((u) => u.value === item.unit)?.label || item.unit;
    return `${item.quantity} ${unitLabel}`;
  };

  return (
    <View style={styles.container}>
      {/* Progress indicator */}
      <View style={styles.progressRow}>
        <Text style={styles.progressText}>
          Item {currentIndex + 1} of {totalItems}
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${((currentIndex + 1) / totalItems) * 100}%` },
            ]}
          />
        </View>
      </View>

      {/* Card content */}
      <View style={styles.card}>
        {/* Confidence badge */}
        <View style={styles.confidenceBadge}>
          <View style={[styles.confidenceDot, { backgroundColor: confidenceColor }]} />
          <Text style={styles.confidenceText}>
            {Math.round(item.confidence * 100)}% confidence
          </Text>
        </View>

        {editMode ? (
          /* Edit mode */
          <ScrollView
            style={styles.editScrollView}
            contentContainerStyle={styles.editScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.editForm}>
              {/* Voice Input Button */}
              <TouchableOpacity
                style={styles.voiceInputButton}
                onPress={handleVoiceInput}
              >
                <Ionicons name="mic" size={20} color="#4CAF50" />
                <Text style={styles.voiceInputText}>Tap to speak your changes</Text>
              </TouchableOpacity>

              {voiceText ? (
                <View style={styles.voiceResultBadge}>
                  <Text style={styles.voiceResultText}>"{voiceText}"</Text>
                </View>
              ) : null}

              {/* Dismiss Keyboard */}
              <TouchableOpacity
                style={styles.dismissKeyboardButton}
                onPress={() => Keyboard.dismiss()}
              >
                <Ionicons name="chevron-down" size={14} color="#666" />
                <Text style={styles.dismissKeyboardText}>Dismiss Keyboard</Text>
              </TouchableOpacity>

              {/* Name */}
              <View style={styles.formRow}>
                <Text style={styles.label}>Product Name</Text>
                <TextInput
                  style={styles.input}
                  value={editedName}
                  onChangeText={setEditedName}
                  placeholder="e.g., Chicken Broth"
                  returnKeyType="next"
                />
              </View>

              {/* Brand */}
              <View style={styles.formRow}>
                <Text style={styles.label}>Brand (optional)</Text>
                <TextInput
                  style={styles.input}
                  value={editedBrand}
                  onChangeText={setEditedBrand}
                  placeholder="e.g., Campbell's"
                  returnKeyType="next"
                />
              </View>

              {/* Quantity Section */}
              <View style={styles.quantitySection}>
                <Text style={styles.sectionTitle}>Quantity</Text>

                {/* Unit Count */}
                <View style={styles.formRowInline}>
                  <View style={styles.formFieldHalf}>
                    <Text style={styles.labelSmall}>How many?</Text>
                    <TextInput
                      style={styles.inputLarge}
                      value={editedUnitCount}
                      onChangeText={setEditedUnitCount}
                      keyboardType="decimal-pad"
                      placeholder="1"
                      returnKeyType="next"
                    />
                  </View>
                  <View style={styles.formFieldHalf}>
                    <Text style={styles.labelSmall}>packages/cans/etc.</Text>
                    <View style={styles.unitHelper}>
                      <Ionicons name="cube-outline" size={24} color="#666" />
                    </View>
                  </View>
                </View>

                {/* Volume per unit */}
                <View style={styles.volumeRow}>
                  <Text style={styles.labelSmall}>Size per unit (optional)</Text>
                  <View style={styles.formRowInline}>
                    <View style={styles.formFieldHalf}>
                      <TextInput
                        style={styles.input}
                        value={editedVolumeQuantity}
                        onChangeText={setEditedVolumeQuantity}
                        keyboardType="decimal-pad"
                        placeholder="12"
                        returnKeyType="done"
                      />
                    </View>
                    <View style={styles.formFieldHalf}>
                      <TouchableOpacity style={styles.dropdown} onPress={handleVolumeUnitSelect}>
                        <Text style={styles.dropdownText}>
                          {VOLUME_UNIT_OPTIONS.find((u) => u.value === editedVolumeUnit)?.label || editedVolumeUnit}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color="#666" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Preview */}
                {editedUnitCount && (
                  <View style={styles.quantityPreview}>
                    <Text style={styles.quantityPreviewLabel}>Total:</Text>
                    <Text style={styles.quantityPreviewValue}>
                      {editedVolumeQuantity
                        ? `${editedUnitCount} × ${editedVolumeQuantity} ${VOLUME_UNIT_OPTIONS.find((u) => u.value === editedVolumeUnit)?.label || editedVolumeUnit}`
                        : `${editedUnitCount} item${parseFloat(editedUnitCount) !== 1 ? 's' : ''}`}
                    </Text>
                  </View>
                )}
              </View>

              {/* Location */}
              <View style={styles.formRow}>
                <Text style={styles.label}>Location</Text>
                <TouchableOpacity style={styles.dropdown} onPress={handleLocationSelect}>
                  <Ionicons name="location-outline" size={18} color="#666" />
                  <Text style={styles.dropdownText}>
                    {LOCATION_OPTIONS.find((l) => l.value === editedLocation)?.label || editedLocation}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Fill Level */}
              <View style={styles.formRow}>
                <Text style={styles.label}>Fill Level (optional)</Text>
                <TouchableOpacity style={styles.dropdown} onPress={handleFillLevelSelect}>
                  <Ionicons name="water-outline" size={18} color="#666" />
                  <Text style={[styles.dropdownText, !editedFillLevel && styles.placeholderText]}>
                    {editedFillLevel
                      ? FILL_LEVEL_OPTIONS.find((f) => f.value === editedFillLevel)?.label
                      : 'Not applicable'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Expiration Date */}
              <View style={styles.formRow}>
                <Text style={styles.label}>Expiration Date (optional)</Text>
                <View style={styles.dateRow}>
                  <TouchableOpacity
                    style={[styles.dropdown, styles.dateDropdown]}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={18} color="#666" />
                    <Text
                      style={[
                        styles.dropdownText,
                        !editedExpirationDate && styles.placeholderText,
                      ]}
                    >
                      {editedExpirationDate ? formatDate(editedExpirationDate) : 'Set expiration'}
                    </Text>
                  </TouchableOpacity>
                  {editedExpirationDate && (
                    <TouchableOpacity
                      style={styles.clearDateButton}
                      onPress={clearExpirationDate}
                    >
                      <Ionicons name="close-circle" size={22} color="#999" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {showDatePicker && (
                <View style={styles.datePickerContainer}>
                  <DateTimePicker
                    value={editedExpirationDate || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                  />
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity
                      style={styles.datePickerDoneButton}
                      onPress={() => setShowDatePicker(false)}
                    >
                      <Text style={styles.datePickerDoneText}>Done</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.editActions}>
                <TouchableOpacity style={styles.cancelEditButton} onPress={handleCancelEdit}>
                  <Text style={styles.cancelEditText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveEditButton} onPress={handleSaveEdit}>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={styles.saveEditText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        ) : (
          /* View mode */
          <>
            <View style={styles.itemDetails}>
              <Text style={styles.itemName}>{item.name}</Text>
              {item.brand && <Text style={styles.itemBrand}>{item.brand}</Text>}
              <View style={styles.quantityRowView}>
                <Ionicons name="cube-outline" size={18} color="#4CAF50" />
                <Text style={styles.quantityText}>{getQuantityDisplay()}</Text>
                {item.category && (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{item.category}</Text>
                  </View>
                )}
              </View>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="location-outline" size={14} color="#666" />
                  <Text style={styles.metaText}>
                    {LOCATION_OPTIONS.find((l) => l.value === location)?.label || location}
                  </Text>
                </View>
                {item.fillLevel && (
                  <View style={styles.metaItem}>
                    <Ionicons name="water-outline" size={14} color="#2196F3" />
                    <Text style={[styles.metaText, { color: '#2196F3' }]}>
                      {FILL_LEVEL_OPTIONS.find((f) => f.value === item.fillLevel)?.label}
                    </Text>
                  </View>
                )}
                {item.expirationDate && (
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={14} color="#FF9800" />
                    <Text style={[styles.metaText, { color: '#FF9800' }]}>
                      {new Date(item.expirationDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Action buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={handleReject}
              >
                <Ionicons name="close" size={24} color="#f44336" />
                <Text style={styles.rejectText}>Skip</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setEditMode(true)}
              >
                <Ionicons name="pencil" size={20} color="#666" />
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.acceptButton}
                onPress={handleAccept}
              >
                <Ionicons name="checkmark" size={24} color="#fff" />
                <Text style={styles.acceptText}>Add</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Navigation */}
      {!editMode && (
        <View style={styles.navigation}>
          <TouchableOpacity
            style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
            onPress={onPrevious}
            disabled={currentIndex === 0}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={currentIndex === 0 ? '#ccc' : '#4CAF50'}
            />
            <Text
              style={[styles.navText, currentIndex === 0 && styles.navTextDisabled]}
            >
              Previous
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.navButton,
              currentIndex === totalItems - 1 && styles.navButtonDisabled,
            ]}
            onPress={onNext}
            disabled={currentIndex === totalItems - 1}
          >
            <Text
              style={[
                styles.navText,
                currentIndex === totalItems - 1 && styles.navTextDisabled,
              ]}
            >
              Next
            </Text>
            <Ionicons
              name="chevron-forward"
              size={24}
              color={currentIndex === totalItems - 1 ? '#ccc' : '#4CAF50'}
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  progressRow: {
    marginBottom: 16,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  confidenceText: {
    fontSize: 12,
    color: '#666',
  },
  itemDetails: {
    marginBottom: 16,
  },
  itemName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemBrand: {
    fontSize: 15,
    color: '#666',
    marginBottom: 8,
  },
  quantityRowView: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  quantityText: {
    fontSize: 17,
    color: '#4CAF50',
    fontWeight: '600',
  },
  categoryBadge: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 'auto',
  },
  categoryText: {
    fontSize: 11,
    color: '#666',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#666',
  },
  placeholderText: {
    color: '#999',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#f44336',
    backgroundColor: '#fff',
    gap: 2,
  },
  rejectText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f44336',
  },
  editButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    gap: 2,
  },
  editText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    gap: 2,
  },
  acceptText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 4,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  navTextDisabled: {
    color: '#ccc',
  },
  editForm: {
    gap: 14,
  },
  voiceInputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
  },
  voiceInputText: {
    fontSize: 15,
    color: '#4CAF50',
    fontWeight: '500',
  },
  voiceResultBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  voiceResultText: {
    fontSize: 13,
    color: '#1976D2',
    fontStyle: 'italic',
  },
  dismissKeyboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  dismissKeyboardText: {
    fontSize: 11,
    color: '#999',
  },
  formRow: {
    gap: 6,
  },
  formRowInline: {
    flexDirection: 'row',
    gap: 10,
  },
  formFieldHalf: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  labelSmall: {
    fontSize: 12,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 8,
    fontSize: 15,
    color: '#333',
  },
  inputLarge: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 8,
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  unitHelper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  quantitySection: {
    backgroundColor: '#FAFAFA',
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  volumeRow: {
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  quantityPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  quantityPreviewLabel: {
    fontSize: 13,
    color: '#666',
  },
  quantityPreviewValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4CAF50',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 8,
    gap: 8,
  },
  dropdownText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  cancelEditButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cancelEditText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
  },
  saveEditButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
  },
  saveEditText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  editScrollView: {
    maxHeight: 450,
  },
  editScrollContent: {
    flexGrow: 1,
    paddingBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateDropdown: {
    flex: 1,
  },
  clearDateButton: {
    padding: 4,
  },
  datePickerContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  datePickerDoneButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  datePickerDoneText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
});
