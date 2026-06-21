import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../components/ScreenContainer';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { useAppData } from '../context/AppDataContext';
import { getProgressSuggestion } from '../data/overload';
import { CATEGORY_LABELS } from '../data/exerciseCatalog';
import { splitSeconds, toSeconds } from '../utils/duration';
import { fontStyles, radius, spacing, ThemeColors } from '../theme';
import { ProgramStackParamList } from '../navigation/types';
import { DayExercise, SetLog } from '../types';

type Props = NativeStackScreenProps<ProgramStackParamList, 'WorkoutSession'>;

export function WorkoutSessionScreen({ route, navigation }: Props) {
  const { dayId } = route.params;
  const { days, exercises, logs, settings, saveWorkoutLog, getExerciseById, colors } =
    useAppData();
  const styles = createStyles(colors);
  const day = days.find((d) => d.id === dayId);

  const [setsByExercise, setSetsByExercise] = useState<Record<string, SetLog[]>>(() => {
    const initial: Record<string, SetLog[]> = {};
    if (day) {
      for (const dayExercise of day.exercises) {
        const exercise = exercises.find((e) => e.id === dayExercise.exerciseId);
        const suggestion = exercise
          ? getProgressSuggestion(exercise, logs, settings.unit)
          : { weight: null, durationSeconds: null, message: '' };
        const isTime = exercise?.trackingType === 'time';
        initial[dayExercise.id] = Array.from({ length: dayExercise.targetSets }, () => ({
          reps: isTime ? 0 : dayExercise.targetReps,
          weight: isTime ? 0 : suggestion.weight ?? 0,
          durationSeconds: isTime ? suggestion.durationSeconds ?? 0 : 0,
        }));
      }
    }
    return initial;
  });

  if (!day) {
    return (
      <ScreenContainer style={styles.container}>
        <EmptyState title="Day not found" />
      </ScreenContainer>
    );
  }

  function updateSet(dayExerciseId: string, setIndex: number, field: 'reps' | 'weight', value: string) {
    const numeric = value === '' ? 0 : parseFloat(value);
    setSetsByExercise((prev) => {
      const next = [...(prev[dayExerciseId] ?? [])];
      next[setIndex] = { ...next[setIndex], [field]: isNaN(numeric) ? 0 : numeric };
      return { ...prev, [dayExerciseId]: next };
    });
  }

  function updateDurationPart(
    dayExerciseId: string,
    setIndex: number,
    part: 'minutes' | 'seconds',
    value: string
  ) {
    const numeric = value === '' ? 0 : parseInt(value, 10) || 0;
    setSetsByExercise((prev) => {
      const next = [...(prev[dayExerciseId] ?? [])];
      const current = next[setIndex];
      const split = splitSeconds(current.durationSeconds);
      const minutes = part === 'minutes' ? numeric : split.minutes;
      const seconds = part === 'seconds' ? numeric : split.seconds;
      next[setIndex] = { ...current, durationSeconds: toSeconds(minutes, seconds) };
      return { ...prev, [dayExerciseId]: next };
    });
  }

  function handleFinish() {
    const entries = day!.exercises.map((dayExercise) => ({
      exerciseId: dayExercise.exerciseId,
      targetReps: dayExercise.targetReps,
      targetDurationSeconds: dayExercise.targetDurationSeconds,
      sets: setsByExercise[dayExercise.id] ?? [],
    }));
    saveWorkoutLog(dayId, entries);
    Alert.alert('Workout saved', `Nice work — ${day!.name} is logged.`, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  }

  function renderExercise({ item }: { item: DayExercise }) {
    const exercise = getExerciseById(item.exerciseId);
    if (!exercise) return null;
    const suggestion = getProgressSuggestion(exercise, logs, settings.unit);
    const sets = setsByExercise[item.id] ?? [];
    const isTime = exercise.trackingType === 'time';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[fontStyles.heading, { color: colors.text }]}>{exercise.name}</Text>
            <Text style={[fontStyles.bodyMuted, { color: colors.textMuted }]}>
              {CATEGORY_LABELS[exercise.category]} · Target{' '}
              {isTime
                ? `${item.targetSets} × ${Math.floor(item.targetDurationSeconds / 60)}:${String(item.targetDurationSeconds % 60).padStart(2, '0')}`
                : `${item.targetSets} × ${item.targetReps}`}
            </Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate('ExerciseHistory', { exerciseId: exercise.id })}
            hitSlop={8}
          >
            <Ionicons name="time-outline" size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        <Text style={styles.suggestion}>{suggestion.message}</Text>

        <View style={styles.setHeaderRow}>
          <Text style={[fontStyles.label, styles.setCol, { color: colors.textMuted }]}>
            {isTime ? 'RND' : 'SET'}
          </Text>
          {isTime ? (
            <>
              <Text style={[fontStyles.label, styles.inputCol, { color: colors.textMuted }]}>
                MIN
              </Text>
              <Text style={[fontStyles.label, styles.inputCol, { color: colors.textMuted }]}>
                SEC
              </Text>
            </>
          ) : (
            <>
              <Text style={[fontStyles.label, styles.inputCol, { color: colors.textMuted }]}>
                REPS
              </Text>
              <Text style={[fontStyles.label, styles.inputCol, { color: colors.textMuted }]}>
                WEIGHT ({settings.unit})
              </Text>
            </>
          )}
        </View>

        {sets.map((set, index) => {
          if (isTime) {
            const split = splitSeconds(set.durationSeconds);
            return (
              <View key={index} style={styles.setRow}>
                <Text style={[fontStyles.body, styles.setCol, { color: colors.text }]}>
                  {index + 1}
                </Text>
                <TextInput
                  style={[styles.input, styles.inputCol]}
                  keyboardType="number-pad"
                  value={split.minutes === 0 ? '' : String(split.minutes)}
                  onChangeText={(v) => updateDurationPart(item.id, index, 'minutes', v)}
                />
                <TextInput
                  style={[styles.input, styles.inputCol]}
                  keyboardType="number-pad"
                  value={split.seconds === 0 ? '' : String(split.seconds)}
                  onChangeText={(v) => updateDurationPart(item.id, index, 'seconds', v)}
                />
              </View>
            );
          }
          return (
            <View key={index} style={styles.setRow}>
              <Text style={[fontStyles.body, styles.setCol, { color: colors.text }]}>
                {index + 1}
              </Text>
              <TextInput
                style={[styles.input, styles.inputCol]}
                keyboardType="number-pad"
                value={set.reps === 0 ? '' : String(set.reps)}
                onChangeText={(v) => updateSet(item.id, index, 'reps', v)}
              />
              <TextInput
                style={[styles.input, styles.inputCol]}
                keyboardType="decimal-pad"
                value={set.weight === 0 ? '' : String(set.weight)}
                onChangeText={(v) => updateSet(item.id, index, 'weight', v)}
              />
            </View>
          );
        })}
      </View>
    );
  }

  return (
    <ScreenContainer style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'android' ? 24 : 0}
      >
        <FlatList
          data={day.exercises}
          keyExtractor={(e) => e.id}
          renderItem={renderExercise}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        />
        <View style={styles.footer}>
          <Button label="Finish Workout" onPress={handleFinish} />
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      paddingTop: spacing.md,
    },
    flex: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl * 2,
      gap: spacing.md,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    suggestion: {
      marginTop: spacing.sm,
      fontSize: 13,
      fontStyle: 'italic',
      color: colors.primary,
    },
    setHeaderRow: {
      flexDirection: 'row',
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    setRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.xs,
      gap: spacing.sm,
    },
    setCol: {
      width: 40,
    },
    inputCol: {
      flex: 1,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.background,
    },
    footer: {
      padding: spacing.lg,
      backgroundColor: colors.background,
    },
  });
}
