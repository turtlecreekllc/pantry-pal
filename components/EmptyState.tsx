import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './ui/Button';
import { colors, typography, spacing } from '../lib/theme';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Brand-styled empty state component
 * Displays when there's no content to show
 */
export function EmptyState({
  icon = 'file-tray-outline',
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps): React.ReactElement {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={64} color={colors.brownMuted} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          onPress={onAction}
          style={styles.button}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.space8,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.peachLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.space4,
  },
  title: {
    fontFamily: 'Quicksand-SemiBold',
    fontSize: typography.textXl,
    fontWeight: typography.fontSemibold,
    color: colors.brown,
    marginTop: spacing.space4,
    textAlign: 'center',
  },
  description: {
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textSm,
    color: colors.brownMuted,
    marginTop: spacing.space2,
    textAlign: 'center',
    lineHeight: typography.textSm * 1.5,
  },
  button: {
    marginTop: spacing.space6,
    minWidth: 160,
  },
});
