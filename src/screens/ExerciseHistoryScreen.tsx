import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { EmptyState } from '../components/EmptyState';
import { WeightChart } from '../components/WeightChart';
import { useAppData } from '../context/AppDataContext';
import { formatDuration } from '../utils/duration';
import { fontStyles, radius, spacing, ThemeColors } from '../theme';
import { ExerciseLog } from '../types';

interface Props {
  navigation: { setOptions: (options: { title?: string }) => void };
  route: { params: { exerciseId: string } };
}

export function ExerciseHistoryScreen({ route, navigation }: Props) {
  const { exerciseId } = route.params;
  const { getExerciseById, getLogsForExercise, settings, colors } = useAppData();
  const styles = createStyles(colors);
  const exercise = getExerciseById(exerciseId);
  const exerciseLogs = getLogsForExercise(exerciseId);
  const isTime = exercise?.trackingType === 'time';

  React.useLayoutEffect(() => {
    navigation.setOptions({ title: exercise?.name ?? 'History' });
  }, [navigation, exercise?.name]);

  const chartData = [...exerciseLogs]
    .reverse()
    .map((log) => {
      if (isTime) {
        const validSets = log.sets.filter((s) => s.durationSeconds > 0);
        const topDuration =
          validSets.length > 0 ? Math.max(...validSets.map((s) => s.durationSeconds)) : 0;
        return { date: log.date, value: topDuration };
      }
      const validSets = log.sets.filter((s) => s.reps > 0);
      const topWeight = validSets.length > 0 ? Math.max(...validSets.map((s) => s.weight)) : 0;
      return { date: log.date, value: topWeight };
    })
    .filter((point) => point.value > 0);

  function renderItem({ item }: { item: ExerciseLog }) {
    const date = new Date(item.date);
    const dateLabel = date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const setsSummary = isTime
      ? item.sets
          .filter((s) => s.durationSeconds > 0)
          .map((s) => formatDuration(s.durationSeconds))
          .join('  ·  ')
      : item.sets
          .filter((s) => s.reps > 0 || s.weight > 0)
          .map((s) => `${s.weight}${settings.unit}×${s.reps}`)
          .join('  ·  ');

    return (
      <View style={styles.row}>
        <Text style={[fontStyles.label, { color: colors.textMuted }]}>{dateLabel}</Text>
        <Text style={[fontStyles.body, { color: colors.text }]}>
          {setsSummary || 'No sets recorded'}
        </Text>
      </View>
    );
  }

  return (
    <ScreenContainer style={styles.container}>
      <FlatList
        data={exerciseLogs}
        keyExtractor={(l) => l.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          chartData.length > 0 ? (
            <WeightChart
              data={chartData}
              formatValue={isTime ? formatDuration : (n) => `${n}${settings.unit}`}
            />
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            title="No history yet"
            subtitle="Log a workout with this exercise to start tracking progress."
          />
        }
      />
    </ScreenContainer>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      paddingTop: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    listContent: {
      gap: spacing.sm,
      paddingBottom: spacing.lg,
    },
    row: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      gap: spacing.xs,
      borderWidth: 1,
      borderColor: colors.border,
    },
  });
}
