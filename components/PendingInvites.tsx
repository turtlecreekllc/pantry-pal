import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHouseholdContext } from '../context/HouseholdContext';
import { useHousehold } from '../hooks/useHousehold';
import { HouseholdInvite } from '../lib/types';

interface PendingInvitesProps {
  /** Called after an invite is accepted/declined */
  onInviteHandled?: () => void;
}

/**
 * Displays pending household invites for the current user.
 * Shows as a banner/card that can be dismissed.
 */
export function PendingInvites({ onInviteHandled }: PendingInvitesProps) {
  const { pendingInvites, refreshInvites, refreshHouseholds } = useHouseholdContext();
  const { acceptInvitation, declineInvitation, operationLoading } = useHousehold();

  if (!pendingInvites || pendingInvites.length === 0) {
    return null;
  }

  const handleAccept = async (invite: HouseholdInvite) => {
    try {
      await acceptInvitation(invite.id);
      await refreshHouseholds();
      await refreshInvites();
      onInviteHandled?.();
      Alert.alert('Success', `You've joined ${invite.household_name || 'the household'}!`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to accept invite';
      Alert.alert('Error', message);
    }
  };

  const handleDecline = (invite: HouseholdInvite) => {
    Alert.alert(
      'Decline Invite',
      `Are you sure you want to decline the invite to ${invite.household_name || 'this household'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              await declineInvitation(invite.id);
              await refreshInvites();
              onInviteHandled?.();
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : 'Failed to decline invite';
              Alert.alert('Error', message);
            }
          },
        },
      ]
    );
  };

  const formatExpiryDate = (expiresAt: string): string => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) {
      return 'Expires soon';
    }
    if (diffDays === 1) {
      return 'Expires tomorrow';
    }
    return `Expires in ${diffDays} days`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="mail-unread" size={20} color="#4CAF50" />
        <Text style={styles.headerText}>
          {pendingInvites.length} Pending Invite{pendingInvites.length !== 1 ? 's' : ''}
        </Text>
      </View>
      {pendingInvites.map((invite) => (
        <View key={invite.id} style={styles.inviteCard}>
          <View style={styles.inviteInfo}>
            <Text style={styles.householdName}>
              {invite.household_name || 'Unknown Household'}
            </Text>
            <Text style={styles.expiryText}>{formatExpiryDate(invite.expires_at)}</Text>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.declineButton}
              onPress={() => handleDecline(invite)}
              disabled={operationLoading}
            >
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.acceptButton, operationLoading && styles.disabledButton]}
              onPress={() => handleAccept(invite)}
              disabled={operationLoading}
            >
              {operationLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={styles.acceptButtonText}>Join</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#c8e6c9',
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2e7d32',
  },
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8f5e9',
  },
  inviteInfo: {
    flex: 1,
  },
  householdName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  expiryText: {
    fontSize: 12,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  declineButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

