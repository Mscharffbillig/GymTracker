import React, { useState } from 'react';
import {
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
import { Button } from '../components/Button';
import { useAppData } from '../context/AppDataContext';
import { splitSeconds, toSeconds } from '../utils/duration';
import { fontStyles, radius, spacing, ThemeColors } from '../theme';
import { ProgressStackParamList } from '../navigation/types';
import { SetLog } from '../types';

type Props = NativeStackScreenProps<ProgressStackParamList, 'LogEdit'>;

export function LogEditScreen({ route, navigation }: Props) {
  const { logId } = route.params;
  const { logs, getExerciseById, settings, colors, updateExerciseLog } = useAppData();
  const styles = createStyles(colors);

  const log = logs.find((l) => l.id === logId);
  const exercise = log ? getExerciseById(log.exerciseId) : undefined;
  const isTime = exercise?.trackingType === 'time';

  const [sets, setSets] = useState<SetLog[]>(log?.sets ?? []);

  if (!log || !exercise) {
    return (
      <ScreenContainer style={styles.container}>
        <Text style={[fontStyles.body, { color: colors.text, padding: spacing.lg }]}>
          Log entry not found.
        </Text>
      </ScreenContainer>
    );
  }

  function updateSet(index: number, field: 'reps' | 'weight', value: string) {
    const numeric = value === '' ? 0 : parseFloat(value);
    setSets((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: isNaN(numeric) ? 0 : numeric };
      return next;
    });
  }

  function updateDuration(index: number, part: 'minutes' | 'seconds', value: string) {
    const numeric = value === '' ? 0 : parseInt(value, 10) || 0;
    setSets((prev) => {
      const next = [...prev];
      const current = next[index];
      const split = splitSeconds(current.durationSeconds);
      const minutes = part === 'minutes' ? numeric : split.minutes;
      const seconds = part === 'seconds' ? numeric : split.seconds;
      next[index] = { ...current, durationSeconds: toSeconds(minutes, seconds) };
      return next;
    });
  }

  function addSet() {
    setSets((prev) => {
      const last = prev[prev.length - 1];
      return [...prev, last ? { ...last } : { reps: 0, weight: 0, durationSeconds: 0 }];
    });
  }

  function removeLastSet() {
    setSets((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }

  function handleSave() {
    updateExerciseLog(logId, sets);
    navigation.goBack();
  }

  const dateLabel = new Date(log.date).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <ScreenContainer style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={[fontStyles.heading, { color: colors.text }]}>{exercise.name}</Text>
          <Text style={[fontStyles.bodyMuted, { color: colors.textMuted }]}>{dateLabel}</Text>

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
            const isLast = index === sets.length - 1;
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
                    onChangeText={(v) => updateDuration(index, 'minutes', v)}
                    placeholderTextColor={colors.textMuted}
                  />
                  <TextInput
                    style={[styles.input, styles.inputCol]}
                    keyboardType="number-pad"
                    value={split.seconds === 0 ? '' : String(split.seconds)}
                    onChangeText={(v) => updateDuration(index, 'seconds', v)}
                    placeholderTextColor={colors.textMuted}
                  />
                  {isLast && sets.length > 1 && (
                    <Pressable onPress={removeLastSet} hitSlop={8} style={styles.removeSetBtn}>
                      <Ionicons name="close" size={16} color={colors.textMuted} />
                    </Pressable>
                  )}
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
                  onChangeText={(v) => updateSet(index, 'reps', v)}
                  placeholderTextColor={colors.textMuted}
                />
                <TextInput
                  style={[styles.input, styles.inputCol]}
                  keyboardType="decimal-pad"
                  value={set.weight === 0 ? '' : String(set.weight)}
                  onChangeText={(v) => updateSet(index, 'weight', v)}
                  placeholderTextColor={colors.textMuted}
                />
                {isLast && sets.length > 1 && (
                  <Pressable onPress={removeLastSet} hitSlop={8} style={styles.removeSetBtn}>
                    <Ionicons name="close" size={16} color={colors.textMuted} />
                  </Pressable>
                )}
              </View>
            );
          })}

          <Pressable style={styles.addSetBtn} onPress={addSet}>
            <Ionicons name="add" size={16} color={colors.primary} />
            <Text style={[styles.addSetLabel, { color: colors.primary }]}>Add Set</Text>
          </Pressable>
        </ScrollView>

        <View style={styles.footer}>
          <Button label="Save Changes" onPress={handleSave} />
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
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl * 2,
      gap: spacing.sm,
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
      width: 36,
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
    removeSetBtn: {
      width: 24,
      alignItems: 'center',
    },
    addSetBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: spacing.sm,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: radius.sm,
    },
    addSetLabel: {
      fontSize: 13,
      fontWeight: '600',
    },
    footer: {
      padding: spacing.lg,
      paddingBottom: spacing.md,
      backgroundColor: colors.background,
    },
  });
}
