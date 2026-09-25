/**
 * Day planner (timeboxing) helpers.
 *
 * The planner is a plain list of blocks positioned on a 30-minute grid. It is
 * intentionally simple: a block is a title, a start minute and a duration, so
 * dragging a task into the timeline is a data change, not a scheduling engine.
 */
import { PLAN_END_HOUR, PLAN_SLOT_MIN, PLAN_START_HOUR, type DayPlan, type PlanBlock } from "./types";

/** Minutes from midnight for the first rendered slot. */
export const PLAN_OPEN_MIN = PLAN_START_HOUR * 60;
/** Minutes from midnight for the end of the rendered timeline. */
export const PLAN_CLOSE_MIN = PLAN_END_HOUR * 60;
/** Number of slots in the rendered timeline. */
export const PLAN_SLOTS = (PLAN_CLOSE_MIN - PLAN_OPEN_MIN) / PLAN_SLOT_MIN;

export function emptyPlan(dateKey: string): DayPlan {
  return { dateKey, blocks: [], updatedAt: Date.now() };
}

export function planFor(dateKey: string, plans: Record<string, DayPlan>): DayPlan {
  return plans[dateKey] ?? emptyPlan(dateKey);
}

/** "570" -> "09:30" (24 h) or "9:30 AM". */
export function fmtMinute(min: number, h24 = true): string {
  const clamped = ((Math.round(min) % 1440) + 1440) % 1440;
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  if (h24) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export interface Slot {
  startMin: number;
  label: string;
}

/** Timeline slots, e.g. 06:00, 06:30 … 23:30. */
export function timelineSlots(h24 = true): Slot[] {
  return Array.from({ length: PLAN_SLOTS }, (_, i) => {
    const startMin = PLAN_OPEN_MIN + i * PLAN_SLOT_MIN;
    return { startMin, label: fmtMinute(startMin, h24) };
  });
}

export function snapToSlot(minute: number): number {
  const offset = minute - PLAN_OPEN_MIN;
  const snapped = Math.round(offset / PLAN_SLOT_MIN) * PLAN_SLOT_MIN + PLAN_OPEN_MIN;
  return Math.max(PLAN_OPEN_MIN, Math.min(PLAN_CLOSE_MIN - PLAN_SLOT_MIN, snapped));
}

export function blockEnd(block: PlanBlock): number {
  return block.startMin + block.durationMin;
}

export function blocksOverlap(a: PlanBlock, b: PlanBlock): boolean {
  return a.startMin < blockEnd(b) && b.startMin < blockEnd(a);
}

/** Total planned minutes (overlaps counted once, so it never exceeds the day). */
export function plannedMinutes(blocks: PlanBlock[]): number {
  const ranges = [...blocks].sort((a, b) => a.startMin - b.startMin);
  let total = 0;
  let cursor = -Infinity;
  for (const b of ranges) {
    const start = Math.max(b.startMin, cursor);
    if (blockEnd(b) > start) total += blockEnd(b) - start;
    cursor = Math.max(cursor, blockEnd(b));
  }
  return total;
}

/** First free run of `durationMin` that fits the existing blocks. */
export function findFreeSlot(blocks: PlanBlock[], durationMin: number): number | null {
  const sorted = [...blocks].sort((a, b) => a.startMin - b.startMin);
  let candidate = PLAN_OPEN_MIN;
  for (const b of sorted) {
    if (blockEnd(b) <= candidate) continue;
    if (b.startMin - candidate >= durationMin) return candidate;
    candidate = Math.max(candidate, blockEnd(b));
  }
  return PLAN_CLOSE_MIN - candidate >= durationMin ? candidate : null;
}

/**
 * Fill the day's free time with the given tasks, highest priority first.
 * Returns new blocks (the caller persists them); existing blocks are kept.
 */
export function autoSchedule(
  tasks: { id: string; title: string; priority: "low" | "med" | "high" }[],
  blocks: PlanBlock[],
  blockMin = PLAN_SLOT_MIN * 2,
  maxBlocks = 6,
): PlanBlock[] {
  const rank = { high: 0, med: 1, low: 2 } as const;
  const queue = [...tasks].sort((a, b) => rank[a.priority] - rank[b.priority]);
  const placed: PlanBlock[] = [];
  let working = [...blocks];
  for (const task of queue) {
    if (placed.length >= maxBlocks) break;
    const slot = findFreeSlot(working, blockMin);
    if (slot == null) break;
    const block: PlanBlock = {
      id: `plan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      taskId: task.id,
      title: task.title,
      startMin: slot,
      durationMin: blockMin,
      done: false,
      updatedAt: Date.now(),
    };
    placed.push(block);
    working = [...working, block];
  }
  return placed;
}

/** Normalise blocks loaded from storage or a merged remote payload. */
export function normalizePlanBlocks(raw: unknown): PlanBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item): PlanBlock[] => {
    if (typeof item !== "object" || item === null) return [];
    const b = item as Record<string, unknown>;
    const startMin = typeof b.startMin === "number" ? b.startMin : PLAN_OPEN_MIN;
    const durationMin = typeof b.durationMin === "number" && b.durationMin > 0 ? b.durationMin : PLAN_SLOT_MIN;
    return [
      {
        id: typeof b.id === "string" ? b.id : `plan-${Math.random().toString(36).slice(2, 8)}`,
        taskId: typeof b.taskId === "string" ? b.taskId : null,
        title: typeof b.title === "string" && b.title.trim() ? b.title : "Block",
        startMin: Math.max(PLAN_OPEN_MIN, Math.min(PLAN_CLOSE_MIN - PLAN_SLOT_MIN, startMin)),
        durationMin,
        done: b.done === true,
        updatedAt: typeof b.updatedAt === "number" ? b.updatedAt : Date.now(),
      },
    ];
  });
}

/** Fraction of the planned day that is already complete. */
export function planProgress(blocks: PlanBlock[]): number {
  const total = blocks.reduce((n, b) => n + b.durationMin, 0);
  if (total === 0) return 0;
  const done = blocks.filter((b) => b.done).reduce((n, b) => n + b.durationMin, 0);
  return done / total;
}
