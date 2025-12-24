import { Stack } from 'expo-router';

export default function RecipeLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#4CAF50',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Recipe',
        }}
      />
    </Stack>
  );
}
