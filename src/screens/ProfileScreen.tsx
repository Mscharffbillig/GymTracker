import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../components/ScreenContainer';
import { WorkoutCalendar } from '../components/WorkoutCalendar';
import { useAppData } from '../context/AppDataContext';
import { formatDuration } from '../utils/duration';
import { fontStyles, radius, spacing, ThemeColors } from '../theme';
import { Gender } from '../types';
import { ProfileStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Profile'>;

function toDateStr(iso: string): string {
  return iso.split('T')[0];
}

export function ProfileScreen({ navigation }: Props) {
  const {
    logs,
    days,
    exercises,
    settings,
    updateSettings,
    weightLog,
    addWeightEntry,
    colors,
  } = useAppData();
  const styles = createStyles(colors);

  const [selectedCalDate, setSelectedCalDate] = useState<string | null>(null);
  const [weightModalVisible, setWeightModalVisible] = useState(false);
  const [weightInput, setWeightInput] = useState('');

  const workoutDates = useMemo(() => {
    const dates = new Set<string>();
    for (const l of logs) dates.add(toDateStr(l.date));
    return dates;
  }, [logs]);

  const selectedDateLogs = useMemo(() => {
    if (!selectedCalDate) return [];
    return logs.filter((l) => toDateStr(l.date) === selectedCalDate);
  }, [logs, selectedCalDate]);

  const selectedDateLabel = useMemo(() => {
    if (!selectedCalDate) return '';
    return new Date(selectedCalDate + 'T00:00:00').toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [selectedCalDate]);

  const currentWeightEntry = weightLog.length > 0 ? weightLog[0] : null;

  function handleLogWeight() {
    const weight = parseFloat(weightInput);
    if (!isNaN(weight) && weight > 0) {
      addWeightEntry(weight);
      setWeightInput('');
      setWeightModalVisible(false);
    }
  }

  return (
    <ScreenContainer style={styles.container} edges={['top', 'bottom']}>
      {/* ── Workout date detail modal ──────────────────────── */}
      <Modal
        visible={selectedCalDate !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedCalDate(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedCalDate(null)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.surface }]} onPress={() => {}}>
            <Text style={[fontStyles.heading, { color: colors.text, marginBottom: spacing.sm }]}>
              {selectedDateLabel}
            </Text>
            {selectedDateLogs.length === 0 ? (
              <Text style={[fontStyles.bodyMuted, { color: colors.textMuted }]}>
                No session logged on this day.
              </Text>
            ) : (
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {selectedDateLogs.map((log) => {
                  const exercise = exercises.find((e) => e.id === log.exerciseId);
                  const dayName = days.find((d) => d.id === log.dayId)?.name;
                  const isTime = exercise?.trackingType === 'time';
                  const setsSummary = log.sets
                    .filter((s) => s.reps > 0 || s.weight > 0 || s.durationSeconds > 0)
                    .map((s) =>
                      isTime
                        ? formatDuration(s.durationSeconds)
                        : `${s.weight}${settings.unit}×${s.reps}`
                    )
                    .join('  ·  ');
                  return (
                    <View key={log.id} style={styles.modalRow}>
                      {dayName && (
                        <Text style={[styles.modalDayName, { color: colors.primary }]}>
                          {dayName}
                        </Text>
                      )}
                      <Text style={[fontStyles.body, { color: colors.text }]}>
                        {exercise?.name ?? 'Exercise'}
                      </Text>
                      <Text style={[fontStyles.bodyMuted, { color: colors.textMuted }]}>
                        {setsSummary || 'No sets recorded'}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            )}
            <Pressable
              style={[styles.modalCloseBtn, { borderTopColor: colors.border }]}
              onPress={() => setSelectedCalDate(null)}
            >
              <Text style={[styles.modalCloseLabel, { color: colors.primary }]}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Log weight modal ───────────────────────────────── */}
      <Modal
        visible={weightModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setWeightModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setWeightModalVisible(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.surface }]} onPress={() => {}}>
            <Text style={[fontStyles.heading, { color: colors.text, marginBottom: spacing.md }]}>
              Log Weight
            </Text>
            <TextInput
              style={[styles.weightInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              keyboardType="decimal-pad"
              placeholder={`Weight in ${settings.unit}`}
              placeholderTextColor={colors.textMuted}
              value={weightInput}
              onChangeText={setWeightInput}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleLogWeight}
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalBtn, { borderColor: colors.border }]}
                onPress={() => setWeightModalVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.textMuted }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={handleLogWeight}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[fontStyles.title, styles.title, { color: colors.text }]}>Profile</Text>

        {/* ── Workout Calendar ──────────────────────────────── */}
        <View style={[styles.calendarCard, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <Text style={[fontStyles.heading, { color: colors.text }]}>Workout Calendar</Text>
          </View>
          <WorkoutCalendar
            markedDates={workoutDates}
            selectedDate={selectedCalDate}
            onDayPress={(d) => setSelectedCalDate((prev) => (prev === d ? null : d))}
            colors={colors}
          />
        </View>

        {/* ── Body Weight ───────────────────────────────────── */}
        <Text style={[fontStyles.label, styles.sectionLabel, { color: colors.textMuted }]}>
          BODY WEIGHT ({settings.unit.toUpperCase()})
        </Text>
        <View style={[styles.weightCard, { backgroundColor: colors.surface }]}>
          {currentWeightEntry ? (
            <View style={styles.weightCurrent}>
              <Text style={[styles.weightValue, { color: colors.text }]}>
                {currentWeightEntry.weight} {settings.unit}
              </Text>
              <Text style={[fontStyles.bodyMuted, { color: colors.textMuted }]}>
                Logged{' '}
                {new Date(currentWeightEntry.date).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>
          ) : (
            <Text style={[fontStyles.bodyMuted, { color: colors.textMuted, marginBottom: spacing.sm }]}>
              No weight logged yet
            </Text>
          )}
          <Pressable
            style={[styles.logWeightBtn, { backgroundColor: colors.primary }]}
            onPress={() => { setWeightInput(''); setWeightModalVisible(true); }}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.logWeightBtnText}>Log Weight</Text>
          </Pressable>
        </View>
        <Pressable
          style={[styles.menuRow, { backgroundColor: colors.surface }]}
          onPress={() => navigation.navigate('WeightHistory')}
          accessibilityRole="button"
        >
          <Ionicons name="scale-outline" size={20} color={colors.primary} />
          <Text style={[fontStyles.body, styles.menuLabel, { color: colors.text }]}>
            Weight History
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>

        {/* ── Gender ───────────────────────────────────────── */}
        <Text style={[fontStyles.label, styles.sectionLabel, { color: colors.textMuted }]}>
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
        <Text style={[fontStyles.label, styles.sectionLabel, { color: colors.textMuted }]}>
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
    calendarCard: {
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.lg,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    sectionLabel: {
      marginBottom: spacing.sm,
    },
    weightCard: {
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
      gap: spacing.sm,
    },
    weightCurrent: {
      gap: spacing.xs,
    },
    weightValue: {
      fontSize: 28,
      fontWeight: '800',
    },
    logWeightBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
    },
    logWeightBtnText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 14,
    },
    optionRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.sm,
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
      lineHeight: 18,
      marginBottom: spacing.lg,
    },
    menuRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderRadius: radius.md,
      gap: spacing.md,
      marginBottom: spacing.sm,
    },
    menuLabel: {
      flex: 1,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    modalCard: {
      width: '100%',
      borderRadius: radius.md,
      padding: spacing.lg,
      maxHeight: '75%',
    },
    modalScroll: {
      maxHeight: 320,
    },
    modalRow: {
      paddingVertical: spacing.sm,
      gap: spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalDayName: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    modalCloseBtn: {
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      alignItems: 'center',
    },
    modalCloseLabel: {
      fontWeight: '700',
      fontSize: 15,
    },
    weightInput: {
      borderWidth: 1,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontSize: 16,
      marginBottom: spacing.md,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    modalBtn: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      alignItems: 'center',
      borderWidth: 1,
    },
    modalBtnText: {
      fontWeight: '700',
      fontSize: 15,
    },
  });
}
