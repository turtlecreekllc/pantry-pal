import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHouseholdContext } from '../../context/HouseholdContext';
import { supabase } from '../../lib/supabase';
import { HouseholdMemberProfile } from '../../lib/tonightService';
import { colors, typography, spacing, borderRadius } from '../../lib/theme';

// ─── constants ────────────────────────────────────────────────────────────────

const AVATAR_EMOJIS = [
  '🧑', '👩', '👨', '👧', '👦', '🧒', '👴', '👵', '🧓',
  '🧑‍🍳', '👩‍🍳', '👨‍🍳', '🧑‍🌾', '🦸', '🧙', '🧜', '🐶', '🐱',
];

const DIETARY_OPTIONS = [
  { label: 'Vegetarian', value: 'vegetarian' },
  { label: 'Vegan', value: 'vegan' },
  { label: 'Gluten-Free', value: 'gluten-free' },
  { label: 'Dairy-Free', value: 'dairy-free' },
  { label: 'Keto', value: 'keto' },
  { label: 'Paleo', value: 'paleo' },
  { label: 'Mediterranean', value: 'mediterranean' },
  { label: 'Low Carb', value: 'low-carb' },
  { label: 'Halal', value: 'halal' },
  { label: 'Kosher', value: 'kosher' },
  { label: 'Pescatarian', value: 'pescatarian' },
];

const ALLERGY_OPTIONS = [
  { label: 'Peanuts', value: 'peanuts' },
  { label: 'Tree Nuts', value: 'tree-nuts' },
  { label: 'Milk / Dairy', value: 'dairy' },
  { label: 'Eggs', value: 'eggs' },
  { label: 'Wheat / Gluten', value: 'gluten' },
  { label: 'Soy', value: 'soy' },
  { label: 'Fish', value: 'fish' },
  { label: 'Shellfish', value: 'shellfish' },
  { label: 'Sesame', value: 'sesame' },
];

const COOKING_METHOD_OPTIONS = [
  { label: 'Baked only (no stovetop)', value: 'baked-only' },
  { label: 'No deep frying', value: 'no-fry' },
  { label: 'Grilled preferred', value: 'grilled' },
  { label: 'Slow cooker', value: 'slow-cooker' },
  { label: 'Air fryer', value: 'air-fryer' },
  { label: 'Instant Pot', value: 'instant-pot' },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

function emptyProfile(householdId: string): Omit<HouseholdMemberProfile, 'id'> {
  return {
    household_id: householdId,
    user_id: null,
    display_name: '',
    avatar_emoji: '🧑',
    dietary_preferences: [],
    allergies: [],
    disliked_ingredients: [],
    cooking_method_preferences: [],
    is_default_included: true,
  } as any;
}

// ─── chip component ────────────────────────────────────────────────────────────

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
      {selected && (
        <Ionicons name="checkmark" size={12} color={colors.brown} style={styles.chipCheck} />
      )}
    </TouchableOpacity>
  );
}

// ─── member edit modal ─────────────────────────────────────────────────────────

interface EditModalProps {
  visible: boolean;
  profile: Partial<HouseholdMemberProfile> | null;
  onSave: (profile: Partial<HouseholdMemberProfile>) => Promise<void>;
  onClose: () => void;
  isSaving: boolean;
}

function MemberEditModal({ visible, profile, onSave, onClose, isSaving }: EditModalProps) {
  const [draft, setDraft] = useState<Partial<HouseholdMemberProfile>>(profile ?? {});
  const [dislikedText, setDislikedText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    if (visible && profile) {
      setDraft({ ...profile });
      setDislikedText((profile.disliked_ingredients ?? []).join(', '));
      setShowEmojiPicker(false);
    }
  }, [visible, profile]);

  const toggleArray = (field: keyof HouseholdMemberProfile, value: string) => {
    const current = (draft[field] as string[]) ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setDraft((d) => ({ ...d, [field]: next }));
  };

  const handleSave = async () => {
    if (!draft.display_name?.trim()) {
      Alert.alert('Name required', 'Please enter a name for this member.');
      return;
    }
    const disliked = dislikedText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    await onSave({ ...draft, disliked_ingredients: disliked });
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalContainer}
      >
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.modalClose}>
            <Text style={styles.modalCloseText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {draft.id ? 'Edit Member' : 'Add Member'}
          </Text>
          <TouchableOpacity onPress={handleSave} style={styles.modalSave} disabled={isSaving}>
            <Text style={[styles.modalSaveText, isSaving && { opacity: 0.5 }]}>
              {isSaving ? 'Saving…' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          {/* Avatar + Name */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Name & Avatar</Text>
            <View style={styles.nameRow}>
              <TouchableOpacity
                style={styles.avatarButton}
                onPress={() => setShowEmojiPicker((v) => !v)}
                accessibilityLabel="Choose avatar emoji"
              >
                <Text style={styles.avatarEmoji}>{draft.avatar_emoji ?? '🧑'}</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.nameInput}
                placeholder="Display name (e.g. Mom, Alex…)"
                placeholderTextColor={colors.brownMuted}
                value={draft.display_name ?? ''}
                onChangeText={(t) => setDraft((d) => ({ ...d, display_name: t }))}
                maxLength={30}
                returnKeyType="done"
              />
            </View>

            {showEmojiPicker && (
              <View style={styles.emojiGrid}>
                {AVATAR_EMOJIS.map((e) => (
                  <TouchableOpacity
                    key={e}
                    style={[
                      styles.emojiCell,
                      draft.avatar_emoji === e && styles.emojiCellSelected,
                    ]}
                    onPress={() => {
                      setDraft((d) => ({ ...d, avatar_emoji: e }));
                      setShowEmojiPicker(false);
                    }}
                  >
                    <Text style={styles.emojiCellText}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Default Included */}
          <View style={styles.section}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={styles.sectionLabel}>Include by default</Text>
                <Text style={styles.sectionHint}>
                  Pre-select this person on the dinner roster
                </Text>
              </View>
              <Switch
                value={draft.is_default_included ?? true}
                onValueChange={(v) => setDraft((d) => ({ ...d, is_default_included: v }))}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>
          </View>

          {/* Dietary Preferences */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Dietary Preferences</Text>
            <Text style={styles.sectionHint}>
              Suggestions will respect all selected preferences
            </Text>
            <View style={styles.chipRow}>
              {DIETARY_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  selected={(draft.dietary_preferences ?? []).includes(opt.value)}
                  onPress={() => toggleArray('dietary_preferences', opt.value)}
                />
              ))}
            </View>
          </View>

          {/* Allergies */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Allergies</Text>
            <Text style={styles.sectionHint}>
              Ingredients to always avoid
            </Text>
            <View style={styles.chipRow}>
              {ALLERGY_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  selected={(draft.allergies ?? []).includes(opt.value)}
                  onPress={() => toggleArray('allergies', opt.value)}
                />
              ))}
            </View>
          </View>

          {/* Disliked Ingredients */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Disliked Ingredients</Text>
            <Text style={styles.sectionHint}>
              Comma-separated — e.g. cilantro, mushrooms, olives
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder="cilantro, mushrooms, olives…"
              placeholderTextColor={colors.brownMuted}
              value={dislikedText}
              onChangeText={setDislikedText}
              multiline
              numberOfLines={3}
              returnKeyType="done"
              blurOnSubmit
            />
          </View>

          {/* Cooking Methods */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Cooking Method Preferences</Text>
            <View style={styles.chipRow}>
              {COOKING_METHOD_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  selected={(draft.cooking_method_preferences ?? []).includes(opt.value)}
                  onPress={() => toggleArray('cooking_method_preferences', opt.value)}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── main screen ──────────────────────────────────────────────────────────────

export default function DinnerRosterScreen(): React.ReactElement {
  const { activeHousehold } = useHouseholdContext();
  const [members, setMembers] = useState<HouseholdMemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<Partial<HouseholdMemberProfile> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // ── load ──────────────────────────────────────────────────────────────────

  const loadMembers = useCallback(async () => {
    if (!activeHousehold) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('household_member_profiles')
        .select('*')
        .eq('household_id', activeHousehold.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setMembers(data ?? []);
    } catch (e) {
      console.error('Failed to load member profiles:', e);
      Alert.alert('Error', 'Could not load member profiles.');
    } finally {
      setLoading(false);
    }
  }, [activeHousehold]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // ── save ──────────────────────────────────────────────────────────────────

  const handleSave = async (profile: Partial<HouseholdMemberProfile>) => {
    if (!activeHousehold) return;
    setIsSaving(true);
    try {
      if (profile.id) {
        const { error } = await supabase
          .from('household_member_profiles')
          .update({
            display_name: profile.display_name,
            avatar_emoji: profile.avatar_emoji,
            dietary_preferences: profile.dietary_preferences ?? [],
            allergies: profile.allergies ?? [],
            disliked_ingredients: profile.disliked_ingredients ?? [],
            cooking_method_preferences: profile.cooking_method_preferences ?? [],
            is_default_included: profile.is_default_included ?? true,
          })
          .eq('id', profile.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('household_member_profiles')
          .insert({
            household_id: activeHousehold.id,
            user_id: null,
            display_name: profile.display_name,
            avatar_emoji: profile.avatar_emoji ?? '🧑',
            dietary_preferences: profile.dietary_preferences ?? [],
            allergies: profile.allergies ?? [],
            disliked_ingredients: profile.disliked_ingredients ?? [],
            cooking_method_preferences: profile.cooking_method_preferences ?? [],
            is_default_included: profile.is_default_included ?? true,
          });
        if (error) throw error;
      }
      setEditTarget(null);
      await loadMembers();
    } catch (e) {
      console.error('Failed to save member profile:', e);
      Alert.alert('Error', 'Could not save member profile.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── delete ─────────────────────────────────────────────────────────────────

  const handleDelete = (member: HouseholdMemberProfile) => {
    Alert.alert(
      'Remove Member',
      `Remove ${member.display_name} from the dinner roster? This won't remove them from the household.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('household_member_profiles')
                .delete()
                .eq('id', member.id);
              if (error) throw error;
              await loadMembers();
            } catch (e) {
              Alert.alert('Error', 'Could not remove member profile.');
            }
          },
        },
      ]
    );
  };

  // ── render ─────────────────────────────────────────────────────────────────

  if (!activeHousehold) {
    return (
      <View style={styles.centered}>
        <Ionicons name="home-outline" size={48} color={colors.brownMuted} />
        <Text style={styles.noHouseholdText}>No active household</Text>
        <Text style={styles.noHouseholdHint}>
          Create a household first in Household Settings.
        </Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Intro card */}
        <View style={styles.infoCard}>
          <Ionicons name="people" size={24} color={colors.primary} />
          <Text style={styles.infoText}>
            Add everyone who might eat dinner. The AI uses their dietary preferences and
            allergies when picking tonight's suggestions.
          </Text>
        </View>

        {/* Member list */}
        {loading ? (
          <Text style={styles.loadingText}>Loading…</Text>
        ) : members.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🍽️</Text>
            <Text style={styles.emptyTitle}>No members yet</Text>
            <Text style={styles.emptyHint}>
              Tap "Add Member" below to get started.
            </Text>
          </View>
        ) : (
          members.map((member) => (
            <View key={member.id} style={styles.memberCard}>
              <TouchableOpacity
                style={styles.memberMain}
                onPress={() => setEditTarget(member)}
                accessibilityLabel={`Edit ${member.display_name}`}
              >
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarEmoji}>{member.avatar_emoji}</Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{member.display_name}</Text>
                  {member.dietary_preferences.length > 0 && (
                    <Text style={styles.memberTags} numberOfLines={1}>
                      {member.dietary_preferences.map((d) =>
                        DIETARY_OPTIONS.find((o) => o.value === d)?.label ?? d
                      ).join(' · ')}
                    </Text>
                  )}
                  {member.allergies.length > 0 && (
                    <Text style={styles.memberAllergies} numberOfLines={1}>
                      ⚠️ {member.allergies.map((a) =>
                        ALLERGY_OPTIONS.find((o) => o.value === a)?.label ?? a
                      ).join(', ')}
                    </Text>
                  )}
                  {!member.is_default_included && (
                    <Text style={styles.memberOptional}>Optional — not included by default</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.brownMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(member)}
                accessibilityLabel={`Remove ${member.display_name}`}
              >
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* Add button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setEditTarget(emptyProfile(activeHousehold.id))}
          accessibilityRole="button"
          accessibilityLabel="Add member"
        >
          <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
          <Text style={styles.addButtonText}>Add Member</Text>
        </TouchableOpacity>
      </ScrollView>

      <MemberEditModal
        visible={editTarget !== null}
        profile={editTarget}
        onSave={handleSave}
        onClose={() => setEditTarget(null)}
        isSaving={isSaving}
      />
    </>
  );
}

// ─── styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  content: {
    padding: spacing.space4,
    paddingBottom: spacing.space8,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.space8,
    gap: spacing.space3,
  },
  noHouseholdText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.textLg,
    color: colors.brown,
  },
  noHouseholdHint: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textBase,
    color: colors.brownMuted,
    textAlign: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.space3,
    backgroundColor: colors.primaryLight + '30',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary + '60',
    padding: spacing.space4,
    marginBottom: spacing.space4,
  },
  infoText: {
    flex: 1,
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brown,
    lineHeight: 20,
  },
  loadingText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textBase,
    color: colors.brownMuted,
    textAlign: 'center',
    marginTop: spacing.space8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.space8,
    gap: spacing.space2,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.textLg,
    color: colors.brown,
  },
  emptyHint: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: spacing.space3,
    overflow: 'hidden',
  },
  memberMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.space4,
    gap: spacing.space3,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  memberAvatarEmoji: {
    fontSize: 26,
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  memberName: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.textBase,
    color: colors.brown,
  },
  memberTags: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
  },
  memberAllergies: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.warning,
  },
  memberOptional: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textXs,
    color: colors.brownMuted,
    fontStyle: 'italic',
  },
  deleteButton: {
    padding: spacing.space4,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.space2,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    paddingVertical: spacing.space4,
    marginTop: spacing.space2,
  },
  addButtonText: {
    fontFamily: 'Quicksand-SemiBold',
    fontSize: typography.textBase,
    color: colors.primary,
  },

  // ── modal ──────────────────────────────────────────────────────────────────
  modalContainer: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space4,
    backgroundColor: colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.primaryDark,
  },
  modalTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.textLg,
    color: colors.brown,
    fontWeight: typography.fontBold,
  },
  modalClose: {
    minWidth: 60,
  },
  modalCloseText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textBase,
    color: colors.brown,
  },
  modalSave: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  modalSaveText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  modalContent: {
    padding: spacing.space4,
    paddingBottom: spacing.space12,
  },

  // ── section ────────────────────────────────────────────────────────────────
  section: {
    marginBottom: spacing.space6,
  },
  sectionLabel: {
    fontFamily: 'Quicksand-SemiBold',
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
    marginBottom: spacing.space1,
  },
  sectionHint: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    marginBottom: spacing.space3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space3,
  },
  avatarButton: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 30,
  },
  nameInput: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space3,
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textBase,
    color: colors.brown,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.space2,
    marginTop: spacing.space3,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.space3,
  },
  emojiCell: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
  },
  emojiCellSelected: {
    backgroundColor: colors.primary + '40',
  },
  emojiCellText: {
    fontSize: 24,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    flex: 1,
    marginRight: spacing.space4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.space2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space1,
    paddingHorizontal: spacing.space3,
    paddingVertical: spacing.space2,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '30',
  },
  chipText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
  },
  chipTextSelected: {
    fontFamily: 'Nunito-SemiBold',
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  chipCheck: {
    marginLeft: 2,
  },
  textArea: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space3,
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textBase,
    color: colors.brown,
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
