/**
 * Preferences Screen - Edit User Preferences
 * Allows users to revisit and update their cooking and dietary preferences
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserPreferences } from '../../hooks/useUserPreferences';
import { Button } from '../../components/ui/Button';
import { colors, typography, spacing, borderRadius, shadows } from '../../lib/theme';

type HouseholdSize = 'just-me' | 'couple' | 'family-small' | 'family-large';
type CookingSkill = 'beginner' | 'intermediate' | 'advanced';

const HOUSEHOLD_OPTIONS: { id: HouseholdSize; emoji: string; label: string; servings: number }[] = [
  { id: 'just-me', emoji: '👤', label: 'Just Me', servings: 1 },
  { id: 'couple', emoji: '👫', label: 'Couple', servings: 2 },
  { id: 'family-small', emoji: '👨‍👩‍👧', label: 'Family (3-4)', servings: 4 },
  { id: 'family-large', emoji: '👨‍👩‍👧‍👦', label: 'Big Family', servings: 6 },
];

const DIETARY_OPTIONS = [
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'gluten-free', label: 'Gluten-free' },
  { id: 'dairy-free', label: 'Dairy-free' },
  { id: 'low-carb', label: 'Low-carb' },
  { id: 'keto', label: 'Keto' },
  { id: 'paleo', label: 'Paleo' },
];

const ALLERGY_OPTIONS = [
  { id: 'nut-allergy', label: 'Tree Nuts' },
  { id: 'peanut-allergy', label: 'Peanuts' },
  { id: 'shellfish', label: 'Shellfish' },
  { id: 'soy', label: 'Soy' },
  { id: 'eggs', label: 'Eggs' },
  { id: 'fish', label: 'Fish' },
];

const CUISINE_OPTIONS = [
  { id: 'italian', label: 'Italian', emoji: '🇮🇹' },
  { id: 'mexican', label: 'Mexican', emoji: '🇲🇽' },
  { id: 'asian', label: 'Asian', emoji: '🥢' },
  { id: 'indian', label: 'Indian', emoji: '🇮🇳' },
  { id: 'mediterranean', label: 'Mediterranean', emoji: '🫒' },
  { id: 'american', label: 'American', emoji: '🇺🇸' },
  { id: 'french', label: 'French', emoji: '🇫🇷' },
  { id: 'thai', label: 'Thai', emoji: '🇹🇭' },
  { id: 'japanese', label: 'Japanese', emoji: '🇯🇵' },
  { id: 'chinese', label: 'Chinese', emoji: '🇨🇳' },
];

const SKILL_OPTIONS: { id: CookingSkill; label: string; description: string }[] = [
  { id: 'beginner', label: 'Beginner', description: 'Simple recipes with few ingredients' },
  { id: 'intermediate', label: 'Intermediate', description: 'Comfortable with most techniques' },
  { id: 'advanced', label: 'Advanced', description: 'Ready for complex recipes' },
];

const MAX_TIME_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 0, label: 'Any time' },
];

/**
 * Get household size ID from numeric value
 */
function getHouseholdSizeId(servings: number): HouseholdSize {
  if (servings <= 1) return 'just-me';
  if (servings <= 2) return 'couple';
  if (servings <= 4) return 'family-small';
  return 'family-large';
}

export default function PreferencesScreen(): React.ReactElement {
  const router = useRouter();
  const { preferences, loading, updatePreferences, refresh } = useUserPreferences();
  const [isSaving, setIsSaving] = useState(false);
  const [householdSize, setHouseholdSize] = useState<HouseholdSize>('couple');
  const [dietaryPreferences, setDietaryPreferences] = useState<Set<string>>(new Set());
  const [allergies, setAllergies] = useState<Set<string>>(new Set());
  const [favoriteCuisines, setFavoriteCuisines] = useState<Set<string>>(new Set());
  const [cookingSkill, setCookingSkill] = useState<CookingSkill>('intermediate');
  const [maxCookTime, setMaxCookTime] = useState<number>(60);
  const [hasChanges, setHasChanges] = useState(false);

  // Load current preferences
  useEffect(() => {
    if (preferences) {
      setHouseholdSize(getHouseholdSizeId(preferences.household_size || 2));
      setDietaryPreferences(new Set(preferences.dietary_preferences || []));
      setAllergies(new Set(preferences.allergies || []));
      setFavoriteCuisines(new Set(preferences.favorite_cuisines || []));
      setCookingSkill(preferences.cooking_skill || 'intermediate');
      setMaxCookTime(preferences.max_cook_time || 60);
    }
  }, [preferences]);

  const toggleItem = (set: Set<string>, item: string, setter: React.Dispatch<React.SetStateAction<Set<string>>>): void => {
    const newSet = new Set(set);
    if (newSet.has(item)) {
      newSet.delete(item);
    } else {
      newSet.add(item);
    }
    setter(newSet);
    setHasChanges(true);
  };

  const handleSave = async (): Promise<void> => {
    setIsSaving(true);
    try {
      const householdServings = HOUSEHOLD_OPTIONS.find(h => h.id === householdSize)?.servings || 2;
      const success = await updatePreferences({
        household_size: householdServings,
        dietary_preferences: Array.from(dietaryPreferences),
        allergies: Array.from(allergies),
        favorite_cuisines: Array.from(favoriteCuisines),
        cooking_skill: cookingSkill,
        max_cook_time: maxCookTime,
      });
      if (success) {
        Alert.alert('Saved!', 'Your preferences have been updated.');
        setHasChanges(false);
      } else {
        Alert.alert('Error', 'Failed to save preferences. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestartOnboarding = (): void => {
    Alert.alert(
      'Restart Setup',
      'This will take you through the full onboarding experience again. Your data will be preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Setup',
          onPress: () => router.push('/onboarding'),
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.coral} />
          <Text style={styles.loadingText}>Loading preferences...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Household Size */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Household Size</Text>
          <Text style={styles.sectionDescription}>
            This helps us suggest the right portion sizes
          </Text>
          <View style={styles.optionsGrid}>
            {HOUSEHOLD_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.gridOption,
                  householdSize === option.id && styles.gridOptionSelected,
                ]}
                onPress={() => {
                  setHouseholdSize(option.id);
                  setHasChanges(true);
                }}
                accessibilityLabel={option.label}
                accessibilityRole="button"
              >
                <Text style={styles.gridOptionEmoji}>{option.emoji}</Text>
                <Text
                  style={[
                    styles.gridOptionLabel,
                    householdSize === option.id && styles.gridOptionLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Dietary Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dietary Preferences</Text>
          <Text style={styles.sectionDescription}>
            We'll filter recipes to match your diet
          </Text>
          <View style={styles.chipGrid}>
            {DIETARY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.chip,
                  dietaryPreferences.has(option.id) && styles.chipSelected,
                ]}
                onPress={() => toggleItem(dietaryPreferences, option.id, setDietaryPreferences)}
                accessibilityLabel={option.label}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: dietaryPreferences.has(option.id) }}
              >
                <Text
                  style={[
                    styles.chipText,
                    dietaryPreferences.has(option.id) && styles.chipTextSelected,
                  ]}
                >
                  {option.label}
                  {dietaryPreferences.has(option.id) && ' ✓'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Allergies */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Allergies</Text>
          <Text style={styles.sectionDescription}>
            We'll exclude recipes with these ingredients
          </Text>
          <View style={styles.chipGrid}>
            {ALLERGY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.chip,
                  styles.allergyChip,
                  allergies.has(option.id) && styles.allergyChipSelected,
                ]}
                onPress={() => toggleItem(allergies, option.id, setAllergies)}
                accessibilityLabel={option.label}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: allergies.has(option.id) }}
              >
                <Text
                  style={[
                    styles.chipText,
                    allergies.has(option.id) && styles.allergyChipTextSelected,
                  ]}
                >
                  {option.label}
                  {allergies.has(option.id) && ' ⚠️'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Favorite Cuisines */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Favorite Cuisines</Text>
          <Text style={styles.sectionDescription}>
            We'll prioritize recipes from these cuisines
          </Text>
          <View style={styles.chipGrid}>
            {CUISINE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.chip,
                  favoriteCuisines.has(option.id) && styles.chipSelected,
                ]}
                onPress={() => toggleItem(favoriteCuisines, option.id, setFavoriteCuisines)}
                accessibilityLabel={option.label}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: favoriteCuisines.has(option.id) }}
              >
                <Text
                  style={[
                    styles.chipText,
                    favoriteCuisines.has(option.id) && styles.chipTextSelected,
                  ]}
                >
                  {option.emoji} {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Cooking Skill */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cooking Skill</Text>
          <Text style={styles.sectionDescription}>
            This helps us suggest appropriate recipes
          </Text>
          <View style={styles.card}>
            {SKILL_OPTIONS.map((option, index) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.radioItem,
                  index < SKILL_OPTIONS.length - 1 && styles.radioItemBorder,
                ]}
                onPress={() => {
                  setCookingSkill(option.id);
                  setHasChanges(true);
                }}
                accessibilityLabel={option.label}
                accessibilityRole="radio"
                accessibilityState={{ selected: cookingSkill === option.id }}
              >
                <View style={styles.radioItemContent}>
                  <Text style={styles.radioItemLabel}>{option.label}</Text>
                  <Text style={styles.radioItemDescription}>{option.description}</Text>
                </View>
                <View
                  style={[
                    styles.radioCircle,
                    cookingSkill === option.id && styles.radioCircleSelected,
                  ]}
                >
                  {cookingSkill === option.id && <View style={styles.radioCircleInner} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Max Cook Time */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Max Cook Time</Text>
          <Text style={styles.sectionDescription}>
            Only show recipes that fit your schedule
          </Text>
          <View style={styles.timeGrid}>
            {MAX_TIME_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.timeOption,
                  maxCookTime === option.value && styles.timeOptionSelected,
                ]}
                onPress={() => {
                  setMaxCookTime(option.value);
                  setHasChanges(true);
                }}
                accessibilityLabel={option.label}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.timeOptionText,
                    maxCookTime === option.value && styles.timeOptionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Restart Onboarding */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.restartButton}
            onPress={handleRestartOnboarding}
            accessibilityLabel="Restart onboarding"
            accessibilityRole="button"
          >
            <View style={styles.restartButtonIcon}>
              <Ionicons name="refresh" size={20} color={colors.coral} />
            </View>
            <View style={styles.restartButtonContent}>
              <Text style={styles.restartButtonTitle}>Restart Setup Wizard</Text>
              <Text style={styles.restartButtonSubtitle}>
                Go through the full setup experience again
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.brownMuted} />
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <View style={styles.saveContainer}>
          <Button
            title={isSaving ? 'Saving...' : 'Save Preferences'}
            onPress={handleSave}
            disabled={isSaving || !hasChanges}
            style={styles.saveButton}
          />
          {!hasChanges && (
            <Text style={styles.noChangesText}>
              Make changes to enable save
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textBase,
    color: colors.brownMuted,
    marginTop: spacing.space3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.space4,
    paddingBottom: spacing.space10,
  },
  section: {
    marginBottom: spacing.space6,
  },
  sectionTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: typography.textLg,
    fontWeight: typography.fontBold,
    color: colors.brown,
    marginBottom: spacing.space1,
  },
  sectionDescription: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    marginBottom: spacing.space3,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.space3,
  },
  gridOption: {
    width: '47%',
    paddingVertical: spacing.space4,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.brown,
    ...shadows.sm,
  },
  gridOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.brown,
  },
  gridOptionEmoji: {
    fontSize: 32,
    marginBottom: spacing.space2,
  },
  gridOptionLabel: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    fontWeight: typography.fontMedium,
    color: colors.brown,
  },
  gridOptionLabelSelected: {
    fontFamily: 'Nunito-Bold',
    fontWeight: typography.fontBold,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.space2,
  },
  chip: {
    paddingVertical: spacing.space2,
    paddingHorizontal: spacing.space3,
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.brownMuted,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.brown,
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
  allergyChip: {
    borderColor: colors.warning,
    backgroundColor: colors.white,
  },
  allergyChipSelected: {
    backgroundColor: colors.warningBg,
    borderColor: colors.warning,
  },
  allergyChipTextSelected: {
    fontFamily: 'Nunito-SemiBold',
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.brown,
    overflow: 'hidden',
    ...shadows.sm,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.space4,
  },
  radioItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.creamDark,
  },
  radioItemContent: {
    flex: 1,
  },
  radioItemLabel: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  radioItemDescription: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    marginTop: 2,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.brownMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: colors.coral,
  },
  radioCircleInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.coral,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.space2,
  },
  timeOption: {
    paddingVertical: spacing.space3,
    paddingHorizontal: spacing.space4,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.brown,
    ...shadows.sm,
  },
  timeOptionSelected: {
    backgroundColor: colors.primary,
  },
  timeOptionText: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    fontWeight: typography.fontMedium,
    color: colors.brown,
  },
  timeOptionTextSelected: {
    fontFamily: 'Nunito-Bold',
    fontWeight: typography.fontBold,
  },
  restartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.space4,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.brown,
    ...shadows.sm,
  },
  restartButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.coralLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.space3,
  },
  restartButtonContent: {
    flex: 1,
  },
  restartButtonTitle: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  restartButtonSubtitle: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    marginTop: 2,
  },
  saveContainer: {
    marginTop: spacing.space4,
    alignItems: 'center',
  },
  saveButton: {
    width: '100%',
  },
  noChangesText: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    marginTop: spacing.space2,
  },
});

