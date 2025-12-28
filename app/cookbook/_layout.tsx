import { Stack } from 'expo-router';

export default function CookbookLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#4CAF50' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
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
