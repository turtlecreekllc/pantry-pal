import { Stack } from 'expo-router';

export default function ItemLayout() {
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
