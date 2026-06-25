import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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
import { getProgressSuggestion, ProgressSuggestion } from '../data/overload';
import { CATEGORY_LABELS } from '../data/exerciseCatalog';
import { splitSeconds, toSeconds } from '../utils/duration';
import { generateId } from '../utils/id';
import { fontStyles, radius, spacing, ThemeColors } from '../theme';
import { ProgramStackParamList } from '../navigation/types';
import { DayExercise, DraftWorkout, ExtraSessionExercise, ExerciseLog, SetLog } from '../types';

type Props = NativeStackScreenProps<ProgramStackParamList, 'WorkoutSession'>;

function lastTopWeight(exerciseId: string, logs: ExerciseLog[]): number {
  const matching = logs.filter((l) => l.exerciseId === exerciseId);
  if (matching.length === 0) return 0;
  const last = matching.reduce((a, b) =>
    new Date(a.date) > new Date(b.date) ? a : b
  );
  const valid = last.sets.filter((s) => s.weight > 0);
  return valid.length === 0 ? 0 : Math.max(...valid.map((s) => s.weight));
}

function lastTopDuration(exerciseId: string, logs: ExerciseLog[]): number {
  const matching = logs.filter((l) => l.exerciseId === exerciseId);
  if (matching.length === 0) return 0;
  const last = matching.reduce((a, b) =>
    new Date(a.date) > new Date(b.date) ? a : b
  );
  const valid = last.sets.filter((s) => s.durationSeconds > 0);
  return valid.length === 0 ? 0 : Math.max(...valid.map((s) => s.durationSeconds));
}

export function WorkoutSessionScreen({ route, navigation }: Props) {
  const { dayId } = route.params;
  const {
    days,
    exercises,
    logs,
    settings,
    saveWorkoutLog,
    getExerciseById,
    colors,
    draftWorkout,
    saveDraftWorkout,
    clearDraftWorkout,
  } = useAppData();
  const styles = createStyles(colors);
  const day = days.find((d) => d.id === dayId);

  const hasDraft = draftWorkout?.dayId === dayId;

  // ── State — initialised from draft if resuming, otherwise fresh ──────────

  const [setsByExercise, setSetsByExercise] = useState<Record<string, SetLog[]>>(() => {
    if (hasDraft) return draftWorkout!.setsByExercise;
    if (!day) return {};
    const init: Record<string, SetLog[]> = {};
    for (const de of day.exercises) {
      const ex = exercises.find((e) => e.id === de.exerciseId);
      const isTime = ex?.trackingType === 'time';
      const prevWeight = isTime ? 0 : lastTopWeight(de.exerciseId, logs);
      const prevDur = isTime ? lastTopDuration(de.exerciseId, logs) || de.targetDurationSeconds : 0;
      init[de.id] = Array.from({ length: de.targetSets }, () => ({
        reps: isTime ? 0 : de.targetReps,
        weight: prevWeight,
        durationSeconds: prevDur,
      }));
    }
    return init;
  });

  const [skippedExercises, setSkippedExercises] = useState<Set<string>>(() =>
    hasDraft ? new Set(draftWorkout!.skippedExercises) : new Set()
  );

  const [activeExerciseIds, setActiveExerciseIds] = useState<Record<string, string>>(() => {
    if (hasDraft) return draftWorkout!.activeExerciseIds;
    if (!day) return {};
    const init: Record<string, string> = {};
    for (const de of day.exercises) init[de.id] = de.exerciseId;
    return init;
  });

  const [extraExercises, setExtraExercises] = useState<ExtraSessionExercise[]>(() =>
    hasDraft ? draftWorkout!.extraExercises : []
  );

  const [extraSets, setExtraSets] = useState<Record<string, SetLog[]>>(() =>
    hasDraft ? draftWorkout!.extraSets : {}
  );

  const [startedAt] = useState(() =>
    hasDraft ? draftWorkout!.startedAt : new Date().toISOString()
  );

  const [showResumeBanner, setShowResumeBanner] = useState(hasDraft);

  // ── Draft auto-save ──────────────────────────────────────────────────────

  const isDraftCleared = useRef(false);
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    if (isDraftCleared.current || !day) return;
    const draft: DraftWorkout = {
      dayId,
      startedAt,
      setsByExercise,
      skippedExercises: [...skippedExercises],
      activeExerciseIds,
      extraExercises,
      extraSets,
    };
    saveDraftWorkout(draft);
  }, [setsByExercise, skippedExercises, activeExerciseIds, extraExercises, extraSets]);

  if (!day) {
    return (
      <ScreenContainer style={styles.container}>
        <EmptyState title="Day not found" />
      </ScreenContainer>
    );
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  function handleStartFresh() {
    setShowResumeBanner(false);
    isDraftCleared.current = true;
    clearDraftWorkout();

    const freshSets: Record<string, SetLog[]> = {};
    const freshActiveIds: Record<string, string> = {};
    for (const de of day!.exercises) {
      const ex = exercises.find((e) => e.id === de.exerciseId);
      const isTime = ex?.trackingType === 'time';
      const prevWeight = isTime ? 0 : lastTopWeight(de.exerciseId, logs);
      const prevDur = isTime ? lastTopDuration(de.exerciseId, logs) || de.targetDurationSeconds : 0;
      freshSets[de.id] = Array.from({ length: de.targetSets }, () => ({
        reps: isTime ? 0 : de.targetReps,
        weight: prevWeight,
        durationSeconds: prevDur,
      }));
      freshActiveIds[de.id] = de.exerciseId;
    }
    setSetsByExercise(freshSets);
    setSkippedExercises(new Set());
    setActiveExerciseIds(freshActiveIds);
    setExtraExercises([]);
    setExtraSets({});
    // Re-arm auto-save for the fresh session
    isDraftCleared.current = false;
  }

  function toggleSkip(dayExerciseId: string) {
    setSkippedExercises((prev) => {
      const next = new Set(prev);
      next.has(dayExerciseId) ? next.delete(dayExerciseId) : next.add(dayExerciseId);
      return next;
    });
  }

  function toggleAlternative(dayExercise: DayExercise) {
    if (!dayExercise.alternativeExerciseId) return;
    setActiveExerciseIds((prev) => {
      const current = prev[dayExercise.id] ?? dayExercise.exerciseId;
      const next = current === dayExercise.exerciseId
        ? dayExercise.alternativeExerciseId!
        : dayExercise.exerciseId;
      return { ...prev, [dayExercise.id]: next };
    });
  }

  function updateSet(
    dayExerciseId: string,
    setIndex: number,
    field: 'reps' | 'weight',
    value: string
  ) {
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

  function addSet(dayExerciseId: string, isTime: boolean) {
    setSetsByExercise((prev) => {
      const current = prev[dayExerciseId] ?? [];
      const last = current[current.length - 1];
      const newSet: SetLog = last
        ? { ...last }
        : { reps: 0, weight: 0, durationSeconds: 0 };
      return { ...prev, [dayExerciseId]: [...current, newSet] };
    });
  }

  function updateExtraSet(
    extraId: string,
    setIndex: number,
    field: 'reps' | 'weight',
    value: string
  ) {
    const numeric = value === '' ? 0 : parseFloat(value);
    setExtraSets((prev) => {
      const next = [...(prev[extraId] ?? [])];
      next[setIndex] = { ...next[setIndex], [field]: isNaN(numeric) ? 0 : numeric };
      return { ...prev, [extraId]: next };
    });
  }

  function updateExtraDurationPart(
    extraId: string,
    setIndex: number,
    part: 'minutes' | 'seconds',
    value: string
  ) {
    const numeric = value === '' ? 0 : parseInt(value, 10) || 0;
    setExtraSets((prev) => {
      const next = [...(prev[extraId] ?? [])];
      const current = next[setIndex];
      const split = splitSeconds(current.durationSeconds);
      const minutes = part === 'minutes' ? numeric : split.minutes;
      const seconds = part === 'seconds' ? numeric : split.seconds;
      next[setIndex] = { ...current, durationSeconds: toSeconds(minutes, seconds) };
      return { ...prev, [extraId]: next };
    });
  }

  function addExtraSet(extraId: string) {
    setExtraSets((prev) => {
      const current = prev[extraId] ?? [];
      const last = current[current.length - 1];
      const newSet: SetLog = last ? { ...last } : { reps: 0, weight: 0, durationSeconds: 0 };
      return { ...prev, [extraId]: [...current, newSet] };
    });
  }

  function removeExtraExercise(extraId: string) {
    setExtraExercises((prev) => prev.filter((e) => e.id !== extraId));
    setExtraSets((prev) => {
      const next = { ...prev };
      delete next[extraId];
      return next;
    });
  }

  function handleAddExercise() {
    navigation.navigate('ExercisePicker', {
      dayId,
      onSessionAdd: (exerciseId, sets, reps, durSecs) => {
        const id = generateId();
        const ex = getExerciseById(exerciseId);
        const isTime = ex?.trackingType === 'time';
        const prevWeight = isTime ? 0 : lastTopWeight(exerciseId, logs);
        const prevDur = isTime ? lastTopDuration(exerciseId, logs) || durSecs : 0;
        setExtraExercises((prev) => [
          ...prev,
          { id, exerciseId, targetSets: sets, targetReps: reps, targetDurationSeconds: durSecs },
        ]);
        setExtraSets((prev) => ({
          ...prev,
          [id]: Array.from({ length: sets }, () => ({
            reps: isTime ? 0 : reps,
            weight: prevWeight,
            durationSeconds: prevDur,
          })),
        }));
      },
    });
  }

  function handleFinish() {
    isDraftCleared.current = true;
    clearDraftWorkout();

    const plannedEntries = day!.exercises
      .filter((de) => !skippedExercises.has(de.id))
      .map((de) => ({
        exerciseId: activeExerciseIds[de.id] ?? de.exerciseId,
        targetReps: de.targetReps,
        targetDurationSeconds: de.targetDurationSeconds,
        sets: setsByExercise[de.id] ?? [],
      }));

    const extraEntries = extraExercises.map((ee) => ({
      exerciseId: ee.exerciseId,
      targetReps: ee.targetReps,
      targetDurationSeconds: ee.targetDurationSeconds,
      sets: extraSets[ee.id] ?? [],
    }));

    saveWorkoutLog(dayId, [...plannedEntries, ...extraEntries]);
    Alert.alert('Workout saved', `Nice work — ${day!.name} is logged.`, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  }

  // ── Render helpers ───────────────────────────────────────────────────────

  function renderSetRows(
    sets: SetLog[],
    isTime: boolean,
    suggestion: ProgressSuggestion,
    onUpdateSet: (index: number, field: 'reps' | 'weight', value: string) => void,
    onUpdateDuration: (index: number, part: 'minutes' | 'seconds', value: string) => void
  ) {
    return sets.map((set, index) => {
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
              onChangeText={(v) => onUpdateDuration(index, 'minutes', v)}
              placeholder={
                suggestion.durationSeconds
                  ? String(Math.floor(suggestion.durationSeconds / 60))
                  : ''
              }
              placeholderTextColor={colors.textMuted}
            />
            <TextInput
              style={[styles.input, styles.inputCol]}
              keyboardType="number-pad"
              value={split.seconds === 0 ? '' : String(split.seconds)}
              onChangeText={(v) => onUpdateDuration(index, 'seconds', v)}
              placeholder={
                suggestion.durationSeconds
                  ? String(suggestion.durationSeconds % 60).padStart(2, '0')
                  : ''
              }
              placeholderTextColor={colors.textMuted}
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
            onChangeText={(v) => onUpdateSet(index, 'reps', v)}
            placeholderTextColor={colors.textMuted}
          />
          <TextInput
            style={[styles.input, styles.inputCol]}
            keyboardType="decimal-pad"
            value={set.weight === 0 ? '' : String(set.weight)}
            onChangeText={(v) => onUpdateSet(index, 'weight', v)}
            placeholder={suggestion.weight ? String(suggestion.weight) : ''}
            placeholderTextColor={colors.textMuted}
          />
        </View>
      );
    });
  }

  function renderSetHeader(isTime: boolean) {
    return (
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
    );
  }

  function renderPlannedExercise(dayExercise: DayExercise) {
    const activeExId = activeExerciseIds[dayExercise.id] ?? dayExercise.exerciseId;
    const exercise = getExerciseById(activeExId);
    if (!exercise) return null;

    const isSkipped = skippedExercises.has(dayExercise.id);
    const hasAlt = !!dayExercise.alternativeExerciseId;
    const usingAlt = hasAlt && activeExId === dayExercise.alternativeExerciseId;
    const altExercise = hasAlt ? getExerciseById(dayExercise.alternativeExerciseId!) : null;
    const suggestion = getProgressSuggestion(exercise, logs, settings.unit);
    const sets = setsByExercise[dayExercise.id] ?? [];
    const isTime = exercise.trackingType === 'time';

    return (
      <View key={dayExercise.id} style={[styles.card, isSkipped && styles.cardSkipped]}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.nameLine}>
              <Text style={[fontStyles.heading, { color: colors.text }]}>{exercise.name}</Text>
              {usingAlt && (
                <View style={styles.altBadge}>
                  <Text style={styles.altBadgeText}>ALT</Text>
                </View>
              )}
            </View>
            <Text style={[fontStyles.bodyMuted, { color: colors.textMuted }]}>
              {CATEGORY_LABELS[exercise.category]} · Target{' '}
              {isTime
                ? `${dayExercise.targetSets} × ${Math.floor(dayExercise.targetDurationSeconds / 60)}:${String(dayExercise.targetDurationSeconds % 60).padStart(2, '0')}`
                : `${dayExercise.targetSets} × ${dayExercise.targetReps}`}
            </Text>
            {hasAlt && altExercise && !usingAlt && (
              <Text style={[styles.altHint, { color: colors.textMuted }]}>
                Alt: {altExercise.name}
              </Text>
            )}
          </View>
          <View style={styles.cardActions}>
            {hasAlt && (
              <Pressable onPress={() => toggleAlternative(dayExercise)} hitSlop={8}>
                <Ionicons
                  name="swap-horizontal-outline"
                  size={20}
                  color={usingAlt ? colors.primary : colors.textMuted}
                />
              </Pressable>
            )}
            <Pressable
              onPress={() =>
                navigation.navigate('ExerciseHistory', { exerciseId: exercise.id })
              }
              hitSlop={8}
            >
              <Ionicons name="time-outline" size={20} color={colors.textMuted} />
            </Pressable>
            <Pressable onPress={() => toggleSkip(dayExercise.id)} hitSlop={8}>
              <Ionicons
                name={isSkipped ? 'play-circle-outline' : 'ban-outline'}
                size={20}
                color={isSkipped ? colors.primary : colors.danger}
              />
            </Pressable>
          </View>
        </View>

        {isSkipped ? (
          <Text style={styles.skippedLabel}>Skipped — won't count toward progress this session</Text>
        ) : (
          <>
            <Text style={styles.suggestion}>{suggestion.message}</Text>
            {renderSetHeader(isTime)}
            {renderSetRows(
              sets,
              isTime,
              suggestion,
              (index, field, value) => updateSet(dayExercise.id, index, field, value),
              (index, part, value) => updateDurationPart(dayExercise.id, index, part, value)
            )}
            <Pressable
              style={styles.addSetBtn}
              onPress={() => addSet(dayExercise.id, isTime)}
            >
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={[styles.addSetLabel, { color: colors.primary }]}>Add Set</Text>
            </Pressable>
          </>
        )}
      </View>
    );
  }

  function renderExtraExercise(ee: ExtraSessionExercise) {
    const exercise = getExerciseById(ee.exerciseId);
    if (!exercise) return null;
    const isTime = exercise.trackingType === 'time';
    const sets = extraSets[ee.id] ?? [];
    const suggestion = getProgressSuggestion(exercise, logs, settings.unit);

    return (
      <View key={ee.id} style={[styles.card, styles.cardExtra]}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[fontStyles.heading, { color: colors.text }]}>{exercise.name}</Text>
            <Text style={[fontStyles.bodyMuted, { color: colors.textMuted }]}>
              {CATEGORY_LABELS[exercise.category]} · Added this session
            </Text>
          </View>
          <View style={styles.cardActions}>
            <Pressable
              onPress={() =>
                navigation.navigate('ExerciseHistory', { exerciseId: exercise.id })
              }
              hitSlop={8}
            >
              <Ionicons name="time-outline" size={20} color={colors.textMuted} />
            </Pressable>
            <Pressable onPress={() => removeExtraExercise(ee.id)} hitSlop={8}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </Pressable>
          </View>
        </View>

        <Text style={styles.suggestion}>{suggestion.message}</Text>
        {renderSetHeader(isTime)}
        {renderSetRows(
          sets,
          isTime,
          suggestion,
          (index, field, value) => updateExtraSet(ee.id, index, field, value),
          (index, part, value) => updateExtraDurationPart(ee.id, index, part, value)
        )}
        <Pressable style={styles.addSetBtn} onPress={() => addExtraSet(ee.id)}>
          <Ionicons name="add" size={16} color={colors.primary} />
          <Text style={[styles.addSetLabel, { color: colors.primary }]}>Add Set</Text>
        </Pressable>
      </View>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <ScreenContainer style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'android' ? 24 : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
        >
          {showResumeBanner && (
            <View style={styles.resumeBanner}>
              <Ionicons name="time-outline" size={16} color={colors.primary} />
              <Text style={[styles.resumeText, { color: colors.primary }]}>
                Resumed previous session
              </Text>
              <Pressable onPress={handleStartFresh} hitSlop={8}>
                <Text style={[styles.resumeReset, { color: colors.danger }]}>Start Fresh</Text>
              </Pressable>
            </View>
          )}

          {day.exercises.map((de) => renderPlannedExercise(de))}

          {extraExercises.map((ee) => renderExtraExercise(ee))}

          <Pressable style={styles.addExerciseBtn} onPress={handleAddExercise}>
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={[styles.addExerciseLabel, { color: colors.primary }]}>Add Exercise</Text>
          </Pressable>
        </ScrollView>

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
    resumeBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    resumeText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
    },
    resumeReset: {
      fontSize: 13,
      fontWeight: '600',
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    cardSkipped: {
      opacity: 0.5,
    },
    cardExtra: {
      borderWidth: 1,
      borderColor: colors.primary,
      borderStyle: 'dashed',
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    cardActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    nameLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    altBadge: {
      backgroundColor: colors.primary,
      borderRadius: radius.sm,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    altBadgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '700',
    },
    altHint: {
      fontSize: 12,
      marginTop: 1,
    },
    suggestion: {
      marginTop: spacing.sm,
      fontSize: 13,
      fontStyle: 'italic',
      color: colors.primary,
    },
    skippedLabel: {
      marginTop: spacing.sm,
      fontSize: 13,
      fontStyle: 'italic',
      color: colors.textMuted,
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
    addSetBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: spacing.sm,
      paddingVertical: spacing.xs,
    },
    addSetLabel: {
      fontSize: 13,
      fontWeight: '600',
    },
    addExerciseBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.primary,
      borderStyle: 'dashed',
    },
    addExerciseLabel: {
      fontSize: 15,
      fontWeight: '600',
    },
    footer: {
      padding: spacing.lg,
      backgroundColor: colors.background,
    },
  });
}
