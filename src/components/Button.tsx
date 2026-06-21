import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { radius, spacing, ThemeColors } from '../theme';
import { useAppData } from '../context/AppDataContext';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ label, onPress, variant = 'primary', disabled, style }: ButtonProps) {
  const { colors } = useAppData();
  const styles = createStyles(colors);
  const variantStyles = createVariantStyles(colors);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.label, variant === 'ghost' ? styles.ghostLabel : null]}>{label}</Text>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    base: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    ghostLabel: {
      color: colors.primary,
    },
    disabled: {
      opacity: 0.5,
    },
    pressed: {
      opacity: 0.8,
    },
  });
}

function createVariantStyles(colors: ThemeColors): Record<Variant, ViewStyle> {
  return {
    primary: { backgroundColor: colors.primary },
    secondary: { backgroundColor: '#3A3F4D' },
    danger: { backgroundColor: colors.danger },
    ghost: { backgroundColor: 'transparent' },
  };
}
