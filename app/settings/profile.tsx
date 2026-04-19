import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Image,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { useUserPreferences, COOKING_EQUIPMENT_OPTIONS } from '../../hooks/useUserPreferences';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { colors, typography, spacing, borderRadius, shadows } from '../../lib/theme';

interface UserProfile {
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { 
    measurementSystem, 
    setMeasurementSystem,
    highAltitudeCooking,
    setHighAltitudeCooking,
    cookingEquipment,
    toggleCookingEquipment,
  } = useUserPreferences();
  const [isEditing, setIsEditing] = useState(false);
  const [isPasswordEditing, setIsPasswordEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    firstName: '',
    lastName: '',
    avatarUrl: null,
  });
  const [editedProfile, setEditedProfile] = useState<UserProfile>({
    firstName: '',
    lastName: '',
    avatarUrl: null,
  });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (user?.user_metadata) {
      const metadata = user.user_metadata;
      const initialProfile = {
        firstName: metadata.first_name || '',
        lastName: metadata.last_name || '',
        avatarUrl: metadata.avatar_url || null,
      };
      setProfile(initialProfile);
      setEditedProfile(initialProfile);
    }
  }, [user]);

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library to change your profile photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setEditedProfile(prev => ({ ...prev, avatarUrl: asset.uri }));
      if (!isEditing) {
        setIsEditing(true);
      }
    }
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      let avatarUrl = profile.avatarUrl;
      if (editedProfile.avatarUrl && editedProfile.avatarUrl !== profile.avatarUrl) {
        if (editedProfile.avatarUrl.startsWith('file://') || editedProfile.avatarUrl.startsWith('content://')) {
          const response = await fetch(editedProfile.avatarUrl);
          const blob = await response.blob();
          const fileExt = editedProfile.avatarUrl.split('.').pop()?.toLowerCase() || 'jpg';
          const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
          const filePath = `avatars/${fileName}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('user-content')
            .upload(filePath, blob, {
              contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
              upsert: true,
            });
          if (uploadError) {
            console.error('Upload error:', uploadError);
            avatarUrl = editedProfile.avatarUrl;
          } else {
            const { data: urlData } = supabase.storage
              .from('user-content')
              .getPublicUrl(filePath);
            avatarUrl = urlData.publicUrl;
          }
        } else {
          avatarUrl = editedProfile.avatarUrl;
        }
      }
      const { error } = await supabase.auth.updateUser({
        data: {
          first_name: editedProfile.firstName.trim(),
          last_name: editedProfile.lastName.trim(),
          avatar_url: avatarUrl,
        },
      });
      if (error) throw error;
      setProfile({
        firstName: editedProfile.firstName.trim(),
        lastName: editedProfile.lastName.trim(),
        avatarUrl,
      });
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedProfile(profile);
    setIsEditing(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      Alert.alert('Success', 'Password updated successfully');
      setNewPassword('');
      setConfirmPassword('');
      setIsPasswordEditing(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update password';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            Alert.alert(
              'Confirm Deletion',
              'This will permanently delete your account and all associated data.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'I understand, delete my account',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await signOut();
                      router.replace('/(auth)/login');
                    } catch (error) {
                      Alert.alert('Error', 'Failed to delete account');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const displayName = profile.firstName || profile.lastName 
    ? `${profile.firstName} ${profile.lastName}`.trim() 
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <View style={styles.card}>
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={handlePickImage} style={styles.avatarContainer}>
              {editedProfile.avatarUrl ? (
                <Image source={{ uri: editedProfile.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={40} color={colors.brown} />
                </View>
              )}
              <View style={styles.editBadge}>
                <Ionicons name="camera" size={16} color={colors.brown} />
              </View>
            </TouchableOpacity>
            {displayName && !isEditing && (
              <Text style={styles.displayName}>{displayName}</Text>
            )}
          </View>
          {!isEditing ? (
            <>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setIsEditing(true)}
              >
                <View style={styles.menuItemLeft}>
                  <Ionicons name="create-outline" size={22} color={colors.brown} />
                  <Text style={styles.menuItemText}>Edit Profile</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.brownMuted} />
              </TouchableOpacity>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.label}>Email</Text>
                <Text style={styles.value}>{user?.email || 'Not signed in'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Member Since</Text>
                <Text style={styles.value}>
                  {user?.created_at
                    ? new Date(user.created_at).toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric',
                      })
                    : 'N/A'}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.editForm}>
              <Text style={styles.inputLabel}>First Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your first name"
                placeholderTextColor={colors.brownMuted}
                value={editedProfile.firstName}
                onChangeText={(text) => setEditedProfile(prev => ({ ...prev, firstName: text }))}
                autoCapitalize="words"
              />
              <Text style={styles.inputLabel}>Last Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your last name"
                placeholderTextColor={colors.brownMuted}
                value={editedProfile.lastName}
                onChangeText={(text) => setEditedProfile(prev => ({ ...prev, lastName: text }))}
                autoCapitalize="words"
              />
              <View style={styles.formButtons}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={handleCancelEdit}
                  style={styles.formButton}
                />
                <Button
                  title={isSavingProfile ? 'Saving...' : 'Save'}
                  onPress={handleSaveProfile}
                  disabled={isSavingProfile}
                  style={styles.formButton}
                />
              </View>
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Ionicons name="scale-outline" size={22} color={colors.brown} />
              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleTitle}>Use Metric Measurements</Text>
                <Text style={styles.toggleDescription}>
                  {measurementSystem === 'metric' 
                    ? 'Showing grams, ml, celsius' 
                    : 'Showing cups, oz, fahrenheit'}
                </Text>
              </View>
            </View>
            <Switch
              value={measurementSystem === 'metric'}
              onValueChange={(value: boolean) => { setMeasurementSystem(value ? 'metric' : 'imperial'); }}
              trackColor={{ false: colors.creamDark, true: colors.coral }}
              thumbColor={colors.white}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Ionicons name="trending-up-outline" size={22} color={colors.brown} />
              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleTitle}>High Altitude Cooking</Text>
                <Text style={styles.toggleDescription}>
                  {highAltitudeCooking
                    ? 'Adjusting recipes for 3,000+ ft elevation'
                    : 'Standard sea-level recipes'}
                </Text>
              </View>
            </View>
            <Switch
              value={highAltitudeCooking}
              onValueChange={(value: boolean) => { setHighAltitudeCooking(value); }}
              trackColor={{ false: colors.creamDark, true: colors.coral }}
              thumbColor={colors.white}
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cooking Equipment</Text>
        <Text style={styles.sectionSubtitle}>Select all that you have or prefer to use</Text>
        <View style={styles.card}>
          {COOKING_EQUIPMENT_OPTIONS.map((equipment, index) => (
            <React.Fragment key={equipment.id}>
              {index > 0 && <View style={styles.divider} />}
              <TouchableOpacity
                style={styles.equipmentRow}
                onPress={() => toggleCookingEquipment(equipment.id)}
              >
                <View style={styles.equipmentInfo}>
                  <Ionicons 
                    name={equipment.icon as any} 
                    size={22} 
                    color={cookingEquipment.includes(equipment.id) ? colors.coral : colors.brownMuted} 
                  />
                  <Text style={[
                    styles.equipmentLabel,
                    cookingEquipment.includes(equipment.id) && styles.equipmentLabelActive
                  ]}>
                    {equipment.label}
                  </Text>
                </View>
                <View style={[
                  styles.checkbox,
                  cookingEquipment.includes(equipment.id) && styles.checkboxActive
                ]}>
                  {cookingEquipment.includes(equipment.id) && (
                    <Ionicons name="checkmark" size={16} color={colors.white} />
                  )}
                </View>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>
        <View style={styles.card}>
          {!isPasswordEditing ? (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setIsPasswordEditing(true)}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="key-outline" size={22} color={colors.brown} />
                <Text style={styles.menuItemText}>Change Password</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.brownMuted} />
            </TouchableOpacity>
          ) : (
            <View style={styles.passwordForm}>
              <Text style={styles.formTitle}>Change Password</Text>
              <TextInput
                style={styles.input}
                placeholder="New Password"
                placeholderTextColor={colors.brownMuted}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Confirm New Password"
                placeholderTextColor={colors.brownMuted}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
              />
              <View style={styles.formButtons}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => {
                    setIsPasswordEditing(false);
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  style={styles.formButton}
                />
                <Button
                  title={isLoading ? 'Saving...' : 'Save'}
                  onPress={handleChangePassword}
                  disabled={isLoading}
                  style={styles.formButton}
                />
              </View>
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data & Privacy</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="download-outline" size={22} color={colors.brown} />
              <Text style={styles.menuItemText}>Export My Data</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.brownMuted} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="shield-checkmark-outline" size={22} color={colors.brown} />
              <Text style={styles.menuItemText}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.brownMuted} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="document-text-outline" size={22} color={colors.brown} />
              <Text style={styles.menuItemText}>Terms of Service</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.brownMuted} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="log-out-outline" size={22} color={colors.error} />
              <Text style={[styles.menuItemText, styles.dangerText]}>Sign Out</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuItem} onPress={handleDeleteAccount}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="trash-outline" size={22} color={colors.error} />
              <Text style={[styles.menuItemText, styles.dangerText]}>
                Delete Account
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  content: {
    padding: spacing.space4,
    paddingBottom: spacing.space10,
  },
  section: {
    marginBottom: spacing.space6,
  },
  sectionTitle: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textXs,
    fontWeight: typography.fontSemibold,
    color: colors.brownMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.space2,
    marginLeft: spacing.space1,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.brown,
    overflow: 'hidden',
    ...shadows.sm,
  },
  avatarSection: {
    alignItems: 'center',
    padding: spacing.space5,
    borderBottomWidth: 2,
    borderBottomColor: colors.brown,
    backgroundColor: colors.peachLight,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.brown,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.brown,
  },
  editBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.brown,
  },
  displayName: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.textXl,
    fontWeight: typography.fontBold,
    color: colors.brown,
    marginTop: spacing.space3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space4,
    borderBottomWidth: 1,
    borderBottomColor: colors.creamDark,
    minHeight: 56,
  },
  label: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textBase,
    fontWeight: typography.fontMedium,
    color: colors.brown,
  },
  value: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textBase,
    color: colors.brownMuted,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space4,
    minHeight: 56,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textBase,
    fontWeight: typography.fontMedium,
    color: colors.brown,
    marginLeft: spacing.space3,
  },
  dangerText: {
    color: colors.error,
  },
  divider: {
    height: 1,
    backgroundColor: colors.creamDark,
    marginLeft: 54,
  },
  editForm: {
    padding: spacing.space4,
  },
  inputLabel: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    fontWeight: typography.fontMedium,
    color: colors.brownMuted,
    marginBottom: spacing.space2,
  },
  input: {
    backgroundColor: colors.cream,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.brownMuted,
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space3,
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textBase,
    marginBottom: spacing.space4,
    color: colors.brown,
    minHeight: 48,
  },
  formButtons: {
    flexDirection: 'row',
    gap: spacing.space3,
    marginTop: spacing.space2,
  },
  formButton: {
    flex: 1,
  },
  passwordForm: {
    padding: spacing.space4,
  },
  formTitle: {
    fontFamily: 'Quicksand-SemiBold',
    fontSize: typography.textLg,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
    marginBottom: spacing.space4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space4,
    minHeight: 72,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleTextContainer: {
    marginLeft: spacing.space3,
    flex: 1,
  },
  toggleTitle: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textBase,
    fontWeight: typography.fontMedium,
    color: colors.brown,
  },
  toggleDescription: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    marginTop: 2,
  },
  sectionSubtitle: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    marginBottom: spacing.space2,
    marginLeft: spacing.space1,
  },
  equipmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space4,
    minHeight: 56,
  },
  equipmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  equipmentLabel: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textBase,
    fontWeight: typography.fontMedium,
    color: colors.brownMuted,
    marginLeft: spacing.space3,
  },
  equipmentLabelActive: {
    color: colors.brown,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.creamDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.coral,
    borderColor: colors.coral,
  },
});

