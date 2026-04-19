import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getAvailableShortcuts,
  presentShortcutUI,
  isSiriShortcutsAvailable,
  suggestAllShortcuts,
} from '../../lib/siriShortcuts';

interface ShortcutCardProps {
  title: string;
  phrase: string;
  description: string;
  onAdd: () => void;
}

/**
 * Individual shortcut card component
 */
function ShortcutCard({ title, phrase, description, onAdd }: ShortcutCardProps): React.ReactElement {
  return (
    <View style={styles.shortcutCard}>
      <View style={styles.shortcutContent}>
        <View style={styles.shortcutHeader}>
          <Ionicons name="mic" size={20} color="#4CAF50" />
          <Text style={styles.shortcutTitle}>{title}</Text>
        </View>
        <Text style={styles.shortcutPhrase}>"{phrase}"</Text>
        <Text style={styles.shortcutDescription}>{description}</Text>
      </View>
      <TouchableOpacity
        style={styles.addButton}
        onPress={onAdd}
        accessibilityLabel={`Add ${title} to Siri`}
        accessibilityRole="button"
      >
        <Ionicons name="add-circle" size={28} color="#4CAF50" />
      </TouchableOpacity>
    </View>
  );
}

/**
 * Siri Settings Screen
 * Allows users to configure and add Siri Shortcuts for Dinner Plans
 */
export default function SiriSettingsScreen(): React.ReactElement {
  const [isLoading, setIsLoading] = useState(false);
  const shortcuts = getAvailableShortcuts();
  const isAvailable = isSiriShortcutsAvailable();

  const handleAddShortcut = async (shortcutKey: string, title: string): Promise<void> => {
    if (!isAvailable) {
      Alert.alert(
        'Not Available',
        'Siri Shortcuts are only available on iOS devices.'
      );
      return;
    }
    setIsLoading(true);
    try {
      const status = await presentShortcutUI(shortcutKey as keyof typeof import('../../lib/siriShortcuts').SHORTCUTS);
      if (status === 'added') {
        Alert.alert('Success', `"${title}" shortcut added to Siri!`);
      } else if (status === 'deleted') {
        Alert.alert('Removed', `"${title}" shortcut removed from Siri.`);
      }
    } catch (error) {
      Alert.alert(
        'Unable to Add',
        'Make sure Siri is enabled in your device settings, then try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestAll = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await suggestAllShortcuts();
      Alert.alert(
        'Shortcuts Suggested',
        'All shortcuts have been suggested to Siri. You can now add them by saying "Hey Siri" and following the prompts.'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to suggest shortcuts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const openSiriSettings = (): void => {
    Linking.openURL('app-settings:');
  };

  if (Platform.OS !== 'ios') {
    return (
      <View style={styles.unsupportedContainer}>
        <Ionicons name="logo-apple" size={64} color="#ccc" />
        <Text style={styles.unsupportedTitle}>iOS Only</Text>
        <Text style={styles.unsupportedText}>
          Siri Shortcuts are only available on iOS devices.
          For Android, check out the Google Assistant integration.
        </Text>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => Alert.alert('Coming Soon', 'Google Assistant integration is being developed.')}
        >
          <Ionicons name="logo-google" size={20} color="#4CAF50" />
          <Text style={styles.linkButtonText}>Google Assistant Setup</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Info */}
      <View style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <Ionicons name="mic-circle" size={32} color="#4CAF50" />
          <Text style={styles.infoTitle}>Siri Shortcuts</Text>
        </View>
        <Text style={styles.infoText}>
          Use your voice to quickly access Dinner Plans features.
          Say "Hey Siri" followed by your custom phrase to trigger each action.
        </Text>
        <TouchableOpacity
          style={styles.settingsLink}
          onPress={openSiriSettings}
        >
          <Ionicons name="settings-outline" size={16} color="#4CAF50" />
          <Text style={styles.settingsLinkText}>Open Siri Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Suggest All Button */}
      <TouchableOpacity
        style={[styles.suggestAllButton, isLoading && styles.buttonDisabled]}
        onPress={handleSuggestAll}
        disabled={isLoading}
        accessibilityLabel="Suggest all shortcuts to Siri"
        accessibilityRole="button"
      >
        <Ionicons name="sparkles" size={20} color="#fff" />
        <Text style={styles.suggestAllText}>Suggest All Shortcuts</Text>
      </TouchableOpacity>

      {/* Shortcuts List */}
      <Text style={styles.sectionTitle}>Available Shortcuts</Text>
      <Text style={styles.sectionSubtitle}>
        Tap the + button to customize and add each shortcut to Siri
      </Text>

      {shortcuts.map((shortcut) => (
        <ShortcutCard
          key={shortcut.key}
          title={shortcut.title}
          phrase={shortcut.phrase}
          description={shortcut.description}
          onAdd={() => handleAddShortcut(shortcut.key, shortcut.title)}
        />
      ))}

      {/* Example Commands */}
      <View style={styles.examplesCard}>
        <Text style={styles.examplesTitle}>Example Commands</Text>
        <View style={styles.exampleRow}>
          <Ionicons name="chevron-forward" size={16} color="#666" />
          <Text style={styles.exampleText}>"Hey Siri, add milk to Dinner Plans"</Text>
        </View>
        <View style={styles.exampleRow}>
          <Ionicons name="chevron-forward" size={16} color="#666" />
          <Text style={styles.exampleText}>"Hey Siri, what's expiring in Dinner Plans"</Text>
        </View>
        <View style={styles.exampleRow}>
          <Ionicons name="chevron-forward" size={16} color="#666" />
          <Text style={styles.exampleText}>"Hey Siri, scan my pantry"</Text>
        </View>
        <View style={styles.exampleRow}>
          <Ionicons name="chevron-forward" size={16} color="#666" />
          <Text style={styles.exampleText}>"Hey Siri, what can I make for dinner"</Text>
        </View>
      </View>

      {/* Bottom padding */}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  settingsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  settingsLinkText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  suggestAllButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  suggestAllText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#888',
    marginBottom: 16,
  },
  shortcutCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  shortcutContent: {
    flex: 1,
  },
  shortcutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  shortcutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  shortcutPhrase: {
    fontSize: 14,
    color: '#4CAF50',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  shortcutDescription: {
    fontSize: 13,
    color: '#888',
  },
  addButton: {
    padding: 8,
  },
  examplesCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  examplesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 12,
  },
  exampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 13,
    color: '#333',
    flex: 1,
  },
  bottomPadding: {
    height: 32,
  },
  unsupportedContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  unsupportedTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  unsupportedText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4CAF50',
  },
});

