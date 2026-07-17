import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../components/ScreenContainer';
import { useAppData } from '../context/AppDataContext';
import { fontStyles, radius, spacing, ThemeColors } from '../theme';
import { Gender } from '../types';
import { ProfileStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Profile'>;

export function ProfileScreen({ navigation }: Props) {
  const { settings, updateSettings, colors } = useAppData();
  const styles = createStyles(colors);

  return (
    <ScreenContainer style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[fontStyles.title, styles.title, { color: colors.text }]}>Profile</Text>

        {/* ── Body weight ──────────────────────────────────── */}
        <Text style={[fontStyles.label, { color: colors.textMuted }]}>
          BODY WEIGHT ({settings.unit.toUpperCase()})
        </Text>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
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
          Used to fill weight fields on bodyweight exercises during a session.
        </Text>

        {/* ── Gender ───────────────────────────────────────── */}
        <Text style={[fontStyles.label, styles.sectionSpacing, { color: colors.textMuted }]}>
          BODY MAP FIGURE
        </Text>
        <View style={styles.optionRow}>
          {(['male', 'female'] as Gender[]).map((g) => (
            <Pressable
              key={g}
              onPress={() => updateSettings({ ...settings, gender: g })}
              style={[styles.option, settings.gender === g && styles.optionActive]}
            >
              <Text style={[styles.optionLabel, settings.gender === g && styles.optionLabelActive]}>
                {g === 'male' ? 'Male' : 'Female'}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={[fontStyles.bodyMuted, styles.helperText, { color: colors.textMuted }]}>
          Selects the figure shown on your Muscle Map.
        </Text>

        {/* ── Statistics ───────────────────────────────────── */}
        <Text style={[fontStyles.label, styles.sectionSpacing, { color: colors.textMuted }]}>
          INSIGHTS
        </Text>
        <Pressable
          style={[styles.menuRow, { backgroundColor: colors.surface }]}
          onPress={() => navigation.navigate('Stats')}
          accessibilityRole="button"
          accessibilityLabel="Statistics"
        >
          <Ionicons name="bar-chart-outline" size={20} color={colors.primary} />
          <Text style={[fontStyles.body, styles.menuLabel, { color: colors.text }]}>
            Statistics
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1 },
    scrollContent: {
      paddingTop: spacing.lg,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl,
    },
    title: {
      marginBottom: spacing.lg,
    },
    input: {
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
    sectionSpacing: {
      marginTop: spacing.xl,
    },
    optionRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.sm,
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
    menuRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.md,
      gap: spacing.md,
    },
    menuLabel: {
      flex: 1,
    },
  });
}
