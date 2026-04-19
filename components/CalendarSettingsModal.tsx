import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCalendar } from '../hooks/useCalendar';
import { WritableCalendar } from '../lib/calendarService';

interface CalendarSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CalendarSettingsModal({ visible, onClose }: CalendarSettingsModalProps) {
  const {
    settings,
    loading,
    needsCalendarSelection,
    availableCalendars,
    enableCalendar,
    disableCalendar,
    selectCalendar,
    cancelCalendarSelection,
    checkPermissions,
  } = useCalendar();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleToggleCalendar = async (value: boolean) => {
    setIsProcessing(true);
    try {
      if (value) {
        const result = await enableCalendar();
        // result can be true, false, or 'needs_selection'
        // 'needs_selection' will trigger the calendar picker UI via needsCalendarSelection state
      } else {
        await disableCalendar();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectCalendar = async (calendar: WritableCalendar) => {
    setIsProcessing(true);
    try {
      await selectCalendar(calendar);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelSelection = () => {
    cancelCalendarSelection();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Calendar Integration</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {loading ? (
              <ActivityIndicator size="large" color="#4CAF50" />
            ) : needsCalendarSelection ? (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Select a Calendar</Text>
                  <Text style={styles.description}>
                    Your device doesn't support creating new calendars. Please select an existing calendar to use for meal plans:
                  </Text>
                </View>
                <ScrollView style={styles.calendarList} showsVerticalScrollIndicator={false}>
                  {availableCalendars.map((calendar) => (
                    <TouchableOpacity
                      key={calendar.id}
                      style={styles.calendarItem}
                      onPress={() => handleSelectCalendar(calendar)}
                      disabled={isProcessing}
                    >
                      <View style={[styles.calendarColor, { backgroundColor: calendar.color }]} />
                      <View style={styles.calendarInfo}>
                        <Text style={styles.calendarName}>{calendar.title}</Text>
                        <Text style={styles.calendarSource}>{calendar.source}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#ccc" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancelSelection}
                  disabled={isProcessing}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.section}>
                  <View style={styles.row}>
                    <View style={styles.rowText}>
                      <Text style={styles.label}>Sync to Calendar</Text>
                      <Text style={styles.description}>
                        Automatically add meal plans to your device calendar
                      </Text>
                    </View>
                    {isProcessing ? (
                        <ActivityIndicator size="small" color="#4CAF50" />
                    ) : (
                        <Switch
                          value={settings.enabled}
                          onValueChange={handleToggleCalendar}
                          trackColor={{ false: '#e0e0e0', true: '#81c784' }}
                          thumbColor={settings.enabled ? '#4CAF50' : '#f5f5f5'}
                        />
                    )}
                  </View>
                </View>
                {settings.enabled && settings.calendarName && (
                  <View style={styles.section}>
                    <View style={styles.infoBox}>
                      <Ionicons name="calendar-outline" size={20} color="#4CAF50" />
                      <Text style={styles.infoText}>
                        Using: {settings.calendarName}
                      </Text>
                    </View>
                  </View>
                )}
                {settings.enabled && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Preferences</Text>
                    <View style={styles.row}>
                      <View style={styles.rowText}>
                        <Text style={styles.label}>Reminders</Text>
                        <Text style={styles.description}>
                          Get notified before meal time
                        </Text>
                      </View>
                      <Switch
                        value={settings.reminders}
                        disabled // TODO: Implement update settings in hook for partial updates
                        trackColor={{ false: '#e0e0e0', true: '#81c784' }}
                        thumbColor={settings.reminders ? '#4CAF50' : '#f5f5f5'}
                      />
                    </View>
                    {/* Placeholder for reminder time configuration */}
                    {settings.reminders && (
                        <View style={styles.infoBox}>
                             <Ionicons name="time-outline" size={20} color="#666" />
                             <Text style={styles.infoText}>Default reminder: 1 hour before</Text>
                        </View>
                    )}
                  </View>
                )}
                <View style={styles.noteBox}>
                    <Ionicons name="information-circle-outline" size={20} color="#4CAF50" />
                    <Text style={styles.noteText}>
                        {settings.enabled 
                          ? 'Meal plans will be synced to your selected calendar.'
                          : 'DinnerPlans will create a dedicated calendar or let you choose an existing one.'}
                    </Text>
                </View>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center', // Center vertically for this modal
    padding: 16,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    maxHeight: '80%',
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  rowText: {
    flex: 1,
    marginRight: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  infoBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f5f5f5',
      padding: 12,
      borderRadius: 8,
      marginTop: 8
  },
  infoText: {
      fontSize: 14,
      color: '#666',
      marginLeft: 8
  },
  noteBox: {
      flexDirection: 'row',
      backgroundColor: '#e8f5e9',
      padding: 16,
      borderRadius: 8,
      alignItems: 'flex-start'
  },
  noteText: {
      fontSize: 14,
      color: '#2e7d32',
      marginLeft: 12,
      flex: 1,
      lineHeight: 20
  },
  calendarList: {
    maxHeight: 250,
    marginBottom: 16,
  },
  calendarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    marginBottom: 8,
  },
  calendarColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  calendarInfo: {
    flex: 1,
  },
  calendarName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  calendarSource: {
    fontSize: 13,
    color: '#888',
  },
  cancelButton: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
});

