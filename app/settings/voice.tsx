/**
 * Voice Commands Screen
 * Shows users the list of available Siri/Google Assistant voice commands
 * and provides quick access to configuration settings.
 *
 * @module VoiceCommandsScreen
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getAvailableShortcuts } from '../../lib/siriShortcuts';
import { colors, typography, spacing, borderRadius, shadows } from '../../lib/theme';

interface VoiceCommandProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  phrase: string;
  description: string;
  iconColor: string;
}

/**
 * Individual voice command card component
 */
function VoiceCommandCard({
  icon,
  title,
  phrase,
  description,
  iconColor,
}: VoiceCommandProps): React.ReactElement {
  return (
    <View style={styles.commandCard}>
      <View style={[styles.commandIconContainer, { backgroundColor: `${iconColor}20` }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.commandContent}>
        <Text style={styles.commandTitle}>{title}</Text>
        <View style={styles.phraseContainer}>
          <Ionicons name="mic" size={14} color={colors.info} />
          <Text style={styles.commandPhrase}>"{phrase}"</Text>
        </View>
        <Text style={styles.commandDescription}>{description}</Text>
      </View>
    </View>
  );
}

/**
 * Map shortcut keys to icons and colors
 */
function getCommandVisuals(key: string): { icon: keyof typeof Ionicons.glyphMap; color: string } {
  const visuals: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
    addItem: { icon: 'add-circle', color: colors.success },
    viewPantry: { icon: 'home', color: colors.primary },
    viewExpiring: { icon: 'time', color: colors.warning },
    scanPantry: { icon: 'camera', color: colors.coral },
    viewRecipes: { icon: 'restaurant', color: colors.primaryDark },
    addGrocery: { icon: 'cart', color: colors.info },
    voiceReview: { icon: 'mic-circle', color: colors.brownLight },
  };
  return visuals[key] || { icon: 'ellipse', color: colors.brownMuted };
}

/**
 * Voice Commands Screen
 * Displays all available voice commands for Siri (iOS) or Google Assistant (Android)
 */
export default function VoiceCommandsScreen(): React.ReactElement {
  const router = useRouter();
  const shortcuts = getAvailableShortcuts();
  const isIOS = Platform.OS === 'ios';
  const assistantName = isIOS ? 'Siri' : 'Google Assistant';
  const triggerPhrase = isIOS ? 'Hey Siri' : 'Hey Google';

  const handleSetupPress = (): void => {
    if (isIOS) {
      router.push('/settings/siri');
    } else {
      router.push('/settings/google-assistant');
    }
  };

  const handleHelpPress = (): void => {
    if (isIOS) {
      router.push('/settings/siri-help');
    } else {
      router.push('/settings/google-assistant');
    }
  };

  const openSystemSettings = (): void => {
    if (isIOS) {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconContainer}>
            <Ionicons
              name={isIOS ? 'mic-circle' : 'mic'}
              size={48}
              color={colors.coral}
            />
          </View>
          <Text style={styles.heroTitle}>Voice Commands</Text>
          <Text style={styles.heroSubtitle}>
            Say "{triggerPhrase}" followed by any command below to control
            DinnerPlans hands-free
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={handleSetupPress}
            accessibilityLabel={`Set up ${assistantName}`}
            accessibilityRole="button"
          >
            <Ionicons name="settings-outline" size={20} color={colors.white} />
            <Text style={styles.quickActionText}>Set Up {assistantName}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionButtonSecondary}
            onPress={handleHelpPress}
            accessibilityLabel="View help guide"
            accessibilityRole="button"
          >
            <Ionicons name="help-circle-outline" size={20} color={colors.brown} />
            <Text style={styles.quickActionTextSecondary}>Help Guide</Text>
          </TouchableOpacity>
        </View>

        {/* Available Commands Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Available Commands</Text>
          <Text style={styles.sectionSubtitle}>
            {shortcuts.length} voice commands ready to use
          </Text>
        </View>

        <View style={styles.commandsContainer}>
          {shortcuts.map((shortcut) => {
            const { icon, color } = getCommandVisuals(shortcut.key);
            return (
              <VoiceCommandCard
                key={shortcut.key}
                icon={icon}
                title={shortcut.title}
                phrase={shortcut.phrase}
                description={shortcut.description}
                iconColor={color}
              />
            );
          })}
        </View>

        {/* Example Usage Section */}
        <View style={styles.examplesCard}>
          <View style={styles.examplesHeader}>
            <Ionicons name="chatbubble-ellipses" size={20} color={colors.success} />
            <Text style={styles.examplesTitle}>Try These Examples</Text>
          </View>
          <View style={styles.examplesList}>
            <View style={styles.exampleItem}>
              <Text style={styles.exampleBullet}>•</Text>
              <Text style={styles.exampleText}>
                "{triggerPhrase}, add milk to my pantry"
              </Text>
            </View>
            <View style={styles.exampleItem}>
              <Text style={styles.exampleBullet}>•</Text>
              <Text style={styles.exampleText}>
                "{triggerPhrase}, what's expiring soon"
              </Text>
            </View>
            <View style={styles.exampleItem}>
              <Text style={styles.exampleBullet}>•</Text>
              <Text style={styles.exampleText}>
                "{triggerPhrase}, what can I make for dinner"
              </Text>
            </View>
            <View style={styles.exampleItem}>
              <Text style={styles.exampleBullet}>•</Text>
              <Text style={styles.exampleText}>
                "{triggerPhrase}, scan my pantry"
              </Text>
            </View>
          </View>
        </View>

        {/* Tips Card */}
        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb" size={20} color={colors.warning} />
            <Text style={styles.tipsTitle}>Pro Tips</Text>
          </View>
          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.tipText}>
                Speak naturally — {assistantName} understands conversational phrases
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.tipText}>
                Works with AirPods, CarPlay, and HomePod
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.tipText}>
                Customize phrases to match how you naturally speak
              </Text>
            </View>
          </View>
        </View>

        {/* System Settings Link */}
        <TouchableOpacity
          style={styles.settingsLink}
          onPress={openSystemSettings}
          accessibilityLabel={`Open ${assistantName} settings`}
          accessibilityRole="button"
        >
          <Ionicons name="phone-portrait-outline" size={18} color={colors.info} />
          <Text style={styles.settingsLinkText}>
            Open Device {assistantName} Settings
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.info} />
        </TouchableOpacity>

        {/* Bottom Padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.space4,
    paddingTop: spacing.space4,
  },
  heroCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.brown,
    padding: spacing.space6,
    alignItems: 'center',
    ...shadows.sm,
  },
  heroIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.coral}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.space4,
  },
  heroTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.text2xl,
    fontWeight: typography.fontBold,
    color: colors.brown,
    marginBottom: spacing.space2,
  },
  heroSubtitle: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.space3,
    marginTop: spacing.space4,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.space2,
    backgroundColor: colors.coral,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.brown,
    paddingVertical: spacing.space3,
    paddingHorizontal: spacing.space4,
    ...shadows.sm,
  },
  quickActionText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textSm,
    fontWeight: typography.fontSemibold,
    color: colors.white,
  },
  quickActionButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.space2,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.brown,
    paddingVertical: spacing.space3,
    paddingHorizontal: spacing.space4,
  },
  quickActionTextSecondary: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textSm,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  sectionHeader: {
    marginTop: spacing.space6,
    marginBottom: spacing.space3,
  },
  sectionTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.textLg,
    fontWeight: typography.fontBold,
    color: colors.brown,
  },
  sectionSubtitle: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    marginTop: spacing.space1,
  },
  commandsContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.brown,
    overflow: 'hidden',
    ...shadows.sm,
  },
  commandCard: {
    flexDirection: 'row',
    padding: spacing.space4,
    borderBottomWidth: 1,
    borderBottomColor: colors.creamDark,
  },
  commandIconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commandContent: {
    flex: 1,
    marginLeft: spacing.space3,
  },
  commandTitle: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
    marginBottom: 2,
  },
  phraseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  commandPhrase: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    fontWeight: typography.fontMedium,
    color: colors.info,
    fontStyle: 'italic',
  },
  commandDescription: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textXs,
    color: colors.brownMuted,
    lineHeight: 16,
  },
  examplesCard: {
    backgroundColor: colors.successBg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.success,
    padding: spacing.space4,
    marginTop: spacing.space6,
  },
  examplesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
    marginBottom: spacing.space3,
  },
  examplesTitle: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  examplesList: {
    gap: spacing.space2,
  },
  exampleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.space2,
  },
  exampleBullet: {
    fontFamily: 'Nunito-Bold',
    fontSize: typography.textBase,
    fontWeight: typography.fontBold,
    color: colors.success,
  },
  exampleText: {
    flex: 1,
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brown,
    lineHeight: 20,
  },
  tipsCard: {
    backgroundColor: colors.warningBg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.warning,
    padding: spacing.space4,
    marginTop: spacing.space4,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
    marginBottom: spacing.space3,
  },
  tipsTitle: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  tipsList: {
    gap: spacing.space2,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.space2,
  },
  tipText: {
    flex: 1,
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brown,
    lineHeight: 20,
  },
  settingsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.space2,
    paddingVertical: spacing.space4,
    marginTop: spacing.space4,
  },
  settingsLinkText: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    fontWeight: typography.fontMedium,
    color: colors.info,
  },
  bottomPadding: {
    height: spacing.space8,
  },
});

