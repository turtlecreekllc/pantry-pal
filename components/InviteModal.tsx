import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useHousehold } from '../hooks/useHousehold';

interface InviteModalProps {
  visible: boolean;
  onClose: () => void;
}

export function InviteModal({ visible, onClose }: InviteModalProps) {
  const { inviteMember, getInviteLink, operationLoading } = useHousehold();
  const [email, setEmail] = useState('');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const validateEmail = (emailToValidate: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailToValidate);
  };

  const handleSendInvite = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }
    if (!validateEmail(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    try {
      const invite = await inviteMember(email.trim().toLowerCase());
      const link = getInviteLink(invite.token);
      setInviteLink(link);
      setEmail('');
      Alert.alert(
        'Invite Sent',
        `An invitation has been sent to ${email}. You can also share the invite link directly.`
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send invite';
      Alert.alert('Error', message);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    try {
      await Clipboard.setStringAsync(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      Alert.alert('Error', 'Failed to copy link');
    }
  };

  const handleShareLink = async () => {
    if (!inviteLink) return;
    try {
      await Share.share({
        message: `Join my household on Pantry Pal! ${inviteLink}`,
        url: Platform.OS === 'ios' ? inviteLink : undefined,
      });
    } catch {
      // User cancelled share
    }
  };

  const handleClose = () => {
    setEmail('');
    setInviteLink(null);
    setCopied(false);
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
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Invite Member</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name="person-add" size={40} color="#4CAF50" />
            </View>
            <Text style={styles.description}>
              Invite family members or roommates to share your household pantry, meal plans, and grocery lists.
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <TouchableOpacity
              style={[styles.sendButton, operationLoading && styles.disabledButton]}
              onPress={handleSendInvite}
              disabled={operationLoading}
            >
              {operationLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#fff" />
                  <Text style={styles.sendButtonText}>Send Invite</Text>
                </>
              )}
            </TouchableOpacity>
            {inviteLink && (
              <View style={styles.linkSection}>
                <Text style={styles.linkLabel}>Or share this link:</Text>
                <View style={styles.linkContainer}>
                  <Text style={styles.linkText} numberOfLines={1}>
                    {inviteLink}
                  </Text>
                </View>
                <View style={styles.linkActions}>
                  <TouchableOpacity
                    style={[styles.linkButton, copied && styles.linkButtonCopied]}
                    onPress={handleCopyLink}
                  >
                    <Ionicons
                      name={copied ? 'checkmark' : 'copy-outline'}
                      size={18}
                      color={copied ? '#4CAF50' : '#666'}
                    />
                    <Text style={[styles.linkButtonText, copied && styles.linkButtonTextCopied]}>
                      {copied ? 'Copied!' : 'Copy'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.linkButton} onPress={handleShareLink}>
                    <Ionicons name="share-outline" size={18} color="#666" />
                    <Text style={styles.linkButtonText}>Share</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={20} color="#666" />
              <Text style={styles.infoText}>
                Invites expire after 7 days. New members will join as regular members but you can change their role later.
              </Text>
            </View>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
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
  content: {
    padding: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  linkSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  linkLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  linkContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  linkText: {
    fontSize: 12,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  linkActions: {
    flexDirection: 'row',
    gap: 12,
  },
  linkButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    gap: 6,
  },
  linkButtonCopied: {
    backgroundColor: '#e8f5e9',
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  linkButtonTextCopied: {
    color: '#4CAF50',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    marginTop: 20,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
});

