import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getAvailableShortcuts } from '../../lib/siriShortcuts';

interface HelpSection {
  title: string;
  content: string;
}

const SIRI_HELP_SECTIONS: HelpSection[] = [
  {
    title: 'What are Siri Shortcuts?',
    content:
      'Siri Shortcuts let you use voice commands to quickly access DinnerPlans features. Instead of opening the app and navigating to a screen, just say "Hey Siri" followed by your custom phrase.',
  },
  {
    title: 'How do I set up Siri Shortcuts?',
    content:
      'Go to Settings > Integrations > Siri Shortcuts in DinnerPlans. You can tap the + button next to each shortcut to customize the phrase and add it to Siri. Alternatively, tap "Suggest All Shortcuts" to make them available in the Shortcuts app.',
  },
  {
    title: 'Why aren\'t my shortcuts working?',
    content:
      'Make sure Siri is enabled in your device Settings. Go to Settings > Siri & Search and ensure "Listen for Hey Siri" is turned on. Also verify that DinnerPlans has permission to use Siri.',
  },
  {
    title: 'Can I change the voice command phrases?',
    content:
      'Yes! When you add a shortcut, you can customize the phrase to whatever feels natural to you. Tap the + button next to any shortcut in Settings > Siri to set your own phrase.',
  },
  {
    title: 'Do shortcuts work offline?',
    content:
      'Siri needs to be online to process your voice command, but once the app opens, many features like viewing your pantry work offline.',
  },
];

/**
 * Siri Shortcuts Help Screen
 * Provides guidance on using Siri voice commands with DinnerPlans
 */
export default function SiriHelpScreen(): React.ReactElement {
  const router = useRouter();
  const [expandedSection, setExpandedSection] = useState<number | null>(null);
  const shortcuts = getAvailableShortcuts();

  const toggleSection = (index: number): void => {
    setExpandedSection(expandedSection === index ? null : index);
  };

  const handleGoToSiriSettings = (): void => {
    router.push('/settings/siri');
  };

  const handleOpenDeviceSettings = (): void => {
    Linking.openURL('app-settings:');
  };

  if (Platform.OS !== 'ios') {
    return (
      <View style={styles.unsupportedContainer}>
        <Ionicons name="logo-apple" size={64} color="#ccc" />
        <Text style={styles.unsupportedTitle}>iOS Only Feature</Text>
        <Text style={styles.unsupportedText}>
          Siri Shortcuts are only available on iOS devices. If you're using
          Android, check out Google Assistant for similar voice control features.
        </Text>
        <TouchableOpacity
          style={styles.androidButton}
          onPress={() => router.push('/settings/google-assistant')}
        >
          <Ionicons name="logo-google" size={20} color="#4CAF50" />
          <Text style={styles.androidButtonText}>Google Assistant Help</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero Section */}
      <View style={styles.heroCard}>
        <View style={styles.heroIconContainer}>
          <Ionicons name="mic-circle" size={48} color="#4CAF50" />
        </View>
        <Text style={styles.heroTitle}>Siri Shortcuts Guide</Text>
        <Text style={styles.heroSubtitle}>
          Control DinnerPlans with your voice using Siri
        </Text>
      </View>

      {/* Quick Start */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Start</Text>
        <View style={styles.card}>
          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Enable Siri</Text>
              <Text style={styles.stepDescription}>
                Make sure "Hey Siri" is enabled in your device settings
              </Text>
            </View>
          </View>
          <View style={styles.stepDivider} />
          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Add Shortcuts</Text>
              <Text style={styles.stepDescription}>
                Go to DinnerPlans Settings → Siri and add your shortcuts
              </Text>
            </View>
          </View>
          <View style={styles.stepDivider} />
          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Start Talking</Text>
              <Text style={styles.stepDescription}>
                Say "Hey Siri" followed by your custom phrase
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={styles.setupButton}
          onPress={handleGoToSiriSettings}
          accessibilityRole="button"
          accessibilityLabel="Set up Siri shortcuts"
        >
          <Ionicons name="settings-outline" size={18} color="#fff" />
          <Text style={styles.setupButtonText}>Set Up Shortcuts</Text>
          <Ionicons name="chevron-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Available Commands */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Available Voice Commands</Text>
        <View style={styles.card}>
          {shortcuts.map((shortcut, index) => (
            <View key={shortcut.key}>
              {index > 0 && <View style={styles.commandDivider} />}
              <View style={styles.commandItem}>
                <View style={styles.commandIconContainer}>
                  <Ionicons name="mic" size={16} color="#4CAF50" />
                </View>
                <View style={styles.commandContent}>
                  <Text style={styles.commandTitle}>{shortcut.title}</Text>
                  <Text style={styles.commandPhrase}>"{shortcut.phrase}"</Text>
                  <Text style={styles.commandDescription}>
                    {shortcut.description}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Example Phrases */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Example Phrases</Text>
        <View style={styles.examplesCard}>
          <Text style={styles.exampleIntro}>
            Try saying these to Siri after adding shortcuts:
          </Text>
          <View style={styles.exampleItem}>
            <Ionicons name="chatbubble-ellipses" size={18} color="#2E7D32" />
            <Text style={styles.exampleText}>
              "Hey Siri, add milk to my pantry"
            </Text>
          </View>
          <View style={styles.exampleItem}>
            <Ionicons name="chatbubble-ellipses" size={18} color="#2E7D32" />
            <Text style={styles.exampleText}>
              "Hey Siri, what's expiring soon"
            </Text>
          </View>
          <View style={styles.exampleItem}>
            <Ionicons name="chatbubble-ellipses" size={18} color="#2E7D32" />
            <Text style={styles.exampleText}>
              "Hey Siri, what can I make for dinner"
            </Text>
          </View>
          <View style={styles.exampleItem}>
            <Ionicons name="chatbubble-ellipses" size={18} color="#2E7D32" />
            <Text style={styles.exampleText}>
              "Hey Siri, scan my pantry"
            </Text>
          </View>
          <View style={styles.exampleItem}>
            <Ionicons name="chatbubble-ellipses" size={18} color="#2E7D32" />
            <Text style={styles.exampleText}>
              "Hey Siri, add eggs to my grocery list"
            </Text>
          </View>
        </View>
      </View>

      {/* FAQ Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        <View style={styles.card}>
          {SIRI_HELP_SECTIONS.map((section, index) => (
            <View key={index}>
              {index > 0 && <View style={styles.faqDivider} />}
              <TouchableOpacity
                style={styles.faqItem}
                onPress={() => toggleSection(index)}
                accessibilityRole="button"
                accessibilityState={{ expanded: expandedSection === index }}
              >
                <Text style={styles.faqQuestion}>{section.title}</Text>
                <Ionicons
                  name={expandedSection === index ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
              {expandedSection === index && (
                <View style={styles.faqAnswer}>
                  <Text style={styles.faqAnswerText}>{section.content}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </View>

      {/* Troubleshooting */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Troubleshooting</Text>
        <View style={styles.card}>
          <View style={styles.troubleItem}>
            <Ionicons name="warning-outline" size={20} color="#FFA000" />
            <View style={styles.troubleContent}>
              <Text style={styles.troubleTitle}>Siri doesn't respond</Text>
              <Text style={styles.troubleDescription}>
                Check that "Hey Siri" is enabled in Settings → Siri & Search
              </Text>
            </View>
          </View>
          <View style={styles.troubleDivider} />
          <View style={styles.troubleItem}>
            <Ionicons name="warning-outline" size={20} color="#FFA000" />
            <View style={styles.troubleContent}>
              <Text style={styles.troubleTitle}>Shortcut not found</Text>
              <Text style={styles.troubleDescription}>
                Re-add the shortcut in DinnerPlans Settings → Siri
              </Text>
            </View>
          </View>
          <View style={styles.troubleDivider} />
          <View style={styles.troubleItem}>
            <Ionicons name="warning-outline" size={20} color="#FFA000" />
            <View style={styles.troubleContent}>
              <Text style={styles.troubleTitle}>App doesn't open correctly</Text>
              <Text style={styles.troubleDescription}>
                Try deleting and re-adding the shortcut with a new phrase
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={styles.deviceSettingsButton}
          onPress={handleOpenDeviceSettings}
        >
          <Ionicons name="phone-portrait-outline" size={18} color="#4CAF50" />
          <Text style={styles.deviceSettingsText}>Open Device Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Tips */}
      <View style={styles.tipsCard}>
        <View style={styles.tipsHeader}>
          <Ionicons name="bulb" size={20} color="#FFA000" />
          <Text style={styles.tipsTitle}>Pro Tips</Text>
        </View>
        <View style={styles.tipItem}>
          <Text style={styles.tipBullet}>•</Text>
          <Text style={styles.tipText}>
            Use short, memorable phrases for your shortcuts
          </Text>
        </View>
        <View style={styles.tipItem}>
          <Text style={styles.tipBullet}>•</Text>
          <Text style={styles.tipText}>
            Add shortcuts you use most often first
          </Text>
        </View>
        <View style={styles.tipItem}>
          <Text style={styles.tipBullet}>•</Text>
          <Text style={styles.tipText}>
            Siri learns your voice over time for better accuracy
          </Text>
        </View>
        <View style={styles.tipItem}>
          <Text style={styles.tipBullet}>•</Text>
          <Text style={styles.tipText}>
            Shortcuts work with AirPods and HomePod too!
          </Text>
        </View>
      </View>

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
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  heroIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
  },
  stepDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 56,
  },
  setupButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  setupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  commandItem: {
    flexDirection: 'row',
    padding: 16,
  },
  commandIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  commandContent: {
    flex: 1,
  },
  commandTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  commandPhrase: {
    fontSize: 14,
    color: '#4CAF50',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  commandDescription: {
    fontSize: 13,
    color: '#888',
  },
  commandDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 60,
  },
  examplesCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
  },
  exampleIntro: {
    fontSize: 14,
    color: '#2E7D32',
    marginBottom: 12,
    fontWeight: '500',
  },
  exampleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  exampleText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  faqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginRight: 12,
  },
  faqDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  faqAnswerText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  troubleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 12,
  },
  troubleContent: {
    flex: 1,
  },
  troubleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  troubleDescription: {
    fontSize: 14,
    color: '#666',
  },
  troubleDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 48,
  },
  deviceSettingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 12,
  },
  deviceSettingsText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  tipsCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F57C00',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tipBullet: {
    fontSize: 14,
    color: '#F57C00',
    marginRight: 8,
    fontWeight: '600',
  },
  tipText: {
    fontSize: 14,
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
  androidButton: {
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
  androidButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4CAF50',
  },
});

