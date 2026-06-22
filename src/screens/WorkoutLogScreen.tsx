import React, { useMemo } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../components/ScreenContainer';
import { EmptyState } from '../components/EmptyState';
import { useAppData } from '../context/AppDataContext';
import { formatDuration } from '../utils/duration';
import { fontStyles, radius, spacing, ThemeColors } from '../theme';
import { ProgressStackParamList } from '../navigation/types';
import { ExerciseLog } from '../types';

type Props = NativeStackScreenProps<ProgressStackParamList, 'WorkoutLog'>;

interface Session {
  key: string;
  date: string;
  dayName: string;
  entries: ExerciseLog[];
}

export function WorkoutLogScreen({ navigation }: Props) {
  const { logs, days, getExerciseById, settings, colors, deleteLog } = useAppData();
  const styles = createStyles(colors);

  function confirmDelete(entry: ExerciseLog, exerciseName: string) {
    Alert.alert('Delete entry?', `Remove ${exerciseName} from this workout log.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteLog(entry.id) },
    ]);
  }

  const sessions = useMemo<Session[]>(() => {
    const byKey = new Map<string, Session>();
    for (const log of logs) {
      const key = `${log.date}|${log.dayId}`;
      const dayName = days.find((d) => d.id === log.dayId)?.name ?? 'Workout';
      const existing = byKey.get(key);
      if (existing) {
        existing.entries.push(log);
      } else {
        byKey.set(key, { key, date: log.date, dayName, entries: [log] });
      }
    }
    return Array.from(byKey.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [logs, days]);

  function renderSession({ item }: { item: Session }) {
    const dateLabel = new Date(item.date).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return (
      <View style={styles.card}>
        <Text style={[fontStyles.heading, { color: colors.text }]}>{item.dayName}</Text>
        <Text style={[fontStyles.label, styles.dateLabel, { color: colors.textMuted }]}>
          {dateLabel}
        </Text>
        {item.entries.map((entry, index) => {
          const exercise = getExerciseById(entry.exerciseId);
          const setsSummary =
            exercise?.trackingType === 'time'
              ? entry.sets
                  .filter((s) => s.durationSeconds > 0)
                  .map((s) => formatDuration(s.durationSeconds))
                  .join('  ·  ')
              : entry.sets
                  .filter((s) => s.reps > 0 || s.weight > 0)
                  .map((s) => `${s.weight}${settings.unit}×${s.reps}`)
                  .join('  ·  ');
          return (
            <View
              key={entry.id}
              style={[styles.entryRow, index === 0 && styles.entryRowFirst]}
            >
              <Pressable
                style={styles.entryRowMain}
                onPress={() =>
                  exercise && navigation.navigate('ExerciseHistory', { exerciseId: exercise.id })
                }
              >
                <Text style={[fontStyles.body, { color: colors.text }]}>
                  {exercise?.name ?? 'Exercise'}
                </Text>
                <Text style={[fontStyles.bodyMuted, { color: colors.textMuted }]}>
                  {setsSummary || 'No sets recorded'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => confirmDelete(entry, exercise?.name ?? 'this exercise')}
                style={styles.deleteBtn}
                hitSlop={8}
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            </View>
          );
        })}
      </View>
    );
  }

  return (
    <ScreenContainer style={styles.container} edges={['top', 'bottom']}>
      <Text style={[fontStyles.title, styles.header, { color: colors.text }]}>Workout Log</Text>
      <FlatList
        data={sessions}
        keyExtractor={(s) => s.key}
        renderItem={renderSession}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title="No workouts logged yet"
            subtitle="Finish a workout from the Program tab and it will show up here."
          />
        }
      />
    </ScreenContainer>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      paddingTop: spacing.lg,
    },
    header: {
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.md,
    },
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
      gap: spacing.sm,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    dateLabel: {
      marginBottom: spacing.sm,
    },
    entryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    entryRowFirst: {
      borderTopWidth: 0,
      paddingTop: 0,
    },
    entryRowMain: {
      flex: 1,
      gap: spacing.xs,
    },
    deleteBtn: {
      padding: spacing.xs,
    },
  });
}
