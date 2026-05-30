/**
 * Legal Screen — Privacy Policy & Terms of Service
 * Surfaces hosted legal documents inside the in-app browser.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LEGAL_URLS, openLegalLink } from '../../lib/legalLinks';
import { colors, typography, spacing, borderRadius } from '../../lib/theme';

interface LegalRowProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
  url: string;
  onPress: () => void;
  testID: string;
}

function LegalRow({ icon, title, description, url, onPress, testID }: LegalRowProps): React.ReactElement {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      accessibilityLabel={title}
      accessibilityRole="link"
      accessibilityHint={`Opens ${title} in an in-app browser`}
      testID={testID}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={22} color={colors.brown} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
        <Text style={styles.rowUrl} numberOfLines={1}>{url}</Text>
      </View>
      <Ionicons name="open-outline" size={18} color={colors.brownMuted} />
    </TouchableOpacity>
  );
}

export default function LegalScreen(): React.ReactElement {
  const handlePrivacy = (): void => {
    void openLegalLink('privacy');
  };

  const handleTerms = (): void => {
    void openLegalLink('terms');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Legal Documents</Text>
        <View style={styles.card}>
          <LegalRow
            icon="shield-checkmark-outline"
            title="Privacy Policy"
            description="How we collect, use, and protect your data."
            url={LEGAL_URLS.privacyPolicy}
            onPress={handlePrivacy}
            testID="legal-privacy-row"
          />
          <View style={styles.divider} />
          <LegalRow
            icon="document-text-outline"
            title="Terms of Service"
            description="The agreement that governs your use of DinnerPlans."
            url={LEGAL_URLS.termsOfService}
            onPress={handleTerms}
            testID="legal-terms-row"
          />
        </View>
      </View>

      <Text style={styles.footnote}>
        These documents open inside DinnerPlans. You can also view them anytime at
        dinnerplans.ai.
      </Text>
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
    letterSpacing: 1,
    marginBottom: spacing.space2,
    marginLeft: spacing.space1,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.brown,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.space4,
  },
  rowIcon: {
    width: 36,
    alignItems: 'center',
    marginRight: spacing.space3,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
  },
  rowDescription: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    marginTop: 2,
  },
  rowUrl: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textXs,
    color: colors.brownMuted,
    marginTop: spacing.space1,
    opacity: 0.7,
  },
  divider: {
    height: 1,
    backgroundColor: colors.creamDark,
    marginLeft: 56,
  },
  footnote: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textXs,
    color: colors.brownMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.space4,
  },
});
