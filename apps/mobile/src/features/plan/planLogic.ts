import type { Task } from '@data/tasks';

export interface PlanSections {
  today: Task[];
  later: Task[];
  done: Task[];
}

export type PlanWhen = 'today' | 'later';

export function partitionPlanTasks(tasks: Task[], localDate: string): PlanSections {
  const today: Task[] = [];
  const later: Task[] = [];
  const done: Task[] = [];

  for (const task of tasks) {
    if (task.status === 'done') {
      done.push(task);
      continue;
    }

    if (task.due_date === localDate) {
      today.push(task);
    } else {
      later.push(task);
    }
  }

  return { today, later, done };
}

export function resolveDueDate(when: PlanWhen, customDate: string, today: string): string | null {
  if (when === 'today') return today;
  const trimmed = customDate.trim();
  return isIsoLocalDate(trimmed) ? trimmed : null;
}

export function draftFromTaskDueDate(dueDate: string | null, today: string): { when: PlanWhen; customDate: string } {
  if (dueDate === today) {
    return { when: 'today', customDate: '' };
  }
  return { when: 'later', customDate: dueDate ?? '' };
}

export function dueMetaLabel(dueDate: string | null, today: string): string | null {
  if (!dueDate) return 'No date';
  if (dueDate === today) return 'Today';

  const label = formatDate(dueDate);
  if (!label) return null;
  if (dueDate < today) return `Overdue · ${label}`;
  return `Due ${label}`;
}

function isIsoLocalDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function formatDate(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map((part) => Number(part));
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
