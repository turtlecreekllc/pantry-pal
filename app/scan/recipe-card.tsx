import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { analyzeRecipeCard } from '../../lib/aiScanner';
import { ImportedRecipe, RecipeCardScanResult } from '../../lib/types';
import { RecipeReviewCard } from '../../components/RecipeReviewCard';
import { useSavedRecipes } from '../../hooks/useSavedRecipes';

type ScanPhase = 'capture' | 'preview' | 'processing' | 'review' | 'complete';

interface CapturedPhoto {
  uri: string;
}

export default function RecipeCardScannerScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const { saveRecipe } = useSavedRecipes();

  const [phase, setPhase] = useState<ScanPhase>('capture');
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [scannedRecipes, setScannedRecipes] = useState<RecipeCardScanResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [enableTorch, setEnableTorch] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  const currentRecipe = scannedRecipes[currentIndex];

  const handleCapture = async () => {
    if (!cameraRef.current) return;

    try {
      // Don't request base64 to save memory
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
      });

      if (photo) {
        const newPhoto = { uri: photo.uri };
        setCapturedPhotos((prev) => [...prev, newPhoto]);
        
        if (!batchMode) {
          setPhase('preview');
        } else {
          // In batch mode, stay in capture but show count
        }
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
      allowsMultipleSelection: batchMode,
    });

    if (!result.canceled) {
      const newPhotos = result.assets.map(asset => ({ uri: asset.uri }));
      setCapturedPhotos(prev => [...prev, ...newPhotos]);
      setPhase('preview');
    }
  };

  const handleProcessPhotos = async () => {
    setPhase('processing');
    setProcessedCount(0);
    const results: RecipeCardScanResult[] = [];

    try {
      for (const photo of capturedPhotos) {
        // Read file as base64 on demand
        const base64 = await FileSystem.readAsStringAsync(photo.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        try {
          const result = await analyzeRecipeCard(base64);
          result.originalImage = photo.uri;
          result.recipe.image_url = photo.uri;
          results.push(result);
        } catch (err) {
            console.error('Failed to analyze photo', err);
            // Add a fallback result for manual entry
            results.push({
                recipe: {
                    title: 'Manual Entry Required',
                    image_url: photo.uri,
                    source_platform: 'recipe_card',
                },
                confidence: 0,
                originalImage: photo.uri,
            });
        }
        setProcessedCount((prev) => prev + 1);
      }

      setScannedRecipes(results);
      if (results.length > 0) {
        setPhase('review');
      } else {
        Alert.alert('Error', 'Could not process any recipes.');
        setPhase('capture');
      }
    } catch (error) {
      console.error('Error processing recipes:', error);
      Alert.alert('Error', 'Failed to analyze recipes. Please try again.');
      setPhase('capture');
    }
  };

  const handleSaveRecipe = async (editedRecipe: Partial<ImportedRecipe>) => {
    try {
      // Create a full ExtendedRecipe object from the partial data
      const recipeToSave: any = {
        id: generateId(),
        name: editedRecipe.title || 'Untitled Recipe',
        category: editedRecipe.category || 'Other',
        area: editedRecipe.cuisine || 'Unknown',
        instructions: editedRecipe.instructions || '',
        thumbnail: editedRecipe.image_url || '',
        youtubeUrl: null,
        ingredients: editedRecipe.ingredients || [],
        source: 'imported',
        // Extended fields
        recipeSource: 'imported',
        readyInMinutes: (editedRecipe.prep_time || 0) + (editedRecipe.cook_time || 0),
        servings: editedRecipe.servings || 4,
        diets: editedRecipe.diets || [],
        nutrition: editedRecipe.nutrition || undefined,
        import_metadata: editedRecipe.import_metadata || {},
      };

      await saveRecipe(recipeToSave, 'imported');
      setSavedCount(prev => prev + 1);
      
      if (currentIndex < scannedRecipes.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setPhase('complete');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save recipe.');
    }
  };

  const handleDiscardRecipe = () => {
    if (currentIndex < scannedRecipes.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setPhase('complete');
    }
  };

  const handleExportPDF = async () => {
    try {
      // Simple HTML generation for the PDF
      // In a real app, we would fetch the saved recipes from DB or use the scanned results that were saved.
      // Here we assume the user wants to export the recipes they just scanned (even if some fields changed on save, 
      // we only have access to the ones they 'reviewed'. Ideally we'd pass the saved objects, but for now 
      // we'll use a generic success message or try to construct it).
      
      // Since we didn't store the *final* saved versions in state (only sent to DB), 
      // we'll export a summary of what was digitized.
      
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 40px; }
              h1 { color: #4CAF50; text-align: center; }
              .recipe { margin-bottom: 40px; page-break-inside: avoid; border: 1px solid #ddd; padding: 20px; border-radius: 8px; }
              .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
              .meta { color: #666; font-style: italic; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <h1>Family Recipes</h1>
            <p style="text-align: center; color: #666;">Digitized on ${new Date().toLocaleDateString()}</p>
            <hr />
            
            ${scannedRecipes.map(r => `
              <div class="recipe">
                <div class="title">${r.recipe.title || 'Untitled'}</div>
                <div class="meta">
                   ${r.recipe.cuisine || ''} • ${r.recipe.category || ''}
                   ${r.recipe.import_metadata?.attribution ? `• From ${r.recipe.import_metadata.attribution}` : ''}
                </div>
                <p>${r.recipe.description || ''}</p>
                <h3>Ingredients</h3>
                <ul>
                  ${(r.recipe.ingredients || []).map(i => `<li>${i.measure} ${i.ingredient}</li>`).join('')}
                </ul>
                <h3>Instructions</h3>
                <p style="white-space: pre-line;">${r.recipe.instructions || ''}</p>
              </div>
            `).join('')}
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF.');
    }
  };

  const handleDone = () => {
    router.back();
  };

  const generateId = () => Math.random().toString(36).substring(2, 15);

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Camera access required for scanning.</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={phase === 'capture' ? '#fff' : '#333'} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: phase === 'capture' ? '#fff' : '#333' }]}>
          {phase === 'capture' ? 'Scan Recipe Card' : 
           phase === 'review' ? `Review (${currentIndex + 1}/${scannedRecipes.length})` : 
           'Recipe Scanner'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {phase === 'capture' && (
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
            enableTorch={enableTorch}
          >
            <View style={styles.overlay}>
              <View style={styles.controls}>
                <TouchableOpacity onPress={() => setEnableTorch(!enableTorch)} style={styles.iconButton}>
                  <Ionicons name={enableTorch ? 'flash' : 'flash-off'} size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setBatchMode(!batchMode)} 
                  style={[styles.batchButton, batchMode && styles.batchButtonActive]}
                >
                  <Ionicons name="layers" size={20} color={batchMode ? '#4CAF50' : '#fff'} />
                  <Text style={[styles.batchText, batchMode && styles.batchTextActive]}>Batch Mode</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.captureArea}>
                <View style={styles.captureFrame} />
                <Text style={styles.instructionText}>
                  Align recipe card within frame
                </Text>
              </View>

              <View style={styles.bottomControls}>
                <TouchableOpacity onPress={handlePickImage} style={styles.galleryButton}>
                  <Ionicons name="images" size={28} color="#fff" />
                </TouchableOpacity>
                
                <TouchableOpacity onPress={handleCapture} style={styles.captureButton}>
                  <View style={styles.captureInner} />
                </TouchableOpacity>

                <View style={styles.counterContainer}>
                  {capturedPhotos.length > 0 && (
                     <TouchableOpacity onPress={() => setPhase('preview')} style={styles.previewButton}>
                       <Text style={styles.counterText}>{capturedPhotos.length}</Text>
                       <Ionicons name="arrow-forward" size={20} color="#fff" />
                     </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </CameraView>
        </View>
      )}

      {phase === 'preview' && (
        <View style={styles.previewContainer}>
          <Text style={styles.previewTitle}>
            {capturedPhotos.length} Recipe Card{capturedPhotos.length !== 1 ? 's' : ''} Captured
          </Text>
          <ScrollView horizontal style={styles.photoList}>
            {capturedPhotos.map((photo, index) => (
              <Image key={index} source={{ uri: photo.uri }} style={styles.thumbnail} />
            ))}
          </ScrollView>
          <View style={styles.previewActions}>
            <TouchableOpacity 
              style={styles.secondaryButton} 
              onPress={() => {
                setCapturedPhotos([]);
                setPhase('capture');
              }}
            >
              <Text style={styles.secondaryButtonText}>Retake All</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.secondaryButton} 
              onPress={() => setPhase('capture')}
            >
              <Text style={styles.secondaryButtonText}>Add More</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={handleProcessPhotos}>
              <Text style={styles.primaryButtonText}>Process Cards</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {phase === 'processing' && (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.processingText}>Digitizing Recipes...</Text>
          <Text style={styles.processingSubtext}>
            Processed {processedCount} of {capturedPhotos.length}
          </Text>
        </View>
      )}

      {phase === 'review' && currentRecipe && (
        <View style={styles.reviewContainer}>
          <RecipeReviewCard
            recipe={currentRecipe.recipe}
            confidence={currentRecipe.confidence}
            onSave={handleSaveRecipe}
            onDiscard={handleDiscardRecipe}
          />
        </View>
      )}

      {phase === 'complete' && (
        <View style={styles.completeContainer}>
          <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
          <Text style={styles.completeTitle}>All Done!</Text>
          <Text style={styles.completeSubtitle}>
            {savedCount} recipe{savedCount !== 1 ? 's' : ''} saved to your cookbook.
          </Text>
          
          <TouchableOpacity style={styles.exportButton} onPress={handleExportPDF}>
            <Ionicons name="share-outline" size={20} color="#4CAF50" />
            <Text style={styles.exportButtonText}>Export PDF Cookbook</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.primaryButton} onPress={handleDone}>
            <Text style={styles.primaryButtonText}>View Cookbook</Text>
          </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 10,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconButton: {
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
  },
  batchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  batchButtonActive: {
    backgroundColor: '#fff',
  },
  batchText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  batchTextActive: {
    color: '#4CAF50',
  },
  captureArea: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  captureFrame: {
    width: 280,
    height: 180,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 12,
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  instructionText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  galleryButton: {
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 30,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  counterContainer: {
    width: 50, // Balance the gallery button
    alignItems: 'center',
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  counterText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  permissionText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    justifyContent: 'center',
  },
  previewTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  photoList: {
    flexGrow: 0,
    marginBottom: 20,
  },
  thumbnail: {
    width: 150,
    height: 200,
    borderRadius: 12,
    marginRight: 10,
    resizeMode: 'cover',
  },
  previewActions: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  processingText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  processingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  reviewContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  completeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
  },
  completeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  completeSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
    marginBottom: 16,
  },
  exportButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
});
