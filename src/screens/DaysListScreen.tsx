import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../components/ScreenContainer';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { PromptModal } from '../components/PromptModal';
import { useAppData } from '../context/AppDataContext';
import { fontStyles, radius, spacing, ThemeColors } from '../theme';
import { ProgramStackParamList } from '../navigation/types';
import { Day } from '../types';

type Props = NativeStackScreenProps<ProgramStackParamList, 'Days'>;

export function DaysListScreen({ navigation }: Props) {
  const { days, addDay, moveDay, deleteDay, colors } = useAppData();
  const styles = createStyles(colors);
  const [addModalVisible, setAddModalVisible] = useState(false);

  const sortedDays = [...days].sort((a, b) => a.order - b.order);

  function renderItem({ item, index }: { item: Day; index: number }) {
    return (
      <Pressable
        style={styles.row}
        onPress={() => navigation.navigate('DayDetail', { dayId: item.id })}
      >
        <View style={styles.rowMain}>
          <Text style={[fontStyles.heading, { color: colors.text }]}>{item.name}</Text>
          <Text style={[fontStyles.bodyMuted, { color: colors.textMuted }]}>
            {item.exercises.length} exercise{item.exercises.length === 1 ? '' : 's'}
          </Text>
        </View>
        <View style={styles.rowActions}>
          <Pressable
            disabled={index === 0}
            onPress={() => moveDay(item.id, 'up')}
            style={styles.iconBtn}
          >
            <Ionicons name="chevron-up" size={20} color={index === 0 ? colors.border : colors.textMuted} />
          </Pressable>
          <Pressable
            disabled={index === sortedDays.length - 1}
            onPress={() => moveDay(item.id, 'down')}
            style={styles.iconBtn}
          >
            <Ionicons
              name="chevron-down"
              size={20}
              color={index === sortedDays.length - 1 ? colors.border : colors.textMuted}
            />
          </Pressable>
          <Pressable onPress={() => deleteDay(item.id)} style={styles.iconBtn}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </Pressable>
        </View>
      </Pressable>
    );
  }

  return (
    <ScreenContainer style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={[fontStyles.title, { color: colors.text }]}>My Program</Text>
      </View>

      <FlatList
        data={sortedDays}
        keyExtractor={(d) => d.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title="No days yet"
            subtitle="Add a day to start building your workout rotation, like Day 1, Day 2, Push, Pull, Legs..."
          />
        }
      />

      <View style={styles.footer}>
        <Button label="+ Add Day" onPress={() => setAddModalVisible(true)} />
      </View>

      <PromptModal
        visible={addModalVisible}
        title="New Day"
        placeholder="e.g. Day 1, Push Day"
        submitLabel="Add"
        onCancel={() => setAddModalVisible(false)}
        onSubmit={(name) => {
          setAddModalVisible(false);
          addDay(name);
        }}
      />
    </ScreenContainer>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      paddingTop: spacing.lg,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.md,
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
    },
    rowMain: {
      flex: 1,
      gap: spacing.xs,
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
    },
  });
}
