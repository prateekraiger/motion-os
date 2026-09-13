import { addDays, dateKey, diffDays, parseDateKey, startOfDay, MS } from "./time";
import type { FocusConfig, FocusPhase, FocusSession, Habit, Task } from "./types";

/* --------------------------- Focus --------------------------------- */

export function phaseDurationMs(phase: FocusPhase, config: FocusConfig): number {
  const min =
    phase === "work" ? config.workMin : phase === "shortBreak" ? config.shortBreakMin : config.longBreakMin;
  return Math.max(1, min) * MS.minute;
}

export function sessionsOn(sessions: FocusSession[], key: string): FocusSession[] {
  return sessions.filter((s) => dateKey(new Date(s.startedAt)) === key);
}

export function focusMsOn(sessions: FocusSession[], key: string): number {
  return sessionsOn(sessions, key).reduce((sum, s) => sum + s.durationMs, 0);
}

export function focusMsTotal(sessions: FocusSession[]): number {
  return sessions.reduce((sum, s) => sum + s.durationMs, 0);
}

/* --------------------------- Tasks --------------------------------- */

const PRIORITY_RANK = { high: 0, med: 1, low: 2 } as const;

/** Sort: incomplete first, then priority, then due date, then manual order. */
export function sortTasks(a: Task, b: Task): number {
  if (a.done !== b.done) return a.done ? 1 : -1;
  if (a.priority !== b.priority) return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (a.due && b.due && a.due !== b.due) return a.due < b.due ? -1 : 1;
  if (a.due && !b.due) return -1;
  if (!a.due && b.due) return 1;
  return a.order - b.order;
}

export function isOverdue(task: Task, ref: Date = new Date()): boolean {
  if (task.done || !task.due) return false;
  const d = parseDateKey(task.due);
  return !!d && diffDays(startOfDay(ref), d) < 0;
}

export function isDueToday(task: Task, ref: Date = new Date()): boolean {
  return !task.done && task.due === dateKey(ref);
}

/**
 * Tasks completed on a given day.
 * Recurring tasks keep their `completedAt` after re-opening, so they count on
 * the day they were last completed even while sitting back in the open list.
 */
export function tasksCompletedOn(tasks: Task[], key: string): number {
  return tasks.reduce((n, t) => {
    if (!t.completedAt) return n;
    if (dateKey(new Date(t.completedAt)) !== key) return n;
    return t.done || t.repeat !== "none" ? n + 1 : n;
  }, 0);
}

/* ------------------------ Recurring tasks --------------------------- */

/**
 * Due-day for a recurring task after it is completed on `ref`.
 * - With a due date: one day (daily) or seven days (weekly) after it.
 * - Without one: daily stays undated (always visible in Today);
 *   weekly is pinned to the same weekday next week.
 */
export function nextDueKey(task: Task, ref: Date = new Date()): string | null {
  if (task.repeat === "none") return task.due;
  const step = task.repeat === "weekly" ? 7 : 1;
  if (task.due) {
    const base = parseDateKey(task.due);
    if (base) return dateKey(addDays(base, step));
  }
  return task.repeat === "daily" ? null : dateKey(addDays(ref, 7));
}

/* --------------------------- Reminders ------------------------------ */

/** Reminders older than this are not re-announced (avoids spam after the app is closed for days). */
export const REMINDER_GRACE_MS = MS.day;

/** Stable identity for "this task at this reminder moment". */
export function reminderKey(task: Task): string {
  return `${task.id}::${task.remindAt ?? ""}`;
}

/** Open tasks whose reminder moment has already passed, within the grace window. */
export function dueReminders(tasks: Task[], nowMs: number): Task[] {
  return tasks.filter((t) => {
    if (t.done || !t.remindAt) return false;
    const at = new Date(t.remindAt).getTime();
    if (Number.isNaN(at)) return false;
    return at <= nowMs && nowMs - at <= REMINDER_GRACE_MS;
  });
}

/** Nearest upcoming reminder across open tasks (null when none is scheduled). */
export function nextReminder(tasks: Task[], nowMs: number): { task: Task; at: number } | null {
  let best: { task: Task; at: number } | null = null;
  for (const t of tasks) {
    if (t.done || !t.remindAt) continue;
    const at = new Date(t.remindAt).getTime();
    if (Number.isNaN(at) || at <= nowMs) continue;
    if (!best || at < best.at) best = { task: t, at };
  }
  return best;
}

/* ----------------------------- Stats -------------------------------- */

export interface DayStat {
  key: string;
  /** Weekday letter for the chart axis (M T W T F S S). */
  label: string;
  /** Focused milliseconds logged that day. */
  ms: number;
  /** Tasks completed that day (recurrence-aware). */
  done: number;
  /** True for the day that is "today" relative to `ref`. */
  isToday: boolean;
}

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

/** Per-day focus + task-completion series for the last `n` days (oldest first). */
export function dailyStats(sessions: FocusSession[], tasks: Task[], n = 7, ref: Date = new Date()): DayStat[] {
  const keys = lastNDays(n, ref);
  const today = dateKey(ref);
  return keys.map((key) => {
    const d = parseDateKey(key) ?? new Date();
    return {
      key,
      label: DAY_LETTERS[d.getDay()],
      ms: focusMsOn(sessions, key),
      done: tasksCompletedOn(tasks, key),
      isToday: key === today,
    };
  });
}

/** Focused milliseconds for the current week (Mon-first) and the previous one. */
export function focusWeeks(
  sessions: FocusSession[],
  ref: Date = new Date(),
): { thisWeek: number; lastWeek: number } {
  const sum = (keys: string[]) => keys.reduce((n, k) => n + focusMsOn(sessions, k), 0);
  return {
    thisWeek: sum(weekKeys(ref)),
    lastWeek: sum(weekKeys(addDays(startOfDay(ref), -7))),
  };
}

/** Habit completions over the last `n` days: done vs. possible (habit × day cells). */
export function habitWindowCompletion(habits: Habit[], n = 7, ref: Date = new Date()): { done: number; possible: number } {
  const keys = lastNDays(n, ref);
  const possible = habits.length * keys.length;
  const done = habits.reduce(
    (sum, h) => sum + keys.reduce((m, k) => m + (habitDoneOn(h, k) ? 1 : 0), 0),
    0,
  );
  return { done, possible };
}

/* --------------------------- Habits -------------------------------- */

export function habitDoneOn(habit: Habit, key: string): boolean {
  return !!habit.history[key];
}

export function habitDoneToday(habit: Habit, ref: Date = new Date()): boolean {
  return habitDoneOn(habit, dateKey(ref));
}

/** Current consecutive-day streak ending today (or yesterday if today undone). */
export function habitStreak(habit: Habit, ref: Date = new Date()): number {
  let streak = 0;
  const cursor = startOfDay(ref);
  // Allow the streak to stay alive if today isn't marked yet.
  if (!habitDoneOn(habit, dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (habitDoneOn(habit, dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Longest streak ever recorded. */
export function habitBestStreak(habit: Habit): number {
  const keys = Object.keys(habit.history)
    .filter((k) => habit.history[k])
    .sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const k of keys) {
    const d = parseDateKey(k);
    if (!d) continue;
    if (prev && diffDays(prev, d) === 1) run += 1;
    else run = 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

export function habitCompletionsThisWeek(habit: Habit, ref: Date = new Date()): number {
  return weekKeys(ref).reduce((n, k) => n + (habitDoneOn(habit, k) ? 1 : 0), 0);
}

/* --------------------------- Day keys ------------------------------ */

/** Seven day-keys for the week containing `ref`, Monday first. */
export function weekKeys(ref: Date = new Date()): string[] {
  const s = startOfDay(ref);
  const dow = (s.getDay() + 6) % 7; // Mon = 0
  s.setDate(s.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(s);
    d.setDate(s.getDate() + i);
    return dateKey(d);
  });
}

/** Last `n` day-keys ending today, oldest first. */
export function lastNDays(n: number, ref: Date = new Date()): string[] {
  const s = startOfDay(ref);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(s);
    d.setDate(s.getDate() - (n - 1 - i));
    return dateKey(d);
  });
}
