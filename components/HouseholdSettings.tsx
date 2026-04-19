import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHouseholdContext } from '../context/HouseholdContext';
import { useAuth } from '../context/AuthContext';
import { removeMember, transferOwnership } from '../lib/householdService';
import { HouseholdInviteModal } from './HouseholdInviteModal';
import { ManagePendingInvites } from './ManagePendingInvites';

interface HouseholdSettingsProps {
  visible: boolean;
  onClose: () => void;
}

export function HouseholdSettings({ visible, onClose }: HouseholdSettingsProps) {
  const { user } = useAuth();
  const {
    activeHousehold,
    createNewHousehold,
    leaveCurrentHousehold,
    deleteCurrentHousehold,
    refreshHouseholds,
    loading,
    error,
    currentRole,
    hasPermission,
    removeMember,
    transferOwnership,
  } = useHouseholdContext();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newHouseholdName, setNewHouseholdName] = useState('');

  const isOwner = currentRole === 'owner';
  const isAdmin = currentRole === 'admin' || isOwner;

  const handleCreateHousehold = async () => {
    if (!newHouseholdName.trim()) {
      Alert.alert('Error', 'Please enter a household name');
      return;
    }
    try {
      await createNewHousehold(newHouseholdName.trim());
      setNewHouseholdName('');
      setIsCreating(false);
      Alert.alert('Success', 'Household created!');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to create household';
      Alert.alert('Error', message);
    }
  };

  const handleLeaveHousehold = () => {
    if (isOwner) {
      Alert.alert(
        'Cannot Leave',
        'As the owner, you cannot leave the household. You must either transfer ownership to another member first, or delete the household.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }
    Alert.alert(
      'Leave Household',
      'Are you sure you want to leave this household? You will lose access to the shared pantry and meal plans.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveCurrentHousehold();
              onClose();
            } catch (e: unknown) {
              const message = e instanceof Error ? e.message : 'Failed to leave household';
              Alert.alert('Error', message);
            }
          },
        },
      ]
    );
  };

  const handleDeleteHousehold = () => {
    Alert.alert(
      'Delete Household',
      'This action cannot be undone. All data including pantry items and meal plans will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCurrentHousehold();
              onClose();
            } catch (e: unknown) {
              const message = e instanceof Error ? e.message : 'Failed to delete household';
              Alert.alert('Error', message);
            }
          },
        },
      ]
    );
  };

  if (!activeHousehold && !isCreating) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
              <Text style={styles.headerButtonText}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Household</Text>
            <View style={styles.headerButton} />
          </View>

          <View style={styles.emptyState}>
            <Ionicons name="home-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Household</Text>
            <Text style={styles.emptyText}>
              Create a household to share your pantry and meal plans with family or roommates.
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setIsCreating(true)}
            >
              <Text style={styles.createButtonText}>Create Household</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  if (isCreating) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => setIsCreating(false)}
              style={styles.headerButton}
            >
              <Text style={styles.headerButtonText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>New Household</Text>
            <View style={styles.headerButton} />
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Household Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Smith Family"
              value={newHouseholdName}
              onChangeText={setNewHouseholdName}
              autoFocus
            />
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateHousehold}
            >
              <Text style={styles.createButtonText}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
              <Text style={styles.headerButtonText}>Done</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Household Settings</Text>
            <View style={styles.headerButton} />
          </View>

          <ScrollView style={styles.content}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Info</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Name</Text>
                <Text style={styles.value}>{activeHousehold?.name}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Role</Text>
                <Text style={styles.valueCapitalized}>{currentRole}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Members ({activeHousehold?.members.length})</Text>
                {isAdmin && (
                  <TouchableOpacity onPress={() => setShowInviteModal(true)}>
                    <Text style={styles.actionText}>Invite</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {activeHousehold?.members.map((member) => (
                <View key={member.id} style={styles.memberRow}>
                    <View style={styles.memberInfo}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {member.user_email ? member.user_email[0].toUpperCase() : '?'}
                            </Text>
                        </View>
                        <View>
                            <Text style={styles.memberEmail}>
                                {member.user_id === user?.id ? 'You' : member.user_email || 'Unknown User'}
                            </Text>
                            <Text style={styles.memberRole}>
                                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                            </Text>
                        </View>
                    </View>
                    
                    {member.user_id !== user?.id && (
                        <View style={styles.memberActions}>
                            {isOwner && (
                                <TouchableOpacity
                                    onPress={() => {
                                        Alert.alert(
                                            'Transfer Ownership',
                                            `Make ${member.user_email} the new owner? You will become an admin.`,
                                            [
                                                { text: 'Cancel', style: 'cancel' },
                                                {
                                                    text: 'Transfer',
                                                    style: 'destructive',
                                                    onPress: async () => {
                                                        try {
                                                            if (!activeHousehold) return;
                                                            await transferOwnership(member.user_id);
                                                            await refreshHouseholds();
                                                            onClose();
                                                        } catch (e: unknown) {
                                                            const message = e instanceof Error ? e.message : 'Failed to transfer ownership';
                                                            Alert.alert('Error', message);
                                                        }
                                                    }
                                                }
                                            ]
                                        );
                                    }}
                                    style={styles.actionButton}
                                >
                                    <Ionicons name="key-outline" size={20} color="#666" />
                                </TouchableOpacity>
                            )}
                            {(isOwner || hasPermission('canRemoveMembers')) && (
                                <TouchableOpacity
                                    onPress={() => {
                                        Alert.alert(
                                            'Remove Member',
                                            `Are you sure you want to remove ${member.user_email || 'this user'}?`,
                                            [
                                                { text: 'Cancel', style: 'cancel' },
                                                {
                                                    text: 'Remove',
                                                    style: 'destructive',
                                                    onPress: async () => {
                                                        try {
                                                            await removeMember(member.id);
                                                            await refreshHouseholds();
                                                        } catch (e: unknown) {
                                                            const message = e instanceof Error ? e.message : 'Failed to remove member';
                                                            Alert.alert('Error', message);
                                                        }
                                                    }
                                                }
                                            ]
                                        );
                                    }}
                                    style={styles.actionButton}
                                >
                                    <Ionicons name="trash-outline" size={20} color="#f44336" />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>
              ))}
            </View>

            {isAdmin && activeHousehold && (
              <View style={styles.section}>
                <ManagePendingInvites 
                  householdId={activeHousehold.id}
                  onInvitesChange={refreshHouseholds}
                />
              </View>
            )}

            <View style={styles.section}>
                <TouchableOpacity
                    style={styles.dangerRow}
                    onPress={handleLeaveHousehold}
                >
                    <Text style={styles.dangerText}>Leave Household</Text>
                </TouchableOpacity>
                
                {isOwner && (
                    <TouchableOpacity
                        style={[styles.dangerRow, styles.lastRow]}
                        onPress={handleDeleteHousehold}
                    >
                        <Text style={styles.dangerText}>Delete Household</Text>
                    </TouchableOpacity>
                )}
            </View>
          </ScrollView>
        </View>
      </Modal>
      
      <HouseholdInviteModal
        visible={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        householdId={activeHousehold?.id || ''}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerButton: {
    minWidth: 60,
  },
  headerButtonText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    padding: 16,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 16,
    color: '#333',
  },
  value: {
    fontSize: 16,
    color: '#666',
  },
  valueCapitalized: {
    fontSize: 16,
    color: '#666',
    textTransform: 'capitalize',
  },
  actionText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '500',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  memberEmail: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  memberRole: {
    fontSize: 14,
    color: '#666',
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    padding: 4,
  },
  dangerRow: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  dangerText: {
    fontSize: 16,
    color: '#f44336',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  form: {
    padding: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    marginTop: 8,
  },
});
