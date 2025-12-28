import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { ItemClaim } from '../lib/types';
import {
  getItemClaims,
  createItemClaim,
  removeItemClaim,
  getUserClaimForItem,
} from '../lib/claimsService';

interface ItemClaimBadgeProps {
  /** Pantry item ID */
  pantryItemId: string;
  /** Whether this is part of a household */
  isHousehold?: boolean;
  /** Compact mode for list views */
  compact?: boolean;
}

/**
 * Displays and manages item claims for pantry items
 */
export function ItemClaimBadge({ pantryItemId, isHousehold = false, compact = false }: ItemClaimBadgeProps) {
  const { user } = useAuth();
  const [claims, setClaims] = useState<ItemClaim[]>([]);
  const [userClaim, setUserClaim] = useState<ItemClaim | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadClaims = useCallback(async () => {
    if (!isHousehold) {
      setLoading(false);
      return;
    }
    try {
      const [allClaims, myClaimResult] = await Promise.all([
        getItemClaims(pantryItemId),
        user ? getUserClaimForItem({ pantryItemId, userId: user.id }) : Promise.resolve(null),
      ]);
      setClaims(allClaims);
      setUserClaim(myClaimResult);
    } catch (err) {
      console.error('Failed to load claims:', err);
    } finally {
      setLoading(false);
    }
  }, [pantryItemId, isHousehold, user]);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  const handleClaim = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      await createItemClaim({
        pantryItemId,
        userId: user.id,
        note: note.trim() || undefined,
      });
      setShowModal(false);
      setNote('');
      await loadClaims();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to claim item';
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnclaim = () => {
    if (!userClaim) return;
    Alert.alert('Remove Claim', 'Are you sure you want to unclaim this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeItemClaim(userClaim.id);
            await loadClaims();
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to remove claim';
            Alert.alert('Error', message);
          }
        },
      },
    ]);
  };

  if (!isHousehold || loading) {
    return null;
  }

  const otherClaims = claims.filter((c) => c.user_id !== user?.id);
  const hasOtherClaims = otherClaims.length > 0;

  if (compact) {
    if (claims.length === 0) return null;
    return (
      <View style={styles.compactBadge}>
        <Ionicons name="flag" size={12} color="#FF9800" />
        <Text style={styles.compactText}>{claims.length} claimed</Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        {userClaim ? (
          <TouchableOpacity style={styles.claimedBadge} onPress={handleUnclaim}>
            <Ionicons name="flag" size={16} color="#fff" />
            <Text style={styles.claimedText}>You claimed this</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.claimButton, hasOtherClaims && styles.claimButtonWarning]}
            onPress={() => setShowModal(true)}
          >
            <Ionicons
              name="flag-outline"
              size={16}
              color={hasOtherClaims ? '#FF9800' : '#4CAF50'}
            />
            <Text style={[styles.claimButtonText, hasOtherClaims && styles.claimButtonTextWarning]}>
              Claim
            </Text>
          </TouchableOpacity>
        )}
        {hasOtherClaims && (
          <View style={styles.otherClaims}>
            <Text style={styles.otherClaimsText}>
              Also claimed by:{' '}
              {otherClaims.map((c) => c.user_email?.split('@')[0] || 'Someone').join(', ')}
            </Text>
          </View>
        )}
      </View>
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Claim Item</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDescription}>
              Claiming an item lets other household members know you're reserving it for yourself.
            </Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Add a note (optional)"
              value={note}
              onChangeText={setNote}
              maxLength={100}
            />
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleClaim}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Claim Item</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff3e0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  compactText: {
    fontSize: 11,
    color: '#FF9800',
    fontWeight: '500',
  },
  claimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  claimButtonWarning: {
    backgroundColor: '#fff3e0',
  },
  claimButtonText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  claimButtonTextWarning: {
    color: '#FF9800',
  },
  claimedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  claimedText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  otherClaims: {
    marginTop: 8,
  },
  otherClaimsText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 360,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

