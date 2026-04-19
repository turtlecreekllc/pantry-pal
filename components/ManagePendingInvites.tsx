import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHousehold } from '../hooks/useHousehold';
import { HouseholdInvite } from '../lib/types';

interface ManagePendingInvitesProps {
  /** Household ID to show invites for */
  householdId: string;
  /** Called when invites list changes */
  onInvitesChange?: () => void;
}

/**
 * Component for managing pending household invites.
 * Allows owners/admins to view and revoke pending invitations.
 */
export function ManagePendingInvites({ 
  householdId, 
  onInvitesChange 
}: ManagePendingInvitesProps) {
  const { fetchPendingInvites, revokeInvitation, operationLoading } = useHousehold();
  const [invites, setInvites] = useState<HouseholdInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const loadInvites = useCallback(async () => {
    setLoading(true);
    try {
      const pendingInvites = await fetchPendingInvites();
      setInvites(pendingInvites);
    } catch (err) {
      console.error('Failed to load pending invites:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchPendingInvites]);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  const handleRevokeInvite = (invite: HouseholdInvite) => {
    Alert.alert(
      'Revoke Invitation',
      `Are you sure you want to revoke the invitation sent to ${invite.email}? They will no longer be able to join using this invite.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            setRevokingId(invite.id);
            try {
              await revokeInvitation(invite.id);
              setInvites((prev) => prev.filter((i) => i.id !== invite.id));
              onInvitesChange?.();
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : 'Failed to revoke invite';
              Alert.alert('Error', message);
            } finally {
              setRevokingId(null);
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
    if (diffDays <= 0) return 'Expires today';
    if (diffDays === 1) return 'Expires tomorrow';
    return `Expires in ${diffDays} days`;
  };

  const formatSentDate = (createdAt: string): string => {
    const date = new Date(createdAt);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined 
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading invites...</Text>
      </View>
    );
  }

  if (invites.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="mail-outline" size={24} color="#ccc" />
        <Text style={styles.emptyText}>No pending invites</Text>
      </View>
    );
  }

  const renderInviteItem = ({ item }: { item: HouseholdInvite }) => {
    const isRevoking = revokingId === item.id;
    return (
      <View style={styles.inviteItem}>
        <View style={styles.inviteInfo}>
          <View style={styles.inviteHeader}>
            <Ionicons name="mail-unread-outline" size={18} color="#4CAF50" />
            <Text style={styles.inviteEmail} numberOfLines={1}>
              {item.email}
            </Text>
          </View>
          <View style={styles.inviteDetails}>
            <Text style={styles.inviteDate}>Sent {formatSentDate(item.created_at)}</Text>
            <Text style={styles.separator}>•</Text>
            <Text style={styles.inviteExpiry}>{formatExpiryDate(item.expires_at)}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.revokeButton, isRevoking && styles.revokeButtonDisabled]}
          onPress={() => handleRevokeInvite(item)}
          disabled={isRevoking || operationLoading}
          accessibilityLabel={`Revoke invitation to ${item.email}`}
          accessibilityRole="button"
        >
          {isRevoking ? (
            <ActivityIndicator size="small" color="#f44336" />
          ) : (
            <Ionicons name="close-circle-outline" size={22} color="#f44336" />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Pending Invites ({invites.length})</Text>
        <TouchableOpacity 
          onPress={loadInvites} 
          style={styles.refreshButton}
          accessibilityLabel="Refresh invites"
          accessibilityRole="button"
        >
          <Ionicons name="refresh-outline" size={18} color="#666" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={invites}
        keyExtractor={(item) => item.id}
        renderItem={renderInviteItem}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  refreshButton: {
    padding: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
  inviteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  inviteInfo: {
    flex: 1,
    marginRight: 12,
  },
  inviteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  inviteEmail: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  inviteDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 26,
  },
  inviteDate: {
    fontSize: 12,
    color: '#999',
  },
  separator: {
    fontSize: 12,
    color: '#ccc',
    marginHorizontal: 6,
  },
  inviteExpiry: {
    fontSize: 12,
    color: '#FF9800',
  },
  revokeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  revokeButtonDisabled: {
    opacity: 0.5,
  },
});

export default ManagePendingInvites;

