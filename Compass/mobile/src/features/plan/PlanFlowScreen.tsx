/**
 * PlanFlowScreen — one-off tasks: add, tick, delete.
 * Split into "Today" and "Later" sections by due date.
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
import * as Crypto from 'expo-crypto';
import { theme } from '@styles/theme';
import { exec, query } from '@lib/db';
import { localDateISO } from '@lib/time';

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'done' | 'skipped';
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
}

const nowISO = () => new Date().toISOString();

async function listTasks(): Promise<Task[]> {
  return query<Task>(
    `SELECT id, title, status, due_date, completed_at, created_at
     FROM tasks
     WHERE status IN ('todo','done')
     ORDER BY (status = 'done') ASC, due_date ASC NULLS LAST, created_at ASC`,
  );
}

async function addTask(title: string, dueDate: string | null): Promise<void> {
  const id = Crypto.randomUUID();
  const now = nowISO();
  await exec(
    `INSERT INTO tasks (id, title, status, due_date, created_at, updated_at)
     VALUES (?, ?, 'todo', ?, ?, ?)`,
    [id, title, dueDate, now, now],
  );
}

async function toggleTask(t: Task): Promise<void> {
  const nextStatus = t.status === 'done' ? 'todo' : 'done';
  await exec(
    `UPDATE tasks
       SET status = ?, completed_at = ?, updated_at = ?
     WHERE id = ?`,
    [nextStatus, nextStatus === 'done' ? nowISO() : null, nowISO(), t.id],
  );
}

async function deleteTask(id: string): Promise<void> {
  await exec('DELETE FROM tasks WHERE id = ?', [id]);
}

export function PlanFlowScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [dueToday, setDueToday] = useState(true);

  const load = useCallback(async () => {
    setTasks(await listTasks());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const today = localDateISO();
  const todayTasks = tasks.filter((t) => t.due_date === today && t.status === 'todo');
  const laterTasks = tasks.filter((t) => (t.due_date !== today || t.status === 'done'));

  const handleAdd = useCallback(async () => {
    if (!newTitle.trim()) return;
    await addTask(newTitle.trim(), dueToday ? today : null);
    setNewTitle('');
    setAdding(false);
    load();
  }, [newTitle, dueToday, today, load]);

  const handleToggle = useCallback(
    async (t: Task) => {
      await toggleTask(t);
      load();
    },
    [load],
  );

  const handleDelete = useCallback(
    (t: Task) => {
      Alert.alert('Remove task?', t.title, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await deleteTask(t.id);
            load();
          },
        },
      ]);
    },
    [load],
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TaskSection title="Today" tasks={todayTasks} onToggle={handleToggle} onDelete={handleDelete} />
        <TaskSection title="Later & done" tasks={laterTasks} onToggle={handleToggle} onDelete={handleDelete} />
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setAdding(true)}>
        <Text style={styles.fabText}>+ Add task</Text>
      </TouchableOpacity>

      <Modal visible={adding} animationType="slide" transparent onRequestClose={() => setAdding(false)}>
        <View style={styles.modalBack}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add task</Text>
            <TextInput
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="What needs doing?"
              placeholderTextColor={theme.colors.muted}
              style={styles.modalInput}
              autoFocus
            />
            <TouchableOpacity
              style={styles.dueToggle}
              onPress={() => setDueToday((v) => !v)}
            >
              <View style={[styles.checkbox, dueToday && styles.checkboxOn]}>
                {dueToday && <Text style={styles.checkboxText}>✓</Text>}
              </View>
              <Text style={styles.dueLabel}>For today</Text>
            </TouchableOpacity>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => { setAdding(false); setNewTitle(''); }} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAdd} style={styles.modalSave}>
                <Text style={styles.modalSaveText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function TaskSection({
  title,
  tasks,
  onToggle,
  onDelete,
}: {
  title: string;
  tasks: Task[];
  onToggle: (t: Task) => void;
  onDelete: (t: Task) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionHead}>{title}</Text>
      {tasks.length === 0 ? (
        <Text style={styles.emptyText}>Nothing here.</Text>
      ) : (
        tasks.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={styles.row}
            onPress={() => onToggle(t)}
            onLongPress={() => onDelete(t)}
          >
            <View style={[styles.tick, t.status === 'done' && styles.tickDone]}>
              <Text style={styles.tickIcon}>{t.status === 'done' ? '✓' : ''}</Text>
            </View>
            <Text style={[styles.title, t.status === 'done' && styles.titleDone]}>{t.title}</Text>
          </TouchableOpacity>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  scrollContent: { padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: 96 },
  section: { backgroundColor: theme.colors.card, borderRadius: theme.radii.card, borderWidth: 1, borderColor: theme.colors.line, overflow: 'hidden' },
  sectionHead: { fontSize: theme.typography.xs, fontWeight: '700', color: theme.colors.muted, textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.line },
  emptyText: { padding: theme.spacing.md, color: theme.colors.muted, fontStyle: 'italic', fontSize: theme.typography.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, padding: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.line },
  tick: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: theme.colors.line, alignItems: 'center', justifyContent: 'center' },
  tickDone: { backgroundColor: theme.colors.olive, borderColor: theme.colors.olive },
  tickIcon: { color: '#fff', fontSize: 12, fontWeight: '700' },
  title: { flex: 1, fontSize: theme.typography.md, color: theme.colors.ink },
  titleDone: { color: theme.colors.muted, textDecorationLine: 'line-through' },
  fab: {
    position: 'absolute', bottom: theme.spacing.lg, right: theme.spacing.lg,
    backgroundColor: theme.colors.ink, borderRadius: theme.radii.full,
    paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.lg,
  },
  fabText: { color: theme.colors.card, fontWeight: '700', fontSize: theme.typography.sm },
  modalBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: theme.spacing.lg },
  modalCard: { backgroundColor: theme.colors.card, borderRadius: theme.radii.card, padding: theme.spacing.lg, width: '100%', gap: theme.spacing.md },
  modalTitle: { fontSize: theme.typography.lg, fontWeight: '800', color: theme.colors.ink },
  modalInput: {
    borderWidth: 1, borderColor: theme.colors.line, borderRadius: theme.radii.input,
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
    fontSize: theme.typography.md, color: theme.colors.ink, backgroundColor: theme.colors.bg,
  },
  dueToggle: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: theme.colors.line, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: theme.colors.ink, borderColor: theme.colors.ink },
  checkboxText: { color: theme.colors.card, fontWeight: '700', fontSize: 12 },
  dueLabel: { fontSize: theme.typography.sm, color: theme.colors.ink },
  modalActions: { flexDirection: 'row', gap: theme.spacing.sm, justifyContent: 'flex-end' },
  modalCancel: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
  modalCancelText: { color: theme.colors.muted, fontWeight: '600' },
  modalSave: { backgroundColor: theme.colors.ink, borderRadius: theme.radii.full, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm },
  modalSaveText: { color: theme.colors.card, fontWeight: '700' },
});
