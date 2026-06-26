import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { useAppData } from '../context/AppDataContext';
import { fontStyles, radius, spacing, ThemeColors } from '../theme';
import { ThemeMode, WeightUnit } from '../types';

const FRESH_OPTIONS = [1, 2, 3, 5];
const RECENT_OPTIONS = [4, 6, 8, 10, 14];

export function SettingsScreen() {
  const { settings, updateSettings, colors } = useAppData();
  const styles = createStyles(colors);

  function setUnit(unit: WeightUnit) {
    updateSettings({ ...settings, unit });
  }

  function setTheme(theme: ThemeMode) {
    updateSettings({ ...settings, theme });
  }

  function setFreshDays(freshDays: number) {
    updateSettings({ ...settings, freshDays });
  }

  function setRecentDays(recentDays: number) {
    updateSettings({ ...settings, recentDays });
  }

  function toggleOverload() {
    updateSettings({ ...settings, overloadEnabled: !settings.overloadEnabled });
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

      <Text style={[fontStyles.label, styles.sectionSpacing, { color: colors.textMuted }]}>
        MUSCLE MAP — FRESH WITHIN (DAYS)
      </Text>
      <View style={styles.chipRow}>
        {FRESH_OPTIONS.map((days) => (
          <Pressable
            key={days}
            onPress={() => setFreshDays(days)}
            style={[styles.chip, settings.freshDays === days && styles.optionActive]}
          >
            <Text
              style={[styles.optionLabel, settings.freshDays === days && styles.optionLabelActive]}
            >
              {days}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[fontStyles.label, styles.sectionSpacing, { color: colors.textMuted }]}>
        MUSCLE MAP — NEEDS WORK AFTER (DAYS)
      </Text>
      <View style={styles.chipRow}>
        {RECENT_OPTIONS.map((days) => (
          <Pressable
            key={days}
            onPress={() => setRecentDays(days)}
            style={[styles.chip, settings.recentDays === days && styles.optionActive]}
          >
            <Text
              style={[styles.optionLabel, settings.recentDays === days && styles.optionLabelActive]}
            >
              {days}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={[fontStyles.bodyMuted, styles.helperText, { color: colors.textMuted }]}>
        A muscle group shows fresh for the first window, fades to "recent" until the second
        number, then reads as needing work.
      </Text>

      <Text style={[fontStyles.label, styles.sectionSpacing, { color: colors.textMuted }]}>
        PROGRESSIVE OVERLOAD
      </Text>
      <View style={styles.optionRow}>
        {([true, false] as boolean[]).map((val) => (
          <Pressable
            key={String(val)}
            onPress={() => updateSettings({ ...settings, overloadEnabled: val })}
            style={[styles.option, settings.overloadEnabled === val && styles.optionActive]}
          >
            <Text style={[styles.optionLabel, settings.overloadEnabled === val && styles.optionLabelActive]}>
              {val ? 'On' : 'Off'}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={[fontStyles.bodyMuted, styles.helperText, { color: colors.textMuted }]}>
        When on, each exercise shows a weight or rep suggestion based on your last session.
      </Text>

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
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    chip: {
      minWidth: 52,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
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
    helperText: {
      marginTop: spacing.sm,
      lineHeight: 18,
    },
    footnote: {
      marginTop: spacing.xl,
      lineHeight: 20,
    },
  });
}
