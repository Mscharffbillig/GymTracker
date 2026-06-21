import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fontStyles, spacing } from '../theme';
import { useAppData } from '../context/AppDataContext';

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  const { colors } = useAppData();
  return (
    <View style={styles.container}>
      <Text style={[fontStyles.heading, { color: colors.text }]}>{title}</Text>
      {subtitle ? (
        <Text style={[fontStyles.bodyMuted, styles.subtitle, { color: colors.textMuted }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  subtitle: {
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
