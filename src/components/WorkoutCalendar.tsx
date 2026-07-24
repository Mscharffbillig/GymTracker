import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, ThemeColors } from '../theme';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DOW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface Props {
  markedDates: Set<string>;
  selectedDate?: string | null;
  onDayPress?: (dateStr: string) => void;
  colors: ThemeColors;
}

export function WorkoutCalendar({ markedDates, selectedDate, onDayPress, colors }: Props) {
  const [displayMonth, setDisplayMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const styles = createStyles(colors);

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const { rows, year, month } = useMemo(() => {
    const y = displayMonth.getFullYear();
    const m = displayMonth.getMonth();
    const firstDow = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells: (number | null)[] = [
      ...Array<null>(firstDow).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);
    const r: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) r.push(cells.slice(i, i + 7));
    return { rows: r, year: y, month: m };
  }, [displayMonth]);

  function cellDateStr(day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => setDisplayMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
          hitSlop={12}
          style={styles.arrowBtn}
        >
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
        </Pressable>
        <Text style={[styles.monthTitle, { color: colors.text }]}>
          {MONTH_NAMES[month]} {year}
        </Text>
        <Pressable
          onPress={() => setDisplayMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
          hitSlop={12}
          style={styles.arrowBtn}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.dowRow}>
        {DOW_LABELS.map((label, i) => (
          <Text key={i} style={[styles.dowLabel, { color: colors.textMuted }]}>
            {label}
          </Text>
        ))}
      </View>

      {rows.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((day, ci) => {
            if (!day) {
              return <View key={ci} style={styles.cell} />;
            }
            const dateStr = cellDateStr(day);
            const isMarked = markedDates.has(dateStr);
            const isSelected = selectedDate === dateStr;
            const isToday = dateStr === todayStr;

            return (
              <Pressable
                key={ci}
                style={styles.cell}
                onPress={() => onDayPress?.(dateStr)}
                hitSlop={2}
              >
                <View
                  style={[
                    styles.dayCircle,
                    isSelected && { backgroundColor: colors.primary },
                    isToday && !isSelected && { borderWidth: 1.5, borderColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      { color: isSelected ? '#fff' : isToday ? colors.primary : colors.text },
                      (isSelected || isToday) && { fontWeight: '700' },
                    ]}
                  >
                    {day}
                  </Text>
                </View>
                <View
                  style={[
                    styles.dot,
                    isMarked
                      ? { backgroundColor: isSelected ? '#fff' : colors.primary }
                      : { backgroundColor: 'transparent' },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      borderRadius: radius.md,
      paddingHorizontal: spacing.sm,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.xs,
    },
    arrowBtn: {
      padding: spacing.xs,
    },
    monthTitle: {
      fontSize: 15,
      fontWeight: '700',
    },
    dowRow: {
      flexDirection: 'row',
      marginBottom: spacing.xs,
    },
    dowLabel: {
      flex: 1,
      textAlign: 'center',
      fontSize: 11,
      fontWeight: '600',
    },
    row: {
      flexDirection: 'row',
    },
    cell: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 3,
    },
    dayCircle: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayText: {
      fontSize: 13,
      fontWeight: '500',
    },
    dot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      marginTop: 2,
    },
  });
}
