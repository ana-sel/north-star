import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { addTask, deleteTask, listPlanTasks, toggleTask, updateTask } from '@data/tasks';
import type { Task } from '@data/tasks';
import { getDeviceTimezone, localDateForInstant, localDateISO } from '@lib/time';
import { colors, radii, spacing, typography } from '@styles/theme';
import { Button, Card, EmptyState, Icon, LoadingState, TaskRow } from '@ui';
import { draftFromTaskDueDate, dueMetaLabel, partitionPlanTasks, resolveDueDate } from './planLogic';

type DraftWhen = 'today' | 'later';

interface TaskDraft {
  title: string;
  when: DraftWhen;
  customDate: string;
}

const EMPTY_DRAFT: TaskDraft = {
  title: '',
  when: 'today',
  customDate: '',
};

export function PlanFlowScreen() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TaskDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);

  const today = localDateISO();

  const load = useCallback(async () => {
    setTasks(await listPlanTasks());
  }, []);

  useEffect(() => {
    load()
      .finally(() => setLoading(false));
  }, [load]);

  const sections = useMemo(() => partitionPlanTasks(tasks, today), [tasks, today]);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setEditingTaskId(null);
    setDraft(EMPTY_DRAFT);
    setSaving(false);
  }, []);

  const openCreate = useCallback(() => {
    setEditingTaskId(null);
    setDraft(EMPTY_DRAFT);
    setSheetOpen(true);
  }, []);

  const openEdit = useCallback((task: Task) => {
    const dueDraft = draftFromTaskDueDate(task.due_date, today);
    setEditingTaskId(task.id);
    setDraft({ title: task.title, when: dueDraft.when, customDate: dueDraft.customDate });
    setSheetOpen(true);
  }, [today]);

  const saveTask = useCallback(async () => {
    const title = draft.title.trim();
    if (!title) return;

    setSaving(true);
    try {
      const dueDate = resolveDueDate(draft.when, draft.customDate, today);
      if (editingTaskId) {
        await updateTask(editingTaskId, { title, due_date: dueDate });
      } else {
        await addTask(title, dueDate);
      }
      await load();
      closeSheet();
    } finally {
      setSaving(false);
    }
  }, [closeSheet, draft.customDate, draft.title, draft.when, editingTaskId, load, today]);

  const handleToggle = useCallback(async (task: Task) => {
    await toggleTask(task);
    await load();
  }, [load]);

  const handleDeleteFromSheet = useCallback(() => {
    if (!editingTaskId) return;
    const taskId = editingTaskId;
    const label = draft.title.trim() || 'This task';

    Alert.alert('Delete task?', label, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTask(taskId);
          await load();
          closeSheet();
        },
      },
    ]);
  }, [closeSheet, draft.title, editingTaskId, load]);

  if (loading) return <LoadingState />;

  const sectionCards = [
    {
      key: 'today',
      title: 'Today',
      subtitle: 'What can move today',
      tasks: sections.today,
      empty: 'No tasks due today.',
      icon: 'sun' as const,
    },
    {
      key: 'later',
      title: 'Later',
      subtitle: 'Parked for another day',
      tasks: sections.later,
      empty: 'Nothing parked for later.',
      icon: 'compass' as const,
    },
    {
      key: 'done',
      title: 'Done',
      subtitle: 'Closed loops stay visible',
      tasks: sections.done,
      empty: 'Nothing completed yet.',
      icon: 'check' as const,
    },
  ];

  return (
    <>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Card tone="muted" style={styles.lens}>
          <View style={styles.lensBadge}>
            <Icon name="target" size={18} color={colors.onDark} />
          </View>
          <View style={styles.lensText}>
            <Text style={styles.lensTitle}>Plan flow</Text>
            <Text style={styles.lensSub}>Today, later, done. Keep it simple and moving.</Text>
          </View>
        </Card>

        {sectionCards.map((section) => (
          <Card key={section.key} padded={false} style={styles.sectionCard}>
            <View style={styles.sectionHead}>
              <View style={styles.sectionHeadMain}>
                <View style={styles.sectionBadge}>
                  <Icon name={section.icon} size={13} color={colors.inkMuted} />
                </View>
                <View>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Text style={styles.sectionSub}>{section.subtitle}</Text>
                </View>
              </View>
              <View style={styles.countPill}>
                <Text style={styles.countText}>{section.tasks.length}</Text>
              </View>
            </View>

            {section.tasks.length === 0 ? (
              <Text style={styles.emptyText}>{section.empty}</Text>
            ) : (
              section.tasks.map((task, index) => (
                <TaskRow
                  key={task.id}
                  title={task.title}
                  done={task.status === 'done'}
                  onToggle={() => handleToggle(task)}
                  onEdit={() => openEdit(task)}
                  meta={taskMeta(task, today) ?? undefined}
                  showBorder={index < section.tasks.length - 1}
                />
              ))
            )}
          </Card>
        ))}

        {tasks.length === 0 ? (
          <EmptyState
            title="Start with one task"
            body="Add one concrete next action. You can move it between Today and Later anytime."
            action={{ label: 'Add first task', onPress: openCreate }}
          />
        ) : null}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={openCreate} activeOpacity={0.85}>
        <Icon name="plus" size={14} color={colors.onDark} />
        <Text style={styles.fabText}>Add task</Text>
      </TouchableOpacity>

      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={closeSheet}>
        <View style={styles.sheetBack}>
          <TouchableOpacity style={styles.sheetOverlay} onPress={closeSheet} />
          <View style={styles.sheet}>
            <View style={styles.sheetGrip} />

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{editingTaskId ? 'Edit task' : 'Add task'}</Text>
              <TouchableOpacity style={styles.closeButton} onPress={closeSheet} activeOpacity={0.75}>
                <Icon name="x" size={14} color={colors.inkMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Task</Text>
            <TextInput
              value={draft.title}
              onChangeText={(value) => setDraft((current) => ({ ...current, title: value }))}
              placeholder="What needs doing?"
              placeholderTextColor={colors.inkFaint}
              style={styles.input}
              autoFocus
              maxLength={120}
            />

            <Text style={styles.fieldLabel}>When</Text>
            <View style={styles.whenRow}>
              <PressPill
                label="Today"
                selected={draft.when === 'today'}
                onPress={() => setDraft((current) => ({ ...current, when: 'today' }))}
              />
              <PressPill
                label="Later"
                selected={draft.when === 'later'}
                onPress={() => setDraft((current) => ({ ...current, when: 'later' }))}
              />
            </View>

            {draft.when === 'later' ? (
              <>
                <Text style={styles.fieldLabel}>Date (optional)</Text>
                <TextInput
                  value={draft.customDate}
                  onChangeText={(value) => setDraft((current) => ({ ...current, customDate: value }))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.inkFaint}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
                <Text style={styles.hint}>Leave blank to keep it in Later without a date.</Text>
              </>
            ) : null}

            <Button
              label={editingTaskId ? 'Save changes' : 'Add task'}
              onPress={saveTask}
              disabled={!draft.title.trim()}
              loading={saving}
              style={styles.primaryAction}
            />

            {editingTaskId ? (
              <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteFromSheet} activeOpacity={0.8}>
                <Icon name="x" size={13} color={colors.error} />
                <Text style={styles.deleteText}>Delete task</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}

function taskMeta(task: Task, today: string): string | null {
  if (task.status === 'done') {
    const completedDate = task.completed_at
      ? localDateForInstant(new Date(task.completed_at), getDeviceTimezone())
      : null;
    if (completedDate === today) return 'Completed today';
    if (completedDate) {
      const formatted = shortDate(completedDate);
      if (formatted) return `Completed ${formatted}`;
    }
  }
  return dueMetaLabel(task.due_date, today);
}

function shortDate(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map((part) => Number(part));
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function PressPill({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.whenPill, selected && styles.whenPillSelected]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={[styles.whenText, selected && styles.whenTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.huge + spacing.xxl,
  },

  lens: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  lensBadge: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.btn,
  },
  lensText: { flex: 1 },
  lensTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.2,
  },
  lensSub: {
    marginTop: 2,
    fontSize: typography.sizes.sm,
    color: colors.inkMuted,
  },

  sectionCard: { overflow: 'hidden' },
  sectionHead: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionHeadMain: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  sectionBadge: {
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  sectionTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.inkMuted,
  },
  sectionSub: { marginTop: 2, fontSize: typography.sizes.sm, color: colors.ink },
  countPill: {
    minWidth: 28,
    borderRadius: radii.pill,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  countText: { fontSize: typography.sizes.xs, fontWeight: '700', color: colors.inkMuted },
  emptyText: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    fontSize: typography.sizes.sm,
    color: colors.inkMuted,
  },

  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.btn,
  },
  fabText: { fontSize: typography.sizes.sm, color: colors.onDark, fontWeight: '700' },

  sheetBack: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.35)' },
  sheetOverlay: { ...StyleSheet.absoluteFillObject },
  sheet: {
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    backgroundColor: colors.canvas,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  sheetGrip: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  sheetTitle: { fontSize: typography.sizes.lg, fontWeight: '800', color: colors.ink },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  fieldLabel: {
    marginTop: spacing.sm,
    marginBottom: 6,
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.input,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontSize: typography.sizes.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  whenRow: { flexDirection: 'row', gap: spacing.sm },
  whenPill: {
    flex: 1,
    minHeight: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  whenPillSelected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  whenText: { fontSize: typography.sizes.sm, color: colors.inkMuted, fontWeight: '700' },
  whenTextSelected: { color: colors.ink },
  hint: { marginTop: 6, fontSize: typography.sizes.xs, color: colors.inkMuted },
  primaryAction: { marginTop: spacing.md },
  deleteButton: {
    marginTop: spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  deleteText: { color: colors.error, fontSize: typography.sizes.sm, fontWeight: '700' },
});
