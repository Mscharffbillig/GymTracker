import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { fontStyles, radius, spacing, ThemeColors } from '../theme';
import { useAppData } from '../context/AppDataContext';

interface ChartPoint {
  date: string;
  value: number;
}

const VIEW_WIDTH = 320;
const VIEW_HEIGHT = 140;
const PADDING = 16;

export function WeightChart({
  data,
  formatValue,
}: {
  data: ChartPoint[];
  formatValue: (n: number) => string;
}) {
  const { colors } = useAppData();
  const styles = createStyles(colors);

  if (data.length < 2) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[fontStyles.bodyMuted, { color: colors.textMuted }]}>
          Log a couple more sessions to see your progress chart.
        </Text>
      </View>
    );
  }

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = PADDING + (i / (data.length - 1)) * (VIEW_WIDTH - PADDING * 2);
    const y = VIEW_HEIGHT - PADDING - ((d.value - min) / range) * (VIEW_HEIGHT - PADDING * 2);
    return { x, y };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View style={styles.container}>
      <Text style={[fontStyles.label, { color: colors.textMuted }]}>
        {formatValue(min)} – {formatValue(max)}
      </Text>
      <Svg width="100%" height={VIEW_HEIGHT} viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}>
        <Polyline
          points={polylinePoints}
          fill="none"
          stroke={colors.primary}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={4} fill={colors.primary} />
        ))}
      </Svg>
      <View style={styles.datesRow}>
        <Text style={[fontStyles.label, { color: colors.textMuted }]}>
          {formatShort(data[0].date)}
        </Text>
        <Text style={[fontStyles.label, { color: colors.textMuted }]}>
          {formatShort(data[data.length - 1].date)}
        </Text>
      </View>
    </View>
  );
}

function formatShort(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    emptyContainer: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.lg,
      alignItems: 'center',
    },
    datesRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.xs,
    },
  });
}
