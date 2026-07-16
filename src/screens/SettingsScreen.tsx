import React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../components/ScreenContainer';
import { useAppData } from '../context/AppDataContext';
import { fontStyles, radius, spacing, ThemeColors } from '../theme';
import { ThemeMode, WeightUnit } from '../types';
import { SettingsStackParamList } from '../navigation/types';

const FRESH_OPTIONS = [1, 2, 3, 5];
const RECENT_OPTIONS = [4, 6, 8, 10, 14];
const HEAT_WARNING_OPTIONS = [5, 6, 7, 8, 10];

type Props = NativeStackScreenProps<SettingsStackParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props) {
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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
        BODY WEIGHT ({settings.unit.toUpperCase()})
      </Text>
      <TextInput
        style={[styles.bodyWeightInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
        keyboardType="decimal-pad"
        value={settings.bodyWeight === 0 ? '' : String(settings.bodyWeight)}
        onChangeText={(v) => {
          const n = parseFloat(v);
          updateSettings({ ...settings, bodyWeight: isNaN(n) ? 0 : n });
        }}
        placeholder={`Enter your body weight in ${settings.unit}`}
        placeholderTextColor={colors.textMuted}
      />
      <Text style={[fontStyles.bodyMuted, styles.helperText, { color: colors.textMuted }]}>
        Lets you fill weight fields on bodyweight exercises (lunges, etc.) with one tap during a session.
      </Text>

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

      <Text style={[fontStyles.label, styles.sectionSpacing, { color: colors.textMuted }]}>
        HEAT MAP — OVERWORK WARNING (HEAT POINTS)
      </Text>
      <View style={styles.chipRow}>
        {HEAT_WARNING_OPTIONS.map((val) => (
          <Pressable
            key={val}
            onPress={() => updateSettings({ ...settings, heatWarningThreshold: val })}
            style={[styles.chip, settings.heatWarningThreshold === val && styles.optionActive]}
          >
            <Text
              style={[
                styles.optionLabel,
                settings.heatWarningThreshold === val && styles.optionLabelActive,
              ]}
            >
              {val}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={[fontStyles.bodyMuted, styles.helperText, { color: colors.textMuted }]}>
        Primary exercises add 3 heat, secondary add 1. Heat fades over your decay window.
        At this threshold the muscle shows a recovery warning on the body map.
      </Text>

      {/* ── Analytics consent ───────────────────────────────── */}
      <Text style={[fontStyles.label, styles.sectionSpacing, { color: colors.textMuted }]}>
        PRIVACY
      </Text>

      <View style={[styles.toggleRow, { backgroundColor: colors.surface }]}>
        <View style={{ flex: 1 }}>
          <Text style={[fontStyles.body, { color: colors.text }]}>
            Anonymous usage analytics
          </Text>
          <Text style={[fontStyles.bodyMuted, styles.helperText, { color: colors.textMuted }]}>
            Share anonymous information about which features are used and how the app performs.
            Workout details, exercise names, weights, repetitions, notes, and personal information
            are never included.
          </Text>
        </View>
        <Switch
          value={settings.analyticsEnabled === true}
          onValueChange={(val) => updateSettings({ ...settings, analyticsEnabled: val })}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#FFFFFF"
          accessibilityLabel="Anonymous usage analytics"
          accessibilityRole="switch"
          accessibilityState={{ checked: settings.analyticsEnabled === true }}
        />
      </View>

      {/* ── Send feedback ───────────────────────────────────── */}
      <Text style={[fontStyles.label, styles.sectionSpacing, { color: colors.textMuted }]}>
        SUPPORT
      </Text>

      <Pressable
        style={[styles.feedbackRow, { backgroundColor: colors.surface }]}
        onPress={() => navigation.navigate('Feedback')}
        accessibilityRole="button"
        accessibilityLabel="Send feedback"
      >
        <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
        <Text style={[fontStyles.body, styles.feedbackLabel, { color: colors.text }]}>
          Send feedback
        </Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>

      <Text style={[fontStyles.bodyMuted, styles.footnote, { color: colors.textMuted }]}>
        All workout data stays on this device. There is no account, sync, or internet
        connection — uninstalling the app deletes your data.
      </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: spacing.lg,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl,
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
    bodyWeightInput: {
      marginTop: spacing.sm,
      borderWidth: 1,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontSize: 16,
    },
    helperText: {
      marginTop: spacing.sm,
      lineHeight: 18,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.md,
      gap: spacing.md,
    },
    feedbackRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.md,
      gap: spacing.md,
    },
    feedbackLabel: {
      flex: 1,
    },
    footnote: {
      marginTop: spacing.xl,
      lineHeight: 20,
    },
  });
}
