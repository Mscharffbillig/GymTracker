import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { useAppData } from '../context/AppDataContext';
import { fontStyles, radius, spacing, ThemeColors } from '../theme';
import { ThemeMode, WeightUnit } from '../types';

export function SettingsScreen() {
  const { settings, updateSettings, colors } = useAppData();
  const styles = createStyles(colors);

  function setUnit(unit: WeightUnit) {
    updateSettings({ ...settings, unit });
  }

  function setTheme(theme: ThemeMode) {
    updateSettings({ ...settings, theme });
  }

  return (
    <ScreenContainer style={styles.container} edges={['top', 'bottom']}>
      <Text style={[fontStyles.title, styles.title, { color: colors.text }]}>Settings</Text>

      <Text style={[fontStyles.label, { color: colors.textMuted }]}>APPEARANCE</Text>
      <View style={styles.optionRow}>
        {(['dark', 'light'] as ThemeMode[]).map((theme) => (
          <Pressable
            key={theme}
            onPress={() => setTheme(theme)}
            style={[styles.option, settings.theme === theme && styles.optionActive]}
          >
            <Text style={[styles.optionLabel, settings.theme === theme && styles.optionLabelActive]}>
              {theme === 'dark' ? 'Dark' : 'Light'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[fontStyles.label, styles.sectionSpacing, { color: colors.textMuted }]}>
        WEIGHT UNIT
      </Text>
      <View style={styles.optionRow}>
        {(['lbs', 'kg'] as WeightUnit[]).map((unit) => (
          <Pressable
            key={unit}
            onPress={() => setUnit(unit)}
            style={[styles.option, settings.unit === unit && styles.optionActive]}
          >
            <Text style={[styles.optionLabel, settings.unit === unit && styles.optionLabelActive]}>
              {unit.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[fontStyles.bodyMuted, styles.footnote, { color: colors.textMuted }]}>
        All workout data stays on this device. There is no account, sync, or internet
        connection — uninstalling the app deletes your data.
      </Text>
    </ScreenContainer>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      paddingTop: spacing.lg,
      paddingHorizontal: spacing.lg,
    },
    title: {
      marginBottom: spacing.lg,
    },
    optionRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    sectionSpacing: {
      marginTop: spacing.xl,
    },
    option: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    optionActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    optionLabel: {
      fontWeight: '700',
      color: colors.textMuted,
    },
    optionLabelActive: {
      color: '#FFFFFF',
    },
    footnote: {
      marginTop: spacing.xl,
      lineHeight: 20,
    },
  });
}
