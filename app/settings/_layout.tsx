import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../../lib/theme';

function BackButton(): React.ReactElement {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.back()}
      style={{
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: -spacing.space2,
      }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityLabel="Go back"
      accessibilityRole="button"
    >
      <Ionicons name="chevron-back" size={28} color={colors.brown} />
    </TouchableOpacity>
  );
}

export default function SettingsLayout(): React.ReactElement {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.brown,
        headerTitleStyle: {
          fontFamily: 'Quicksand-Bold',
          fontWeight: typography.fontBold,
          fontSize: typography.textLg,
          color: colors.brown,
        },
        headerShadowVisible: false,
        headerBackTitle: '',
        headerBackVisible: false,
        headerLeft: () => <BackButton />,
      }}
    >
      <Stack.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          title: 'Notifications',
        }}
      />
      <Stack.Screen
        name="subscription"
        options={{
          title: 'Subscription',
        }}
      />
      <Stack.Screen
        name="token-history"
        options={{
          title: 'Token Usage History',
        }}
      />
      <Stack.Screen
        name="help"
        options={{
          title: 'Help & Support',
        }}
      />
      <Stack.Screen
        name="achievements"
        options={{
          title: 'Achievements',
        }}
      />
      <Stack.Screen
        name="integrations"
        options={{
          title: 'Integrations',
        }}
      />
      <Stack.Screen
        name="siri"
        options={{
          title: 'Siri Shortcuts',
        }}
      />
      <Stack.Screen
        name="google-assistant"
        options={{
          title: 'Google Assistant',
        }}
      />
      <Stack.Screen
        name="siri-help"
        options={{
          title: 'Siri Shortcuts Guide',
        }}
      />
      <Stack.Screen
        name="household"
        options={{
          title: 'Household',
        }}
      />
      <Stack.Screen
        name="dinner-roster"
        options={{
          title: 'Dinner Roster',
        }}
      />
      <Stack.Screen
        name="voice"
        options={{
          title: 'Voice Commands',
        }}
      />
      <Stack.Screen
        name="meal-history"
        options={{
          title: 'Meal History & Savings',
        }}
      />
      <Stack.Screen
        name="usage-history"
        options={{
          title: 'Usage History',
        }}
      />
      <Stack.Screen
        name="preferences"
        options={{
          title: 'Preferences',
        }}
      />
      <Stack.Screen
        name="services"
        options={{
          title: 'Connected Services',
        }}
      />
      <Stack.Screen
        name="ai-feedback"
        options={{
          title: 'AI Feedback',
        }}
      />
    </Stack>
  );
}

