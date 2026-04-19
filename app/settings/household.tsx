import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useHouseholdContext } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { HouseholdInviteModal } from '../../components/HouseholdInviteModal';
import { ManagePendingInvites } from '../../components/ManagePendingInvites';
import { Button } from '../../components/ui/Button';
import { colors, typography, spacing, borderRadius } from '../../lib/theme';

export default function HouseholdScreen(): React.ReactElement {
  const router = useRouter();
  const { user } = useAuth();
  const {
    activeHousehold,
    createNewHousehold,
    leaveCurrentHousehold,
    deleteCurrentHousehold,
    refreshHouseholds,
    loading,
    currentRole,
    hasPermission,
    removeMember,
    transferOwnership,
  } = useHouseholdContext();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newHouseholdName, setNewHouseholdName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOwner = currentRole === 'owner';
  const isAdmin = currentRole === 'admin' || isOwner;

  const handleCreateHousehold = async (): Promise<void> => {
    if (!newHouseholdName.trim()) {
      Alert.alert('Error', 'Please enter a household name');
      return;
    }
    setIsSubmitting(true);
    try {
      await createNewHousehold(newHouseholdName.trim());
      setNewHouseholdName('');
      setIsCreating(false);
      Alert.alert('Success', 'Household created!');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to create household';
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLeaveHousehold = (): void => {
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
              router.back();
            } catch (e: unknown) {
              const message = e instanceof Error ? e.message : 'Failed to leave household';
              Alert.alert('Error', message);
            }
          },
        },
      ]
    );
  };

  const handleDeleteHousehold = (): void => {
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
              router.back();
            } catch (e: unknown) {
              const message = e instanceof Error ? e.message : 'Failed to delete household';
              Alert.alert('Error', message);
            }
          },
        },
      ]
    );
  };

  const handleTransferOwnership = (memberId: string, memberEmail: string): void => {
    Alert.alert(
      'Transfer Ownership',
      `Make ${memberEmail} the new owner? You will become an admin.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Transfer',
          style: 'destructive',
          onPress: async () => {
            try {
              await transferOwnership(memberId);
              await refreshHouseholds();
            } catch (e: unknown) {
              const message = e instanceof Error ? e.message : 'Failed to transfer ownership';
              Alert.alert('Error', message);
            }
          },
        },
      ]
    );
  };

  const handleRemoveMember = (memberId: string, memberEmail: string): void => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${memberEmail || 'this user'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMember(memberId);
              await refreshHouseholds();
            } catch (e: unknown) {
              const message = e instanceof Error ? e.message : 'Failed to remove member';
              Alert.alert('Error', message);
            }
          },
        },
      ]
    );
  };

  const handleShareInvite = async (): Promise<void> => {
    if (!activeHousehold) return;
    try {
      await Share.share({
        message: `Join my household "${activeHousehold.name}" on Dinner Plans AI! Download the app and use this link to join.`,
        title: 'Join my Household',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (!activeHousehold && !isCreating) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.emptyContent}>
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="home-outline" size={64} color={colors.brownMuted} />
          </View>
          <Text style={styles.emptyTitle}>No Household</Text>
          <Text style={styles.emptyText}>
            Create a household to share your pantry and meal plans with family or roommates.
          </Text>
          <Button
            title="Create Household"
            onPress={() => setIsCreating(true)}
            style={styles.createButton}
          />
        </View>
      </ScrollView>
    );
  }

  if (isCreating) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.formContent}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create New Household</Text>
          <Text style={styles.inputLabel}>Household Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Smith Family"
            placeholderTextColor={colors.brownMuted}
            value={newHouseholdName}
            onChangeText={setNewHouseholdName}
            autoFocus
          />
          <View style={styles.formButtons}>
            <Button
              title="Cancel"
              variant="secondary"
              onPress={() => {
                setIsCreating(false);
                setNewHouseholdName('');
              }}
              style={styles.formButton}
            />
            <Button
              title={isSubmitting ? 'Creating...' : 'Create'}
              onPress={handleCreateHousehold}
              disabled={isSubmitting}
              style={styles.formButton}
            />
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Household Info */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Household Info</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{activeHousehold?.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Your Role</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{currentRole}</Text>
            </View>
          </View>
        </View>

        {/* Members Section */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Members ({activeHousehold?.members.length})
            </Text>
            {isAdmin && (
              <TouchableOpacity
                style={styles.inviteButton}
                onPress={() => setShowInviteModal(true)}
              >
                <Ionicons name="person-add-outline" size={18} color={colors.success} />
                <Text style={styles.inviteButtonText}>Invite</Text>
              </TouchableOpacity>
            )}
          </View>
          {activeHousehold?.members.map((member) => (
            <View key={member.id} style={styles.memberRow}>
              <View style={styles.memberInfo}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>
                    {member.user_email ? member.user_email[0].toUpperCase() : '?'}
                  </Text>
                </View>
                <View style={styles.memberDetails}>
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
                      onPress={() => handleTransferOwnership(member.user_id, member.user_email || '')}
                      style={styles.actionButton}
                      accessibilityLabel="Transfer ownership"
                    >
                      <Ionicons name="key-outline" size={20} color={colors.brownMuted} />
                    </TouchableOpacity>
                  )}
                  {(isOwner || hasPermission('canRemoveMembers')) && (
                    <TouchableOpacity
                      onPress={() => handleRemoveMember(member.id, member.user_email || '')}
                      style={styles.actionButton}
                      accessibilityLabel="Remove member"
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Pending Invites */}
        {isAdmin && activeHousehold && (
          <View style={styles.card}>
            <ManagePendingInvites
              householdId={activeHousehold.id}
              onInvitesChange={refreshHouseholds}
            />
          </View>
        )}

        {/* Sharing Options */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Sharing</Text>
          <TouchableOpacity style={styles.shareRow} onPress={handleShareInvite}>
            <View style={styles.shareIcon}>
              <Ionicons name="share-social-outline" size={22} color={colors.brown} />
            </View>
            <View style={styles.shareInfo}>
              <Text style={styles.shareTitle}>Share Invite Link</Text>
              <Text style={styles.shareDescription}>
                Send an invite link to family or roommates
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.brownMuted} />
          </TouchableOpacity>
          {isAdmin && (
            <TouchableOpacity
              style={styles.shareRow}
              onPress={() => setShowInviteModal(true)}
            >
              <View style={styles.shareIcon}>
                <Ionicons name="mail-outline" size={22} color={colors.brown} />
              </View>
              <View style={styles.shareInfo}>
                <Text style={styles.shareTitle}>Invite by Email</Text>
                <Text style={styles.shareDescription}>
                  Send a direct email invitation
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.brownMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Danger Zone */}
        <View style={styles.card}>
          <Text style={styles.sectionTitleDanger}>Danger Zone</Text>
          <TouchableOpacity style={styles.dangerRow} onPress={handleLeaveHousehold}>
            <Ionicons name="exit-outline" size={22} color={colors.error} />
            <Text style={styles.dangerText}>Leave Household</Text>
          </TouchableOpacity>
          {isOwner && (
            <TouchableOpacity style={styles.dangerRow} onPress={handleDeleteHousehold}>
              <Ionicons name="trash-outline" size={22} color={colors.error} />
              <Text style={styles.dangerText}>Delete Household</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

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
    backgroundColor: colors.cream,
  },
  content: {
    padding: spacing.space4,
    paddingBottom: spacing.space8,
  },
  emptyContent: {
    flex: 1,
    padding: spacing.space4,
  },
  formContent: {
    padding: spacing.space4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.space8,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.full,
    backgroundColor: colors.creamDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.space4,
  },
  emptyTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.textXl,
    fontWeight: typography.fontBold,
    color: colors.brown,
    marginBottom: spacing.space2,
  },
  emptyText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textBase,
    color: colors.brownMuted,
    textAlign: 'center',
    marginBottom: spacing.space6,
    lineHeight: 24,
  },
  createButton: {
    minWidth: 200,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.brown,
    padding: spacing.space4,
    marginBottom: spacing.space4,
  },
  cardTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.textLg,
    fontWeight: typography.fontBold,
    color: colors.brown,
    marginBottom: spacing.space4,
  },
  inputLabel: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    fontWeight: typography.fontMedium,
    color: colors.brown,
    marginBottom: spacing.space2,
  },
  input: {
    backgroundColor: colors.cream,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.brown,
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space3,
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textBase,
    color: colors.brown,
    marginBottom: spacing.space4,
  },
  formButtons: {
    flexDirection: 'row',
    gap: spacing.space3,
  },
  formButton: {
    flex: 1,
  },
  sectionTitle: {
    fontFamily: 'Quicksand-SemiBold',
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
    marginBottom: spacing.space3,
  },
  sectionTitleDanger: {
    fontFamily: 'Quicksand-SemiBold',
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.error,
    marginBottom: spacing.space3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.space3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.space2,
  },
  label: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textBase,
    color: colors.brownMuted,
  },
  value: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  roleBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.space3,
    paddingVertical: spacing.space1,
    borderRadius: borderRadius.full,
  },
  roleText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textSm,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
    textTransform: 'capitalize',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space1,
    paddingHorizontal: spacing.space3,
    paddingVertical: spacing.space2,
    backgroundColor: colors.successBg,
    borderRadius: borderRadius.md,
  },
  inviteButtonText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textSm,
    fontWeight: typography.fontSemibold,
    color: colors.success,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.space3,
    borderTopWidth: 1,
    borderTopColor: colors.creamDark,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.brown,
  },
  memberAvatarText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.textBase,
    fontWeight: typography.fontBold,
    color: colors.brown,
  },
  memberDetails: {
    marginLeft: spacing.space3,
    flex: 1,
  },
  memberEmail: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  memberRole: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    textTransform: 'capitalize',
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space3,
  },
  actionButton: {
    padding: spacing.space2,
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.space3,
    borderTopWidth: 1,
    borderTopColor: colors.creamDark,
  },
  shareIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareInfo: {
    flex: 1,
    marginLeft: spacing.space3,
  },
  shareTitle: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  shareDescription: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space3,
    paddingVertical: spacing.space3,
    borderTopWidth: 1,
    borderTopColor: colors.creamDark,
  },
  dangerText: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textBase,
    fontWeight: typography.fontMedium,
    color: colors.error,
  },
});

