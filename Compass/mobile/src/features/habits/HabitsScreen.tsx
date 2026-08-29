/**
 * HabitsScreen — Log · Habits.
 *
 * Two sections: morning + evening rituals. Each row shows the habit
 * name, an "add habit" row at the bottom of each section, and a tick
 * button for today. Tapping a completed row un-ticks.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { theme } from '@styles/theme';
import { createHabit, habitsForDate, tickHabit, untickHabit, archiveHabit } from '@data/habits';
import type { HabitDayStatus, Ritual } from '@data/habits';
import { getDeviceTimezone, localDateISO } from '@lib/time';

export function HabitsScreen() {
  const [morning, setMorning] = useState<HabitDayStatus[]>([]);
  const [evening, setEvening] = useState<HabitDayStatus[]>([]);
  const [addingFor, setAddingFor] = useState<Ritual | null>(null);
  const [newName, setNewName] = useState('');

  const today = localDateISO();

  const load = useCallback(async () => {
    const [m, e] = await Promise.all([
      habitsForDate(today, 'morning'),
      habitsForDate(today, 'evening'),
    ]);
    setMorning(m);
    setEvening(e);
  }, [today]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = useCallback(
    async (row: HabitDayStatus) => {
      if (row.completed) {
        await untickHabit(row.habit.id, today);
      } else {
        await tickHabit(row.habit.id, today, getDeviceTimezone());
      }
      load();
    },
    [today, load],
  );

  const handleArchive = useCallback(
    (row: HabitDayStatus) => {
      Alert.alert('Archive habit?', row.habit.name, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            await archiveHabit(row.habit.id);
            load();
          },
        },
      ]);
    },
    [load],
  );

  const handleAddSubmit = useCallback(async () => {
    if (!addingFor || !newName.trim()) return;
    await createHabit({
      name: newName.trim(),
      ritual: addingFor,
      icon: null,
      cadence: 'daily',
      days_mask: null,
      duration_min: null,
    });
    setNewName('');
    setAddingFor(null);
    load();
  }, [addingFor, newName, load]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <RitualSection
          title="Morning ritual"
          ritual="morning"
          items={morning}
          onToggle={handleToggle}
          onArchive={handleArchive}
          onAdd={() => setAddingFor('morning')}
        />
        <RitualSection
          title="Evening ritual"
          ritual="evening"
          items={evening}
          onToggle={handleToggle}
          onArchive={handleArchive}
          onAdd={() => setAddingFor('evening')}
        />
      </ScrollView>

      <Modal visible={addingFor !== null} animationType="slide" transparent onRequestClose={() => setAddingFor(null)}>
        <View style={styles.modalBack}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add {addingFor} habit</Text>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Drink water on waking"
              placeholderTextColor={theme.colors.muted}
              style={styles.modalInput}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => { setAddingFor(null); setNewName(''); }} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddSubmit} style={styles.modalSave}>
                <Text style={styles.modalSaveText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function RitualSection({
  title,
  ritual,
  items,
  onToggle,
  onArchive,
  onAdd,
}: {
  title: string;
  ritual: Ritual;
  items: HabitDayStatus[];
  onToggle: (row: HabitDayStatus) => void;
  onArchive: (row: HabitDayStatus) => void;
  onAdd: () => void;
}) {
  const doneCount = items.filter((r) => r.completed).length;
  const badgeStyle = ritual === 'morning' ? styles.badgeAM : styles.badgePM;
  const badgeIcon = ritual === 'morning' ? '☀' : '☾';
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={[styles.badge, badgeStyle]}>
          <Text style={styles.badgeIcon}>{badgeIcon}</Text>
        </View>
        <View style={styles.sectionHeadText}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionMeta}>
            {doneCount} of {items.length} done
          </Text>
        </View>
      </View>

      {items.length === 0 ? (
        <Text style={styles.emptyText}>No habits yet.</Text>
      ) : (
        items.map((row) => (
          <View key={row.habit.id} style={styles.habitRow}>
            <TouchableOpacity
              style={[styles.tick, row.completed && styles.tickDone]}
              onPress={() => onToggle(row)}
            >
              <Text style={styles.tickIcon}>{row.completed ? '✓' : ''}</Text>
            </TouchableOpacity>
            <Text style={[styles.habitName, row.completed && styles.habitNameDone]}>{row.habit.name}</Text>
            <TouchableOpacity onLongPress={() => onArchive(row)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.habitMenu}>…</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      <TouchableOpacity style={styles.addRow} onPress={onAdd}>
        <Text style={styles.addPlus}>+</Text>
        <Text style={styles.addText}>Add habit</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  scrollContent: { padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: theme.spacing.xxxl },
  section: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
    overflow: 'hidden',
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.line },
  sectionHeadText: { flex: 1 },
  badge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  badgeAM: { backgroundColor: '#a8843f' },
  badgePM: { backgroundColor: '#4a5674' },
  badgeIcon: { fontSize: 20, color: '#fff' },
  sectionTitle: { fontSize: theme.typography.md, fontWeight: '800', color: theme.colors.ink },
  sectionMeta: { fontSize: theme.typography.xs, color: theme.colors.muted },
  emptyText: { padding: theme.spacing.md, fontSize: theme.typography.sm, color: theme.colors.muted, fontStyle: 'italic' },
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.line },
  tick: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: theme.colors.line, alignItems: 'center', justifyContent: 'center' },
  tickDone: { backgroundColor: theme.colors.olive, borderColor: theme.colors.olive },
  tickIcon: { color: '#fff', fontSize: 15, fontWeight: '700' },
  habitName: { flex: 1, fontSize: theme.typography.md, color: theme.colors.ink },
  habitNameDone: { color: theme.colors.muted, textDecorationLine: 'line-through' },
  habitMenu: { fontSize: 20, color: theme.colors.muted, paddingHorizontal: 4 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md },
  addPlus: { fontSize: 18, color: theme.colors.olive, fontWeight: '700' },
  addText: { fontSize: theme.typography.sm, fontWeight: '600', color: theme.colors.olive },
  modalBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: theme.spacing.lg },
  modalCard: { backgroundColor: theme.colors.card, borderRadius: theme.radii.card, padding: theme.spacing.lg, width: '100%', gap: theme.spacing.md },
  modalTitle: { fontSize: theme.typography.lg, fontWeight: '800', color: theme.colors.ink },
  modalInput: {
    borderWidth: 1, borderColor: theme.colors.line, borderRadius: theme.radii.input,
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
    fontSize: theme.typography.md, color: theme.colors.ink, backgroundColor: theme.colors.bg,
  },
  modalActions: { flexDirection: 'row', gap: theme.spacing.sm, justifyContent: 'flex-end' },
  modalCancel: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
  modalCancelText: { color: theme.colors.muted, fontWeight: '600' },
  modalSave: { backgroundColor: theme.colors.ink, borderRadius: theme.radii.full, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm },
  modalSaveText: { color: theme.colors.card, fontWeight: '700' },
});
