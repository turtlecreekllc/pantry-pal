import { Stack } from 'expo-router';
import { colors, typography } from '../../lib/theme';

export default function RecipeLayout(): React.ReactElement {
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
        name="[id]"
        options={{
          title: 'Recipe',
        }}
      />
      <Stack.Screen
        name="generate"
        options={{
          title: 'AI Recipe Generator',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="cook/[id]"
        options={{
          title: 'Cook Mode',
          presentation: 'fullScreenModal',
          headerShown: false,
        }}
      />
    </Stack>
  );
}
