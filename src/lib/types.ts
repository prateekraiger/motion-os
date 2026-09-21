export type Priority = "low" | "med" | "high";
export type Repeat = "none" | "daily" | "weekly";

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  done: boolean;
  priority: Priority;
  createdAt: number;
  completedAt: number | null;
  /** Due-date day key ("YYYY-MM-DD") or null. */
  due: string | null;
  notes: string;
  /** Estimated focus blocks (pomodoros) for this task. */
  estimate: number;
  /** Focus blocks actually spent on this task. */
  spent: number;
  order: number;
  /** ISO moment of a one-time reminder, or null. */
  remindAt: string | null;
  /** Recurrence applied when the task is completed. */
  repeat: Repeat;
  /** How many times this task has been completed (recurrence history). */
  timesDone: number;
  /** Checklist items for this task. */
  subtasks: Subtask[];
}

export type Mood = 1 | 2 | 3 | 4 | 5;

export interface JournalEntry {
  id: string;
  /** Date key ("YYYY-MM-DD") */
  dateKey: string;
  mood: Mood | null;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface Habit {
  id: string;
  name: string;
  createdAt: number;
  color: string;
  /** Target completions per week (used for weekly goal). */
  target: number;
  archived: boolean;
  order: number;
  /** Map of day-key -> completed. */
  history: Record<string, boolean>;
}

export interface FocusSession {
  id: string;
  startedAt: number;
  endedAt: number;
  /** Actual focused milliseconds credited to this session. */
  durationMs: number;
  taskId: string | null;
  /** True when the full planned duration completed (vs. stopped early). */
  completed: boolean;
}

export type FocusPhase = "work" | "shortBreak" | "longBreak";
export type FocusStatus = "idle" | "running" | "paused";

export interface FocusTimer {
  phase: FocusPhase;
  status: FocusStatus;
  /** Epoch ms when the current running phase will complete (null unless running). */
  endsAt: number | null;
  /** Remaining ms captured while paused/idle. */
  remainingMs: number;
  /** Completed work rounds in the current long-break cycle. */
  round: number;
  /** Task linked to the active work phase. */
  taskId: string | null;
  /** Epoch ms when the current work segment began (for crediting partial time). */
  segmentStartedAt: number | null;
}

export interface FocusConfig {
  workMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  roundsBeforeLongBreak: number;
  autoStartBreaks: boolean;
  autoStartWork: boolean;
  sound: boolean;
  ambientSound: "none" | "white" | "pink" | "brown";
  ambientVolume: number;
}

export interface ProductivityData {
  tasks: Task[];
  habits: Habit[];
  sessions: FocusSession[];
  timer: FocusTimer;
  focusConfig: FocusConfig;
  journals: JournalEntry[];
}

export const HABIT_COLORS = ["#ff0000", "#ffffff", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7"] as const;
