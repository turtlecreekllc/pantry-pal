import { Stack } from 'expo-router';
import { colors, typography } from '../../lib/theme';

export default function MealLayout(): React.ReactElement {
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
    />
  );
}
