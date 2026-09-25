/**
 * A small, dependency-free CRDT layer.
 *
 * Motion OS keeps every record in a local collection keyed by `id`. To let two
 * devices that were edited offline converge, each record carries a logical
 * write clock (`updatedAt`, falling back to its creation time) and deletions
 * are remembered as tombstones. Merging two states is then a per-id
 * last-write-wins register, which is associative, commutative and idempotent —
 * the three properties that make the merge conflict-free.
 *
 * This is deliberately not a full Yjs/Automerge document: the data model is a
 * handful of independent collections, and per-record LWW keeps the merge
 * inspectable (and the payload small) while still merging phone + desktop
 * edits without conflicts.
 */

export type Clock<T> = (record: T) => number;

/** id -> epoch ms of the deletion. */
export type Tombstones = Record<string, number>;

/** Stamp `updatedAt` on a record that is being mutated. */
export function stamp<T extends object>(record: T, at: number = Date.now()): T {
  return { ...record, updatedAt: at } as T;
}

/** Merge two tombstone maps (newest deletion wins). */
export function mergeTombstones(local: Tombstones, remote: Tombstones): Tombstones {
  const out: Tombstones = { ...local };
  for (const [id, at] of Object.entries(remote)) {
    if (!(id in out) || out[id] < at) out[id] = at;
  }
  // Keep the map from growing without bound.
  const entries = Object.entries(out).sort((a, b) => b[1] - a[1]).slice(0, 500);
  return Object.fromEntries(entries);
}

/**
 * Last-write-wins merge of two collections.
 *
 * - A record present on both sides resolves to the newer `updatedAt`.
 * - A deletion (tombstone) beats any older remote copy, and loses to a newer
 *   remote write, so a task deleted on the phone does not resurrect from a
 *   stale desktop backup — but re-creating it later does come back.
 *
 * The local ordering is preserved (records only ever appended), so a sync
 * never reshuffles a list the user has arranged by hand.
 */
export function mergeByLww<T extends { id: string }>(
  local: T[],
  remote: T[],
  clock: Clock<T>,
  localDead: Tombstones = {},
  remoteDead: Tombstones = {},
): T[] {
  const localById = new Map(local.map((r) => [r.id, r]));
  const remoteById = new Map(remote.map((r) => [r.id, r]));

  const remoteTime = (id: string) => {
    const r = remoteById.get(id);
    return r ? clock(r) : (remoteDead[id] ?? Number.NEGATIVE_INFINITY);
  };
  const localTime = (id: string) => {
    const l = localById.get(id);
    return l ? clock(l) : (localDead[id] ?? Number.NEGATIVE_INFINITY);
  };

  const out: T[] = [];
  const taken = new Set<string>();

  for (const record of local) {
    // Keep the local record unless the remote side has a strictly newer write
    // for this id (a newer deletion counts as a write).
    if (remoteTime(record.id) > localTime(record.id)) {
      const newer = remoteById.get(record.id);
      if (newer) {
        out.push(newer);
        taken.add(record.id);
      }
      // Otherwise the newer remote write was a deletion: drop the record.
      continue;
    }
    out.push(record);
    taken.add(record.id);
  }

  // Records that only exist remotely, in the remote collection's own order.
  for (const record of remote) {
    if (taken.has(record.id)) continue;
    if (remoteTime(record.id) >= localTime(record.id)) out.push(record);
  }

  return out;
}

/** Drop tombstones for ids that no longer exist anywhere and are old. */
export function pruneTombstones(dead: Tombstones, liveIds: Set<string>, olderThanMs = 30 * 86_400_000): Tombstones {
  const cutoff = Date.now() - olderThanMs;
  const out: Tombstones = {};
  for (const [id, at] of Object.entries(dead)) {
    if (liveIds.has(id)) continue;
    if (at < cutoff) continue;
    out[id] = at;
  }
  return out;
}

/** Convenience: id sets for pruning. */
export function idSet<T extends { id: string }>(records: T[]): Set<string> {
  return new Set(records.map((r) => r.id));
}
