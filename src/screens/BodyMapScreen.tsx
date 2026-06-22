import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Body, { ExtendedBodyPart, Slug } from 'react-native-body-highlighter';
import { ScreenContainer } from '../components/ScreenContainer';
import { Button } from '../components/Button';
import { useAppData } from '../context/AppDataContext';
import { getAllMuscleGroupStatuses } from '../data/muscleMap';
import {
  BodyMapMode,
  buildHighlighterData,
  getSlugToGroups,
  LEVEL_COLORS,
  PROJECTED_COLOR,
  SLUG_LABELS,
} from '../data/bodySlugMap';
import { MUSCLE_GROUP_LABELS } from '../data/exerciseCatalog';
import { fontStyles, radius, spacing, ThemeColors } from '../theme';

type BodyView = 'front' | 'back';

function statusLine(daysAgo: number | null): string {
  if (daysAgo === null) return 'Not trained yet';
  if (daysAgo === 0) return 'Trained today';
  if (daysAgo === 1) return 'Trained yesterday';
  return `Trained ${daysAgo} days ago`;
}

export function BodyMapScreen() {
  const { logs, exercises, days, settings, colors } = useAppData();
  const styles = createStyles(colors);
  const [view, setView] = useState<BodyView>('front');
  const [mode, setMode] = useState<BodyMapMode>('completed');
  const [selectedSlug, setSelectedSlug] = useState<Slug | null>(null);

  const statuses = useMemo(
    () => getAllMuscleGroupStatuses(logs, exercises, days, settings.unit, settings.freshDays, settings.recentDays),
    [logs, exercises, days, settings.unit, settings.freshDays, settings.recentDays]
  );

  const slugToGroups = useMemo(() => getSlugToGroups(), []);

  const highlighterData = useMemo(() => buildHighlighterData(statuses, mode), [statuses, mode]);

  const selectedGroups = selectedSlug ? slugToGroups[selectedSlug] ?? [] : [];

  const legend =
    mode === 'completed'
      ? [
          { label: `Fresh (0–${settings.freshDays}d)`, color: LEVEL_COLORS.fresh! },
          {
            label: `Recent (${settings.freshDays + 1}–${settings.recentDays}d)`,
            color: LEVEL_COLORS.recent!,
          },
          { label: `Needs work (${settings.recentDays + 1}d+)`, color: LEVEL_COLORS.stale! },
          { label: 'Not in program', color: colors.surfaceAlt },
        ]
      : [
          { label: 'Covered by your program', color: PROJECTED_COLOR },
          { label: "Won't be hit", color: colors.surfaceAlt },
        ];

  function handleBodyPartPress(part: ExtendedBodyPart) {
    if (part.slug) setSelectedSlug(part.slug);
  }

  return (
    <ScreenContainer style={styles.container} edges={['top', 'bottom']}>
      <Text style={[fontStyles.title, styles.header, { color: colors.text }]}>Muscle Map</Text>

      <View style={styles.toggleRow}>
        {(['front', 'back'] as BodyView[]).map((v) => (
          <Pressable
            key={v}
            onPress={() => setView(v)}
            style={[styles.toggleOption, view === v && styles.toggleOptionActive]}
          >
            <Text style={[styles.toggleLabel, view === v && styles.toggleLabelActive]}>
              {v === 'front' ? 'Front' : 'Back'}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.toggleRow}>
        {(['completed', 'projected'] as BodyMapMode[]).map((m) => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            style={[styles.toggleOption, mode === m && styles.toggleOptionActive]}
          >
            <Text style={[styles.toggleLabel, mode === m && styles.toggleLabelActive]}>
              {m === 'completed' ? 'Completed' : 'Projected'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Body
          data={highlighterData}
          side={view}
          scale={1.7}
          border={colors.border}
          defaultFill={colors.surfaceAlt}
          onBodyPartPress={handleBodyPartPress}
        />

        <View style={styles.legend}>
          {legend.map((item) => (
            <View key={item.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={[fontStyles.bodyMuted, { color: colors.textMuted }]}>{item.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={selectedSlug !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedSlug(null)}
      >
        <Pressable style={styles.overlay} onPress={() => setSelectedSlug(null)}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            {selectedSlug ? (
              <>
                <Text style={[fontStyles.heading, { color: colors.text }]}>
                  {SLUG_LABELS[selectedSlug]}
                </Text>

                {selectedGroups.length === 0 ? (
                  <Text style={[fontStyles.bodyMuted, styles.statusLine, { color: colors.textMuted }]}>
                    Not tracked yet.
                  </Text>
                ) : (
                  selectedGroups.map((group) => {
                    const status = statuses[group];
                    return (
                      <View key={group} style={styles.groupBlock}>
                        {selectedGroups.length > 1 ? (
                          <Text style={[fontStyles.label, { color: colors.textMuted }]}>
                            {MUSCLE_GROUP_LABELS[group].toUpperCase()}
                          </Text>
                        ) : null}
                        <Text style={[fontStyles.bodyMuted, styles.statusLine, { color: colors.textMuted }]}>
                          {statusLine(status.daysAgo)}
                        </Text>
                        {status.weightProgressLabel ? (
                          <Text style={[fontStyles.body, styles.progressLine, { color: colors.primary }]}>
                            Getting stronger: {status.weightProgressLabel}
                          </Text>
                        ) : null}
                        {status.exerciseNamesInProgram.length > 0 ? (
                          status.exerciseNamesInProgram.map((name) => (
                            <Text key={name} style={[fontStyles.body, { color: colors.text }]}>
                              • {name}
                            </Text>
                          ))
                        ) : (
                          <Text style={[fontStyles.bodyMuted, { color: colors.textMuted }]}>
                            No exercises for this muscle group yet.
                          </Text>
                        )}
                      </View>
                    );
                  })
                )}

                <Button
                  label="Close"
                  variant="ghost"
                  onPress={() => setSelectedSlug(null)}
                  style={styles.closeBtn}
                />
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
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
    toggleRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.sm,
    },
    toggleOption: {
      flex: 1,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    toggleOptionActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    toggleLabel: {
      fontWeight: '700',
      color: colors.textMuted,
    },
    toggleLabelActive: {
      color: '#FFFFFF',
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl,
      alignItems: 'center',
    },
    legend: {
      width: '100%',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      marginTop: spacing.md,
      justifyContent: 'center',
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    legendDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
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
    statusLine: {
      marginTop: spacing.xs,
    },
    progressLine: {
      marginTop: spacing.xs,
      fontWeight: '600',
    },
    groupBlock: {
      marginTop: spacing.md,
      gap: spacing.xs,
    },
    closeBtn: {
      marginTop: spacing.lg,
      alignSelf: 'flex-end',
    },
  });
}
