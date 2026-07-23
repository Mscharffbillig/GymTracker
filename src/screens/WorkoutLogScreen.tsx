import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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
  const [search, setSearch] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  function confirmDelete(entry: ExerciseLog, exerciseName: string) {
    Alert.alert('Delete entry?', `Remove ${exerciseName} from this routine log.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteLog(entry.id) },
    ]);
  }

  function toggleExpand(key: string) {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const sessions = useMemo<Session[]>(() => {
    const byKey = new Map<string, Session>();
    for (const log of logs) {
      const key = `${log.date}|${log.dayId}`;
      const dayName = days.find((d) => d.id === log.dayId)?.name ?? 'Routine';
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

  const filteredSessions = useMemo<Session[]>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter(
      (s) =>
        s.dayName.toLowerCase().includes(q) ||
        s.entries.some((e) => getExerciseById(e.exerciseId)?.name.toLowerCase().includes(q))
    );
  }, [sessions, search, getExerciseById]);

  function renderSession({ item }: { item: Session }) {
    const isExpanded = expandedKeys.has(item.key);
    const dateLabel = new Date(item.date).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return (
      <View style={styles.card}>
        <Pressable style={styles.cardHeader} onPress={() => toggleExpand(item.key)}>
          <View style={styles.cardHeaderText}>
            <Text style={[fontStyles.heading, { color: colors.text }]}>{item.dayName}</Text>
            <Text style={[fontStyles.label, { color: colors.textMuted }]}>{dateLabel}</Text>
          </View>
          <View style={styles.cardHeaderMeta}>
            <Text style={[fontStyles.bodyMuted, { color: colors.textMuted }]}>
              {item.entries.length} {item.entries.length === 1 ? 'exercise' : 'exercises'}
            </Text>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textMuted}
            />
          </View>
        </Pressable>

        {isExpanded &&
          item.entries.map((entry) => {
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
              <View key={entry.id} style={styles.entryRow}>
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
                  {entry.note ? (
                    <Text style={[styles.entryNote, { color: colors.textMuted }]}>
                      {entry.note}
                    </Text>
                  ) : null}
                </Pressable>
                <Pressable
                  onPress={() => navigation.navigate('LogEdit', { logId: entry.id })}
                  style={styles.editBtn}
                  hitSlop={8}
                >
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
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
      <View style={styles.headerRow}>
        <Text style={[fontStyles.title, { color: colors.text }]}>Routine Log</Text>
      </View>
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search sessions…"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
      <FlatList
        data={filteredSessions}
        keyExtractor={(s) => s.key}
        renderItem={renderSession}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          search.trim() ? (
            <EmptyState title="No sessions match your search" />
          ) : (
            <EmptyState
              title="No sessions logged yet"
              subtitle="Finish a routine from the Program tab and it will show up here."
            />
          )
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
    headerRow: {
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.sm,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
    },
    searchInput: {
      flex: 1,
      paddingVertical: spacing.sm,
      fontSize: 15,
      color: colors.text,
    },
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
      gap: spacing.sm,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      overflow: 'hidden',
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      gap: spacing.sm,
    },
    cardHeaderText: {
      flex: 1,
      gap: spacing.xs,
    },
    cardHeaderMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    entryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    entryRowMain: {
      flex: 1,
      gap: spacing.xs,
    },
    entryNote: {
      fontSize: 12,
      fontStyle: 'italic',
      lineHeight: 17,
    },
    editBtn: {
      padding: spacing.xs,
      marginRight: spacing.xs,
    },
    deleteBtn: {
      padding: spacing.xs,
    },
  });
}
