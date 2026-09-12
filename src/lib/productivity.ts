import { dateKey, diffDays, parseDateKey, startOfDay, MS } from "./time";
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
