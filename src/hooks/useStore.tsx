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
import { stamp } from "../lib/crdt";
import { autoSchedule } from "../lib/timebox";
import {
  normalizeHabit,
  normalizeJournal,
  normalizePlans,
  normalizeSession,
  normalizeTask,
} from "../lib/normalize";
import { mergePayloads } from "../lib/merge";
import { deviceLabel, type SyncPayload, type TombstoneSets } from "../lib/sync";
import type {
  DayPlan,
  FocusConfig,
  FocusPhase,
  FocusSession,
  FocusTimer,
  Habit,
  JournalEntry,
  PlanBlock,
  Priority,
  Repeat,
  Task,
} from "../lib/types";
import { HABIT_COLORS, PLAN_SLOT_MIN } from "../lib/types";
import { haptic } from "../lib/haptics";
import { notify } from "../lib/notifications";

const KEYS = {
  tasks: "motion-os:tasks:v1",
  habits: "motion-os:habits:v1",
  sessions: "motion-os:sessions:v1",
  timer: "motion-os:timer:v1",
  focusConfig: "motion-os:focus-config:v1",
  journals: "motion-os:journals:v1",
  plans: "motion-os:plans:v1",
  tombstones: "motion-os:tombstones:v1",
  configStamp: "motion-os:focus-config:stamp:v1",
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
  tag: null,
};

/* ------------------------- Merge clocks ----------------------------- */


interface StoreCtx {
  tasks: Task[];
  habits: Habit[];
  sessions: FocusSession[];
  timer: FocusTimer;
  focusConfig: FocusConfig;
  journals: JournalEntry[];
  plans: Record<string, DayPlan>;

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
  setTimerTag: (tag: string | null) => void;
  setFocusPhase: (phase: FocusPhase) => void;
  /** Arm and start a work block of `minutes` (Quick Settings tile / intent). */
  startFocusBlock: (minutes: number) => void;
  /** Add time to the running (or paused) block — notification "+5 min". */
  extendTimer: (minutes: number) => void;
  updateFocusConfig: (patch: Partial<FocusConfig>) => void;

  // Journals
  upsertJournal: (
    dateKey: string,
    patch: Partial<Omit<JournalEntry, "id" | "dateKey" | "createdAt" | "updatedAt">>,
  ) => void;

  // Day planner
  addPlanBlock: (dateKey: string, block: Omit<PlanBlock, "id" | "done" | "updatedAt">) => void;
  updatePlanBlock: (dateKey: string, id: string, patch: Partial<PlanBlock>) => void;
  movePlanBlock: (dateKey: string, id: string, startMin: number) => void;
  removePlanBlock: (dateKey: string, id: string) => void;
  togglePlanBlock: (dateKey: string, id: string) => void;
  autoPlanDay: (dateKey: string, blockMin?: number) => number;
  clearPlanDay: (dateKey: string) => void;

  // Data
  exportData: () => string;
  importData: (json: string) => boolean;
  mergeRemoteData: (payload: SyncPayload) => SyncPayload;
  clearAllData: () => void;
}

const Ctx = createContext<StoreCtx | null>(null);

function beep(sound: boolean) {
  if (!sound) return;
  try {
    const AudioCtor =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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

const EMPTY_TOMBSTONES: TombstoneSets = { tasks: {}, habits: {}, sessions: {}, journals: {} };

export function StoreProvider({ children }: { children: ReactNode }) {
  // The `ref` triplets let callbacks read the freshest state without being
  // re-created on every edit, which matters for the sync merge.
  const [tasks, setTasks, tasksRef] = useLocalStorage<Task[]>(KEYS.tasks, []);
  const [habits, setHabits, habitsRef] = useLocalStorage<Habit[]>(KEYS.habits, []);
  const [sessions, setSessions, sessionsRef] = useLocalStorage<FocusSession[]>(KEYS.sessions, []);
  const [timer, setTimer] = useLocalStorage<FocusTimer>(KEYS.timer, DEFAULT_TIMER);
  const [focusConfig, setFocusConfig, focusConfigRef] = useLocalStorage<FocusConfig>(KEYS.focusConfig, DEFAULT_CONFIG);
  const [journals, setJournals, journalsRef] = useLocalStorage<JournalEntry[]>(KEYS.journals, []);
  const [plans, setPlans, plansRef] = useLocalStorage<Record<string, DayPlan>>(KEYS.plans, {});
  const [, setTombstones, tombstonesStateRef] = useLocalStorage<TombstoneSets>(KEYS.tombstones, EMPTY_TOMBSTONES);
  const [, setConfigStamp, configStampStateRef] = useLocalStorage<number>(KEYS.configStamp, 0);

  const configRef = useRef(focusConfig);
  configRef.current = focusConfig;
  const configStampRef = configStampStateRef;
  const focusConfigLatestRef = focusConfigRef;

  const rememberDeletion = useCallback(
    (collection: keyof TombstoneSets, id: string) => {
      setTombstones((prev) => {
        const next: TombstoneSets = { ...prev };
        next[collection] = { ...(next[collection] ?? {}), [id]: Date.now() };
        return next;
      });
    },
    [setTombstones],
  );

  /* --------------------------- Tasks ------------------------------- */
  const addTask: StoreCtx["addTask"] = useCallback(
    ({ title, priority = "med", due = null, estimate = 0, repeat = "none" }) => {
      const clean = title.trim();
      if (!clean) return;
      const now = Date.now();
      setTasks((prev) => [
        {
          id: uid(),
          title: clean,
          done: false,
          priority,
          createdAt: now,
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
          updatedAt: now,
        },
        ...prev,
      ]);
    },
    [setTasks],
  );

  const updateTask: StoreCtx["updateTask"] = useCallback(
    (id, patch) =>
      setTasks((prev) => prev.map((t) => (t.id === id ? stamp({ ...t, ...patch }) : t))),
    [setTasks],
  );

  const toggleTask: StoreCtx["toggleTask"] = useCallback(
    (id) =>
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          haptic("toggle");
          if (!t.done && t.repeat !== "none") {
            // Completing a recurring task: count it, keep the last-completed
            // moment (for stats), and re-arm the due date for the next cycle.
            return stamp({
              ...t,
              done: false,
              completedAt: Date.now(),
              due: nextDueKey(t),
              timesDone: t.timesDone + 1,
            });
          }
          return stamp({ ...t, done: !t.done, completedAt: !t.done ? Date.now() : null });
        }),
      ),
    [setTasks],
  );

  const removeTask: StoreCtx["removeTask"] = useCallback(
    (id) => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      rememberDeletion("tasks", id);
    },
    [setTasks, rememberDeletion],
  );

  const clearCompletedTasks = useCallback(() => {
    const done = tasks.filter((t) => t.done);
    if (done.length > 0) {
      const at = Date.now();
      setTombstones((prev) => {
        const bucket = { ...(prev.tasks ?? {}) };
        done.forEach((t) => {
          bucket[t.id] = at;
        });
        return { ...prev, tasks: bucket };
      });
    }
    setTasks((prev) => prev.filter((t) => !t.done));
  }, [tasks, setTasks, setTombstones]);

  const reorderTask: StoreCtx["reorderTask"] = useCallback(
    (id, dir) =>
      setTasks((prev) => {
        const active = prev.filter((t) => !t.done).sort((a, b) => a.order - b.order);
        const idx = active.findIndex((t) => t.id === id);
        const swap = idx + dir;
        if (idx < 0 || swap < 0 || swap >= active.length) return prev;
        const a = active[idx];
        const b = active[swap];
        const now = Date.now();
        return prev.map((t) =>
          t.id === a.id ? stamp({ ...t, order: b.order }, now) : t.id === b.id ? stamp({ ...t, order: a.order }, now) : t,
        );
      }),
    [setTasks],
  );

  /* --------------------------- Habits ------------------------------ */
  const addHabit: StoreCtx["addHabit"] = useCallback(
    ({ name, target = 7, color }) => {
      const clean = name.trim();
      if (!clean) return;
      const now = Date.now();
      setHabits((prev) => [
        ...prev,
        {
          id: uid(),
          name: clean,
          createdAt: now,
          color: color ?? HABIT_COLORS[prev.length % HABIT_COLORS.length],
          target,
          archived: false,
          order: prev.length,
          history: {},
          updatedAt: now,
        },
      ]);
    },
    [setHabits],
  );

  const updateHabit: StoreCtx["updateHabit"] = useCallback(
    (id, patch) => setHabits((prev) => prev.map((h) => (h.id === id ? stamp({ ...h, ...patch }) : h))),
    [setHabits],
  );

  const toggleHabit: StoreCtx["toggleHabit"] = useCallback(
    (id, dayKey) =>
      setHabits((prev) =>
        prev.map((h) => {
          if (h.id !== id) return h;
          haptic("tap");
          const history = { ...h.history };
          if (history[dayKey]) delete history[dayKey];
          else history[dayKey] = true;
          return stamp({ ...h, history });
        }),
      ),
    [setHabits],
  );

  const removeHabit: StoreCtx["removeHabit"] = useCallback(
    (id) => {
      setHabits((prev) => prev.filter((h) => h.id !== id));
      rememberDeletion("habits", id);
    },
    [setHabits, rememberDeletion],
  );

  /* --------------------------- Focus timer ------------------------- */
  const logSession = useCallback(
    (durationMs: number, taskId: string | null, completed: boolean, startedAt: number, tag: string | null) => {
      if (durationMs < 1000) return;
      const now = Date.now();
      setSessions((prev) => [
        ...prev,
        {
          id: uid(),
          startedAt,
          endedAt: now,
          durationMs,
          taskId,
          completed,
          tag: tag?.trim().replace(/^#/, "") || null,
          updatedAt: now,
        },
      ]);
      if (taskId) setTasks((prev) => prev.map((t) => (t.id === taskId ? stamp({ ...t, spent: t.spent + 1 }) : t)));
    },
    [setSessions, setTasks],
  );

  const advancePhase = useCallback(
    (fromPhase: FocusPhase, prevRound: number, taskId: string | null, tag: string | null): FocusTimer => {
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
        tag,
      };
    },
    [],
  );

  const completePhase = useCallback(() => {
    const prev = timerRef.current;
    if (prev.phase === "work") {
      const duration = phaseDurationMs("work", configRef.current);
      logSession(duration, prev.taskId, true, prev.segmentStartedAt ?? Date.now() - duration, prev.tag);
    }
    beep(configRef.current.sound);
    haptic("timer");
    const next = advancePhase(prev.phase, prev.round, prev.taskId, prev.tag);
    // A finished block is worth a notification even when the app is in the
    // background — that is when the user most wants to know.
    if (prev.phase === "work") {
      void notify({
        title: "Focus block complete",
        body: next.phase === "work" ? "Ready for the next block." : "Time for a break.",
      }).catch(() => undefined);
    }
    setTimer(next);
  }, [advancePhase, logSession, setTimer]);

  const startTimer = useCallback(() => {
    setTimer((prev) => {
      if (prev.status === "running") return prev;
      haptic("tap");
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
    haptic("tap");
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
    if (elapsed >= 60_000) logSession(elapsed, prev.taskId, false, prev.segmentStartedAt ?? Date.now() - elapsed, prev.tag);
  };

  const resetTimer = useCallback(() => {
    haptic("tap");
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
    haptic("tap");
    setTimer((prev) => {
      creditPartial(prev);
      return advancePhase(prev.phase, prev.round, prev.taskId, prev.tag);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advancePhase, logSession, setTimer]);

  const setTimerTask: StoreCtx["setTimerTask"] = useCallback(
    (id) => setTimer((prev) => ({ ...prev, taskId: id })),
    [setTimer],
  );

  const setTimerTag: StoreCtx["setTimerTag"] = useCallback(
    (tag) => setTimer((prev) => ({ ...prev, tag: tag?.trim().replace(/^#/, "") || null })),
    [setTimer],
  );

  /** Extend the current block by `minutes` (notification action). */
  const extendTimer: StoreCtx["extendTimer"] = useCallback(
    (minutes) => {
      const delta = Math.max(1, Math.round(minutes)) * 60_000;
      setTimer((prev) =>
        prev.status === "running" && prev.endsAt != null
          ? { ...prev, endsAt: prev.endsAt + delta }
          : { ...prev, remainingMs: prev.remainingMs + delta },
      );
    },
    [setTimer],
  );

  /**
   * Arm and start a work block of an arbitrary length without touching the
   * saved configuration — this is what the Quick Settings tile triggers.
   */
  const startFocusBlock: StoreCtx["startFocusBlock"] = useCallback(
    (minutes) => {
      const clamped = Math.max(1, Math.min(180, Math.round(minutes)));
      haptic("success");
      setTimer((prev) => ({
        ...prev,
        phase: "work",
        status: "idle",
        endsAt: null,
        remainingMs: clamped * 60_000,
        segmentStartedAt: null,
      }));
      setTimer((prev) =>
        prev.status === "running"
          ? prev
          : {
              ...prev,
              status: "running",
              endsAt: Date.now() + prev.remainingMs,
              remainingMs: prev.remainingMs,
              segmentStartedAt: Date.now(),
            },
      );
    },
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
      const now = Date.now();
      setFocusConfig((prev) => {
        const next = { ...prev, ...patch };
        // If idle, keep the visible remaining time in sync with new durations.
        setTimer((t) => (t.status === "idle" ? { ...t, remainingMs: phaseDurationMs(t.phase, next) } : t));
        return next;
      });
      setConfigStamp(now);
    },
    [setFocusConfig, setTimer, setConfigStamp],
  );

  // Tick: while running, detect phase completion. Also reconciles on mount if
  // the app was closed past a phase's end time.
  const processedEndsAtRef = useRef<number | null>(null);
  const timerRef = useRef(timer);
  timerRef.current = timer;
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

  /* --------------------------- Day planner ------------------------- */
  const addPlanBlock: StoreCtx["addPlanBlock"] = useCallback(
    (dateKey, block) =>
      setPlans((prev) => {
        const day = prev[dateKey] ?? { dateKey, blocks: [] };
        const now = Date.now();
        return {
          ...prev,
          [dateKey]: {
            dateKey,
            updatedAt: now,
            blocks: [
              ...day.blocks,
              {
                ...block,
                id: uid(),
                done: false,
                updatedAt: now,
              },
            ],
          },
        };
      }),
    [setPlans],
  );

  const updatePlanBlock: StoreCtx["updatePlanBlock"] = useCallback(
    (dateKey, id, patch) =>
      setPlans((prev) => {
        const day = prev[dateKey];
        if (!day) return prev;
        return {
          ...prev,
          [dateKey]: {
            ...day,
            updatedAt: Date.now(),
            blocks: day.blocks.map((b) => (b.id === id ? stamp({ ...b, ...patch }) : b)),
          },
        };
      }),
    [setPlans],
  );

  const movePlanBlock: StoreCtx["movePlanBlock"] = useCallback(
    (dateKey, id, startMin) =>
      setPlans((prev) => {
        const day = prev[dateKey];
        if (!day) return prev;
        return {
          ...prev,
          [dateKey]: {
            ...day,
            updatedAt: Date.now(),
            blocks: day.blocks.map((b) => (b.id === id ? stamp({ ...b, startMin }) : b)),
          },
        };
      }),
    [setPlans],
  );

  const removePlanBlock: StoreCtx["removePlanBlock"] = useCallback(
    (dateKey, id) =>
      setPlans((prev) => {
        const day = prev[dateKey];
        if (!day) return prev;
        return {
          ...prev,
          [dateKey]: {
            ...day,
            updatedAt: Date.now(),
            blocks: day.blocks.filter((b) => b.id !== id),
          },
        };
      }),
    [setPlans],
  );

  const togglePlanBlock: StoreCtx["togglePlanBlock"] = useCallback(
    (dateKey, id) =>
      setPlans((prev) => {
        const day = prev[dateKey];
        if (!day) return prev;
        haptic("toggle");
        return {
          ...prev,
          [dateKey]: {
            ...day,
            updatedAt: Date.now(),
            blocks: day.blocks.map((b) => (b.id === id ? stamp({ ...b, done: !b.done }) : b)),
          },
        };
      }),
    [setPlans],
  );

  const autoPlanDay: StoreCtx["autoPlanDay"] = useCallback(
    (dateKey, blockMin = PLAN_SLOT_MIN * 2) => {
      const open = tasks.filter((t) => !t.done);
      if (open.length === 0) return 0;
      const existing = plans[dateKey]?.blocks ?? [];
      const placed = autoSchedule(open, existing, blockMin);
      if (placed.length === 0) return 0;
      const now = Date.now();
      setPlans((prev) => {
        const day = prev[dateKey] ?? { dateKey, blocks: [] };
        return { ...prev, [dateKey]: { dateKey, updatedAt: now, blocks: [...day.blocks, ...placed] } };
      });
      haptic("success");
      return placed.length;
    },
    [tasks, plans, setPlans],
  );

  const clearPlanDay: StoreCtx["clearPlanDay"] = useCallback(
    (dateKey) =>
      setPlans((prev) => {
        const day = prev[dateKey];
        if (!day || day.blocks.length === 0) return prev;
        const now = Date.now();
        // Keep an explicit "cleared" marker so a sync cannot resurrect the day.
        return { ...prev, [dateKey]: { dateKey, blocks: [], updatedAt: now, clearedAt: now } };
      }),
    [setPlans],
  );

  /* --------------------------- Data -------------------------------- */
  const exportData = useCallback(
    () =>
      JSON.stringify(
        {
          version: 2,
          tasks: tasksRef.current,
          habits: habitsRef.current,
          sessions: sessionsRef.current,
          focusConfig: focusConfigLatestRef.current,
          journals: journalsRef.current,
          plans: plansRef.current,
          configUpdatedAt: configStampRef.current,
        },
        null,
        2,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /** Build the sync payload from the freshest local state. */
  const buildLocalPayload = useCallback((): SyncPayload => {
    const dead = tombstonesStateRef.current;
    return {
      v: 2,
      updatedAt: Date.now(),
      device: deviceLabel(),
      tasks: tasksRef.current,
      habits: habitsRef.current,
      sessions: sessionsRef.current,
      journals: journalsRef.current,
      plans: plansRef.current,
      focusConfig: focusConfigLatestRef.current,
      configUpdatedAt: configStampRef.current,
      tombstones: {
        tasks: dead.tasks ?? {},
        habits: dead.habits ?? {},
        sessions: dead.sessions ?? {},
        journals: dead.journals ?? {},
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const importData = useCallback(
    (json: string) => {
      try {
        const data = JSON.parse(json) as Record<string, unknown>;
        // Normalise so backups made by older versions (without remindAt /
        // repeat / timesDone / notes) import cleanly.
        if (Array.isArray(data.tasks)) setTasks(data.tasks.map(normalizeTask));
        if (Array.isArray(data.habits)) setHabits(data.habits.map(normalizeHabit));
        if (Array.isArray(data.sessions)) setSessions(data.sessions.map(normalizeSession));
        if (Array.isArray(data.journals)) setJournals(data.journals.map(normalizeJournal));
        if (data.plans) setPlans(normalizePlans(data.plans));
        if (data.focusConfig) {
          setFocusConfig({ ...DEFAULT_CONFIG, ...(data.focusConfig as FocusConfig) });
          setConfigStamp(typeof data.configUpdatedAt === "number" ? data.configUpdatedAt : Date.now());
        }
        return true;
      } catch {
        return false;
      }
    },
    [setTasks, setHabits, setSessions, setJournals, setPlans, setFocusConfig, setConfigStamp],
  );

  /**
   * Merge a payload pulled from another device into local state.
   *
   * The local payload is built from the freshest state in this closure, merged
   * with the remote one (per record, so offline edits on both sides survive),
   * applied locally, and returned so the caller can push the converged result
   * back to the user's cloud.
   */
  const mergeRemoteData: StoreCtx["mergeRemoteData"] = useCallback(
    (payload) => {
      const local = buildLocalPayload();
      const merged = mergePayloads(local, payload);

      setTasks(merged.tasks.map(normalizeTask));
      setHabits(merged.habits.map(normalizeHabit));
      setSessions(merged.sessions.map(normalizeSession));
      setJournals(merged.journals.map(normalizeJournal));
      setPlans(merged.plans);
      setTombstones({
        tasks: merged.tombstones.tasks,
        habits: merged.tombstones.habits,
        sessions: merged.tombstones.sessions,
        journals: merged.tombstones.journals,
      });
      if (merged.configUpdatedAt > configStampRef.current) {
        setFocusConfig({ ...DEFAULT_CONFIG, ...(merged.focusConfig as FocusConfig) });
        setConfigStamp(merged.configUpdatedAt);
      }
      return merged;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setTasks, setHabits, setSessions, setJournals, setPlans, setTombstones, setFocusConfig, setConfigStamp],
  );

  const clearAllData = useCallback(() => {
    setTasks([]);
    setHabits([]);
    setSessions([]);
    setJournals([]);
    setPlans({});
    setTimer(DEFAULT_TIMER);
  }, [setTasks, setHabits, setSessions, setJournals, setPlans, setTimer]);

  const value = useMemo<StoreCtx>(
    () => ({
      tasks,
      habits,
      sessions,
      timer,
      focusConfig,
      journals,
      plans,
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
      setTimerTag,
      setFocusPhase,
      startFocusBlock,
      extendTimer,
      updateFocusConfig,
      upsertJournal,
      addPlanBlock,
      updatePlanBlock,
      movePlanBlock,
      removePlanBlock,
      togglePlanBlock,
      autoPlanDay,
      clearPlanDay,
      exportData,
      importData,
      mergeRemoteData,
      clearAllData,
    }),
    [
      tasks,
      habits,
      sessions,
      timer,
      focusConfig,
      journals,
      plans,
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
      setTimerTag,
      setFocusPhase,
      startFocusBlock,
      extendTimer,
      updateFocusConfig,
      upsertJournal,
      addPlanBlock,
      updatePlanBlock,
      movePlanBlock,
      removePlanBlock,
      togglePlanBlock,
      autoPlanDay,
      clearPlanDay,
      exportData,
      importData,
      mergeRemoteData,
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
