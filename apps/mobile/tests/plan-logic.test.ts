import { draftFromTaskDueDate, dueMetaLabel, partitionPlanTasks, resolveDueDate } from '../src/features/plan/planLogic';
import type { Task } from '../src/data/tasks';

function makeTask(partial: Partial<Task> & Pick<Task, 'id' | 'title'>): Task {
  return {
    id: partial.id,
    title: partial.title,
    status: partial.status ?? 'todo',
    due_date: partial.due_date ?? null,
    completed_at: partial.completed_at ?? null,
    created_at: partial.created_at ?? '2026-09-01T00:00:00.000Z',
  };
}

describe('Plan logic', () => {
  it('partitions into today, later, and done with due-date authority', () => {
    const today = '2026-09-10';
    const tasks: Task[] = [
      makeTask({ id: 't1', title: 'Today task', status: 'todo', due_date: today }),
      makeTask({ id: 't2', title: 'Future task', status: 'todo', due_date: '2026-09-11' }),
      makeTask({ id: 't3', title: 'Unscheduled', status: 'todo', due_date: null }),
      makeTask({ id: 't4', title: 'Completed', status: 'done', due_date: today }),
    ];

    const sections = partitionPlanTasks(tasks, today);

    expect(sections.today.map((task) => task.id)).toEqual(['t1']);
    expect(sections.later.map((task) => task.id)).toEqual(['t2', 't3']);
    expect(sections.done.map((task) => task.id)).toEqual(['t4']);
  });

  it('resolves add/edit due dates from the selected timing mode', () => {
    const today = '2026-09-10';

    expect(resolveDueDate('today', '', today)).toBe(today);
    expect(resolveDueDate('later', '2026-10-03', today)).toBe('2026-10-03');
    expect(resolveDueDate('later', 'bad-date', today)).toBeNull();
    expect(resolveDueDate('later', '   ', today)).toBeNull();
  });

  it('maps stored due date back into an edit draft', () => {
    const today = '2026-09-10';

    expect(draftFromTaskDueDate(today, today)).toEqual({ when: 'today', customDate: '' });
    expect(draftFromTaskDueDate('2026-09-24', today)).toEqual({ when: 'later', customDate: '2026-09-24' });
    expect(draftFromTaskDueDate(null, today)).toEqual({ when: 'later', customDate: '' });
  });

  it('builds due-date labels for scheduled, overdue, and unscheduled tasks', () => {
    const today = '2026-09-10';

    expect(dueMetaLabel(today, today)).toBe('Today');
    expect(dueMetaLabel(null, today)).toBe('No date');
    expect(dueMetaLabel('2026-09-09', today)).toMatch(/^Overdue/);
    expect(dueMetaLabel('2026-09-11', today)).toMatch(/^Due/);
  });

  it('moves a task from today to done when status changes', () => {
    const today = '2026-09-10';
    const todoTask = makeTask({ id: 'm1', title: 'Move me', status: 'todo', due_date: today });
    const doneTask = { ...todoTask, status: 'done' as const, completed_at: '2026-09-10T12:00:00.000Z' };

    const before = partitionPlanTasks([todoTask], today);
    const after = partitionPlanTasks([doneTask], today);

    expect(before.today.map((task) => task.id)).toEqual(['m1']);
    expect(before.done).toHaveLength(0);
    expect(after.today).toHaveLength(0);
    expect(after.done.map((task) => task.id)).toEqual(['m1']);
  });
});
