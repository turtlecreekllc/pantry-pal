import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useHealth } from '../context/HealthContext';
import { useHouseholdContext } from '../context/HouseholdContext';
import { CalendarSettingsModal } from './CalendarSettingsModal';
import { HouseholdSettings } from './HouseholdSettings';
import { LifetimeImpact } from './LifetimeImpact';
import { AchievementsList } from './AchievementsList';

interface SettingsMenuProps {
  visible: boolean;
  onClose: () => void;
}

export function SettingsMenu({ visible, onClose }: SettingsMenuProps) {
  const { user, signOut } = useAuth();
  const { isHealthSyncEnabled, toggleHealthSync } = useHealth();
  const { activeHousehold, hasHousehold, households } = useHouseholdContext();
  const [calendarSettingsVisible, setCalendarSettingsVisible] = useState(false);
  const [showHouseholdSettings, setShowHouseholdSettings] = useState(false);
  const [showHouseholdSwitcher, setShowHouseholdSwitcher] = useState(false);

  const handleSignOut = async () => {
    onClose();
    await signOut();
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.menu}>
                <View style={styles.header}>
                  <Text style={styles.headerTitle}>Settings</Text>
                  <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                {user && (
                  <View style={styles.userSection}>
                    <View style={styles.userAvatar}>
                      <Ionicons name="person" size={24} color="#fff" />
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userEmail} numberOfLines={1}>
                        {user.email}
                      </Text>
                      <Text style={styles.userLabel}>Signed in</Text>
                    </View>
                  </View>
                )}

                <View style={styles.menuItems}>
                  <LifetimeImpact />
                  <AchievementsList horizontal limit={3} />
                  
                  <TouchableOpacity style={styles.menuItem}>
                    <Ionicons name="person-outline" size={22} color="#333" />
                    <Text style={styles.menuItemText}>Account</Text>
                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.menuItem}
                    onPress={() => setShowHouseholdSettings(true)}
                  >
                    <Ionicons name="home-outline" size={22} color="#333" />
                    <View style={styles.menuItemContent}>
                      <Text style={styles.menuItemText}>Household</Text>
                      {hasHousehold ? (
                        <Text style={styles.menuItemSubtext}>{activeHousehold?.name}</Text>
                      ) : (
                        <Text style={styles.menuItemSubtext}>Create or join a household</Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                  </TouchableOpacity>

                  {households.length > 1 && (
                    <TouchableOpacity 
                      style={styles.menuItem}
                      onPress={() => setShowHouseholdSwitcher(true)}
                    >
                      <Ionicons name="swap-horizontal-outline" size={22} color="#333" />
                      <Text style={styles.menuItemText}>Switch Household</Text>
                      <Ionicons name="chevron-forward" size={20} color="#ccc" />
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity 
                    style={styles.menuItem}
                    onPress={() => setCalendarSettingsVisible(true)}
                  >
                    <Ionicons name="calendar-outline" size={22} color="#333" />
                    <Text style={styles.menuItemText}>Calendar Integration</Text>
                  <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>

                {(Platform.OS === 'ios' || Platform.OS === 'android') && (
                  <View style={styles.menuItem}>
                    <Ionicons name="heart-outline" size={22} color="#333" />
                    <View style={styles.menuItemContent}>
                      <Text style={styles.menuItemText}>Sync to Health App</Text>
                      <Text style={styles.menuItemSubtext}>Sync nutrition to Apple Health / Google Fit</Text>
                    </View>
                    <Switch
                      value={isHealthSyncEnabled}
                      onValueChange={toggleHealthSync}
                      trackColor={{ false: '#e0e0e0', true: '#a5d6a7' }}
                      thumbColor={isHealthSyncEnabled ? '#4CAF50' : '#f4f3f4'}
                    />
                  </View>
                )}

                <TouchableOpacity style={styles.menuItem}>
                    <Ionicons name="card-outline" size={22} color="#333" />
                  <Text style={styles.menuItemText}>Subscription</Text>
                  <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
                  <Ionicons name="notifications-outline" size={22} color="#333" />
                  <Text style={styles.menuItemText}>Notifications</Text>
                  <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
                  <Ionicons name="help-circle-outline" size={22} color="#333" />
                  <Text style={styles.menuItemText}>Help & Support</Text>
                  <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
                  <Ionicons name="log-out-outline" size={22} color="#f44336" />
                  <Text style={[styles.menuItemText, styles.logoutText]}>Sign Out</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.version}>Version 1.3.1</Text>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
    
    <CalendarSettingsModal
        visible={calendarSettingsVisible}
        onClose={() => setCalendarSettingsVisible(false)}
    />
    <HouseholdSettings
        visible={showHouseholdSettings}
        onClose={() => setShowHouseholdSettings(false)}
    />
    <HouseholdSwitcher
        visible={showHouseholdSwitcher}
        onClose={() => setShowHouseholdSwitcher(false)}
        onCreateNew={() => setShowHouseholdSettings(true)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
  },
  menu: {
    backgroundColor: '#fff',
    marginTop: 100,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  userLabel: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  menuItems: {
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  menuItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  menuItemSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  logoutText: {
    color: '#f44336',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
    marginHorizontal: 16,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    paddingVertical: 16,
  },
});
