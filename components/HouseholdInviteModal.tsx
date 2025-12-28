import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createInvite, generateInviteLink } from '../lib/householdService';

interface HouseholdInviteModalProps {
  visible: boolean;
  onClose: () => void;
  householdId: string;
}

export function HouseholdInviteModal({ visible, onClose, householdId }: HouseholdInviteModalProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const handleInvite = async () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const invite = await createInvite({ householdId, email: email.trim() });
      const link = generateInviteLink(invite.token);
      setInviteLink(link);
      setEmail('');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to send invite';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleShareLink = async () => {
    if (!inviteLink) return;
    try {
      await Share.share({
        message: `Join my household on Pantry Pal: ${inviteLink}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleClose = () => {
    setInviteLink(null);
    setEmail('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Invite Member</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {!inviteLink ? (
            <View style={styles.content}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="friend@example.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoFocus
              />
              <TouchableOpacity
                style={styles.inviteButton}
                onPress={handleInvite}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.inviteButtonText}>Send Invite</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.content}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
              </View>
              <Text style={styles.successTitle}>Invite Created!</Text>
              <Text style={styles.successText}>
                Share this link with the person you want to invite. It will expire in 7 days.
              </Text>
              
              <View style={styles.linkContainer}>
                <Text style={styles.linkText} numberOfLines={1}>
                  {inviteLink}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.shareButton}
                onPress={handleShareLink}
              >
                <Ionicons name="share-outline" size={20} color="#fff" />
                <Text style={styles.shareButtonText}>Share Link</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.doneButton}
                onPress={handleClose}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    gap: 16,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  inviteButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  successIcon: {
    alignItems: 'center',
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  successText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  linkContainer: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  linkText: {
    color: '#666',
    fontSize: 14,
  },
  shareButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  doneButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  doneButtonText: {
    color: '#666',
    fontSize: 16,
  },
});

