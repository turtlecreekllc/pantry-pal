import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../hooks/useNotifications';

interface NotificationSettingsProps {
  /** Compact mode for embedding in other screens */
  compact?: boolean;
}

/**
 * Settings component for managing push notification preferences
 */
export function NotificationSettings({ compact = false }: NotificationSettingsProps) {
  const {
    isEnabled,
    preferences,
    loading,
    register,
    unregister,
    updatePreferences,
  } = useNotifications();

  const handleToggleNotifications = async () => {
    if (isEnabled) {
      Alert.alert(
        'Disable Notifications',
        'You will no longer receive push notifications. Are you sure?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Disable', style: 'destructive', onPress: unregister },
        ]
      );
    } else {
      await register();
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, compact && styles.compactContainer]}>
        <ActivityIndicator size="small" color="#4CAF50" />
      </View>
    );
  }

  if (compact) {
    return (
      <TouchableOpacity style={styles.compactContainer} onPress={handleToggleNotifications}>
        <View style={styles.compactContent}>
          <Ionicons
            name={isEnabled ? 'notifications' : 'notifications-off-outline'}
            size={20}
            color={isEnabled ? '#4CAF50' : '#666'}
          />
          <Text style={styles.compactText}>
            {isEnabled ? 'Notifications On' : 'Notifications Off'}
          </Text>
        </View>
        <Switch
          value={isEnabled}
          onValueChange={handleToggleNotifications}
          trackColor={{ false: '#e0e0e0', true: '#a5d6a7' }}
          thumbColor={isEnabled ? '#4CAF50' : '#f5f5f5'}
        />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="notifications" size={24} color="#4CAF50" />
        <Text style={styles.title}>Notifications</Text>
      </View>
      <View style={styles.mainToggle}>
        <View style={styles.toggleInfo}>
          <Text style={styles.toggleTitle}>Push Notifications</Text>
          <Text style={styles.toggleDescription}>
            {isEnabled ? 'You will receive notifications' : 'Enable to receive updates'}
          </Text>
        </View>
        <Switch
          value={isEnabled}
          onValueChange={handleToggleNotifications}
          trackColor={{ false: '#e0e0e0', true: '#a5d6a7' }}
          thumbColor={isEnabled ? '#4CAF50' : '#f5f5f5'}
        />
      </View>
      {isEnabled && preferences && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notification Types</Text>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="time-outline" size={20} color="#FF9800" />
                <Text style={styles.settingLabel}>Expiry Reminders</Text>
              </View>
              <Switch
                value={preferences.expiryReminders}
                onValueChange={(value) => updatePreferences({ expiryReminders: value })}
                trackColor={{ false: '#e0e0e0', true: '#ffe0b2' }}
                thumbColor={preferences.expiryReminders ? '#FF9800' : '#f5f5f5'}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="restaurant-outline" size={20} color="#9C27B0" />
                <Text style={styles.settingLabel}>Meal Reminders</Text>
              </View>
              <Switch
                value={preferences.mealReminders}
                onValueChange={(value) => updatePreferences({ mealReminders: value })}
                trackColor={{ false: '#e0e0e0', true: '#e1bee7' }}
                thumbColor={preferences.mealReminders ? '#9C27B0' : '#f5f5f5'}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="people-outline" size={20} color="#2196F3" />
                <Text style={styles.settingLabel}>Household Activity</Text>
              </View>
              <Switch
                value={preferences.householdActivity}
                onValueChange={(value) => updatePreferences({ householdActivity: value })}
                trackColor={{ false: '#e0e0e0', true: '#bbdefb' }}
                thumbColor={preferences.householdActivity ? '#2196F3' : '#f5f5f5'}
              />
            </View>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Timing</Text>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => {
                Alert.alert(
                  'Expiry Reminder Timing',
                  'How many days before expiry should you be reminded?',
                  [1, 2, 3, 5, 7].map((days) => ({
                    text: `${days} day${days > 1 ? 's' : ''} before`,
                    onPress: () => updatePreferences({ expiryDaysBefore: days }),
                  }))
                );
              }}
            >
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Expiry reminder</Text>
              </View>
              <View style={styles.settingValue}>
                <Text style={styles.settingValueText}>
                  {preferences.expiryDaysBefore} days before
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#999" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => {
                Alert.alert(
                  'Meal Reminder Timing',
                  'How many hours before a meal should you be reminded?',
                  [1, 2, 3, 4].map((hours) => ({
                    text: `${hours} hour${hours > 1 ? 's' : ''} before`,
                    onPress: () => updatePreferences({ mealHoursBefore: hours }),
                  }))
                );
              }}
            >
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Meal reminder</Text>
              </View>
              <View style={styles.settingValue}>
                <Text style={styles.settingValueText}>
                  {preferences.mealHoursBefore} hours before
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#999" />
              </View>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  compactText: {
    fontSize: 16,
    color: '#333',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  mainToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 13,
    color: '#666',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  settingValueText: {
    fontSize: 14,
    color: '#666',
  },
});

