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
  /**
   * Last local mutation time. Used by the CRDT merge so two devices that
   * edited the same record offline converge on the newer write.
   */
  updatedAt?: number;
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
  /** Last local mutation time (CRDT merge clock). */
  updatedAt?: number;
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
  /**
   * Optional label for what kind of focus this was, e.g. "DeepWork" or
   * "Admin". Used by the Stats heatmap and the per-tag breakdown.
   */
  tag: string | null;
  /** Last local mutation time (CRDT merge clock). */
  updatedAt?: number;
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
  /** Label applied to the next logged block. */
  tag: string | null;
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

/* ------------------------------------------------------------------ */
/* Day planner (timeboxing)                                            */
/* ------------------------------------------------------------------ */

export interface PlanBlock {
  id: string;
  /** Task this block was planned from, when it came from the task list. */
  taskId: string | null;
  title: string;
  /** Minutes from local midnight (e.g. 9.5 h = 570). */
  startMin: number;
  durationMin: number;
  done: boolean;
  /** Last local mutation time (CRDT merge clock). */
  updatedAt?: number;
}

export interface DayPlan {
  /** Day key ("YYYY-MM-DD"). */
  dateKey: string;
  blocks: PlanBlock[];
  /** Last local mutation time (CRDT merge clock). */
  updatedAt?: number;
  /**
   * When the day was emptied. A clear is a write like any other, so it beats
   * older blocks from another device but loses to newer ones.
   */
  clearedAt?: number;
}

/* ------------------------------------------------------------------ */
/* Sync (bring-your-own-cloud)                                         */
/* ------------------------------------------------------------------ */

/** Where the encrypted payload lives. */
export type SyncProvider = "webdav" | "file";

export interface SyncConfig {
  provider: SyncProvider;
  /** WebDAV endpoint, e.g. https://cloud.example.com/remote.php/dav/files/you/ */
  url: string;
  username: string;
  password: string;
  /** File name inside that folder, e.g. motion-os-backup.motion */
  path: string;
  /** Encrypt the payload with AES-GCM before it leaves the device. */
  encrypt: boolean;
  /** Passphrase used to derive the AES key (never uploaded). */
  passphrase: string;
  /** Last successful sync, epoch ms. */
  lastSyncAt: number | null;
  /** Merge + upload automatically when data changes. */
  autoSync: boolean;
}

export interface ProductivityData {
  tasks: Task[];
  habits: Habit[];
  sessions: FocusSession[];
  timer: FocusTimer;
  focusConfig: FocusConfig;
  journals: JournalEntry[];
  plans: Record<string, DayPlan>;
}

export const HABIT_COLORS = ["#ff0000", "#ffffff", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7"] as const;

/** Suggested focus tags, offered as one-tap chips in the Focus module. */
export const SUGGESTED_TAGS = ["DeepWork", "Admin", "Learning", "Creative", "Errands", "Meetings"] as const;

/** Hours rendered by the day planner timeline. */
export const PLAN_START_HOUR = 6;
export const PLAN_END_HOUR = 24;
export const PLAN_SLOT_MIN = 30;
