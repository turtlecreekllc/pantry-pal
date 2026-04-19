import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getGoogleAssistantCommands,
  isGoogleAssistantAvailable,
  openGoogleAssistantSettings,
  openGoogleAssistantInStore,
  getSetupInstructions,
} from '../../lib/googleAssistant';

interface CommandCardProps {
  phrase: string;
  description: string;
  requiresSetup: boolean;
}

/**
 * Individual command card component
 */
function CommandCard({ phrase, description, requiresSetup }: CommandCardProps): React.ReactElement {
  return (
    <View style={styles.commandCard}>
      <View style={styles.commandContent}>
        <View style={styles.commandHeader}>
          <Ionicons name="mic" size={20} color="#4285F4" />
          <Text style={styles.commandPhrase}>{phrase}</Text>
        </View>
        <Text style={styles.commandDescription}>{description}</Text>
        {requiresSetup && (
          <View style={styles.setupBadge}>
            <Ionicons name="construct-outline" size={12} color="#F57C00" />
            <Text style={styles.setupBadgeText}>Requires App Actions setup</Text>
          </View>
        )}
      </View>
    </View>
  );
}

/**
 * Google Assistant Settings Screen
 * Provides information and setup guidance for Google Assistant integration
 */
export default function GoogleAssistantSettingsScreen(): React.ReactElement {
  const commands = getGoogleAssistantCommands();
  const isAvailable = isGoogleAssistantAvailable();

  const handleOpenAssistant = async (): Promise<void> => {
    try {
      await openGoogleAssistantSettings();
    } catch {
      Alert.alert(
        'Unable to Open',
        'Could not open Google Assistant settings. Make sure Google Assistant is installed on your device.'
      );
    }
  };

  const handleGetAssistant = async (): Promise<void> => {
    await openGoogleAssistantInStore();
  };

  const showSetupInstructions = (): void => {
    Alert.alert(
      'App Actions Setup',
      getSetupInstructions(),
      [{ text: 'OK' }]
    );
  };

  if (Platform.OS !== 'android') {
    return (
      <View style={styles.unsupportedContainer}>
        <Ionicons name="logo-google" size={64} color="#ccc" />
        <Text style={styles.unsupportedTitle}>Android Only</Text>
        <Text style={styles.unsupportedText}>
          Google Assistant integration is only available on Android devices.
          For iOS, check out the Siri Shortcuts integration.
        </Text>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => Alert.alert('Tip', 'Go to Settings → Siri Shortcuts to set up voice commands on iOS.')}
        >
          <Ionicons name="logo-apple" size={20} color="#4CAF50" />
          <Text style={styles.linkButtonText}>Siri Shortcuts Setup</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Info */}
      <View style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <View style={styles.googleIcon}>
            <Text style={[styles.googleLetter, { color: '#4285F4' }]}>G</Text>
            <Text style={[styles.googleLetter, { color: '#EA4335' }]}>o</Text>
            <Text style={[styles.googleLetter, { color: '#FBBC05' }]}>o</Text>
            <Text style={[styles.googleLetter, { color: '#4285F4' }]}>g</Text>
            <Text style={[styles.googleLetter, { color: '#34A853' }]}>l</Text>
            <Text style={[styles.googleLetter, { color: '#EA4335' }]}>e</Text>
          </View>
          <Text style={styles.infoTitle}>Assistant</Text>
        </View>
        <Text style={styles.infoText}>
          Use your voice to interact with Dinner Plans through Google Assistant.
          Say "Hey Google" followed by a command to control the app hands-free.
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleOpenAssistant}
          accessibilityLabel="Open Google Assistant settings"
          accessibilityRole="button"
        >
          <Ionicons name="settings-outline" size={20} color="#fff" />
          <Text style={styles.primaryButtonText}>Open Assistant</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleGetAssistant}
          accessibilityLabel="Get Google Assistant from Play Store"
          accessibilityRole="button"
        >
          <Ionicons name="download-outline" size={20} color="#4285F4" />
          <Text style={styles.secondaryButtonText}>Get App</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Start */}
      <View style={styles.quickStartCard}>
        <Text style={styles.quickStartTitle}>Quick Start</Text>
        <Text style={styles.quickStartText}>
          Try saying: <Text style={styles.highlight}>"Hey Google, open Dinner Plans"</Text>
        </Text>
        <Text style={styles.quickStartNote}>
          This works out of the box with no additional setup required!
        </Text>
      </View>

      {/* Voice Commands */}
      <Text style={styles.sectionTitle}>Available Commands</Text>
      <Text style={styles.sectionSubtitle}>
        Voice commands you can use with Google Assistant
      </Text>

      {commands.map((command, index) => (
        <CommandCard
          key={index}
          phrase={command.phrase}
          description={command.description}
          requiresSetup={command.requiresSetup}
        />
      ))}

      {/* App Actions Info */}
      <View style={styles.advancedCard}>
        <View style={styles.advancedHeader}>
          <Ionicons name="code-slash" size={20} color="#666" />
          <Text style={styles.advancedTitle}>Advanced: App Actions</Text>
        </View>
        <Text style={styles.advancedText}>
          Some commands require Google App Actions configuration.
          This allows deeper integration like adding items by name directly through voice.
        </Text>
        <TouchableOpacity
          style={styles.learnMoreButton}
          onPress={showSetupInstructions}
        >
          <Text style={styles.learnMoreText}>View Setup Instructions</Text>
          <Ionicons name="chevron-forward" size={16} color="#4285F4" />
        </TouchableOpacity>
      </View>

      {/* Tips */}
      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>Tips</Text>
        <View style={styles.tipRow}>
          <Ionicons name="bulb-outline" size={16} color="#F57C00" />
          <Text style={styles.tipText}>
            Make sure Google Assistant is enabled in your device settings
          </Text>
        </View>
        <View style={styles.tipRow}>
          <Ionicons name="bulb-outline" size={16} color="#F57C00" />
          <Text style={styles.tipText}>
            Include "Dinner Plans" in your command to direct it to this app
          </Text>
        </View>
        <View style={styles.tipRow}>
          <Ionicons name="bulb-outline" size={16} color="#F57C00" />
          <Text style={styles.tipText}>
            Train Google Assistant by using commands frequently
          </Text>
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
  googleIcon: {
    flexDirection: 'row',
  },
  googleLetter: {
    fontSize: 20,
    fontWeight: '700',
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
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#4285F4',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#4285F4',
  },
  secondaryButtonText: {
    color: '#4285F4',
    fontSize: 14,
    fontWeight: '600',
  },
  quickStartCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  quickStartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1565C0',
    marginBottom: 8,
  },
  quickStartText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  highlight: {
    fontWeight: '600',
    color: '#4285F4',
  },
  quickStartNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
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
  commandCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  commandContent: {
    flex: 1,
  },
  commandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  commandPhrase: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  commandDescription: {
    fontSize: 13,
    color: '#888',
    marginLeft: 28,
  },
  setupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    marginLeft: 28,
  },
  setupBadgeText: {
    fontSize: 11,
    color: '#F57C00',
  },
  advancedCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  advancedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  advancedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  advancedText: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
    marginBottom: 12,
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  learnMoreText: {
    fontSize: 14,
    color: '#4285F4',
    fontWeight: '500',
  },
  tipsCard: {
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
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    color: '#333',
    flex: 1,
    lineHeight: 18,
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

