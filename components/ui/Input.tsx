import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../../lib/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

/**
 * Brand-styled input component with label and error support
 */
export function Input({
  label,
  error,
  containerStyle,
  style,
  ...props
}: InputProps): React.ReactElement {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          error && styles.inputError,
          style,
        ]}
        placeholderTextColor={colors.brownMuted}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.space4,
  },
  label: {
    fontFamily: 'Nunito-Medium',
    fontSize: typography.textSm,
    fontWeight: typography.fontMedium,
    color: colors.brown,
    marginBottom: spacing.space2,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.brownMuted,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.space3,
    paddingHorizontal: spacing.space4,
    fontFamily: 'Nunito-Regular',
    fontSize: typography.textBase,
    color: colors.brown,
    minHeight: 48,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    fontFamily: 'Nunito-Regular',
    color: colors.error,
    fontSize: typography.textXs,
    marginTop: spacing.space1,
  },
});
