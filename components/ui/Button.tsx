import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../../lib/theme';

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'cta';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

/**
 * Brand-styled button component
 * Supports primary, secondary, danger, and CTA variants
 */
export function Button({
  onPress,
  title,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
}: ButtonProps): React.ReactElement {
  const isDisabled = disabled || loading;

  const getActivityIndicatorColor = (): string => {
    switch (variant) {
      case 'secondary':
        return colors.brown;
      case 'cta':
        return colors.white;
      case 'danger':
        return colors.white;
      default:
        return colors.brown;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        styles[variant],
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled }}
    >
      {loading ? (
        <ActivityIndicator color={getActivityIndicatorColor()} />
      ) : (
        <Text
          style={[
            styles.text,
            variant === 'secondary' && styles.secondaryText,
            variant === 'cta' && styles.ctaText,
            variant === 'danger' && styles.dangerText,
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: spacing.space3,
    paddingHorizontal: spacing.space6,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    borderWidth: 2,
    borderColor: colors.brown,
    ...shadows.sm,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  danger: {
    backgroundColor: colors.error,
  },
  cta: {
    backgroundColor: colors.coral,
    paddingVertical: spacing.space4,
    paddingHorizontal: spacing.space8,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontFamily: 'Nunito-SemiBold',
    color: colors.brown,
    fontSize: typography.textBase,
    fontWeight: typography.fontSemibold,
  },
  secondaryText: {
    color: colors.brown,
  },
  ctaText: {
    color: colors.white,
    fontFamily: 'Nunito-Bold',
    fontWeight: typography.fontBold,
  },
  dangerText: {
    color: colors.white,
  },
});
