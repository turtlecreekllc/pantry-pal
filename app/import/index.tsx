import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface ImportOption {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  color: string;
}

const IMPORT_OPTIONS: ImportOption[] = [
  {
    id: 'url',
    title: 'From URL',
    description: 'Paste a link from any recipe website, Instagram, TikTok, YouTube, or Pinterest',
    icon: 'link-outline',
    route: '/import/url',
    color: '#4CAF50',
  },
  {
    id: 'text',
    title: 'From Text',
    description: 'Paste recipe text copied from messages, notes, or social media',
    icon: 'document-text-outline',
    route: '/import/text',
    color: '#2196F3',
  },
  {
    id: 'photo',
    title: 'From Photo',
    description: 'Take a photo or select an image of a printed or handwritten recipe',
    icon: 'camera-outline',
    route: '/import/photo',
    color: '#FF9800',
  },
];

export default function ImportIndexScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <Text style={styles.headerText}>
          Import recipes from anywhere and save them to your collection
        </Text>

        <View style={styles.optionsContainer}>
          {IMPORT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.optionCard}
              onPress={() => router.push(option.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: option.color }]}>
                <Ionicons name={option.icon} size={28} color="#fff" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.supportedPlatforms}>
          <Text style={styles.supportedTitle}>Supported Platforms</Text>
          <View style={styles.platformIcons}>
            <View style={styles.platformItem}>
              <Ionicons name="logo-instagram" size={24} color="#E4405F" />
              <Text style={styles.platformName}>Instagram</Text>
            </View>
            <View style={styles.platformItem}>
              <Ionicons name="musical-notes" size={24} color="#000" />
              <Text style={styles.platformName}>TikTok</Text>
            </View>
            <View style={styles.platformItem}>
              <Ionicons name="logo-youtube" size={24} color="#FF0000" />
              <Text style={styles.platformName}>YouTube</Text>
            </View>
            <View style={styles.platformItem}>
              <Ionicons name="logo-pinterest" size={24} color="#BD081C" />
              <Text style={styles.platformName}>Pinterest</Text>
            </View>
            <View style={styles.platformItem}>
              <Ionicons name="globe-outline" size={24} color="#4CAF50" />
              <Text style={styles.platformName}>Any Website</Text>
            </View>
          </View>
        </View>
      </View>
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
  headerText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  supportedPlatforms: {
    marginTop: 32,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  supportedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  platformIcons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  platformItem: {
    alignItems: 'center',
    gap: 4,
  },
  platformName: {
    fontSize: 11,
    color: '#999',
  },
});
