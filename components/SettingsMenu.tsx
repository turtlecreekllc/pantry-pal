import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useHouseholdContext } from '../context/HouseholdContext';
import { HouseholdSwitcher } from './HouseholdSwitcher';
import { LifetimeImpact } from './LifetimeImpact';
import { AchievementsList } from './AchievementsList';
import { colors, typography, spacing, borderRadius, shadows } from '../lib/theme';

interface SettingsMenuProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Brand-styled settings menu modal
 */
interface UserProfile {
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export function SettingsMenu({ visible, onClose }: SettingsMenuProps): React.ReactElement {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { households } = useHouseholdContext();
  const [showHouseholdSwitcher, setShowHouseholdSwitcher] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    firstName: '',
    lastName: '',
    avatarUrl: null,
  });

  useEffect(() => {
    if (user?.user_metadata) {
      const metadata = user.user_metadata;
      setProfile({
        firstName: metadata.first_name || '',
        lastName: metadata.last_name || '',
        avatarUrl: metadata.avatar_url || null,
      });
    }
  }, [user]);

  const displayName = profile.firstName || profile.lastName
    ? `${profile.firstName} ${profile.lastName}`.trim()
    : null;

  const handleSignOut = async (): Promise<void> => {
    onClose();
    await signOut();
  };

  const navigateTo = (path: string): void => {
    onClose();
    router.push(path as never);
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.menu}>
                <View style={styles.header}>
                  <Text style={styles.headerTitle}>Settings</Text>
                  <TouchableOpacity
                    onPress={onClose}
                    style={styles.closeButton}
                    accessibilityLabel="Close settings"
                    accessibilityRole="button"
                  >
                    <Ionicons name="close" size={24} color={colors.brownMuted} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                >
                  {user && (
                    <View style={styles.userSection}>
                      {profile.avatarUrl ? (
                        <Image source={{ uri: profile.avatarUrl }} style={styles.userAvatarImage} />
                      ) : (
                        <View style={styles.userAvatar}>
                          <Ionicons name="person" size={24} color={colors.brown} />
                        </View>
                      )}
                      <View style={styles.userInfo}>
                        {displayName && (
                          <Text style={styles.userName} numberOfLines={1}>{displayName}</Text>
                        )}
                        <Text style={[styles.userEmail, displayName && styles.userEmailSmall]} numberOfLines={1}>
                          {user.email}
                        </Text>
                        {!displayName && (
                          <Text style={styles.userLabel}>Signed in</Text>
                        )}
                      </View>
                    </View>
                  )}

                  <View style={styles.menuItems}>
                    <LifetimeImpact />
                    <AchievementsList horizontal limit={3} onSeeAll={onClose} />

                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => navigateTo('/settings/meal-history')}
                    >
                      <Ionicons name="wallet-outline" size={22} color={colors.success} />
                      <Text style={styles.menuItemText}>Meal History & Savings</Text>
                      <Ionicons name="chevron-forward" size={20} color={colors.brownMuted} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => navigateTo('/settings/profile')}
                    >
                      <Ionicons name="person-outline" size={22} color={colors.brown} />
                      <Text style={styles.menuItemText}>Profile</Text>
                      <Ionicons name="chevron-forward" size={20} color={colors.brownMuted} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => navigateTo('/settings/household')}
                    >
                      <Ionicons name="home-outline" size={22} color={colors.brown} />
                      <Text style={styles.menuItemText}>Household</Text>
                      <Ionicons name="chevron-forward" size={20} color={colors.brownMuted} />
                    </TouchableOpacity>

                    {households.length > 1 && (
                      <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => setShowHouseholdSwitcher(true)}
                      >
                        <Ionicons name="swap-horizontal-outline" size={22} color={colors.brown} />
                        <Text style={styles.menuItemText}>Switch Household</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.brownMuted} />
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => navigateTo('/settings/integrations')}
                    >
                      <Ionicons name="extension-puzzle-outline" size={22} color={colors.brown} />
                      <Text style={styles.menuItemText}>Integrations</Text>
                      <Ionicons name="chevron-forward" size={20} color={colors.brownMuted} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => navigateTo('/settings/subscription')}
                    >
                      <Ionicons name="card-outline" size={22} color={colors.brown} />
                      <Text style={styles.menuItemText}>Subscription</Text>
                      <Ionicons name="chevron-forward" size={20} color={colors.brownMuted} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => navigateTo('/settings/notifications')}
                    >
                      <Ionicons name="notifications-outline" size={22} color={colors.brown} />
                      <Text style={styles.menuItemText}>Notifications</Text>
                      <Ionicons name="chevron-forward" size={20} color={colors.brownMuted} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => navigateTo('/settings/help')}
                    >
                      <Ionicons name="help-circle-outline" size={22} color={colors.brown} />
                      <Text style={styles.menuItemText}>Help & Support</Text>
                      <Ionicons name="chevron-forward" size={20} color={colors.brownMuted} />
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
                      <Ionicons name="log-out-outline" size={22} color={colors.error} />
                      <Text style={[styles.menuItemText, styles.logoutText]}>Sign Out</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.version}>Version 1.3.1</Text>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <HouseholdSwitcher
        visible={showHouseholdSwitcher}
        onClose={() => setShowHouseholdSwitcher(false)}
        onCreateNew={() => {
          setShowHouseholdSwitcher(false);
          navigateTo('/settings/household');
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(61, 35, 20, 0.5)',
    justifyContent: 'flex-start',
  },
  menu: {
    backgroundColor: colors.white,
    marginTop: 60,
    marginHorizontal: spacing.space4,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.brown,
    overflow: 'hidden',
    maxHeight: '85%',
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space4,
    borderBottomWidth: 2,
    borderBottomColor: colors.brown,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.textLg,
    fontWeight: typography.fontBold,
    color: colors.brown,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.space4,
    backgroundColor: colors.cream,
    borderBottomWidth: 1,
    borderBottomColor: colors.creamDark,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.brown,
  },
  userAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  userInfo: {
    marginLeft: spacing.space3,
    flex: 1,
  },
  userName: {
    fontFamily: 'Quicksand-SemiBold',
    fontSize: typography.textLg,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  userEmail: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textBase,
    fontWeight: typography.fontMedium,
    color: colors.brown,
  },
  userEmailSmall: {
    fontSize: typography.textSm,
    color: colors.brownMuted,
    marginTop: 2,
  },
  userLabel: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    marginTop: 2,
  },
  menuItems: {
    paddingVertical: spacing.space3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space4,
  },
  menuItemText: {
    flex: 1,
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textBase,
    color: colors.brown,
    marginLeft: spacing.space3,
  },
  logoutText: {
    color: colors.error,
  },
  divider: {
    height: 2,
    backgroundColor: colors.creamDark,
    marginVertical: spacing.space2,
    marginHorizontal: spacing.space4,
  },
  version: {
    fontFamily: 'Nunito-Regular',
    textAlign: 'center',
    fontSize: typography.textXs,
    color: colors.brownMuted,
    paddingVertical: spacing.space4,
  },
});
