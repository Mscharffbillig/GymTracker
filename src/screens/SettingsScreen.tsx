import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../components/ScreenContainer';
import { useAppData } from '../context/AppDataContext';
import { fontStyles, radius, spacing, ThemeColors } from '../theme';
import { BodyMapStyle, ThemeMode, WeightUnit } from '../types';
import { SettingsStackParamList } from '../navigation/types';

const HEAT_WARNING_OPTIONS = [5, 6, 7, 8, 10];
const HEAT_COOLDOWN_OPTIONS = [1, 2, 3, 4];

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
        BODY MAP STYLE
      </Text>
      <View style={styles.optionRow}>
        {(['simple', 'heatmap'] as BodyMapStyle[]).map((style) => (
          <Pressable
            key={style}
            onPress={() => updateSettings({ ...settings, bodyMapStyle: style })}
            style={[styles.option, settings.bodyMapStyle === style && styles.optionActive]}
          >
            <Text style={[styles.optionLabel, settings.bodyMapStyle === style && styles.optionLabelActive]}>
              {style === 'simple' ? 'Simple' : 'Heat Map'}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={[fontStyles.bodyMuted, styles.helperText, { color: colors.textMuted }]}>
        Simple shows whether a muscle was worked this week. Heat Map shows accumulated volume
        using a point-based color gradient.
      </Text>

      <Text style={[fontStyles.label, styles.sectionSpacing, { color: colors.textMuted }]}>
        HEAT MAP — DAILY COOLDOWN (POINTS/DAY)
      </Text>
      <View style={styles.chipRow}>
        {HEAT_COOLDOWN_OPTIONS.map((val) => (
          <Pressable
            key={val}
            onPress={() => updateSettings({ ...settings, heatCooldownPerDay: val })}
            style={[styles.chip, settings.heatCooldownPerDay === val && styles.optionActive]}
          >
            <Text
              style={[styles.optionLabel, settings.heatCooldownPerDay === val && styles.optionLabelActive]}
            >
              {val}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={[fontStyles.bodyMuted, styles.helperText, { color: colors.textMuted }]}>
        Heat points lost per 24 hours. Higher = muscles recover faster on the map. Default is 2.
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
        Primary exercises add 3 pts, secondary add 1 pt. Heat decays daily. At this threshold
        the muscle shows a recovery warning on the body map.
      </Text>

      {/* ── Privacy consent ─────────────────────────────────── */}
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
          value={settings.analyticsEnabled === 'allowed'}
          onValueChange={(val) =>
            updateSettings({ ...settings, analyticsEnabled: val ? 'allowed' : 'declined' })
          }
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#FFFFFF"
          accessibilityLabel="Anonymous usage analytics"
          accessibilityRole="switch"
          accessibilityState={{ checked: settings.analyticsEnabled === 'allowed' }}
        />
      </View>

      <View style={[styles.toggleRow, { backgroundColor: colors.surface }]}>
        <View style={{ flex: 1 }}>
          <Text style={[fontStyles.body, { color: colors.text }]}>
            Crash diagnostics
          </Text>
          <Text style={[fontStyles.bodyMuted, styles.helperText, { color: colors.textMuted }]}>
            Send anonymous crash reports to help fix bugs. No workout data, names, weights,
            or personal information is ever included.
          </Text>
        </View>
        <Switch
          value={settings.diagnosticsEnabled === 'allowed'}
          onValueChange={(val) =>
            updateSettings({ ...settings, diagnosticsEnabled: val ? 'allowed' : 'declined' })
          }
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#FFFFFF"
          accessibilityLabel="Crash diagnostics"
          accessibilityRole="switch"
          accessibilityState={{ checked: settings.diagnosticsEnabled === 'allowed' }}
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

      <Pressable
        onPress={() => Linking.openURL('https://stonewakesoftware.com/only-sets/privacy')}
        accessibilityRole="link"
        accessibilityLabel="Privacy Policy"
        style={styles.privacyLink}
      >
        <Text style={[fontStyles.bodyMuted, { color: colors.primary }]}>Privacy Policy</Text>
      </Pressable>
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
    privacyLink: {
      marginTop: spacing.md,
      alignSelf: 'center',
    },
  });
}
