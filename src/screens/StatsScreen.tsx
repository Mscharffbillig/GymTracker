import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../components/ScreenContainer';
import { useAppData } from '../context/AppDataContext';
import { fontStyles, radius, spacing, ThemeColors } from '../theme';
import { ExerciseLog } from '../types';
import { trackStatisticsViewed } from '../analytics/events';

type Period = 'week' | 'month' | 'year' | 'all';

const PERIOD_LABELS: Record<Period, string> = {
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
  all: 'All Time',
};

function getPeriodStart(period: Period): Date | null {
  if (period === 'all') return null;
  const now = new Date();
  if (period === 'week') {
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const start = new Date(now);
    start.setDate(now.getDate() + diff);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
  return new Date(now.getFullYear(), 0, 1);
}

const COMPARISONS = [
  { lbs: 100,       text: 'a golden retriever' },
  { lbs: 200,       text: 'a full keg of beer' },
  { lbs: 400,       text: 'a grand piano' },
  { lbs: 1_000,     text: 'a horse' },
  { lbs: 2_000,     text: 'a Mini Cooper' },
  { lbs: 4_400,     text: 'an average car' },
  { lbs: 6_000,     text: 'a pickup truck' },
  { lbs: 13_000,    text: 'an African elephant' },
  { lbs: 40_000,    text: 'a city bus' },
  { lbs: 60_000,    text: 'a fire truck' },
  { lbs: 1_400,      text: 'the world\'s largest recorded blue marlin' },
  { lbs: 126_000,   text: 'an M1 Abrams tank' },
  { lbs: 220_000,   text: 'the Statue of Liberty' },
  { lbs: 412_000,   text: 'an empty Boeing 747' },
  { lbs: 1_100_000, text: 'the International Space Station' },
  { lbs: 3_000_000, text: 'a fully loaded Airbus A380' },
];

function getComparison(totalLbs: number): string | null {
  if (totalLbs < 50) return null;
  let best: { lbs: number; text: string } | null = null;
  let bestScore = Infinity;
  for (const c of COMPARISONS) {
    const ratio = totalLbs / c.lbs;
    if (ratio < 0.08 || ratio > 25) continue;
    const score = Math.abs(Math.log(ratio));
    if (score < bestScore) { bestScore = score; best = c; }
  }
  if (!best) return null;
  const ratio = totalLbs / best.lbs;
  const rounded = ratio < 2 ? Math.round(ratio * 10) / 10 : Math.round(ratio);
  const plural = rounded !== 1 && ratio > 1.15;
  const name = plural ? best.text.replace(/^a(n?) /, '') : best.text;
  return `${rounded}× ${name}`;
}

// "Work done" comparisons: totalWork (ft-lbs) vs force needed to slide heavy things.
// Assumes ~1 ft average range of motion per rep, so totalWeight ≈ ft-lbs of work.
const WORK_COMPARISONS: Array<{ forceLbsPerFt: number; desc: string }> = [
  { forceLbsPerFt: 30,     desc: 'a pickup truck across a parking lot' },
  { forceLbsPerFt: 130,    desc: 'a city bus down the block' },
  { forceLbsPerFt: 600,    desc: 'a fire truck' },
  { forceLbsPerFt: 3_000,  desc: 'a loaded freight car' },
  { forceLbsPerFt: 25_000, desc: 'a fully loaded freight train' },
  { forceLbsPerFt: 180_000, desc: 'a nuclear-powered aircraft carrier' },
];

function getWorkComparison(totalLbs: number): string | null {
  if (totalLbs < 100) return null;
  // Pick the comparison where distance (totalLbs / forceLbsPerFt) is between 1 and 5280 (1 mile)
  // and as close to 10-500 ft range as possible for a satisfying result
  let best: { forceLbsPerFt: number; desc: string } | null = null;
  let bestScore = Infinity;
  for (const c of WORK_COMPARISONS) {
    const feet = totalLbs / c.forceLbsPerFt;
    if (feet < 0.5 || feet > 5280) continue;
    const score = Math.abs(Math.log(feet / 50)); // target ~50 ft as ideal
    if (score < bestScore) { bestScore = score; best = c; }
  }
  if (!best) return null;
  const feet = Math.round(totalLbs / best.forceLbsPerFt);
  const dist = feet >= 5280
    ? `${(feet / 5280).toFixed(1)} miles`
    : feet >= 100
    ? `${feet} feet`
    : `${feet} feet`;
  return `Enough to push ${best.desc} ~${dist}`;
}

function formatBig(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}

function toDateStr(iso: string): string {
  return iso.split('T')[0];
}

function calcStreak(logs: ExerciseLog[]): { current: number; best: number } {
  const dates = [...new Set(logs.map((l) => toDateStr(l.date)))].sort().reverse();
  if (dates.length === 0) return { current: 0, best: 0 };

  const todayStr = toDateStr(new Date().toISOString());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = toDateStr(yesterdayDate.toISOString());

  let current = 0;
  if (dates[0] === todayStr || dates[0] === yesterdayStr) {
    current = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000);
      if (diffDays === 1) {
        current++;
      } else {
        break;
      }
    }
  }

  let best = 0;
  let run = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000);
    if (diffDays === 1) {
      run++;
    } else {
      best = Math.max(best, run);
      run = 1;
    }
  }
  best = Math.max(best, run);

  return { current, best };
}

export function StatsScreen() {
  const { logs, exercises, settings, colors } = useAppData();
  const styles = createStyles(colors);
  const [period, setPeriod] = useState<Period>('year');

  useEffect(() => { trackStatisticsViewed(); }, []);

  const filtered = useMemo<ExerciseLog[]>(() => {
    const start = getPeriodStart(period);
    if (!start) return logs;
    return logs.filter((l) => new Date(l.date) >= start);
  }, [logs, period]);

  const stats = useMemo(() => {
    const sessionKeys = new Set(filtered.map((l) => `${toDateStr(l.date)}|${l.dayId}`));
    const workouts = sessionKeys.size;

    let sets = 0;
    let reps = 0;
    let weightMoved = 0;

    for (const log of filtered) {
      for (const set of log.sets) {
        if (set.reps > 0 || set.weight > 0 || set.durationSeconds > 0) {
          sets++;
          reps += set.reps;
          weightMoved += set.weight * set.reps;
        }
      }
    }

    const exerciseCounts: Record<string, number> = {};
    for (const log of filtered) {
      exerciseCounts[log.exerciseId] = (exerciseCounts[log.exerciseId] ?? 0) + 1;
    }
    const topExerciseId = Object.entries(exerciseCounts).sort((a, b) => b[1] - a[1])[0];
    const topExercise = topExerciseId
      ? { name: exercises.find((e) => e.id === topExerciseId[0])?.name ?? 'Unknown', count: topExerciseId[1] }
      : null;

    return { workouts, sets, reps, weightMoved, topExercise };
  }, [filtered, exercises]);

  const streak = useMemo(() => calcStreak(logs), [logs]);

  function StatCard({ value, label }: { value: string; label: string }) {
    return (
      <View style={styles.statCard}>
        <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
      </View>
    );
  }

  return (
    <ScreenContainer style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[fontStyles.title, { color: colors.text, marginBottom: spacing.md }]}>
          Statistics
        </Text>

        <View style={styles.periodRow}>
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <Pressable
              key={p}
              onPress={() => setPeriod(p)}
              style={[styles.periodChip, period === p && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            >
              <Text style={[styles.periodLabel, period === p && { color: '#fff' }]}>
                {PERIOD_LABELS[p]}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.grid}>
          <StatCard value={String(stats.workouts)} label="Sessions" />
          <StatCard value={formatBig(stats.sets)} label="Sets" />
          <StatCard value={formatBig(stats.reps)} label="Reps" />
          <StatCard
            value={`${formatBig(stats.weightMoved)} ${settings.unit}`}
            label="Weight Moved"
          />
        </View>

        {stats.weightMoved === 0 && stats.reps > 0 && (
          <Text style={[styles.note, { color: colors.textMuted }]}>
            Bodyweight-only sessions — weight moved excludes BW sets.
          </Text>
        )}
        {stats.weightMoved > 0 && (
          <Text style={[styles.note, { color: colors.textMuted }]}>
            Weight moved excludes bodyweight exercises.
          </Text>
        )}

        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <View style={styles.infoRow}>
            <Ionicons name="flame" size={20} color="#E69F00" />
            <Text style={[fontStyles.heading, { color: colors.text }]}>Streak</Text>
          </View>
          <View style={styles.streakRow}>
            <View style={styles.streakItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{streak.current}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Current (days)</Text>
            </View>
            <View style={[styles.streakDivider, { backgroundColor: colors.border }]} />
            <View style={styles.streakItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{streak.best}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Best (days)</Text>
            </View>
          </View>
        </View>

        {stats.topExercise && (
          <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
            <View style={styles.infoRow}>
              <Ionicons name="trophy" size={20} color={colors.primary} />
              <Text style={[fontStyles.heading, { color: colors.text }]}>Top Exercise</Text>
            </View>
            <Text style={[fontStyles.body, { color: colors.text, marginTop: spacing.sm }]}>
              {stats.topExercise.name}
            </Text>
            <Text style={[fontStyles.bodyMuted, { color: colors.textMuted }]}>
              {stats.topExercise.count} {stats.topExercise.count === 1 ? 'session' : 'sessions'}
            </Text>
          </View>
        )}

        {stats.weightMoved > 0 && (() => {
          const weightFact = getComparison(stats.weightMoved);
          const workFact = getWorkComparison(stats.weightMoved);
          if (!weightFact && !workFact) return null;
          return (
            <View style={[styles.infoCard, styles.funCard, { backgroundColor: colors.surface }]}>
              <View style={styles.infoRow}>
                <Text style={styles.funEmoji}>💪</Text>
                <Text style={[fontStyles.heading, { color: colors.text }]}>Did You Know?</Text>
              </View>
              {weightFact && (
                <Text style={[styles.funFact, { color: colors.text }]}>
                  You moved{' '}
                  <Text style={{ color: colors.primary, fontWeight: '800' }}>
                    {formatBig(stats.weightMoved)} {settings.unit}
                  </Text>
                  {' '}— that's roughly the weight of{' '}
                  <Text style={{ fontWeight: '700' }}>{weightFact}</Text>.
                </Text>
              )}
              {workFact && (
                <Text style={[styles.funFact, { color: colors.text, marginTop: spacing.sm }]}>
                  {workFact}.
                </Text>
              )}
            </View>
          );
        })()}

        {filtered.length === 0 && (
          <Text style={[styles.empty, { color: colors.textMuted }]}>
            No sessions logged for this period yet.
          </Text>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1 },
    content: {
      paddingTop: spacing.lg,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl,
      gap: spacing.md,
    },
    periodRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    periodChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    periodLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    statCard: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      gap: spacing.xs,
    },
    statValue: {
      fontSize: 28,
      fontWeight: '800',
    },
    statLabel: {
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    note: {
      fontSize: 12,
      fontStyle: 'italic',
      marginTop: -spacing.xs,
    },
    infoCard: {
      borderRadius: radius.md,
      padding: spacing.md,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    streakRow: {
      flexDirection: 'row',
      marginTop: spacing.md,
      gap: spacing.md,
    },
    streakItem: {
      flex: 1,
      gap: spacing.xs,
    },
    streakDivider: {
      width: 1,
    },
    funCard: {
      gap: spacing.sm,
    },
    funEmoji: {
      fontSize: 18,
    },
    funFact: {
      fontSize: 15,
      lineHeight: 22,
    },
    empty: {
      textAlign: 'center',
      marginTop: spacing.xl,
      fontStyle: 'italic',
    },
  });
}
