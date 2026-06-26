import React, { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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
import { Day, DayExercise, Exercise } from '../types';

type Props = NativeStackScreenProps<ProgramStackParamList, 'DayDetail'>;

// ── Per-row swipe card component ────────────────────────────────────────────

interface RowProps {
  item: DayExercise;
  index: number;
  dayId: string;
  totalExercises: number;
  getExerciseById: (id: string) => Exercise | undefined;
  setAlternativeExercise: (dayId: string, dayExerciseId: string, altId: string | null) => void;
  moveDayExercise: (dayId: string, dayExerciseId: string, dir: 'up' | 'down') => void;
  removeExerciseFromDay: (dayId: string, dayExerciseId: string) => void;
  onEdit: (item: DayExercise) => void;
  onPickAlt: (item: DayExercise) => void;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}

function DayExerciseRow({
  item,
  index,
  dayId,
  totalExercises,
  getExerciseById,
  setAlternativeExercise,
  moveDayExercise,
  removeExerciseFromDay,
  onEdit,
  onPickAlt,
  styles,
  colors,
}: RowProps) {
  const { width: screenWidth } = useWindowDimensions();
  // Estimate before layout fires: screen - list padding - row padding - actions (~112px)
  const estimated = screenWidth - spacing.lg * 2 - spacing.md * 2 - 112;
  const [mainWidth, setMainWidth] = useState(estimated > 0 ? estimated : 200);
  const [currentPage, setCurrentPage] = useState(0);

  const exercise = getExerciseById(item.exerciseId);
  if (!exercise) return null;
  const altExercise = item.alternativeExerciseId ? getExerciseById(item.alternativeExerciseId) : null;

  const targetLabel =
    exercise.trackingType === 'time'
      ? `${item.targetSets} round${item.targetSets === 1 ? '' : 's'} × ${formatDuration(item.targetDurationSeconds)}`
      : `${item.targetSets} sets × ${item.targetReps} reps`;

  return (
    <Pressable style={styles.row} onPress={() => onEdit(item)}>
      <View
        style={styles.rowMain}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0) setMainWidth(w);
        }}
      >
        {altExercise ? (
          <>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(e) => {
                const x = e.nativeEvent.contentOffset.x;
                setCurrentPage(Math.round(x / mainWidth));
              }}
              scrollEventThrottle={16}
              style={{ width: mainWidth }}
            >
              {/* Page 1 — Primary */}
              <View style={{ width: mainWidth }}>
                <Text style={[fontStyles.heading, { color: colors.text }]} numberOfLines={1}>
                  {exercise.name}
                </Text>
                <Text style={[fontStyles.bodyMuted, { color: colors.textMuted }]}>
                  {CATEGORY_LABELS[exercise.category]} · {targetLabel}
                </Text>
              </View>

              {/* Page 2 — Alternative */}
              <View style={{ width: mainWidth }}>
                <View style={styles.altPageHeader}>
                  <Ionicons name="swap-horizontal-outline" size={12} color={colors.primary} />
                  <Text style={[styles.altPageTag, { color: colors.primary }]}>ALT</Text>
                </View>
                <Text style={[fontStyles.heading, { color: colors.text }]} numberOfLines={1}>
                  {altExercise.name}
                </Text>
                <View style={styles.altPageMeta}>
                  <Text style={[fontStyles.bodyMuted, { color: colors.textMuted }]}>
                    {CATEGORY_LABELS[altExercise.category]}
                  </Text>
                  <Pressable
                    onPress={() => setAlternativeExercise(dayId, item.id, null)}
                    hitSlop={8}
                  >
                    <Ionicons name="close-circle-outline" size={15} color={colors.textMuted} />
                  </Pressable>
                </View>
              </View>
            </ScrollView>

            <View style={styles.pageDots}>
              <View
                style={[styles.dot, { backgroundColor: currentPage === 0 ? colors.primary : colors.border }]}
              />
              <View
                style={[styles.dot, { backgroundColor: currentPage === 1 ? colors.primary : colors.border }]}
              />
            </View>
          </>
        ) : (
          <>
            <Text style={[fontStyles.heading, { color: colors.text }]}>{exercise.name}</Text>
            <Text style={[fontStyles.bodyMuted, { color: colors.textMuted }]}>
              {CATEGORY_LABELS[exercise.category]} · {targetLabel}
            </Text>
          </>
        )}
      </View>

      <View style={styles.rowActions}>
        <Pressable onPress={() => onPickAlt(item)} style={styles.iconBtn} hitSlop={8}>
          <Ionicons
            name="swap-horizontal-outline"
            size={20}
            color={altExercise ? colors.primary : colors.textMuted}
          />
        </Pressable>
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
          disabled={index === totalExercises - 1}
          onPress={() => moveDayExercise(dayId, item.id, 'down')}
          style={styles.iconBtn}
          hitSlop={8}
        >
          <Ionicons
            name="chevron-down"
            size={20}
            color={index === totalExercises - 1 ? colors.border : colors.textMuted}
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

// ── Main screen ──────────────────────────────────────────────────────────────

export function DayDetailScreen({ route, navigation }: Props) {
  const { dayId } = route.params;
  const {
    days,
    renameDay,
    deleteDay,
    updateDayExercise,
    removeExerciseFromDay,
    moveDayExercise,
    setAlternativeExercise,
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

  return (
    <ScreenContainer style={styles.container}>
      <FlatList
        data={day.exercises}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title="No exercises yet"
            subtitle="Add exercises to build out this day's workout."
          />
        }
        renderItem={({ item, index }) => (
          <DayExerciseRow
            item={item}
            index={index}
            dayId={dayId}
            totalExercises={day.exercises.length}
            getExerciseById={getExerciseById}
            setAlternativeExercise={setAlternativeExercise}
            moveDayExercise={moveDayExercise}
            removeExerciseFromDay={removeExerciseFromDay}
            onEdit={(e) => setEditingExercise(e)}
            onPickAlt={(e) =>
              navigation.navigate('ExercisePicker', {
                dayId,
                onPickAlternative: (exId) => setAlternativeExercise(dayId, e.id, exId),
              })
            }
            styles={styles}
            colors={colors}
          />
        )}
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
      overflow: 'hidden',
    },
    rowMain: {
      flex: 1,
      gap: spacing.xs,
      overflow: 'hidden',
    },
    altPageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      marginBottom: 2,
    },
    altPageTag: {
      fontSize: 11,
      fontWeight: '700',
    },
    altPageMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingRight: spacing.xs,
    },
    pageDots: {
      flexDirection: 'row',
      gap: 5,
      marginTop: spacing.xs,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
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
