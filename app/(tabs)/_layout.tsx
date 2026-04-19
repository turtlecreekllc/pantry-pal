import React, { useState, useEffect, useRef } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, TouchableOpacity, View, StyleSheet, Image } from 'react-native';
import { SettingsMenu } from '../../components/SettingsMenu';
import { MembershipBadge } from '../../components/MembershipBadge';
import { useUserPreferences } from '../../hooks/useUserPreferences';
import { colors, typography, spacing, borderRadius } from '../../lib/theme';

/** Header logo component for Tonight screen */
function HeaderLogo(): React.ReactElement {
  return (
    <Image
      source={require('../../assets/DinnerPlansai_banner-tight-transparent.png')}
      style={styles.headerLogo}
      resizeMode="contain"
    />
  );
}

/**
 * Tab Layout - New Navigation Structure
 * 
 * Per PRD, the new navigation is:
 * 1. Tonight (Home) - "What's for Dinner?" 
 * 2. Plan - Weekly Meal Calendar
 * 3. Pantry - Inventory Management (demoted from home)
 * 4. Grocery - Smart Shopping List
 * 5. More - Settings, Saved, Chat, Profile
 * 
 * Hidden tabs (accessible via navigation):
 * - index (redirects to tonight)
 * - calendar (replaced by plan)
 * - chat (moved to More)
 * - recipes (accessible from tonight/plan)
 * - saved (moved to More)
 * - scan (modal)
 */
export default function TabLayout(): React.ReactElement {
  const [showSettings, setShowSettings] = useState(false);
  const router = useRouter();
  const { onboardingCompleted, loading: preferencesLoading } = useUserPreferences();
  const hasRedirected = useRef(false);

  // Redirect to onboarding if not completed — only once on initial load.
  // Using a ref guard prevents re-triggering after onboarding completes and
  // navigates back here (the stale hook instance would otherwise loop back).
  useEffect(() => {
    if (preferencesLoading) return;
    if (hasRedirected.current) return;

    if (!onboardingCompleted) {
      hasRedirected.current = true;
      router.replace('/onboarding');
    }
  }, [onboardingCompleted, preferencesLoading, router]);

  return (
    <>
      <Tabs
        initialRouteName="tonight"
        screenOptions={{
          tabBarActiveTintColor: colors.brown,
          tabBarInactiveTintColor: colors.brownMuted,
          tabBarStyle: {
            backgroundColor: colors.white,
            borderTopColor: colors.brown,
            borderTopWidth: 2,
            paddingTop: spacing.space2,
            height: Platform.OS === 'ios' ? 88 : 68,
          },
          tabBarLabelStyle: {
            fontFamily: 'Nunito-Medium',
            fontSize: typography.textXs,
            fontWeight: typography.fontMedium,
          },
          tabBarIconStyle: {
            marginTop: spacing.space1,
          },
          headerStyle: {
            backgroundColor: colors.primary,
            borderBottomWidth: 2,
            borderBottomColor: colors.brown,
          },
          headerTintColor: colors.brown,
          headerTitleStyle: {
            fontFamily: 'Quicksand-Bold',
            fontWeight: typography.fontBold,
            fontSize: typography.textLg,
            color: colors.brown,
          },
          headerShadowVisible: false,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => setShowSettings(true)}
              style={styles.menuButton}
              accessibilityLabel="Open settings menu"
              accessibilityRole="button"
            >
              <Ionicons name="menu" size={24} color={colors.brown} />
            </TouchableOpacity>
          ),
          headerRight: () => <MembershipBadge />,
        }}
      >
        {/* PRIMARY TABS - New Navigation Structure */}
        
        {/* 1. Tonight - NEW HOME (What's for Dinner?) */}
        <Tabs.Screen
          name="tonight"
          options={{
            headerTitle: () => <HeaderLogo />,
            tabBarLabel: 'Tonight',
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
                <Ionicons name="restaurant" size={22} color={focused ? colors.brown : color} />
              </View>
            ),
          }}
        />
        
        {/* 2. Plan - Weekly Meal Calendar */}
        <Tabs.Screen
          name="plan"
          options={{
            title: 'Plan',
            tabBarLabel: 'Plan',
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
                <Ionicons name="calendar" size={22} color={focused ? colors.brown : color} />
              </View>
            ),
          }}
        />
        
        {/* 3. Pantry - Inventory Management (demoted from home) */}
        <Tabs.Screen
          name="pantry"
          options={{
            title: 'Pantry',
            tabBarLabel: 'Pantry',
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
                <Ionicons name="file-tray-stacked" size={22} color={focused ? colors.brown : color} />
              </View>
            ),
          }}
        />
        
        {/* 4. Grocery - Smart Shopping List */}
        <Tabs.Screen
          name="grocery"
          options={{
            title: 'Grocery',
            tabBarLabel: 'Grocery',
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
                <Ionicons name="cart" size={22} color={focused ? colors.brown : color} />
              </View>
            ),
          }}
        />
        
        {/* 5. More - Settings, Saved, Chat, Profile */}
        <Tabs.Screen
          name="more"
          options={{
            title: 'More',
            tabBarLabel: 'More',
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
                <Ionicons name="menu" size={22} color={focused ? colors.brown : color} />
              </View>
            ),
          }}
        />
        
        {/* HIDDEN TABS - Accessible via navigation but not shown in tab bar */}
        
        {/* Index route - redirects to tonight (see index.tsx) */}
        <Tabs.Screen
          name="index"
          options={{
            headerShown: false,
            tabBarItemStyle: { display: 'none' },
          }}
        />
        
        {/* Old Calendar - replaced by Plan */}
        <Tabs.Screen
          name="calendar"
          options={{
            title: 'Calendar',
            href: '/plan', // Redirect to plan
            tabBarItemStyle: { display: 'none' },
          }}
        />
        
        {/* Chat - moved to More, but still accessible */}
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Chat with Pepper',
            tabBarItemStyle: { display: 'none' },
          }}
        />
        
        {/* Recipes - accessible from tonight/plan */}
        <Tabs.Screen
          name="recipes"
          options={{
            title: 'Recipes',
            tabBarItemStyle: { display: 'none' },
          }}
        />
        
        {/* Saved - moved to More */}
        <Tabs.Screen
          name="saved"
          options={{
            title: 'Saved Recipes',
            tabBarItemStyle: { display: 'none' },
          }}
        />
        
        {/* Scan - modal */}
        <Tabs.Screen
          name="scan"
          options={{
            title: 'Scan',
            headerShown: false,
            tabBarItemStyle: { display: 'none' },
          }}
        />
      </Tabs>

      <SettingsMenu visible={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  headerLogo: {
    height: 32,
    width: 160,
  },
  menuButton: {
    marginLeft: spacing.space4,
    padding: spacing.space1,
    borderRadius: borderRadius.sm,
  },
  tabIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
  },
  tabIconActive: {
    backgroundColor: colors.primary,
  },
});
