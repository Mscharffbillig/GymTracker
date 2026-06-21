import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from './Button';
import { fontStyles, radius, spacing, ThemeColors } from '../theme';
import { useAppData } from '../context/AppDataContext';
import { splitSeconds, toSeconds } from '../utils/duration';
import { TrackingType } from '../types';

interface TargetModalProps {
  visible: boolean;
  title: string;
  trackingType: TrackingType;
  initialSets: number;
  initialReps: number;
  initialDurationSeconds: number;
  onCancel: () => void;
  onSubmit: (sets: number, reps: number, durationSeconds: number) => void;
}

export function TargetModal({
  visible,
  title,
  trackingType,
  initialSets,
  initialReps,
  initialDurationSeconds,
  onCancel,
  onSubmit,
}: TargetModalProps) {
  const { colors } = useAppData();
  const styles = createStyles(colors);
  const [sets, setSets] = useState(String(initialSets));
  const [reps, setReps] = useState(String(initialReps));
  const [minutes, setMinutes] = useState(String(splitSeconds(initialDurationSeconds).minutes));
  const [seconds, setSeconds] = useState(String(splitSeconds(initialDurationSeconds).seconds));

  useEffect(() => {
    if (visible) {
      setSets(String(initialSets));
      setReps(String(initialReps));
      const split = splitSeconds(initialDurationSeconds);
      setMinutes(String(split.minutes));
      setSeconds(String(split.seconds));
    }
  }, [visible, initialSets, initialReps, initialDurationSeconds]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={[fontStyles.heading, { color: colors.text }]}>{title}</Text>
          <View style={styles.fieldRow}>
            <View style={styles.field}>
              <Text style={[fontStyles.label, { color: colors.textMuted }]}>
                {trackingType === 'time' ? 'ROUNDS' : 'SETS'}
              </Text>
              <TextInput
                value={sets}
                onChangeText={setSets}
                keyboardType="number-pad"
                style={styles.input}
              />
            </View>
            {trackingType === 'time' ? (
              <>
                <View style={styles.field}>
                  <Text style={[fontStyles.label, { color: colors.textMuted }]}>MIN</Text>
                  <TextInput
                    value={minutes}
                    onChangeText={setMinutes}
                    keyboardType="number-pad"
                    style={styles.input}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={[fontStyles.label, { color: colors.textMuted }]}>SEC</Text>
                  <TextInput
                    value={seconds}
                    onChangeText={setSeconds}
                    keyboardType="number-pad"
                    style={styles.input}
                  />
                </View>
              </>
            ) : (
              <View style={styles.field}>
                <Text style={[fontStyles.label, { color: colors.textMuted }]}>TARGET REPS</Text>
                <TextInput
                  value={reps}
                  onChangeText={setReps}
                  keyboardType="number-pad"
                  style={styles.input}
                />
              </View>
            )}
          </View>
          <View style={styles.actions}>
            <Button label="Cancel" variant="ghost" onPress={onCancel} style={styles.actionBtn} />
            <Button
              label="Save"
              onPress={() => {
                const s = parseInt(sets, 10);
                if (!s || s <= 0) return;
                if (trackingType === 'time') {
                  const m = parseInt(minutes, 10) || 0;
                  const sec = parseInt(seconds, 10) || 0;
                  const totalSeconds = toSeconds(m, sec);
                  if (totalSeconds <= 0) return;
                  onSubmit(s, 0, totalSeconds);
                } else {
                  const r = parseInt(reps, 10);
                  if (!r || r <= 0) return;
                  onSubmit(s, r, 0);
                }
              }}
              style={styles.actionBtn}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    card: {
      width: '100%',
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
    },
    fieldRow: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.md,
    },
    field: {
      flex: 1,
      gap: spacing.xs,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.background,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: spacing.lg,
      gap: spacing.sm,
    },
    actionBtn: {
      minWidth: 90,
    },
  });
}
