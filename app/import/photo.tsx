import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { importFromPhoto } from '../../lib/recipeImporter';

export default function ImportPhotoScreen() {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async (useCamera: boolean) => {
    try {
      // Request permissions
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Camera permission is needed to take photos');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Photo library permission is needed to select images');
          return;
        }
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
          });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const handleImport = async () => {
    if (!selectedImage) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }

    setLoading(true);

    try {
      // Read image as base64
      const base64 = await FileSystem.readAsStringAsync(selectedImage, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const result = await importFromPhoto(base64);

      if (!result.success || !result.recipe) {
        Alert.alert('Import Failed', result.error || 'Failed to extract recipe from photo');
        return;
      }

      // Navigate to review screen with the extracted recipe
      router.push({
        pathname: '/import/review',
        params: {
          recipe: JSON.stringify(result.recipe),
          confidence: result.confidence.toString(),
          platform: result.platform,
          warnings: JSON.stringify(result.warnings || []),
        },
      });
    } catch (error) {
      console.error('Import error:', error);
      Alert.alert('Error', 'Failed to import recipe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        {selectedImage ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: selectedImage }} style={styles.previewImage} resizeMode="contain" />
            <TouchableOpacity
              style={styles.changeButton}
              onPress={() => setSelectedImage(null)}
            >
              <Ionicons name="close-circle" size={24} color="#fff" />
              <Text style={styles.changeButtonText}>Change Photo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.selectContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="camera-outline" size={48} color="#4CAF50" />
            </View>
            <Text style={styles.selectTitle}>Select a Recipe Photo</Text>
            <Text style={styles.selectDescription}>
              Take a photo or choose from your library. Works best with printed recipes,
              cookbook pages, or handwritten recipe cards.
            </Text>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => pickImage(true)}
              >
                <Ionicons name="camera" size={24} color="#fff" />
                <Text style={styles.selectButtonText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.selectButton, styles.selectButtonSecondary]}
                onPress={() => pickImage(false)}
              >
                <Ionicons name="images" size={24} color="#4CAF50" />
                <Text style={[styles.selectButtonText, styles.selectButtonTextSecondary]}>
                  Choose Photo
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>Tips for best OCR results:</Text>
          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <Ionicons name="sunny-outline" size={18} color="#FF9800" />
              <Text style={styles.tipText}>Use good lighting</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="scan-outline" size={18} color="#FF9800" />
              <Text style={styles.tipText}>Keep text in focus</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="crop-outline" size={18} color="#FF9800" />
              <Text style={styles.tipText}>Crop to recipe area</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="contrast-outline" size={18} color="#FF9800" />
              <Text style={styles.tipText}>Avoid shadows on text</Text>
            </View>
          </View>
        </View>
      </View>

      {selectedImage && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.importButton, loading && styles.importButtonDisabled]}
            onPress={handleImport}
            disabled={loading}
          >
            {loading ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.importButtonText}>Reading Recipe...</Text>
              </>
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color="#fff" />
                <Text style={styles.importButtonText}>Extract Recipe with AI</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  selectContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  selectTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  selectDescription: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  selectButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  selectButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  selectButtonTextSecondary: {
    color: '#4CAF50',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    flex: 1,
    width: '100%',
  },
  changeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  changeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  tipsSection: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F57C00',
    marginBottom: 12,
  },
  tipsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '45%',
  },
  tipText: {
    fontSize: 13,
    color: '#666',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
  },
  importButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  importButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
