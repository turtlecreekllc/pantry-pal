import { Stack } from 'expo-router';
import { colors, typography } from '../../lib/theme';

export default function ItemLayout(): React.ReactElement {
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
        name="add"
        options={{
          title: 'Add to Pantry',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="manual"
        options={{
          title: 'Add Item',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Item Details',
        }}
      />
    </Stack>
  );
}
