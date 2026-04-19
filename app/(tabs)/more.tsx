/**
 * More Screen - Settings & Secondary Features
 * Houses settings, saved content, full AI chat, and profile management.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useHouseholdContext } from '../../context/HouseholdContext';
import { useSubscription } from '../../hooks/useSubscription';
import { useSavedRecipes } from '../../hooks/useSavedRecipes';
import { useImportedRecipes } from '../../hooks/useImportedRecipes';
import { colors, typography, spacing, borderRadius, shadows } from '../../lib/theme';

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  badge?: string | number;
  onPress: () => void;
  iconColor?: string;
}

function MenuItem({
  icon,
  label,
  description,
  badge,
  onPress,
  iconColor = colors.brown,
}: MenuItemProps): React.ReactElement {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <View style={[styles.menuIconContainer, { backgroundColor: `${iconColor}15` }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuLabel}>{label}</Text>
        {description && <Text style={styles.menuDescription}>{description}</Text>}
      </View>
      {badge !== undefined && (
        <View style={styles.menuBadge}>
          <Text style={styles.menuBadgeText}>{badge}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={20} color={colors.brownMuted} />
    </TouchableOpacity>
  );
}

function MenuSection({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <View style={styles.menuSection}>
      {title && <Text style={styles.sectionTitle}>{title}</Text>}
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

export default function MoreScreen(): React.ReactElement {
  const router = useRouter();
  const { user } = useAuth();
  const { activeHousehold } = useHouseholdContext();
  const { isPremium, tier, totalTokens } = useSubscription();
  const { savedRecipes } = useSavedRecipes();
  const { importedRecipes } = useImportedRecipes();
  const memberCount = activeHousehold?.member_count || 1;
  
  const handleNavigate = (path: string): void => {
    router.push(path as any);
  };
  
  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => handleNavigate('/settings/profile')}
        >
          <View style={styles.profileAvatar}>
            <Text style={styles.profileInitial}>
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {activeHousehold?.name || "My Kitchen"}
            </Text>
            <Text style={styles.profileMeta}>
              {isPremium ? '✨ Premium Member' : 'Free Plan'}
              {activeHousehold && ` • ${memberCount} member${memberCount > 1 ? 's' : ''}`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.brownMuted} />
        </TouchableOpacity>
        
        {/* My Kitchen Section */}
        <MenuSection title="My Kitchen">
          <MenuItem
            icon="analytics"
            label="Usage History"
            description="Track pantry item consumption"
            iconColor={colors.info}
            onPress={() => handleNavigate('/settings/usage-history')}
          />
          <MenuItem
            icon="time"
            label="Meal History"
            description="Past meals and savings"
            iconColor={colors.brownLight}
            onPress={() => handleNavigate('/settings/meal-history')}
          />
        </MenuSection>
        
        {/* Saved Content Section */}
        <MenuSection title="Saved Content">
          <MenuItem
            icon="heart"
            label="Saved Recipes"
            badge={savedRecipes.length}
            iconColor={colors.coral}
            onPress={() => handleNavigate('/(tabs)/saved')}
          />
          <MenuItem
            icon="book"
            label="Imported Recipes"
            badge={importedRecipes.length}
            iconColor={colors.primary}
            onPress={() => handleNavigate('/import')}
          />
        </MenuSection>
        
        {/* AI & Voice Section */}
        <MenuSection title="AI & Voice">
          <MenuItem
            icon="sparkles"
            label="Chat with Pepper"
            description="Your AI cooking companion"
            iconColor={colors.coral}
            onPress={() => handleNavigate('/(tabs)/chat')}
          />
          <MenuItem
            icon="chatbubbles"
            label="AI Feedback"
            description="Review your AI response ratings"
            iconColor={colors.success}
            onPress={() => handleNavigate('/settings/ai-feedback')}
          />
          <MenuItem
            icon="mic"
            label="Siri & Voice"
            description="Set up voice commands"
            iconColor={colors.info}
            onPress={() => handleNavigate('/settings/voice')}
          />
        </MenuSection>
        
        {/* Personalization Section */}
        <MenuSection title="Personalization">
          <MenuItem
            icon="options"
            label="My Preferences"
            description="Diet, cuisines, household size"
            iconColor={colors.coral}
            onPress={() => handleNavigate('/settings/preferences')}
          />
        </MenuSection>
        
        {/* Household Section */}
        <MenuSection title="Household">
          <MenuItem
            icon="home"
            label="Household Settings"
            description="Manage members, sharing preferences"
            iconColor={colors.primary}
            onPress={() => handleNavigate('/settings/household')}
          />
          <MenuItem
            icon="people"
            label="Dinner Roster"
            description="Who's eating — dietary needs & allergies"
            iconColor={colors.coral}
            onPress={() => handleNavigate('/settings/dinner-roster')}
          />
          <MenuItem
            icon="link"
            label="Connected Services"
            description="Instacart, Apple Health, Calendar"
            iconColor={colors.success}
            onPress={() => handleNavigate('/settings/services')}
          />
        </MenuSection>
        
        {/* App Settings Section */}
        <MenuSection title="App Settings">
          <MenuItem
            icon="settings"
            label="App Settings"
            iconColor={colors.brownMuted}
            onPress={() => handleNavigate('/settings')}
          />
          <MenuItem
            icon="notifications"
            label="Notifications"
            iconColor={colors.warning}
            onPress={() => handleNavigate('/settings/notifications')}
          />
          <MenuItem
            icon="card"
            label="Subscription"
            badge={isPremium ? 'Premium' : 'Upgrade'}
            iconColor={colors.coral}
            onPress={() => handleNavigate('/settings/subscription')}
          />
          <MenuItem
            icon="help-circle"
            label="Help & Support"
            iconColor={colors.info}
            onPress={() => handleNavigate('/settings/help')}
          />
        </MenuSection>
        
        {/* Upgrade Prompt for Free Users */}
        {!isPremium && (
          <TouchableOpacity
            style={styles.upgradeCard}
            onPress={() => handleNavigate('/settings/subscription')}
          >
            <View style={styles.upgradeContent}>
              <Text style={styles.upgradeTitle}>🎁 Unlock Premium</Text>
              <Text style={styles.upgradeDescription}>
                Unlimited AI suggestions, household sharing, and more!
              </Text>
            </View>
            <View style={styles.upgradeButton}>
              <Text style={styles.upgradeButtonText}>Upgrade</Text>
            </View>
          </TouchableOpacity>
        )}
        
        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>DinnerPlans.ai</Text>
          <Text style={styles.appVersion}>
            Version {Constants.expoConfig?.version || '1.0.0'}
            {' '}
            ({Platform.OS === 'ios' 
              ? Constants.expoConfig?.ios?.buildNumber 
              : Constants.expoConfig?.android?.versionCode})
          </Text>
        </View>
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
    paddingBottom: spacing.space4,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.space4,
    padding: spacing.space4,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.brown,
    ...shadows.sm,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.brown,
  },
  profileInitial: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.text2xl,
    fontWeight: typography.fontBold,
    color: colors.brown,
  },
  profileInfo: {
    flex: 1,
    marginLeft: spacing.space4,
  },
  profileName: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.textLg,
    fontWeight: typography.fontBold,
    color: colors.brown,
  },
  profileMeta: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    marginTop: spacing.space1,
  },
  menuSection: {
    marginTop: spacing.space4,
  },
  sectionTitle: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textXs,
    fontWeight: typography.fontSemibold,
    color: colors.brownMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginHorizontal: spacing.space4,
    marginBottom: spacing.space2,
  },
  sectionContent: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.space4,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.brown,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.space4,
    borderBottomWidth: 1,
    borderBottomColor: colors.creamDark,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
    marginLeft: spacing.space3,
  },
  menuLabel: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  menuDescription: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    marginTop: 2,
  },
  menuBadge: {
    paddingVertical: 2,
    paddingHorizontal: spacing.space2,
    backgroundColor: colors.peach,
    borderRadius: borderRadius.full,
    marginRight: spacing.space2,
  },
  menuBadgeText: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textXs,
    fontWeight: typography.fontMedium,
    color: colors.brown,
  },
  upgradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.space4,
    padding: spacing.space4,
    backgroundColor: colors.coral,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.brown,
    ...shadows.md,
  },
  upgradeContent: {
    flex: 1,
  },
  upgradeTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.textLg,
    fontWeight: typography.fontBold,
    color: colors.white,
  },
  upgradeDescription: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.white,
    opacity: 0.9,
    marginTop: spacing.space1,
  },
  upgradeButton: {
    paddingVertical: spacing.space2,
    paddingHorizontal: spacing.space4,
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  upgradeButtonText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textSm,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  appInfo: {
    alignItems: 'center',
    marginTop: spacing.space8,
    paddingVertical: spacing.space4,
  },
  appName: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.textBase,
    fontWeight: typography.fontBold,
    color: colors.brownMuted,
  },
  appVersion: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    opacity: 0.6,
    marginTop: spacing.space1,
  },
});

