import React, { useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../components/ScreenContainer';
import { EmptyState } from '../components/EmptyState';
import { WeightChart } from '../components/WeightChart';
import { useAppData } from '../context/AppDataContext';
import { fontStyles, radius, spacing, ThemeColors } from '../theme';
import { ProfileStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'WeightHistory'>;

export function WeightHistoryScreen({ navigation }: Props) {
  const { weightLog, addWeightEntry, deleteWeightEntry, settings, colors } = useAppData();
  const styles = createStyles(colors);
  const [modalVisible, setModalVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => { setInputValue(''); setModalVisible(true); }}
          style={{ marginRight: spacing.sm }}
          hitSlop={8}
        >
          <Ionicons name="add" size={26} color={colors.primary} />
        </Pressable>
      ),
    });
  }, [navigation, colors.primary]);

  function handleAdd() {
    const weight = parseFloat(inputValue);
    if (!isNaN(weight) && weight > 0) {
      addWeightEntry(weight);
      setInputValue('');
      setModalVisible(false);
    }
  }

  function confirmDelete(id: string, weight: number) {
    Alert.alert('Delete entry?', `Remove ${weight} ${settings.unit} from your weight log?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteWeightEntry(id) },
    ]);
  }

  const chartData = [...weightLog].reverse().map((e) => ({ date: e.date, value: e.weight }));

  return (
    <ScreenContainer style={styles.container} edges={['bottom']}>
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.surface }]} onPress={() => {}}>
            <Text style={[fontStyles.heading, { color: colors.text, marginBottom: spacing.md }]}>
              Log Weight
            </Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              keyboardType="decimal-pad"
              placeholder={`Weight in ${settings.unit}`}
              placeholderTextColor={colors.textMuted}
              value={inputValue}
              onChangeText={setInputValue}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalBtn, { borderColor: colors.border }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.textMuted }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={handleAdd}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <FlatList
        data={weightLog}
        keyExtractor={(e) => e.id}
        ListHeaderComponent={
          weightLog.length >= 2 ? (
            <View style={styles.chartWrapper}>
              <WeightChart
                data={chartData}
                formatValue={(v) => `${v} ${settings.unit}`}
              />
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={[styles.row, { backgroundColor: colors.surface }]}>
            <View style={styles.rowText}>
              <Text style={[fontStyles.body, { color: colors.text }]}>
                {item.weight} {settings.unit}
              </Text>
              <Text style={[fontStyles.bodyMuted, { color: colors.textMuted }]}>
                {new Date(item.date).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>
            <Pressable onPress={() => confirmDelete(item.id, item.weight)} hitSlop={8}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            title="No weight entries yet"
            subtitle="Tap + above or use Log Weight on your Profile to start tracking."
          />
        }
      />
    </ScreenContainer>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1 },
    chartWrapper: {
      marginBottom: spacing.md,
    },
    listContent: {
      padding: spacing.lg,
      gap: spacing.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderRadius: radius.md,
    },
    rowText: {
      flex: 1,
      gap: spacing.xs,
    },
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    modalCard: {
      width: '100%',
      borderRadius: radius.md,
      padding: spacing.lg,
    },
    input: {
      borderWidth: 1,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontSize: 16,
      marginBottom: spacing.md,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    modalBtn: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      alignItems: 'center',
      borderWidth: 1,
    },
    modalBtnText: {
      fontWeight: '700',
      fontSize: 15,
    },
  });
}
