import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useLocalStorage, uid } from "./useLocalStorage";
import { nextDueKey, phaseDurationMs } from "../lib/productivity";
import type {
  FocusConfig,
  FocusPhase,
  FocusSession,
  FocusTimer,
  Habit,
  Priority,
  Repeat,
  Task,
  JournalEntry,
} from "../lib/types";
import { HABIT_COLORS } from "../lib/types";

const KEYS = {
  tasks: "motion-os:tasks:v1",
  habits: "motion-os:habits:v1",
  sessions: "motion-os:sessions:v1",
  timer: "motion-os:timer:v1",
  focusConfig: "motion-os:focus-config:v1",
  journals: "motion-os:journals:v1",
};

const DEFAULT_CONFIG: FocusConfig = {
  workMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  roundsBeforeLongBreak: 4,
  autoStartBreaks: true,
  autoStartWork: false,
  sound: true,
  ambientSound: "none",
  ambientVolume: 0.5,
};

const DEFAULT_TIMER: FocusTimer = {
  phase: "work",
  status: "idle",
  endsAt: null,
  remainingMs: DEFAULT_CONFIG.workMin * 60_000,
  round: 0,
  taskId: null,
  segmentStartedAt: null,
};

/** Fill in defaults for task fields that older backups may lack. */
function normalizeTask(raw: unknown): Task {
  const t = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    id: typeof t.id === "string" ? t.id : uid(),
    title: typeof t.title === "string" && t.title.trim() ? t.title : "Untitled task",
    done: t.done === true,
    priority: t.priority === "high" || t.priority === "low" ? t.priority : "med",
    createdAt: typeof t.createdAt === "number" ? t.createdAt : Date.now(),
    completedAt: typeof t.completedAt === "number" ? t.completedAt : null,
    due: typeof t.due === "string" ? t.due : null,
    notes: typeof t.notes === "string" ? t.notes : "",
    estimate: typeof t.estimate === "number" ? t.estimate : 0,
    spent: typeof t.spent === "number" ? t.spent : 0,
    order: typeof t.order === "number" ? t.order : 0,
    remindAt: typeof t.remindAt === "string" ? t.remindAt : null,
    repeat: t.repeat === "daily" || t.repeat === "weekly" ? t.repeat : "none",
    timesDone: typeof t.timesDone === "number" ? t.timesDone : 0,
    subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
  };
}

interface StoreCtx {
  tasks: Task[];
  habits: Habit[];
  sessions: FocusSession[];
  timer: FocusTimer;
  focusConfig: FocusConfig;
  journals: JournalEntry[];

  // Tasks
  addTask: (input: {
    title: string;
    priority?: Priority;
    due?: string | null;
    estimate?: number;
    repeat?: Repeat;
  }) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  toggleTask: (id: string) => void;
  removeTask: (id: string) => void;
  clearCompletedTasks: () => void;
  reorderTask: (id: string, dir: -1 | 1) => void;

  // Habits
  addHabit: (input: { name: string; target?: number; color?: string }) => void;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  toggleHabit: (id: string, dayKey: string) => void;
  removeHabit: (id: string) => void;

  // Focus timer
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  skipPhase: () => void;
  setTimerTask: (id: string | null) => void;
  setFocusPhase: (phase: FocusPhase) => void;
  updateFocusConfig: (patch: Partial<FocusConfig>) => void;

  // Journals
  upsertJournal: (dateKey: string, patch: Partial<Omit<JournalEntry, "id" | "dateKey" | "createdAt" | "updatedAt">>) => void;

  // Data
  exportData: () => string;
  importData: (json: string) => boolean;
  clearAllData: () => void;
}

const Ctx = createContext<StoreCtx | null>(null);

function beep(sound: boolean) {
  if (!sound) return;
  try {
    const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.14);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.55);
    osc.onended = () => ctx.close().catch(() => {});
  } catch {
    /* audio not available */
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useLocalStorage<Task[]>(KEYS.tasks, []);
  const [habits, setHabits] = useLocalStorage<Habit[]>(KEYS.habits, []);
  const [sessions, setSessions] = useLocalStorage<FocusSession[]>(KEYS.sessions, []);
  const [timer, setTimer] = useLocalStorage<FocusTimer>(KEYS.timer, DEFAULT_TIMER);
  const [focusConfig, setFocusConfig] = useLocalStorage<FocusConfig>(KEYS.focusConfig, DEFAULT_CONFIG);
  const [journals, setJournals] = useLocalStorage<JournalEntry[]>(KEYS.journals, []);

  const configRef = useRef(focusConfig);
  configRef.current = focusConfig;

  /* --------------------------- Tasks ------------------------------- */
  const addTask: StoreCtx["addTask"] = useCallback(
    ({ title, priority = "med", due = null, estimate = 0, repeat = "none" }) => {
      const clean = title.trim();
      if (!clean) return;
      setTasks((prev) => [
        {
          id: uid(),
          title: clean,
          done: false,
          priority,
          createdAt: Date.now(),
          completedAt: null,
          due,
          notes: "",
          estimate,
          spent: 0,
          order: prev.length ? Math.min(...prev.map((t) => t.order)) - 1 : 0,
          remindAt: null,
          repeat,
          timesDone: 0,
          subtasks: [],
        },
        ...prev,
      ]);
    },
    [setTasks],
  );

  const updateTask: StoreCtx["updateTask"] = useCallback(
    (id, patch) => setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t))),
    [setTasks],
  );

  const toggleTask: StoreCtx["toggleTask"] = useCallback(
    (id) =>
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          if (!t.done && t.repeat !== "none") {
            // Completing a recurring task: count it, keep the last-completed
            // moment (for stats), and re-arm the due date for the next cycle.
            return {
              ...t,
              done: false,
              completedAt: Date.now(),
              due: nextDueKey(t),
              timesDone: t.timesDone + 1,
            };
          }
          return { ...t, done: !t.done, completedAt: !t.done ? Date.now() : null };
        }),
      ),
    [setTasks],
  );

  const removeTask: StoreCtx["removeTask"] = useCallback(
    (id) => setTasks((prev) => prev.filter((t) => t.id !== id)),
    [setTasks],
  );

  const clearCompletedTasks = useCallback(() => setTasks((prev) => prev.filter((t) => !t.done)), [setTasks]);

  const reorderTask: StoreCtx["reorderTask"] = useCallback(
    (id, dir) =>
      setTasks((prev) => {
        const active = prev.filter((t) => !t.done).sort((a, b) => a.order - b.order);
        const idx = active.findIndex((t) => t.id === id);
        const swap = idx + dir;
        if (idx < 0 || swap < 0 || swap >= active.length) return prev;
        const a = active[idx];
        const b = active[swap];
        return prev.map((t) => (t.id === a.id ? { ...t, order: b.order } : t.id === b.id ? { ...t, order: a.order } : t));
      }),
    [setTasks],
  );

  /* --------------------------- Habits ------------------------------ */
  const addHabit: StoreCtx["addHabit"] = useCallback(
    ({ name, target = 7, color }) => {
      const clean = name.trim();
      if (!clean) return;
      setHabits((prev) => [
        ...prev,
        {
          id: uid(),
          name: clean,
          createdAt: Date.now(),
          color: color ?? HABIT_COLORS[prev.length % HABIT_COLORS.length],
          target,
          archived: false,
          order: prev.length,
          history: {},
        },
      ]);
    },
    [setHabits],
  );

  const updateHabit: StoreCtx["updateHabit"] = useCallback(
    (id, patch) => setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, ...patch } : h))),
    [setHabits],
  );

  const toggleHabit: StoreCtx["toggleHabit"] = useCallback(
    (id, dayKey) =>
      setHabits((prev) =>
        prev.map((h) => {
          if (h.id !== id) return h;
          const history = { ...h.history };
          if (history[dayKey]) delete history[dayKey];
          else history[dayKey] = true;
          return { ...h, history };
        }),
      ),
    [setHabits],
  );

  const removeHabit: StoreCtx["removeHabit"] = useCallback(
    (id) => setHabits((prev) => prev.filter((h) => h.id !== id)),
    [setHabits],
  );

  /* --------------------------- Focus timer ------------------------- */
  const logSession = useCallback(
    (durationMs: number, taskId: string | null, completed: boolean, startedAt: number) => {
      if (durationMs < 1000) return;
      setSessions((prev) => [
        ...prev,
        { id: uid(), startedAt, endedAt: Date.now(), durationMs, taskId, completed },
      ]);
      if (taskId) setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, spent: t.spent + 1 } : t)));
    },
    [setSessions, setTasks],
  );

  const advancePhase = useCallback(
    (fromPhase: FocusPhase, prevRound: number, taskId: string | null): FocusTimer => {
      const cfg = configRef.current;
      let phase: FocusPhase;
      let round = prevRound;
      if (fromPhase === "work") {
        round = prevRound + 1;
        phase = round % cfg.roundsBeforeLongBreak === 0 ? "longBreak" : "shortBreak";
      } else {
        phase = "work";
      }
      const duration = phaseDurationMs(phase, cfg);
      const autoStart = phase === "work" ? cfg.autoStartWork : cfg.autoStartBreaks;
      return {
        phase,
        round,
        status: autoStart ? "running" : "idle",
        endsAt: autoStart ? Date.now() + duration : null,
        remainingMs: duration,
        taskId, // keep the linked task across the cycle until the user changes it
        segmentStartedAt: autoStart && phase === "work" ? Date.now() : null,
      };
    },
    [],
  );

  const completePhase = useCallback(() => {
    setTimer((prev) => {
      if (prev.phase === "work") {
        const duration = phaseDurationMs("work", configRef.current);
        logSession(duration, prev.taskId, true, prev.segmentStartedAt ?? Date.now() - duration);
      }
      beep(configRef.current.sound);
      return advancePhase(prev.phase, prev.round, prev.taskId);
    });
  }, [advancePhase, logSession, setTimer]);

  const startTimer = useCallback(() => {
    setTimer((prev) => {
      if (prev.status === "running") return prev;
      const remaining = prev.remainingMs > 0 ? prev.remainingMs : phaseDurationMs(prev.phase, configRef.current);
      return {
        ...prev,
        status: "running",
        endsAt: Date.now() + remaining,
        remainingMs: remaining,
        segmentStartedAt: prev.phase === "work" ? prev.segmentStartedAt ?? Date.now() : null,
      };
    });
  }, [setTimer]);

  const pauseTimer = useCallback(() => {
    setTimer((prev) => {
      if (prev.status !== "running" || prev.endsAt == null) return prev;
      return { ...prev, status: "paused", remainingMs: Math.max(0, prev.endsAt - Date.now()), endsAt: null };
    });
  }, [setTimer]);

  /** Focused ms actually counted down this phase (excludes paused time). */
  const creditPartial = (prev: FocusTimer) => {
    if (prev.phase !== "work") return;
    const total = phaseDurationMs("work", configRef.current);
    const remaining =
      prev.status === "running" && prev.endsAt != null ? Math.max(0, prev.endsAt - Date.now()) : prev.remainingMs;
    const elapsed = Math.min(total, total - remaining);
    if (elapsed >= 60_000) logSession(elapsed, prev.taskId, false, prev.segmentStartedAt ?? Date.now() - elapsed);
  };

  const resetTimer = useCallback(() => {
    setTimer((prev) => {
      creditPartial(prev);
      return {
        ...prev,
        status: "idle",
        endsAt: null,
        remainingMs: phaseDurationMs(prev.phase, configRef.current),
        segmentStartedAt: null,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logSession, setTimer]);

  const skipPhase = useCallback(() => {
    setTimer((prev) => {
      creditPartial(prev);
      return advancePhase(prev.phase, prev.round, prev.taskId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advancePhase, logSession, setTimer]);

  const setTimerTask: StoreCtx["setTimerTask"] = useCallback(
    (id) => setTimer((prev) => ({ ...prev, taskId: id })),
    [setTimer],
  );

  const setFocusPhase: StoreCtx["setFocusPhase"] = useCallback(
    (phase) =>
      setTimer((prev) => {
        if (prev.phase !== phase) creditPartial(prev);
        return {
          ...prev,
          phase,
          status: "idle",
          endsAt: null,
          remainingMs: phaseDurationMs(phase, configRef.current),
          segmentStartedAt: null,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setTimer],
  );

  const updateFocusConfig: StoreCtx["updateFocusConfig"] = useCallback(
    (patch) => {
      setFocusConfig((prev) => {
        const next = { ...prev, ...patch };
        // If idle, keep the visible remaining time in sync with new durations.
        setTimer((t) =>
          t.status === "idle" ? { ...t, remainingMs: phaseDurationMs(t.phase, next) } : t,
        );
        return next;
      });
    },
    [setFocusConfig, setTimer],
  );

  // Tick: while running, detect phase completion. Also reconciles on mount if
  // the app was closed past a phase's end time.
  const processedEndsAtRef = useRef<number | null>(null);
  useEffect(() => {
    if (timer.status !== "running" || timer.endsAt == null) return;
    const endsAt = timer.endsAt;
    const check = () => {
      if (Date.now() < endsAt) return;
      // Guard against processing the same expiry twice (e.g. StrictMode).
      if (processedEndsAtRef.current === endsAt) return;
      processedEndsAtRef.current = endsAt;
      completePhase();
    };
    check();
    const id = window.setInterval(check, 500);
    return () => window.clearInterval(id);
  }, [timer.status, timer.endsAt, completePhase]);

  /* --------------------------- Journals ---------------------------- */
  const upsertJournal: StoreCtx["upsertJournal"] = useCallback(
    (dateKey, patch) => {
      setJournals((prev) => {
        const existingIdx = prev.findIndex((j) => j.dateKey === dateKey);
        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = { ...next[existingIdx], ...patch, updatedAt: Date.now() };
          return next;
        } else {
          return [
            ...prev,
            {
              id: uid(),
              dateKey,
              mood: patch.mood ?? null,
              content: patch.content ?? "",
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ];
        }
      });
    },
    [setJournals],
  );

  /* --------------------------- Data -------------------------------- */
  const exportData = useCallback(
    () => JSON.stringify({ version: 1, tasks, habits, sessions, focusConfig, journals }, null, 2),
    [tasks, habits, sessions, focusConfig, journals],
  );

  const importData = useCallback(
    (json: string) => {
      try {
        const data = JSON.parse(json);
        // Normalise so backups made by older versions (without remindAt /
        // repeat / timesDone / notes) import cleanly.
        if (Array.isArray(data.tasks)) setTasks(data.tasks.map(normalizeTask));
        if (Array.isArray(data.habits)) setHabits(data.habits);
        if (Array.isArray(data.sessions)) setSessions(data.sessions);
        if (Array.isArray(data.journals)) setJournals(data.journals);
        if (data.focusConfig) setFocusConfig({ ...DEFAULT_CONFIG, ...data.focusConfig });
        return true;
      } catch {
        return false;
      }
    },
    [setTasks, setHabits, setSessions, setJournals, setFocusConfig],
  );

  const clearAllData = useCallback(() => {
    setTasks([]);
    setHabits([]);
    setSessions([]);
    setJournals([]);
    setTimer(DEFAULT_TIMER);
  }, [setTasks, setHabits, setSessions, setJournals, setTimer]);


  const value = useMemo<StoreCtx>(
    () => ({
      tasks,
      habits,
      sessions,
      timer,
      focusConfig,
      journals,
      addTask,
      updateTask,
      toggleTask,
      removeTask,
      clearCompletedTasks,
      reorderTask,
      addHabit,
      updateHabit,
      toggleHabit,
      removeHabit,
      startTimer,
      pauseTimer,
      resetTimer,
      skipPhase,
      setTimerTask,
      setFocusPhase,
      updateFocusConfig,
      upsertJournal,
      exportData,
      importData,
      clearAllData,
    }),
    [
      tasks,
      habits,
      sessions,
      timer,
      focusConfig,
      journals,
      addTask,
      updateTask,
      toggleTask,
      removeTask,
      clearCompletedTasks,
      reorderTask,
      addHabit,
      updateHabit,
      toggleHabit,
      removeHabit,
      startTimer,
      pauseTimer,
      resetTimer,
      skipPhase,
      setTimerTask,
      setFocusPhase,
      updateFocusConfig,
      upsertJournal,
      exportData,
      importData,
      clearAllData,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
