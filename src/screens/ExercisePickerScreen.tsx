import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../components/ScreenContainer';
import { EmptyState } from '../components/EmptyState';
import { TargetModal } from '../components/TargetModal';
import { useAppData } from '../context/AppDataContext';
import {
  CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_TO_MUSCLE_GROUPS,
  MUSCLE_GROUP_LABELS,
} from '../data/exerciseCatalog';
import { fontStyles, radius, spacing, ThemeColors } from '../theme';
import { ProgramStackParamList } from '../navigation/types';
import { Exercise, ExerciseCategory, MuscleGroup, TrackingType } from '../types';

type Props = NativeStackScreenProps<ProgramStackParamList, 'ExercisePicker'>;

export function ExercisePickerScreen({ route, navigation }: Props) {
  const { dayId, onSessionAdd, onPickAlternative } = route.params;
  const { exercises, addCustomExercise, addExerciseToDay, colors } = useAppData();
  const styles = createStyles(colors);

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<ExerciseCategory | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState<ExerciseCategory>('chest');
  const [customMuscleGroup, setCustomMuscleGroup] = useState<MuscleGroup | null>(
    CATEGORY_TO_MUSCLE_GROUPS.chest[0]
  );
  const [customSecondaryGroups, setCustomSecondaryGroups] = useState<MuscleGroup[]>([]);
  const [customTrackingType, setCustomTrackingType] = useState<TrackingType>('reps');

  React.useLayoutEffect(() => {
    if (onPickAlternative) {
      navigation.setOptions({ title: 'Pick Alternative' });
    } else if (onSessionAdd) {
      navigation.setOptions({ title: 'Add Exercise' });
    }
  }, [navigation, onPickAlternative, onSessionAdd]);

  function handleSelectCustomCategory(cat: ExerciseCategory) {
    setCustomCategory(cat);
    setCustomMuscleGroup(CATEGORY_TO_MUSCLE_GROUPS[cat][0] ?? null);
    setCustomSecondaryGroups([]);
    setCustomTrackingType(cat === 'cardio' ? 'time' : 'reps');
  }

  function toggleSecondaryGroup(mg: MuscleGroup) {
    setCustomSecondaryGroups((prev) =>
      prev.includes(mg) ? prev.filter((g) => g !== mg) : [...prev, mg]
    );
  }

  const filtered = useMemo(() => {
    return exercises
      .filter((e) => (activeCategory ? e.category === activeCategory : true))
      .filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [exercises, activeCategory, search]);

  function handlePick(exercise: Exercise) {
    if (onPickAlternative) {
      onPickAlternative(exercise.id);
      navigation.goBack();
      return;
    }
    setSelectedExercise(exercise);
  }

  function handleConfirmTarget(sets: number, reps: number, durationSeconds: number) {
    if (selectedExercise) {
      if (onSessionAdd) {
        onSessionAdd(selectedExercise.id, sets, reps, durationSeconds);
      } else {
        addExerciseToDay(dayId, selectedExercise.id, sets, reps, durationSeconds);
      }
    }
    setSelectedExercise(null);
    navigation.goBack();
  }

  function handleCreateCustom() {
    if (customName.trim().length === 0) return;
    const exercise = addCustomExercise(
      customName.trim(),
      customCategory,
      customMuscleGroup,
      customSecondaryGroups,
      customTrackingType
    );
    setCustomModalVisible(false);
    setCustomName('');
    handleSelectCustomCategory('chest');
    setSelectedExercise(exercise);
  }

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search exercises"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        <Pressable
          onPress={() => setActiveCategory(null)}
          style={[styles.chip, activeCategory === null && styles.chipActive]}
        >
          <Text
            numberOfLines={1}
            style={[styles.chipLabel, activeCategory === null && styles.chipLabelActive]}
          >
            All
          </Text>
        </Pressable>
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            onPress={() => setActiveCategory(cat)}
            style={[styles.chip, activeCategory === cat && styles.chipActive]}
          >
            <Text
              numberOfLines={1}
              style={[styles.chipLabel, activeCategory === cat && styles.chipLabelActive]}
            >
              {CATEGORY_LABELS[cat]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Pressable style={styles.addCustomRow} onPress={() => setCustomModalVisible(true)}>
        <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
        <Text style={styles.addCustomLabel}>Can't find it? Add your own</Text>
      </Pressable>

      <FlatList
        data={filtered}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<EmptyState title="No exercises found" />}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => handlePick(item)}>
            <View style={styles.rowMain}>
              <View style={styles.rowTitleLine}>
                <Text style={[fontStyles.body, { color: colors.text }]}>{item.name}</Text>
                {item.trackingType === 'time' ? (
                  <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                ) : null}
              </View>
              <Text style={[fontStyles.bodyMuted, { color: colors.textMuted }]}>
                {CATEGORY_LABELS[item.category]}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      />

      <TargetModal
        visible={selectedExercise !== null}
        title={selectedExercise?.name ?? ''}
        trackingType={selectedExercise?.trackingType ?? 'reps'}
        initialSets={selectedExercise?.trackingType === 'time' ? 1 : 3}
        initialReps={10}
        initialDurationSeconds={30}
        onCancel={() => setSelectedExercise(null)}
        onSubmit={handleConfirmTarget}
      />

      {customModalVisible ? (
        <View style={styles.customOverlay}>
          <Pressable style={styles.customBackdrop} onPress={() => setCustomModalVisible(false)} />
          <View style={styles.customCard}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={[fontStyles.heading, { color: colors.text }]}>New Exercise</Text>
            <TextInput
              value={customName}
              onChangeText={setCustomName}
              placeholder="Exercise name"
              placeholderTextColor={colors.textMuted}
              style={styles.customInput}
              autoFocus
            />
            <Text style={[fontStyles.label, styles.categoryLabel, { color: colors.textMuted }]}>
              CATEGORY
            </Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.filter((c) => c !== 'other').map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => handleSelectCustomCategory(cat)}
                  style={[styles.chip, customCategory === cat && styles.chipActive]}
                >
                  <Text
                    numberOfLines={1}
                    style={[styles.chipLabel, customCategory === cat && styles.chipLabelActive]}
                  >
                    {CATEGORY_LABELS[cat]}
                  </Text>
                </Pressable>
              ))}
            </View>

            {CATEGORY_TO_MUSCLE_GROUPS[customCategory].length > 0 ? (
              <>
                <Text style={[fontStyles.label, styles.categoryLabel, { color: colors.textMuted }]}>
                  MUSCLE GROUP
                </Text>
                <View style={styles.categoryGrid}>
                  {CATEGORY_TO_MUSCLE_GROUPS[customCategory].map((mg) => (
                    <Pressable
                      key={mg}
                      onPress={() => setCustomMuscleGroup(mg)}
                      style={[styles.chip, customMuscleGroup === mg && styles.chipActive]}
                    >
                      <Text
                        numberOfLines={1}
                        style={[styles.chipLabel, customMuscleGroup === mg && styles.chipLabelActive]}
                      >
                        {MUSCLE_GROUP_LABELS[mg]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}

            {customMuscleGroup !== null && (
              <>
                <Text style={[fontStyles.label, styles.categoryLabel, { color: colors.textMuted }]}>
                  SECONDARY MUSCLES (optional)
                </Text>
                <View style={styles.categoryGrid}>
                  {CATEGORY_TO_MUSCLE_GROUPS[customCategory]
                    .filter((mg) => mg !== customMuscleGroup)
                    .map((mg) => {
                      const active = customSecondaryGroups.includes(mg);
                      return (
                        <Pressable
                          key={mg}
                          onPress={() => toggleSecondaryGroup(mg)}
                          style={[styles.chip, active && styles.chipActive]}
                        >
                          <Text
                            numberOfLines={1}
                            style={[styles.chipLabel, active && styles.chipLabelActive]}
                          >
                            {MUSCLE_GROUP_LABELS[mg]}
                          </Text>
                        </Pressable>
                      );
                    })}
                </View>
              </>
            )}

            <Text style={[fontStyles.label, styles.categoryLabel, { color: colors.textMuted }]}>
              TRACKING TYPE
            </Text>
            <View style={styles.categoryGrid}>
              {(['reps', 'time'] as TrackingType[]).map((tt) => (
                <Pressable
                  key={tt}
                  onPress={() => setCustomTrackingType(tt)}
                  style={[styles.chip, customTrackingType === tt && styles.chipActive]}
                >
                  <Text
                    numberOfLines={1}
                    style={[styles.chipLabel, customTrackingType === tt && styles.chipLabelActive]}
                  >
                    {tt === 'reps' ? 'Reps & Weight' : 'Time'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.customActions}>
              <Pressable
                style={styles.customCancelBtn}
                onPress={() => setCustomModalVisible(false)}
              >
                <Text style={styles.customCancelLabel}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.customSaveBtn} onPress={handleCreateCustom}>
                <Text style={styles.customSaveLabel}>Add</Text>
              </Pressable>
            </View>
            </ScrollView>
          </View>
        </View>
      ) : null}
    </ScreenContainer>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      paddingTop: spacing.md,
      paddingHorizontal: spacing.lg,
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
    },
    searchInput: {
      flex: 1,
      paddingVertical: spacing.sm,
      fontSize: 15,
      color: colors.text,
    },
    chipRow: {
      gap: spacing.sm,
      paddingVertical: spacing.md,
    },
    chip: {
      flexShrink: 0,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      minHeight: 40,
      justifyContent: 'center',
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipLabel: {
      fontSize: 14,
      lineHeight: 18,
      fontWeight: '600',
      color: colors.textMuted,
    },
    chipLabelActive: {
      color: '#FFFFFF',
    },
    addCustomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.md,
    },
    addCustomLabel: {
      color: colors.primary,
      fontWeight: '600',
      fontSize: 14,
    },
    listContent: {
      gap: spacing.sm,
      paddingBottom: spacing.lg,
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
    rowTitleLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    customOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    customBackdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    customCard: {
      width: '100%',
      maxHeight: '85%',
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
    },
    customInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      marginTop: spacing.md,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.background,
    },
    categoryLabel: {
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    customActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: spacing.lg,
      gap: spacing.sm,
    },
    customCancelBtn: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    customCancelLabel: {
      color: colors.primary,
      fontWeight: '600',
    },
    customSaveBtn: {
      backgroundColor: colors.primary,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.md,
    },
    customSaveLabel: {
      color: '#FFFFFF',
      fontWeight: '600',
    },
  });
}
