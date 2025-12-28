import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { importFromText } from '../../lib/recipeImporter';

export default function ImportTextScreen() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    if (!text.trim()) {
      Alert.alert('Error', 'Please enter some recipe text');
      return;
    }

    if (text.trim().length < 20) {
      Alert.alert('Error', 'Please provide more recipe content to import');
      return;
    }

    Keyboard.dismiss();
    setLoading(true);

    try {
      const result = await importFromText(text.trim());

      if (!result.success || !result.recipe) {
        Alert.alert('Import Failed', result.error || 'Failed to extract recipe from text');
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

  const charCount = text.length;
  const minChars = 20;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inputSection}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Recipe Text</Text>
            <Text style={[styles.charCount, charCount < minChars && styles.charCountWarning]}>
              {charCount} characters
            </Text>
          </View>
          <TextInput
            style={styles.textInput}
            placeholder="Paste your recipe here...

Example:
Chocolate Chip Cookies

Ingredients:
- 2 cups flour
- 1 cup butter
- 1 cup chocolate chips
...

Instructions:
1. Preheat oven to 350°F
2. Mix ingredients
..."
            placeholderTextColor="#999"
            value={text}
            onChangeText={setText}
            multiline
            textAlignVertical="top"
            editable={!loading}
          />
        </View>

        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>Tips for best results:</Text>
          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.tipText}>Include ingredient quantities</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.tipText}>List cooking steps in order</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.tipText}>Include cooking times if known</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.tipText}>Mention serving size</Text>
            </View>
          </View>
        </View>

        <View style={styles.examplesSection}>
          <Text style={styles.examplesTitle}>This works great for:</Text>
          <Text style={styles.exampleItem}>• Recipes copied from Instagram captions</Text>
          <Text style={styles.exampleItem}>• Text from messages or notes</Text>
          <Text style={styles.exampleItem}>• Recipes shared in group chats</Text>
          <Text style={styles.exampleItem}>• Email recipes from friends and family</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.importButton,
            (text.trim().length < minChars || loading) && styles.importButtonDisabled,
          ]}
          onPress={handleImport}
          disabled={text.trim().length < minChars || loading}
        >
          {loading ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.importButtonText}>Extracting Recipe...</Text>
            </>
          ) : (
            <>
              <Ionicons name="sparkles" size={20} color="#fff" />
              <Text style={styles.importButtonText}>Extract Recipe with AI</Text>
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
  },
  charCountWarning: {
    color: '#FF9800',
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 16,
    fontSize: 15,
    color: '#333',
    minHeight: 200,
    lineHeight: 22,
  },
  tipsSection: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 12,
  },
  tipsList: {
    gap: 8,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#333',
  },
  examplesSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  examplesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  exampleItem: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
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
