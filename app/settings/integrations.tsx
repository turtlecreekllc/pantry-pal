import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHealth } from '../../context/HealthContext';
import { useCalendar } from '../../hooks/useCalendar';
import { CalendarSettingsModal } from '../../components/CalendarSettingsModal';

export default function IntegrationsScreen() {
  const { isHealthSyncEnabled, toggleHealthSync } = useHealth();
  const { settings: calendarSettings } = useCalendar();
  const [calendarSettingsVisible, setCalendarSettingsVisible] = useState(false);

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Calendar</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setCalendarSettingsVisible(true)}
            >
              <View style={styles.iconContainer}>
                <Ionicons name="calendar-outline" size={22} color="#4CAF50" />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemText}>Calendar Integration</Text>
                <Text style={styles.menuItemDescription}>
                  {calendarSettings.enabled && calendarSettings.calendarName
                    ? `Syncing to: ${calendarSettings.calendarName}`
                    : 'Sync meal plans to your calendar'}
                </Text>
              </View>
              {calendarSettings.enabled
                ? <Ionicons name="checkmark-circle" size={22} color="#4CAF50" />
                : <Ionicons name="chevron-forward" size={20} color="#ccc" />
              }
            </TouchableOpacity>
          </View>
        </View>

        {(Platform.OS === 'ios' || Platform.OS === 'android') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Health</Text>
            <View style={styles.card}>
              <View style={styles.menuItem}>
                <View style={styles.iconContainer}>
                  <Ionicons name="heart-outline" size={22} color="#E91E63" />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemText}>Health App Sync</Text>
                  <Text style={styles.menuItemDescription}>
                    {Platform.OS === 'ios' 
                      ? 'Sync nutrition data to Apple Health'
                      : 'Sync nutrition data to Google Fit'}
                  </Text>
                </View>
                <Switch
                  value={isHealthSyncEnabled}
                  onValueChange={toggleHealthSync}
                  trackColor={{ false: '#e0e0e0', true: '#a5d6a7' }}
                  thumbColor={isHealthSyncEnabled ? '#4CAF50' : '#f4f3f4'}
                />
              </View>
            </View>
            {isHealthSyncEnabled && (
              <Text style={styles.statusText}>
                ✓ Nutrition data will sync automatically when you log meals
              </Text>
            )}
          </View>
        )}

        <View style={styles.infoSection}>
          <Ionicons name="information-circle-outline" size={20} color="#666" />
          <Text style={styles.infoText}>
            Integrations help you connect DinnerPlans with other apps and services 
            to streamline your meal planning experience.
          </Text>
        </View>
      </ScrollView>

      <CalendarSettingsModal
        visible={calendarSettingsVisible}
        onClose={() => setCalendarSettingsVisible(false)}
      />
    </>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  menuItemDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  statusText: {
    fontSize: 13,
    color: '#4CAF50',
    marginTop: 8,
    marginLeft: 4,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
});

