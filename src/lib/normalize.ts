/**
 * Storage normalisers.
 *
 * Every collection that reaches localStorage (or arrives from another device)
 * goes through these, so a backup written by an older build — or a payload
 * hand-edited by a curious user — can never put a half-shaped record into
 * React state.
 */
import { uid } from "../hooks/useLocalStorage";
import { normalizePlanBlocks } from "./timebox";
import { HABIT_COLORS, type DayPlan, type FocusSession, type Habit, type JournalEntry, type Task } from "./types";

export function normalizeTask(raw: unknown): Task {
  const t = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const createdAt = typeof t.createdAt === "number" ? t.createdAt : Date.now();
  return {
    id: typeof t.id === "string" ? t.id : uid(),
    title: typeof t.title === "string" && t.title.trim() ? t.title : "Untitled task",
    done: t.done === true,
    priority: t.priority === "high" || t.priority === "low" ? t.priority : "med",
    createdAt,
    completedAt: typeof t.completedAt === "number" ? t.completedAt : null,
    due: typeof t.due === "string" ? t.due : null,
    notes: typeof t.notes === "string" ? t.notes : "",
    estimate: typeof t.estimate === "number" ? t.estimate : 0,
    spent: typeof t.spent === "number" ? t.spent : 0,
    order: typeof t.order === "number" ? t.order : 0,
    remindAt: typeof t.remindAt === "string" ? t.remindAt : null,
    repeat: t.repeat === "daily" || t.repeat === "weekly" ? t.repeat : "none",
    timesDone: typeof t.timesDone === "number" ? t.timesDone : 0,
    subtasks: Array.isArray(t.subtasks) ? (t.subtasks as Task["subtasks"]) : [],
    updatedAt: typeof t.updatedAt === "number" ? t.updatedAt : createdAt,
  };
}

export function normalizeHabit(raw: unknown): Habit {
  const h = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const createdAt = typeof h.createdAt === "number" ? h.createdAt : Date.now();
  const history: Record<string, boolean> = {};
  if (typeof h.history === "object" && h.history !== null) {
    for (const [k, v] of Object.entries(h.history as Record<string, unknown>)) {
      if (v === true) history[k] = true;
    }
  }
  return {
    id: typeof h.id === "string" ? h.id : uid(),
    name: typeof h.name === "string" && h.name.trim() ? h.name : "Habit",
    createdAt,
    color: typeof h.color === "string" ? h.color : HABIT_COLORS[0],
    target: typeof h.target === "number" ? h.target : 7,
    archived: h.archived === true,
    order: typeof h.order === "number" ? h.order : 0,
    history,
    updatedAt: typeof h.updatedAt === "number" ? h.updatedAt : createdAt,
  };
}

export function normalizeSession(raw: unknown): FocusSession {
  const s = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const endedAt = typeof s.endedAt === "number" ? s.endedAt : Date.now();
  return {
    id: typeof s.id === "string" ? s.id : uid(),
    startedAt: typeof s.startedAt === "number" ? s.startedAt : endedAt,
    endedAt,
    durationMs: typeof s.durationMs === "number" ? s.durationMs : 0,
    taskId: typeof s.taskId === "string" ? s.taskId : null,
    completed: s.completed === true,
    tag: typeof s.tag === "string" && s.tag.trim() ? s.tag.trim().replace(/^#/, "") : null,
    updatedAt: typeof s.updatedAt === "number" ? s.updatedAt : endedAt,
  };
}

export function normalizeJournal(raw: unknown): JournalEntry {
  const j = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const createdAt = typeof j.createdAt === "number" ? j.createdAt : Date.now();
  const mood = typeof j.mood === "number" && j.mood >= 1 && j.mood <= 5 ? (j.mood as JournalEntry["mood"]) : null;
  return {
    id: typeof j.id === "string" ? j.id : uid(),
    dateKey: typeof j.dateKey === "string" ? j.dateKey : "",
    mood,
    content: typeof j.content === "string" ? j.content : "",
    createdAt,
    updatedAt: typeof j.updatedAt === "number" ? j.updatedAt : createdAt,
  };
}

export function normalizePlans(raw: unknown): Record<string, DayPlan> {
  if (typeof raw !== "object" || raw === null) return {};
  const out: Record<string, DayPlan> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const day = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
    const blocks = normalizePlanBlocks(day.blocks);
    const clearedAt = typeof day.clearedAt === "number" ? day.clearedAt : 0;
    // Keep a day that was deliberately cleared: dropping it here would let an
    // older remote copy resurrect its blocks on the next merge.
    if (blocks.length === 0 && clearedAt === 0) continue;
    out[key] = {
      dateKey: key,
      blocks,
      updatedAt: typeof day.updatedAt === "number" ? day.updatedAt : Date.now(),
      clearedAt,
    };
  }
  return out;
}
