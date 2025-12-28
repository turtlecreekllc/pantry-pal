import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Keyboard,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  importFromUrl,
  detectPlatform,
  isValidUrl,
  getPlatformDisplayName,
  getPlatformIcon,
} from '../../lib/recipeImporter';
import { ImportPlatform } from '../../lib/types';

export default function ImportUrlScreen() {
  const router = useRouter();
  const { sharedUrl } = useLocalSearchParams<{ sharedUrl?: string }>();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [detectedPlatform, setDetectedPlatform] = useState<ImportPlatform | null>(null);

  // Pre-fill URL if shared from another app
  useEffect(() => {
    if (sharedUrl) {
      handleUrlChange(sharedUrl);
    }
  }, [sharedUrl]);

  const handleUrlChange = (text: string) => {
    setUrl(text);
    if (isValidUrl(text)) {
      setDetectedPlatform(detectPlatform(text));
    } else {
      setDetectedPlatform(null);
    }
  };

  const handleImport = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a URL');
      return;
    }

    if (!isValidUrl(url.trim())) {
      Alert.alert('Error', 'Please enter a valid URL');
      return;
    }

    Keyboard.dismiss();
    setLoading(true);

    try {
      const result = await importFromUrl(url.trim());

      if (!result.success || !result.recipe) {
        Alert.alert('Import Failed', result.error || 'Failed to extract recipe from URL');
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

  const handlePaste = async () => {
    try {
      // Note: Clipboard API requires expo-clipboard
      // For now, we'll just focus the input
      Alert.alert('Tip', 'Long-press in the text field to paste from clipboard');
    } catch (error) {
      console.error('Paste error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inputSection}>
          <Text style={styles.label}>Recipe URL</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="link-outline" size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="https://..."
              placeholderTextColor="#999"
              value={url}
              onChangeText={handleUrlChange}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              onSubmitEditing={handleImport}
              editable={!loading}
            />
            {url.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setUrl('');
                  setDetectedPlatform(null);
                }}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          {detectedPlatform && (
            <View style={styles.platformBadge}>
              <Ionicons
                name={getPlatformIcon(detectedPlatform) as any}
                size={16}
                color="#4CAF50"
              />
              <Text style={styles.platformText}>
                Detected: {getPlatformDisplayName(detectedPlatform)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.examplesSection}>
          <Text style={styles.examplesTitle}>Supported URL formats:</Text>
          <View style={styles.examplesList}>
            <Text style={styles.exampleItem}>• Any recipe website (AllRecipes, Food Network, etc.)</Text>
            <Text style={styles.exampleItem}>• Instagram posts and reels</Text>
            <Text style={styles.exampleItem}>• TikTok videos</Text>
            <Text style={styles.exampleItem}>• YouTube cooking videos</Text>
            <Text style={styles.exampleItem}>• Pinterest pins</Text>
            <Text style={styles.exampleItem}>• Food blogs</Text>
          </View>
        </View>

        <View style={styles.tipsSection}>
          <View style={styles.tipItem}>
            <Ionicons name="bulb-outline" size={20} color="#FF9800" />
            <Text style={styles.tipText}>
              For best results, use the direct link to the recipe page rather than a shortened URL
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.importButton, (!url.trim() || loading) && styles.importButtonDisabled]}
          onPress={handleImport}
          disabled={!url.trim() || loading}
        >
          {loading ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.importButtonText}>Extracting Recipe...</Text>
            </>
          ) : (
            <>
              <Ionicons name="download-outline" size={20} color="#fff" />
              <Text style={styles.importButtonText}>Import Recipe</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  inputSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  platformText: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '500',
  },
  examplesSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  examplesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  examplesList: {
    gap: 6,
  },
  exampleItem: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  tipsSection: {
    gap: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
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
