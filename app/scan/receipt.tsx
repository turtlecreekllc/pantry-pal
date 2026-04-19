import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePantry } from '../../hooks/usePantry';
import { useHouseholdContext } from '../../context/HouseholdContext';
import { ScanReviewCard } from '../../components/ScanReviewCard';
import { analyzeReceiptImage } from '../../lib/aiScanner';
import { ScannedItem, Location } from '../../lib/types';

type ScanPhase = 'capture' | 'processing' | 'summary' | 'review' | 'complete';

interface ActionHistory {
  type: 'accept' | 'reject';
  item: ScannedItem;
  location: Location;
}

interface DraftSession {
  scannedItems: ScannedItem[];
  itemLocations: Record<string, Location>;
  addedCount: number;
  skippedCount: number;
  timestamp: number;
}

const DRAFT_STORAGE_KEY = '@pantry_pal_receipt_draft';

export default function ReceiptScannerScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const { activeHousehold } = useHouseholdContext();
  const { addItem } = usePantry({ householdId: activeHousehold?.id });

  const [phase, setPhase] = useState<ScanPhase>('capture');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [addedCount, setAddedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [itemLocations, setItemLocations] = useState<Record<string, Location>>({});
  const [actionHistory, setActionHistory] = useState<ActionHistory[]>([]);
  const [hasDraftSession, setHasDraftSession] = useState(false);

  const pendingItems = scannedItems.filter((item) => item.status === 'pending');
  const currentItem = pendingItems[currentIndex];

  // Check for draft session on mount
  useEffect(() => {
    checkForDraftSession();
  }, []);

  // Save draft session whenever state changes during review
  useEffect(() => {
    if (phase === 'review' || phase === 'summary') {
      saveDraftSession();
    }
  }, [scannedItems, itemLocations, addedCount, skippedCount, phase]);

  const checkForDraftSession = async () => {
    try {
      const draftData = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
      if (draftData) {
        const draft: DraftSession = JSON.parse(draftData);
        // Check if draft is less than 24 hours old
        const isRecent = Date.now() - draft.timestamp < 24 * 60 * 60 * 1000;
        if (isRecent && draft.scannedItems.some(item => item.status === 'pending')) {
          setHasDraftSession(true);
          Alert.alert(
            'Resume Previous Scan?',
            'You have an unfinished receipt scan. Would you like to continue where you left off?',
            [
              {
                text: 'Discard',
                style: 'destructive',
                onPress: () => {
                  clearDraftSession();
                  setHasDraftSession(false);
                },
              },
              {
                text: 'Resume',
                onPress: () => loadDraftSession(draft),
              },
            ]
          );
        } else {
          // Clear old or completed draft
          clearDraftSession();
        }
      }
    } catch (error) {
      console.error('Error checking draft session:', error);
    }
  };

  const loadDraftSession = (draft: DraftSession) => {
    setScannedItems(draft.scannedItems);
    setItemLocations(draft.itemLocations);
    setAddedCount(draft.addedCount);
    setSkippedCount(draft.skippedCount);

    const pending = draft.scannedItems.filter(item => item.status === 'pending');
    if (pending.length > 0) {
      setPhase('review');
    } else {
      setPhase('summary');
    }
    setHasDraftSession(false);
  };

  const saveDraftSession = async () => {
    try {
      const draft: DraftSession = {
        scannedItems,
        itemLocations,
        addedCount,
        skippedCount,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch (error) {
      console.error('Error saving draft session:', error);
    }
  };

  const clearDraftSession = async () => {
    try {
      await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing draft session:', error);
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (photo) {
        setCapturedImage(photo.uri);
        processImage(photo.base64 || '');
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

    if (!result.canceled && result.assets[0]) {
      setCapturedImage(result.assets[0].uri);
      processImage(result.assets[0].base64 || '');
    }
  };

  const processImage = async (base64: string) => {
    setPhase('processing');

    try {
      const result = await analyzeReceiptImage(base64);
      setScannedItems(result.items);

      // Initialize locations for all items
      const locations: Record<string, Location> = {};
      result.items.forEach((item) => {
        locations[item.id] = 'pantry';
      });
      setItemLocations(locations);

      if (result.items.length > 0) {
        setPhase('summary');
      } else {
        Alert.alert(
          'No Items Found',
          'Could not detect any items in this receipt. Please try again with a clearer image.',
          [{ text: 'OK', onPress: () => setPhase('capture') }]
        );
      }
    } catch (error) {
      console.error('Error processing image:', error);
      Alert.alert('Error', 'Failed to analyze the receipt. Please try again.', [
        { text: 'OK', onPress: () => setPhase('capture') },
      ]);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setScannedItems([]);
    setCurrentIndex(0);
    setAddedCount(0);
    setSkippedCount(0);
    setActionHistory([]);
    setItemLocations({});
    clearDraftSession();
    setPhase('capture');
  };

  const handleAccept = async (item: ScannedItem) => {
    try {
      // Round quantity to integer since database expects integer type
      const quantity = typeof item.quantity === 'number' && !isNaN(item.quantity)
        ? Math.round(item.quantity)
        : 1;
      await addItem({
        name: item.name,
        quantity,
        unit: item.unit,
        brand: item.brand || null,
        category: item.category || null,
        location: itemLocations[item.id] || 'pantry',
        barcode: null,
        expiration_date: item.expirationDate || null,
        image_url: null,
        nutrition_json: null,
        location_notes: null,
        original_quantity: quantity,
        usage_history: null,
        fill_level: null,
      });

      // Track action for undo
      setActionHistory((prev) => [
        ...prev,
        {
          type: 'accept',
          item: { ...item },
          location: itemLocations[item.id] || 'pantry',
        },
      ]);

      setAddedCount((prev) => prev + 1);
      moveToNextItem(item.id, 'accepted');
    } catch (error) {
      console.error('Error adding item:', error);
      Alert.alert('Error', 'Failed to add item to pantry.');
    }
  };

  const handleReject = (item: ScannedItem) => {
    // Track action for undo
    setActionHistory((prev) => [
      ...prev,
      {
        type: 'reject',
        item: { ...item },
        location: itemLocations[item.id] || 'pantry',
      },
    ]);

    setSkippedCount((prev) => prev + 1);
    moveToNextItem(item.id, 'rejected');
  };

  const handleUndo = () => {
    if (actionHistory.length === 0) return;

    const lastAction = actionHistory[actionHistory.length - 1];

    // Revert the item status back to pending
    setScannedItems((prev) =>
      prev.map((item) =>
        item.id === lastAction.item.id ? { ...item, status: 'pending' } : item
      )
    );

    // Revert counters
    if (lastAction.type === 'accept') {
      setAddedCount((prev) => prev - 1);
    } else {
      setSkippedCount((prev) => prev - 1);
    }

    // Remove from history
    setActionHistory((prev) => prev.slice(0, -1));

    // Navigate back to the undone item
    const pendingAfterUndo = scannedItems.filter(
      (item) => item.status === 'pending' || item.id === lastAction.item.id
    );
    const undoneIndex = pendingAfterUndo.findIndex((item) => item.id === lastAction.item.id);
    if (undoneIndex !== -1) {
      setCurrentIndex(undoneIndex);
    }
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
    clearDraftSession();
    router.back();
  };

  const handleStartReview = () => {
    setPhase('review');
  };

  const handleAcceptAllHighConfidence = async () => {
    const highConfidenceItems = scannedItems.filter(
      (item) => item.status === 'pending' && item.confidence >= 0.9
    );

    if (highConfidenceItems.length === 0) return;

    try {
      for (const item of highConfidenceItems) {
        await addItem({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          brand: item.brand || null,
          category: item.category || null,
          location: itemLocations[item.id] || 'pantry',
          barcode: null,
          expiration_date: item.expirationDate || null,
          image_url: null,
          nutrition_json: null,
          location_notes: null,
          original_quantity: item.quantity,
          usage_history: null,
          fill_level: null,
        });

        // Track action for undo
        setActionHistory((prev) => [
          ...prev,
          {
            type: 'accept',
            item: { ...item },
            location: itemLocations[item.id] || 'pantry',
          },
        ]);

        setAddedCount((prev) => prev + 1);
      }

      // Mark all high confidence items as accepted
      setScannedItems((prev) =>
        prev.map((item) =>
          highConfidenceItems.some((hci) => hci.id === item.id)
            ? { ...item, status: 'accepted' as const }
            : item
        )
      );

      // Check if there are remaining items to review
      const remainingPending = scannedItems.filter(
        (item) =>
          item.status === 'pending' &&
          !highConfidenceItems.some((hci) => hci.id === item.id)
      );

      if (remainingPending.length > 0) {
        setPhase('review');
      } else {
        setPhase('complete');
      }
    } catch (error) {
      console.error('Error bulk accepting items:', error);
      Alert.alert('Error', 'Failed to add some items to pantry.');
    }
  };

  const getConfidenceBreakdown = () => {
    const high = scannedItems.filter((item) => item.confidence >= 0.9).length;
    const medium = scannedItems.filter(
      (item) => item.confidence >= 0.7 && item.confidence < 0.9
    ).length;
    const low = scannedItems.filter((item) => item.confidence < 0.7).length;
    return { high, medium, low };
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Receipt Scanner' }} />
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color="#ccc" />
          <Text style={styles.permissionText}>
            Camera access is required to scan receipts
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
          title: 'Receipt Scanner',
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

      {phase === 'capture' && (
        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back">
            <View style={styles.cameraOverlay}>
              <View style={styles.receiptGuide}>
                <View style={styles.cornerTL} />
                <View style={styles.cornerTR} />
                <View style={styles.cornerBL} />
                <View style={styles.cornerBR} />
              </View>
              <Text style={styles.guideText}>
                Position your receipt within the frame
              </Text>
            </View>
          </CameraView>

          <View style={styles.captureControls}>
            <TouchableOpacity style={styles.galleryButton} onPress={handlePickImage}>
              <Ionicons name="images" size={28} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>

            <View style={styles.placeholderButton} />
          </View>
        </View>
      )}

      {phase === 'processing' && (
        <View style={styles.processingContainer}>
          {capturedImage && (
            <Image source={{ uri: capturedImage }} style={styles.previewImage} />
          )}
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.processingText}>Analyzing receipt...</Text>
            <Text style={styles.processingSubtext}>
              Extracting product information
            </Text>
          </View>
        </View>
      )}

      {phase === 'summary' && (
        <View style={styles.summaryContainer}>
          <ScrollView contentContainerStyle={styles.summaryContent}>
            <View style={styles.summaryHeader}>
              <Ionicons name="receipt-outline" size={64} color="#4CAF50" />
              <Text style={styles.summaryTitle}>Found {scannedItems.length} Items</Text>
              <Text style={styles.summarySubtitle}>Review the confidence breakdown below</Text>
            </View>

            <View style={styles.confidenceBreakdown}>
              <View style={styles.confidenceCard}>
                <View style={styles.confidenceCardHeader}>
                  <View style={[styles.confidenceDotLarge, { backgroundColor: '#4CAF50' }]} />
                  <Text style={styles.confidenceCardTitle}>High Confidence</Text>
                </View>
                <Text style={styles.confidenceCardCount}>{getConfidenceBreakdown().high}</Text>
                <Text style={styles.confidenceCardLabel}>90% - 100%</Text>
              </View>

              <View style={styles.confidenceCard}>
                <View style={styles.confidenceCardHeader}>
                  <View style={[styles.confidenceDotLarge, { backgroundColor: '#FFC107' }]} />
                  <Text style={styles.confidenceCardTitle}>Medium Confidence</Text>
                </View>
                <Text style={styles.confidenceCardCount}>{getConfidenceBreakdown().medium}</Text>
                <Text style={styles.confidenceCardLabel}>70% - 89%</Text>
              </View>

              <View style={styles.confidenceCard}>
                <View style={styles.confidenceCardHeader}>
                  <View style={[styles.confidenceDotLarge, { backgroundColor: '#f44336' }]} />
                  <Text style={styles.confidenceCardTitle}>Low Confidence</Text>
                </View>
                <Text style={styles.confidenceCardCount}>{getConfidenceBreakdown().low}</Text>
                <Text style={styles.confidenceCardLabel}>Below 70%</Text>
              </View>
            </View>

            {getConfidenceBreakdown().high > 0 && (
              <View style={styles.bulkActionInfo}>
                <Ionicons name="information-circle-outline" size={20} color="#666" />
                <Text style={styles.bulkActionText}>
                  You can quickly accept all high confidence items or review them individually
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.summaryActions}>
            {getConfidenceBreakdown().high > 0 && (
              <TouchableOpacity
                style={styles.bulkAcceptButton}
                onPress={handleAcceptAllHighConfidence}
              >
                <Ionicons name="checkmark-done" size={20} color="#fff" />
                <Text style={styles.bulkAcceptText}>
                  Accept All High Confidence ({getConfidenceBreakdown().high})
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.reviewButton} onPress={handleStartReview}>
              <Text style={styles.reviewButtonText}>Review Items Individually</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.retakeButtonSummary} onPress={handleRetake}>
              <Ionicons name="camera" size={18} color="#666" />
              <Text style={styles.retakeTextSummary}>Scan Again</Text>
            </TouchableOpacity>
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
            location={itemLocations[currentItem.id] || 'pantry'}
            onLocationChange={handleLocationChange}
          />

          <View style={styles.reviewActions}>
            {actionHistory.length > 0 && (
              <TouchableOpacity style={styles.undoButton} onPress={handleUndo}>
                <Ionicons name="arrow-undo" size={18} color="#4CAF50" />
                <Text style={styles.undoText}>Undo Last Action</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
              <Ionicons name="camera" size={18} color="#666" />
              <Text style={styles.retakeText}>Scan Another Receipt</Text>
            </TouchableOpacity>
          </View>
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
              {addedCount} item{addedCount !== 1 ? 's' : ''} added to your pantry
            </Text>
            {skippedCount > 0 && (
              <Text style={styles.skippedText}>
                {skippedCount} item{skippedCount !== 1 ? 's' : ''} skipped
              </Text>
            )}
          </View>

          <View style={styles.completeActions}>
            <TouchableOpacity style={styles.scanAnotherButton} onPress={handleRetake}>
              <Ionicons name="camera" size={20} color="#4CAF50" />
              <Text style={styles.scanAnotherText}>Scan Another Receipt</Text>
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
    backgroundColor: '#000',
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
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  receiptGuide: {
    width: '85%',
    height: '70%',
    position: 'relative',
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#fff',
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#fff',
    borderTopRightRadius: 8,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#fff',
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#fff',
    borderBottomRightRadius: 8,
  },
  guideText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 24,
    textAlign: 'center',
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
  placeholderButton: {
    width: 50,
    height: 50,
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
  summaryContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  summaryContent: {
    padding: 24,
    gap: 24,
  },
  summaryHeader: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  summaryTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
  },
  summarySubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  confidenceBreakdown: {
    gap: 12,
  },
  confidenceCard: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
  },
  confidenceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  confidenceDotLarge: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  confidenceCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  confidenceCardCount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  confidenceCardLabel: {
    fontSize: 14,
    color: '#666',
  },
  bulkActionInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
  },
  bulkActionText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  summaryActions: {
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  bulkAcceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
  },
  bulkAcceptText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  reviewButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  reviewButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  retakeButtonSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  retakeTextSummary: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  reviewActions: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  undoText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
});
