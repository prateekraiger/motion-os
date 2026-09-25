/**
 * Automated rolling backups.
 *
 * Instead of remembering to export JSON by hand, the app keeps a snapshot of
 * the whole local state once a day (and on demand), pruned to the last
 * `MAX_SNAPSHOTS`. Snapshots are gzip + base64 so seven of them still fit
 * comfortably in localStorage, and they never leave the device unless the user
 * syncs them to their own cloud.
 */
import { compressToBase64, decompressBase64ToText } from "./encoding";

export const MAX_SNAPSHOTS = 7;
const KEY = "motion-os:snapshots:v1";
/** Skip a snapshot when the compressed payload is absurdly large. */
const MAX_SNAPSHOT_BYTES = 1_500_000;

export interface Snapshot {
  id: string;
  /** Epoch ms when the snapshot was taken. */
  at: number;
  /** Human label, e.g. "Today, 08:12". */
  label: string;
  /** gzip + base64 of the exported JSON. */
  data: string;
}

function read(): Snapshot[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is Snapshot =>
        typeof s === "object" && s !== null && typeof (s as Snapshot).id === "string" && typeof (s as Snapshot).data === "string",
    );
  } catch {
    return [];
  }
}

function write(list: Snapshot[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* quota: drop the oldest and try once more */
    try {
      localStorage.setItem(KEY, JSON.stringify(list.slice(-3)));
    } catch {
      /* give up silently — manual export still works */
    }
  }
}

export function listSnapshots(): Snapshot[] {
  return read().sort((a, b) => b.at - a.at);
}

export function latestSnapshot(): Snapshot | null {
  return listSnapshots()[0] ?? null;
}

function labelFor(at: number): string {
  const d = new Date(at);
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
  return sameDay ? `Today, ${time}` : `${d.getDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()]}, ${time}`;
}

/**
 * Store a snapshot of `json`. Returns the stored snapshot, or null when the
 * state has not changed since the last one (or is too big to keep).
 */
export async function saveSnapshot(json: string): Promise<Snapshot | null> {
  const existing = listSnapshots();
  const latest = existing[0];
  if (latest) {
    try {
      if ((await decompressBase64ToText(latest.data)) === json) return null;
    } catch {
      /* fall through and re-snapshot */
    }
  }

  const data = await compressToBase64(json);
  if (data.length > MAX_SNAPSHOT_BYTES) return null;

  const snapshot: Snapshot = {
    id: `snap-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    at: Date.now(),
    label: labelFor(Date.now()),
    data,
  };
  write([snapshot, ...existing].slice(0, MAX_SNAPSHOTS));
  return snapshot;
}

/** Restore the original JSON from a snapshot id. */
export async function restoreSnapshot(id: string): Promise<string | null> {
  const snap = read().find((s) => s.id === id);
  if (!snap) return null;
  try {
    return await decompressBase64ToText(snap.data);
  } catch {
    return null;
  }
}

export function deleteSnapshot(id: string) {
  write(read().filter((s) => s.id !== id));
}

export function clearSnapshots() {
  write([]);
}

/** True when a fresh daily snapshot is due (none today yet). */
export function snapshotDue(): boolean {
  const latest = latestSnapshot();
  if (!latest) return true;
  const d = new Date(latest.at);
  const now = new Date();
  return d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth() || d.getDate() !== now.getDate();
}
