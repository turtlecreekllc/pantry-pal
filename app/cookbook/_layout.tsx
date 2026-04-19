import { Stack } from 'expo-router';
import { colors, typography } from '../../lib/theme';

export default function CookbookLayout(): React.ReactElement {
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
        headerBackVisible: true,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Cookbooks',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Cookbook',
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: 'Create Cookbook',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
