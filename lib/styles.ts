/**
 * Shared StyleSheet primitives.
 *
 * Theme tokens (lib/theme.ts) remain the single source of truth for raw
 * values — this module only composes them into the StyleSheet patterns
 * that recur across screens. Consume via array composition:
 *
 *   <View style={[sharedStyles.screen, styles.localExtras]} />
 */

import { StyleSheet } from 'react-native';
import { colors, spacing, typography, borderRadius } from './theme';

export const sharedStyles = StyleSheet.create({
  // Full-bleed screen container: flex + cream background.
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },

  // ScrollView content padding used by settings-style screens.
  scrollContent: {
    padding: spacing.space4,
    paddingBottom: spacing.space10,
  },

  // Vertical block between titled sections.
  section: {
    marginBottom: spacing.space6,
  },

  // Uppercase section title (Nunito-SemiBold, brownMuted, letter-spaced).
  sectionTitle: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textXs,
    fontWeight: typography.fontSemibold,
    color: colors.brownMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.space2,
    marginLeft: spacing.space1,
  },

  // White card surface with 2px brown border, large radius, clipped children.
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.brown,
    overflow: 'hidden',
  },
});

export default sharedStyles;
