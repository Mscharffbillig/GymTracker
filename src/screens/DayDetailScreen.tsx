import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../components/ScreenContainer';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { PromptModal } from '../components/PromptModal';
import { TargetModal } from '../components/TargetModal';
import { useAppData } from '../context/AppDataContext';
import { CATEGORY_LABELS } from '../data/exerciseCatalog';
import { formatDuration } from '../utils/duration';
import { fontStyles, radius, spacing, ThemeColors } from '../theme';
import { ProgramStackParamList } from '../navigation/types';
import { DayExercise } from '../types';

type Props = NativeStackScreenProps<ProgramStackParamList, 'DayDetail'>;

export function DayDetailScreen({ route, navigation }: Props) {
  const { dayId } = route.params;
  const {
    days,
    renameDay,
    deleteDay,
    updateDayExercise,
    removeExerciseFromDay,
    moveDayExercise,
    getExerciseById,
    colors,
  } = useAppData();
  const styles = createStyles(colors);
  const day = days.find((d) => d.id === dayId);

  const [renameVisible, setRenameVisible] = useState(false);
  const [editingExercise, setEditingExercise] = useState<DayExercise | null>(null);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: day?.name ?? 'Day',
      headerRight: () => (
        <Pressable onPress={() => setRenameVisible(true)} style={{ marginRight: spacing.sm }}>
          <Ionicons name="create-outline" size={22} color={colors.primary} />
        </Pressable>
      ),
    });
  }, [navigation, day?.name, colors.primary]);

  if (!day) {
    return (
      <ScreenContainer style={styles.container}>
        <EmptyState title="Day not found" subtitle="It may have been deleted." />
      </ScreenContainer>
    );
  }

  function renderItem({ item, index }: { item: DayExercise; index: number }) {
    const exercise = getExerciseById(item.exerciseId);
    if (!exercise) return null;
    const targetLabel =
      exercise.trackingType === 'time'
        ? `${item.targetSets} round${item.targetSets === 1 ? '' : 's'} × ${formatDuration(item.targetDurationSeconds)}`
        : `${item.targetSets} sets × ${item.targetReps} reps`;
    return (
      <Pressable style={styles.row} onPress={() => setEditingExercise(item)}>
        <View style={styles.rowMain}>
          <Text style={[fontStyles.heading, { color: colors.text }]}>{exercise.name}</Text>
          <Text style={[fontStyles.bodyMuted, { color: colors.textMuted }]}>
            {CATEGORY_LABELS[exercise.category]} · {targetLabel}
          </Text>
        </View>
        <View style={styles.rowActions}>
          <Pressable
            disabled={index === 0}
            onPress={() => moveDayExercise(dayId, item.id, 'up')}
            style={styles.iconBtn}
            hitSlop={8}
          >
            <Ionicons
              name="chevron-up"
              size={20}
              color={index === 0 ? colors.border : colors.textMuted}
            />
          </Pressable>
          <Pressable
            disabled={index === day!.exercises.length - 1}
            onPress={() => moveDayExercise(dayId, item.id, 'down')}
            style={styles.iconBtn}
            hitSlop={8}
          >
            <Ionicons
              name="chevron-down"
              size={20}
              color={index === day!.exercises.length - 1 ? colors.border : colors.textMuted}
            />
          </Pressable>
          <Pressable
            onPress={() => removeExerciseFromDay(dayId, item.id)}
            style={styles.iconBtn}
            hitSlop={8}
          >
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </Pressable>
        </View>
      </Pressable>
    );
  }

  return (
    <ScreenContainer style={styles.container}>
      <FlatList
        data={day.exercises}
        keyExtractor={(e) => e.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title="No exercises yet"
            subtitle="Add exercises to build out this day's workout."
          />
        }
      />

      <View style={styles.footer}>
        <Button
          label="+ Add Exercise"
          variant="secondary"
          onPress={() => navigation.navigate('ExercisePicker', { dayId })}
          style={styles.footerBtn}
        />
        <Button
          label="Start Workout"
          onPress={() => navigation.navigate('WorkoutSession', { dayId })}
          disabled={day.exercises.length === 0}
          style={styles.footerBtn}
        />
      </View>

      <PromptModal
        visible={renameVisible}
        title="Rename Day"
        initialValue={day.name}
        onCancel={() => setRenameVisible(false)}
        onSubmit={(name) => {
          setRenameVisible(false);
          renameDay(dayId, name);
        }}
      />

      <TargetModal
        visible={editingExercise !== null}
        title="Edit Target"
        trackingType={
          editingExercise ? getExerciseById(editingExercise.exerciseId)?.trackingType ?? 'reps' : 'reps'
        }
        initialSets={editingExercise?.targetSets ?? 3}
        initialReps={editingExercise?.targetReps ?? 10}
        initialDurationSeconds={editingExercise?.targetDurationSeconds ?? 30}
        onCancel={() => setEditingExercise(null)}
        onSubmit={(sets, reps, durationSeconds) => {
          if (editingExercise) {
            updateDayExercise(dayId, editingExercise.id, sets, reps, durationSeconds);
          }
          setEditingExercise(null);
        }}
      />
    </ScreenContainer>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      paddingTop: spacing.md,
    },
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
      gap: spacing.sm,
    },
    row: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    rowMain: {
      flex: 1,
      gap: spacing.xs,
    },
    rowActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconBtn: {
      padding: spacing.xs,
    },
    footer: {
      padding: spacing.lg,
      gap: spacing.sm,
    },
    footerBtn: {
      width: '100%',
    },
  });
}
