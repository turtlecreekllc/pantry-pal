import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  importFromUrl,
  importFromPhoto,
  detectPlatform,
  getPlatformDisplayName,
  getPlatformIcon,
} from '../lib/recipeImporter';
import { ImportPlatform } from '../lib/types';
import * as FileSystem from 'expo-file-system/legacy';

type ProcessingState = 'detecting' | 'extracting' | 'success' | 'error' | 'not_recipe';

interface ShareReceiverParams {
  url?: string;
  text?: string;
  imageUri?: string;
  platform?: string;
  isRecipeUrl?: string;
  error?: string;
}

export default function ShareReceiverScreen() {
  const router = useRouter();
  const params = useLocalSearchParams() as ShareReceiverParams;
  const [state, setState] = useState<ProcessingState>('detecting');
  const [platform, setPlatform] = useState<ImportPlatform>('web');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pulseAnim] = useState(new Animated.Value(1));
  
  // Check for pre-set error from share intent handler
  useEffect(() => {
    if (params.error) {
      setState('error');
      setErrorMessage(params.error);
    }
  }, [params.error]);

  // Pulse animation for loading state
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  /**
   * Process the shared content
   */
  const processSharedContent = useCallback(async () => {
    const { url, imageUri, error } = params;
    
    // Skip processing if there's already an error from the share handler
    if (error) {
      return;
    }
    
    try {
      // Handle URL shares
      if (url) {
        const detectedPlatform = detectPlatform(url);
        setPlatform(detectedPlatform);
        setState('extracting');
        const result = await importFromUrl(url);
        if (!result.success || !result.recipe) {
          setState('error');
          setErrorMessage(result.error || 'Could not extract recipe from this URL');
          return;
        }
        setState('success');
        // Short delay to show success state
        setTimeout(() => {
          router.replace({
            pathname: '/import/review',
            params: {
              recipe: JSON.stringify(result.recipe),
              confidence: result.confidence.toString(),
              platform: result.platform,
              warnings: JSON.stringify(result.warnings || []),
            },
          });
        }, 500);
        return;
      }
      // Handle image shares
      if (imageUri) {
        setPlatform('photo');
        setState('extracting');
        // Read image as base64
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const result = await importFromPhoto(base64);
        if (!result.success || !result.recipe) {
          setState('error');
          setErrorMessage(result.error || 'Could not extract recipe from this image');
          return;
        }
        // Add the original image to the recipe
        result.recipe.image_url = imageUri;
        setState('success');
        setTimeout(() => {
          router.replace({
            pathname: '/import/review',
            params: {
              recipe: JSON.stringify(result.recipe),
              confidence: result.confidence.toString(),
              platform: result.platform,
              warnings: JSON.stringify(result.warnings || []),
            },
          });
        }, 500);
        return;
      }
      // No valid content
      setState('not_recipe');
      setErrorMessage('No recipe URL or image found in shared content');
    } catch (error) {
      console.error('Error processing shared content:', error);
      setState('error');
      setErrorMessage((error as Error).message || 'Failed to process shared content');
    }
  }, [params, router]);

  useEffect(() => {
    processSharedContent();
  }, [processSharedContent]);

  const handleRetry = () => {
    setState('detecting');
    setErrorMessage(null);
    processSharedContent();
  };

  const handleCancel = () => {
    router.back();
  };

  const handleManualImport = () => {
    // Navigate to manual import with the URL pre-filled
    router.replace({
      pathname: '/import/url',
      params: { sharedUrl: params.url || '' },
    });
  };

  const renderContent = () => {
    switch (state) {
      case 'detecting':
        return (
          <>
            <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
              <Ionicons name="search" size={48} color="#4CAF50" />
            </Animated.View>
            <Text style={styles.title}>Detecting Content</Text>
            <Text style={styles.subtitle}>Analyzing shared link...</Text>
          </>
        );
      case 'extracting':
        return (
          <>
            <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.platformIcon}>
                <Ionicons
                  name={getPlatformIcon(platform) as any}
                  size={32}
                  color="#fff"
                />
              </View>
            </Animated.View>
            <Text style={styles.title}>Extracting Recipe</Text>
            <Text style={styles.subtitle}>
              Importing from {getPlatformDisplayName(platform)}...
            </Text>
            <View style={styles.progressContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
            </View>
            <Text style={styles.tipText}>
              This may take a few seconds depending on the page content
            </Text>
          </>
        );
      case 'success':
        return (
          <>
            <View style={[styles.iconContainer, styles.successIcon]}>
              <Ionicons name="checkmark" size={48} color="#fff" />
            </View>
            <Text style={styles.title}>Recipe Found!</Text>
            <Text style={styles.subtitle}>Opening recipe editor...</Text>
          </>
        );
      case 'error':
        return (
          <>
            <View style={[styles.iconContainer, styles.errorIcon]}>
              <Ionicons name="alert-circle" size={48} color="#fff" />
            </View>
            <Text style={styles.title}>Import Failed</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <View style={styles.buttonGroup}>
              <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                <Ionicons name="refresh" size={20} color="#4CAF50" />
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.manualButton} onPress={handleManualImport}>
                <Ionicons name="create-outline" size={20} color="#fff" />
                <Text style={styles.manualButtonText}>Import Manually</Text>
              </TouchableOpacity>
            </View>
          </>
        );
      case 'not_recipe':
        return (
          <>
            <View style={[styles.iconContainer, styles.warningIcon]}>
              <Ionicons name="help-circle" size={48} color="#fff" />
            </View>
            <Text style={styles.title}>Not a Recipe?</Text>
            <Text style={styles.subtitle}>
              We couldn't detect a recipe in this content.
            </Text>
            <View style={styles.buttonGroup}>
              <TouchableOpacity style={styles.manualButton} onPress={handleManualImport}>
                <Ionicons name="create-outline" size={20} color="#fff" />
                <Text style={styles.manualButtonText}>Try Manual Import</Text>
              </TouchableOpacity>
            </View>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Import Recipe',
          headerLeft: () => (
            <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.content}>
        {params.url && state !== 'success' && (
          <View style={styles.urlPreview}>
            <Ionicons name="link" size={16} color="#999" />
            <Text style={styles.urlText} numberOfLines={1}>
              {params.url}
            </Text>
          </View>
        )}
        <View style={styles.centerContent}>{renderContent()}</View>
        {state !== 'success' && (
          <TouchableOpacity style={styles.cancelLink} onPress={handleCancel}>
            <Text style={styles.cancelLinkText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  urlPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  urlText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  platformIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    backgroundColor: '#4CAF50',
  },
  errorIcon: {
    backgroundColor: '#f44336',
  },
  warningIcon: {
    backgroundColor: '#FF9800',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  progressContainer: {
    marginVertical: 24,
  },
  tipText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  buttonGroup: {
    gap: 12,
    width: '100%',
    maxWidth: 300,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
    backgroundColor: '#fff',
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
  },
  manualButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cancelLink: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  cancelLinkText: {
    fontSize: 15,
    color: '#999',
  },
});

