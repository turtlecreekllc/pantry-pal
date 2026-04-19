import { Stack } from 'expo-router';
import { colors, typography } from '../../lib/theme';

export default function ImportLayout(): React.ReactElement {
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
          title: 'Import Recipe',
        }}
      />
      <Stack.Screen
        name="url"
        options={{
          title: 'Import from URL',
        }}
      />
      <Stack.Screen
        name="text"
        options={{
          title: 'Import from Text',
        }}
      />
      <Stack.Screen
        name="photo"
        options={{
          title: 'Import from Photo',
        }}
      />
      <Stack.Screen
        name="review"
        options={{
          title: 'Review Recipe',
        }}
      />
    </Stack>
  );
}
