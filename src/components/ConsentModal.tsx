import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fontStyles, radius, spacing } from '../theme';
import { darkColors } from '../theme';

interface Props {
  visible: boolean;
  onAllow: () => void;
  onDecline: () => void;
}

export function ConsentModal({ visible, onAllow, onDecline }: Props) {
  const colors = darkColors; // modal always uses dark palette for consistency

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDecline}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.iconRow}>
            <Ionicons name="shield-checkmark-outline" size={32} color={colors.primary} />
          </View>

          <Text style={[fontStyles.heading, styles.title, { color: colors.text }]}>
            A quick privacy question
          </Text>

          <Text style={[fontStyles.body, styles.body, { color: colors.text }]}>
            Help improve Only Sets by sharing anonymous information about which features are
            used and how the app performs.
          </Text>

          <Text style={[fontStyles.bodyMuted, styles.detail, { color: colors.textMuted }]}>
            Workout details, exercise names, weights, repetitions, notes, and personal
            information are{' '}
            <Text style={{ fontWeight: '700', color: colors.text }}>never</Text> included.
            No account is required. You can change this at any time in Settings.
          </Text>

          <Pressable
            style={[styles.btn, styles.btnPrimary, { backgroundColor: colors.primary }]}
            onPress={onAllow}
            accessibilityLabel="Allow anonymous analytics"
            accessibilityRole="button"
          >
            <Text style={[styles.btnLabel, { color: '#fff' }]}>Allow anonymous analytics</Text>
          </Pressable>

          <Pressable
            style={[styles.btn, styles.btnSecondary, { borderColor: colors.border }]}
            onPress={onDecline}
            accessibilityLabel="No thanks"
            accessibilityRole="button"
          >
            <Text style={[styles.btnLabel, { color: colors.textMuted }]}>No thanks</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  iconRow: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  body: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  detail: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  btn: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  btnPrimary: {},
  btnSecondary: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  btnLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
});
