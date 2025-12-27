import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { usePantry } from '../../hooks/usePantry';
import { ScanReviewCard } from '../../components/ScanReviewCard';
import { analyzeShelfPhoto } from '../../lib/aiScanner';
import { ScannedItem, Location } from '../../lib/types';

type ScanPhase = 'location' | 'capture' | 'preview' | 'processing' | 'review' | 'complete';

interface CapturedPhoto {
  uri: string;
  base64: string;
}

const LOCATION_OPTIONS: { label: string; value: Location; icon: string }[] = [
  { label: 'Pantry', value: 'pantry', icon: 'file-tray-full-outline' },
  { label: 'Fridge', value: 'fridge', icon: 'snow-outline' },
  { label: 'Freezer', value: 'freezer', icon: 'cube-outline' },
];

export default function PhotoScannerScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const { addItem } = usePantry();

  const [phase, setPhase] = useState<ScanPhase>('location');
  const [selectedLocation, setSelectedLocation] = useState<Location>('pantry');
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [addedCount, setAddedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [itemLocations, setItemLocations] = useState<Record<string, Location>>({});
  const [enableTorch, setEnableTorch] = useState(false);

  const pendingItems = scannedItems.filter((item) => item.status === 'pending');
  const currentItem = pendingItems[currentIndex];

  const handleSelectLocation = (location: Location) => {
    setSelectedLocation(location);
    setPhase('capture');
  };

  const handleCapture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (photo && photo.base64) {
        setCapturedPhotos([...capturedPhotos, { uri: photo.uri, base64: photo.base64 }]);
        setPhase('preview');
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0] && result.assets[0].base64) {
      setCapturedPhotos([
        ...capturedPhotos,
        { uri: result.assets[0].uri, base64: result.assets[0].base64 },
      ]);
      setPhase('preview');
    }
  };

  const handleAddAnotherPhoto = () => {
    setPhase('capture');
  };

  const handleProcessAllPhotos = async () => {
    setPhase('processing');

    try {
      let allItems: ScannedItem[] = [];

      // Process each photo
      for (const photo of capturedPhotos) {
        const result = await analyzeShelfPhoto(photo.base64, selectedLocation);
        allItems = [...allItems, ...result.items];
      }

      setScannedItems(allItems);

      // Initialize locations for all items with the selected location
      const locations: Record<string, Location> = {};
      allItems.forEach((item) => {
        locations[item.id] = selectedLocation;
      });
      setItemLocations(locations);

      if (allItems.length > 0) {
        setPhase('review');
      } else {
        Alert.alert(
          'No Items Found',
          'Could not detect any items in the photos. Please try again with clearer images.',
          [{ text: 'OK', onPress: () => handleDiscardPhotos() }]
        );
      }
    } catch (error) {
      console.error('Error processing images:', error);
      Alert.alert('Error', 'Failed to analyze the photos. Please try again.', [
        { text: 'OK', onPress: () => handleDiscardPhotos() },
      ]);
    }
  };

  const handleDiscardPhotos = () => {
    setCapturedPhotos([]);
    setPhase('capture');
  };

  const handleRetake = () => {
    setCapturedPhotos([]);
    setScannedItems([]);
    setCurrentIndex(0);
    setPhase('capture');
  };

  const handleChangeLocation = () => {
    setCapturedPhotos([]);
    setScannedItems([]);
    setCurrentIndex(0);
    setAddedCount(0);
    setSkippedCount(0);
    setEnableTorch(false);
    setPhase('location');
  };

  const handleAccept = async (item: ScannedItem) => {
    try {
      // Ensure we have valid data for Supabase
      const itemData = {
        name: item.name?.trim() || 'Unknown Item',
        quantity: typeof item.quantity === 'number' && !isNaN(item.quantity) ? item.quantity : 1,
        unit: item.unit || 'item',
        brand: item.brand || null,
        category: item.category || null,
        location: itemLocations[item.id] || selectedLocation,
        barcode: null,
        expiration_date: item.expirationDate || null,
        image_url: null,
        nutrition_json: null,
        location_notes: null,
        fill_level: item.fillLevel || null,
        original_quantity: typeof item.quantity === 'number' && !isNaN(item.quantity) ? item.quantity : 1,
        usage_history: null,
      };

      await addItem(itemData);

      setAddedCount((prev) => prev + 1);
      moveToNextItem(item.id, 'accepted');
    } catch (error: any) {
      console.error('Error adding item:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      Alert.alert('Error', `Failed to add item: ${errorMessage}`);
    }
  };

  const handleReject = (item: ScannedItem) => {
    setSkippedCount((prev) => prev + 1);
    moveToNextItem(item.id, 'rejected');
  };

  const handleEdit = (editedItem: ScannedItem) => {
    setScannedItems((prev) =>
      prev.map((item) => (item.id === editedItem.id ? editedItem : item))
    );
  };

  const handleLocationChange = (location: Location) => {
    if (currentItem) {
      setItemLocations((prev) => ({
        ...prev,
        [currentItem.id]: location,
      }));
    }
  };

  const moveToNextItem = (itemId: string, status: 'accepted' | 'rejected') => {
    setScannedItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, status } : item))
    );

    const remainingItems = pendingItems.filter((item) => item.id !== itemId);
    if (remainingItems.length === 0) {
      setPhase('complete');
    } else if (currentIndex >= remainingItems.length) {
      setCurrentIndex(remainingItems.length - 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < pendingItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleDone = () => {
    router.back();
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted && phase !== 'location') {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Photo Scanner' }} />
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color="#ccc" />
          <Text style={styles.permissionText}>
            Camera access is required to scan your shelves
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Photo Scanner',
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

      {phase === 'location' && (
        <View style={styles.locationContainer}>
          <View style={styles.locationContent}>
            <Ionicons name="camera" size={64} color="#4CAF50" />
            <Text style={styles.locationTitle}>What are you scanning?</Text>
            <Text style={styles.locationSubtitle}>
              Take a photo of your shelves and we'll identify the products
            </Text>
          </View>

          <View style={styles.locationOptions}>
            {LOCATION_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.locationOption}
                onPress={() => handleSelectLocation(option.value)}
              >
                <View style={styles.locationIconContainer}>
                  <Ionicons name={option.icon as any} size={32} color="#4CAF50" />
                </View>
                <Text style={styles.locationOptionLabel}>{option.label}</Text>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {phase === 'capture' && (
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
            enableTorch={enableTorch}
          >
            <View style={styles.cameraOverlay}>
              <View style={styles.topControls}>
                <View style={styles.locationBadge}>
                  <Ionicons
                    name={
                      LOCATION_OPTIONS.find((l) => l.value === selectedLocation)?.icon as any
                    }
                    size={16}
                    color="#fff"
                  />
                  <Text style={styles.locationBadgeText}>
                    {LOCATION_OPTIONS.find((l) => l.value === selectedLocation)?.label}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.flashButton}
                  onPress={() => setEnableTorch(!enableTorch)}
                >
                  <Ionicons
                    name={enableTorch ? 'flash' : 'flash-outline'}
                    size={24}
                    color="#fff"
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.tipsContainer}>
                <View style={styles.tipBubble}>
                  <Ionicons name="bulb-outline" size={16} color="#FFC107" />
                  <Text style={styles.tipText}>Include product labels</Text>
                </View>
                <View style={styles.tipBubble}>
                  <Ionicons name="sunny-outline" size={16} color="#FFC107" />
                  <Text style={styles.tipText}>Good lighting helps</Text>
                </View>
                {capturedPhotos.length > 0 && (
                  <View style={styles.photoBadge}>
                    <Ionicons name="images" size={16} color="#4CAF50" />
                    <Text style={styles.photoBadgeText}>
                      {capturedPhotos.length} photo{capturedPhotos.length !== 1 ? 's' : ''}{' '}
                      captured
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.guideText}>Position your shelf in the frame</Text>
            </View>
          </CameraView>

          <View style={styles.captureControls}>
            <TouchableOpacity style={styles.galleryButton} onPress={handlePickImage}>
              <Ionicons name="images" size={28} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.changeLocationButton} onPress={handleChangeLocation}>
              <Ionicons name="swap-horizontal" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {phase === 'preview' && capturedPhotos.length > 0 && (
        <View style={styles.previewContainer}>
          <Image
            source={{ uri: capturedPhotos[capturedPhotos.length - 1].uri }}
            style={styles.previewImage}
          />
          <View style={styles.previewOverlay}>
            <View style={styles.previewBadge}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.previewBadgeText}>Photo Captured!</Text>
            </View>
            <Text style={styles.previewSubtext}>
              {capturedPhotos.length} photo{capturedPhotos.length !== 1 ? 's' : ''} ready to
              process
            </Text>
          </View>

          <View style={styles.previewActions}>
            <TouchableOpacity style={styles.discardButton} onPress={handleDiscardPhotos}>
              <Ionicons name="trash-outline" size={20} color="#f44336" />
              <Text style={styles.discardButtonText}>Discard</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.addAnotherButton} onPress={handleAddAnotherPhoto}>
              <Ionicons name="add-circle-outline" size={20} color="#4CAF50" />
              <Text style={styles.addAnotherButtonText}>Add Another Shelf</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.processButton} onPress={handleProcessAllPhotos}>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.processButtonText}>Process All</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {phase === 'processing' && (
        <View style={styles.processingContainer}>
          {capturedPhotos.length > 0 && (
            <Image
              source={{ uri: capturedPhotos[capturedPhotos.length - 1].uri }}
              style={styles.previewImage}
            />
          )}
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.processingText}>
              Analyzing {capturedPhotos.length} photo{capturedPhotos.length !== 1 ? 's' : ''}...
            </Text>
            <Text style={styles.processingSubtext}>Identifying products and quantities</Text>
          </View>
        </View>
      )}

      {phase === 'review' && currentItem && (
        <View style={styles.reviewContainer}>
          <ScanReviewCard
            item={currentItem}
            currentIndex={currentIndex}
            totalItems={pendingItems.length}
            onAccept={handleAccept}
            onReject={handleReject}
            onEdit={handleEdit}
            onPrevious={handlePrevious}
            onNext={handleNext}
            location={itemLocations[currentItem.id] || selectedLocation}
            onLocationChange={handleLocationChange}
          />

          <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
            <Ionicons name="camera" size={18} color="#666" />
            <Text style={styles.retakeText}>Take Another Photo</Text>
          </TouchableOpacity>
        </View>
      )}

      {phase === 'complete' && (
        <View style={styles.completeContainer}>
          <View style={styles.completeContent}>
            <View style={styles.completeIcon}>
              <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
            </View>
            <Text style={styles.completeTitle}>All Done!</Text>
            <Text style={styles.completeSubtitle}>
              {addedCount} item{addedCount !== 1 ? 's' : ''} added to your{' '}
              {LOCATION_OPTIONS.find((l) => l.value === selectedLocation)?.label.toLowerCase()}
            </Text>
            {skippedCount > 0 && (
              <Text style={styles.skippedText}>
                {skippedCount} item{skippedCount !== 1 ? 's' : ''} skipped
              </Text>
            )}
          </View>

          <View style={styles.completeActions}>
            <TouchableOpacity style={styles.scanAnotherButton} onPress={handleChangeLocation}>
              <Ionicons name="camera" size={20} color="#4CAF50" />
              <Text style={styles.scanAnotherText}>Scan Another Area</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#fff',
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  locationContainer: {
    flex: 1,
    padding: 24,
  },
  locationContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  locationTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  locationSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  locationOptions: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
  },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    gap: 16,
  },
  locationIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationOptionLabel: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 40,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  locationBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  flashButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipsContainer: {
    alignItems: 'center',
    gap: 8,
  },
  tipBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tipText: {
    color: '#fff',
    fontSize: 12,
  },
  photoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 4,
  },
  photoBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  guideText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    alignSelf: 'center',
  },
  captureControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingVertical: 30,
    backgroundColor: '#000',
  },
  galleryButton: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  changeLocationButton: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginBottom: 8,
  },
  previewBadgeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  previewSubtext: {
    color: '#fff',
    fontSize: 14,
  },
  previewActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    backgroundColor: '#000',
  },
  discardButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f44336',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  discardButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f44336',
  },
  addAnotherButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  addAnotherButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  processButton: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
  },
  processButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  processingContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewImage: {
    flex: 1,
    resizeMode: 'contain',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
  },
  processingSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 8,
  },
  reviewContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  retakeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  completeContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
    justifyContent: 'space-between',
  },
  completeContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeIcon: {
    marginBottom: 24,
  },
  completeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  completeSubtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  skippedText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  completeActions: {
    gap: 12,
  },
  scanAnotherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 12,
  },
  scanAnotherText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  doneButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
