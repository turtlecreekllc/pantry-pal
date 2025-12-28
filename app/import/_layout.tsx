import { Stack } from 'expo-router';

export default function ImportLayout() {
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
