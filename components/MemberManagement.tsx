import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHouseholdContext } from '../context/HouseholdContext';
import { useHousehold } from '../hooks/useHousehold';
import { useAuth } from '../context/AuthContext';
import { HouseholdMember, HouseholdRole, HOUSEHOLD_ROLES } from '../lib/types';

interface MemberManagementProps {
  visible: boolean;
  onClose: () => void;
}

export function MemberManagement({ visible, onClose }: MemberManagementProps) {
  const { user } = useAuth();
  const { activeHousehold, currentRole, hasPermission } = useHouseholdContext();
  const {
    changeMemberRole,
    removeMemberFromHousehold,
    transferHouseholdOwnership,
    operationLoading,
  } = useHousehold();
  const [selectedMember, setSelectedMember] = useState<HouseholdMember | null>(null);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const members = activeHousehold?.members || [];

  const handleRoleChange = async (memberId: string, newRole: HouseholdRole) => {
    setShowRoleMenu(false);
    if (newRole === 'owner') {
      Alert.alert(
        'Transfer Ownership',
        'Are you sure you want to transfer ownership? You will become an admin.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Transfer',
            style: 'destructive',
            onPress: async () => {
              try {
                const member = members.find((m) => m.id === memberId);
                if (member) {
                  await transferHouseholdOwnership(member.user_id);
                }
              } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to transfer ownership';
                Alert.alert('Error', message);
              }
            },
          },
        ]
      );
      return;
    }
    try {
      await changeMemberRole(memberId, newRole);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update role';
      Alert.alert('Error', message);
    }
  };

  const handleRemoveMember = (member: HouseholdMember) => {
    if (member.role === 'owner') {
      Alert.alert('Cannot Remove', 'The owner cannot be removed. Transfer ownership first.');
      return;
    }
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${member.user_email || 'this member'} from the household?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMemberFromHousehold(member.id);
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : 'Failed to remove member';
              Alert.alert('Error', message);
            }
          },
        },
      ]
    );
  };

  const getRoleColor = (role: HouseholdRole): string => {
    switch (role) {
      case 'owner':
        return '#FF9800';
      case 'admin':
        return '#2196F3';
      default:
        return '#4CAF50';
    }
  };

  const getRoleIcon = (role: HouseholdRole): keyof typeof Ionicons.glyphMap => {
    switch (role) {
      case 'owner':
        return 'shield';
      case 'admin':
        return 'shield-half';
      default:
        return 'person';
    }
  };

  const canManageMember = (member: HouseholdMember): boolean => {
    if (!hasPermission('canManageMembers')) return false;
    if (member.user_id === user?.id) return false;
    if (member.role === 'owner' && currentRole !== 'owner') return false;
    return true;
  };

  const renderMemberCard = (member: HouseholdMember) => {
    const isCurrentUser = member.user_id === user?.id;
    const canManage = canManageMember(member);
    return (
      <View key={member.id} style={styles.memberCard}>
        <View style={styles.memberInfo}>
          <View style={[styles.avatar, { backgroundColor: getRoleColor(member.role) }]}>
            <Ionicons name={getRoleIcon(member.role)} size={20} color="#fff" />
          </View>
          <View style={styles.memberDetails}>
            <Text style={styles.memberEmail}>
              {member.user_email || 'Unknown User'}
              {isCurrentUser && <Text style={styles.youLabel}> (You)</Text>}
            </Text>
            <View style={styles.roleContainer}>
              <View style={[styles.roleBadge, { backgroundColor: getRoleColor(member.role) + '20' }]}>
                <Text style={[styles.roleText, { color: getRoleColor(member.role) }]}>
                  {member.role}
                </Text>
              </View>
              <Text style={styles.joinedDate}>
                Joined {new Date(member.joined_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>
        {canManage && (
          <View style={styles.memberActions}>
            <TouchableOpacity
              style={styles.actionIcon}
              onPress={() => {
                setSelectedMember(member);
                setShowRoleMenu(true);
              }}
            >
              <Ionicons name="swap-horizontal" size={20} color="#666" />
            </TouchableOpacity>
            {hasPermission('canRemoveMembers') && member.role !== 'owner' && (
              <TouchableOpacity
                style={styles.actionIcon}
                onPress={() => handleRemoveMember(member)}
              >
                <Ionicons name="close-circle-outline" size={20} color="#f44336" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
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
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Members</Text>
            <View style={styles.placeholder} />
          </View>
          <ScrollView style={styles.scrollView}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {members.length} Member{members.length !== 1 ? 's' : ''}
              </Text>
              {members.map(renderMemberCard)}
            </View>
            <View style={styles.permissionsSection}>
              <Text style={styles.permissionsTitle}>Role Permissions</Text>
              <View style={styles.permissionCard}>
                <View style={styles.permissionHeader}>
                  <Ionicons name="shield" size={18} color="#FF9800" />
                  <Text style={styles.permissionRole}>Owner</Text>
                </View>
                <Text style={styles.permissionDesc}>
                  Full control: manage members, delete household, all admin permissions
                </Text>
              </View>
              <View style={styles.permissionCard}>
                <View style={styles.permissionHeader}>
                  <Ionicons name="shield-half" size={18} color="#2196F3" />
                  <Text style={styles.permissionRole}>Admin</Text>
                </View>
                <Text style={styles.permissionDesc}>
                  Invite members, manage pantry/meals/calendar, edit settings
                </Text>
              </View>
              <View style={styles.permissionCard}>
                <View style={styles.permissionHeader}>
                  <Ionicons name="person" size={18} color="#4CAF50" />
                  <Text style={styles.permissionRole}>Member</Text>
                </View>
                <Text style={styles.permissionDesc}>
                  View all data, add/edit pantry items, view meal plans
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
      {/* Role Selection Menu */}
      <Modal
        visible={showRoleMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRoleMenu(false)}
      >
        <TouchableOpacity
          style={styles.roleMenuOverlay}
          activeOpacity={1}
          onPress={() => setShowRoleMenu(false)}
        >
          <View style={styles.roleMenuContainer}>
            <Text style={styles.roleMenuTitle}>Change Role</Text>
            <Text style={styles.roleMenuSubtitle}>
              {selectedMember?.user_email}
            </Text>
            {HOUSEHOLD_ROLES.map((role) => {
              const isCurrentRole = selectedMember?.role === role;
              const canSelectRole =
                role !== 'owner' || (currentRole === 'owner' && hasPermission('canTransferOwnership'));
              if (!canSelectRole) return null;
              return (
                <TouchableOpacity
                  key={role}
                  style={[styles.roleOption, isCurrentRole && styles.roleOptionActive]}
                  onPress={() => selectedMember && handleRoleChange(selectedMember.id, role)}
                  disabled={isCurrentRole || operationLoading}
                >
                  <Ionicons
                    name={getRoleIcon(role)}
                    size={20}
                    color={isCurrentRole ? '#4CAF50' : getRoleColor(role)}
                  />
                  <Text
                    style={[
                      styles.roleOptionText,
                      isCurrentRole && styles.roleOptionTextActive,
                    ]}
                  >
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </Text>
                  {isCurrentRole && (
                    <Ionicons name="checkmark" size={20} color="#4CAF50" />
                  )}
                  {operationLoading && !isCurrentRole && (
                    <ActivityIndicator size="small" color="#666" />
                  )}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowRoleMenu(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '60%',
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
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberDetails: {
    marginLeft: 12,
    flex: 1,
  },
  memberEmail: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  youLabel: {
    color: '#4CAF50',
    fontWeight: '400',
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  joinedDate: {
    fontSize: 11,
    color: '#999',
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionsSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  permissionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  permissionCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  permissionRole: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textTransform: 'capitalize',
  },
  permissionDesc: {
    fontSize: 12,
    color: '#666',
    marginLeft: 26,
    lineHeight: 18,
  },
  roleMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleMenuContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '85%',
    maxWidth: 340,
    padding: 20,
  },
  roleMenuTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  roleMenuSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
    gap: 12,
  },
  roleOptionActive: {
    backgroundColor: '#e8f5e9',
  },
  roleOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  roleOptionTextActive: {
    fontWeight: '600',
    color: '#4CAF50',
  },
  cancelButton: {
    paddingVertical: 14,
    marginTop: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
});

