/**
 * Payload-level merge: two devices' states converge into one.
 *
 * This is the composition step used by sync — it takes the local payload and a
 * payload pulled from the user's own cloud and returns a single payload that
 * contains every surviving record from both sides. Because each collection
 * resolves per record with the CRDT merge, the result does not depend on which
 * side is "local", so a phone and a desktop that were both edited offline can
 * be merged in either order and reach the same state.
 */
import { mergeByLww, mergeTombstones, type Tombstones } from "./crdt";
import {
  normalizeHabit,
  normalizeJournal,
  normalizePlans,
  normalizeSession,
  normalizeTask,
} from "./normalize";
import type { DayPlan, FocusSession, Habit, JournalEntry, PlanBlock, Task } from "./types";
import type { SyncPayload, TombstoneSets } from "./sync";

export const EMPTY_TOMBSTONES: TombstoneSets = {
  tasks: {},
  habits: {},
  sessions: {},
  journals: {},
};

const taskClock = (t: Task) => t.updatedAt ?? t.createdAt;
const habitClock = (h: Habit) => h.updatedAt ?? h.createdAt;
const sessionClock = (s: FocusSession) => s.updatedAt ?? s.endedAt;
const journalClock = (j: JournalEntry) => j.updatedAt ?? j.createdAt;
const blockClock = (b: PlanBlock) => b.updatedAt ?? 0;

function mergePlans(local: unknown, remote: unknown): Record<string, DayPlan> {
  const a = normalizePlans(local);
  const b = normalizePlans(remote);
  const out: Record<string, DayPlan> = { ...a };

  for (const [key, remoteDay] of Object.entries(b)) {
    const localDay = a[key];
    if (!localDay) {
      // Nothing local: the remote day is new information.
      out[key] = remoteDay;
      continue;
    }
    // A clear is a write: it discards older remote blocks, but a remote write
    // made after the clear wins.
    const clearedLocally = (localDay.clearedAt ?? 0) > (remoteDay.updatedAt ?? 0);
    out[key] = {
      dateKey: key,
      updatedAt: Math.max(localDay.updatedAt ?? 0, remoteDay.updatedAt ?? 0),
      clearedAt: Math.max(localDay.clearedAt ?? 0, remoteDay.clearedAt ?? 0),
      blocks: clearedLocally ? localDay.blocks : mergeByLww(localDay.blocks, remoteDay.blocks, blockClock),
    };
  }
  return out;
}

function asTombstones(value: unknown): Tombstones {
  if (typeof value !== "object" || value === null) return {};
  const out: Tombstones = {};
  for (const [id, at] of Object.entries(value as Record<string, unknown>)) {
    if (typeof at === "number") out[id] = at;
  }
  return out;
}

/** Merge `remote` into `local`, returning the converged payload. */
export function mergePayloads(local: SyncPayload, remote: SyncPayload): SyncPayload {
  const lDead = local.tombstones ?? EMPTY_TOMBSTONES;
  const rDead = remote.tombstones ?? EMPTY_TOMBSTONES;

  const localTasks = (local.tasks ?? []).map(normalizeTask);
  const remoteTasks = (remote.tasks ?? []).map(normalizeTask);
  const localHabits = (local.habits ?? []).map(normalizeHabit);
  const remoteHabits = (remote.habits ?? []).map(normalizeHabit);
  const localSessions = (local.sessions ?? []).map(normalizeSession);
  const remoteSessions = (remote.sessions ?? []).map(normalizeSession);
  const localJournals = (local.journals ?? []).map(normalizeJournal);
  const remoteJournals = (remote.journals ?? []).map(normalizeJournal);

  const remoteConfigAt = typeof remote.configUpdatedAt === "number" ? remote.configUpdatedAt : 0;
  const localConfigAt = typeof local.configUpdatedAt === "number" ? local.configUpdatedAt : 0;
  const remoteConfigNewer = remoteConfigAt > localConfigAt;

  return {
    v: 2,
    updatedAt: Math.max(local.updatedAt ?? 0, remote.updatedAt ?? 0),
    device: local.device,
    tasks: mergeByLww(localTasks, remoteTasks, taskClock, asTombstones(lDead.tasks), asTombstones(rDead.tasks)),
    habits: mergeByLww(localHabits, remoteHabits, habitClock, asTombstones(lDead.habits), asTombstones(rDead.habits)),
    sessions: mergeByLww(
      localSessions,
      remoteSessions,
      sessionClock,
      asTombstones(lDead.sessions),
      asTombstones(rDead.sessions),
    ),
    journals: mergeByLww(
      localJournals,
      remoteJournals,
      journalClock,
      asTombstones(lDead.journals),
      asTombstones(rDead.journals),
    ),
    plans: mergePlans(local.plans, remote.plans),
    focusConfig: remoteConfigNewer ? remote.focusConfig : local.focusConfig,
    configUpdatedAt: Math.max(localConfigAt, remoteConfigAt),
    tombstones: {
      tasks: mergeTombstones(asTombstones(lDead.tasks), asTombstones(rDead.tasks)),
      habits: mergeTombstones(asTombstones(lDead.habits), asTombstones(rDead.habits)),
      sessions: mergeTombstones(asTombstones(lDead.sessions), asTombstones(rDead.sessions)),
      journals: mergeTombstones(asTombstones(lDead.journals), asTombstones(rDead.journals)),
    },
  };
}
