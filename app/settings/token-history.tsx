/**
 * Token History Screen
 * Dedicated screen for viewing token transaction history
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { TokenUsageHistory } from '../../components/TokenUsageHistory';

export default function TokenHistoryScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <TokenUsageHistory showChart={true} />
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
    paddingBottom: 40,
  },
});

