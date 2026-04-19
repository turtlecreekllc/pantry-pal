import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { NotificationSettings } from '../../components/NotificationSettings';

export default function NotificationsScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <NotificationSettings />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
});

