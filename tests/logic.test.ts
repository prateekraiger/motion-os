import assert from "node:assert/strict";
import { mergeByLww, mergeTombstones, stamp } from "../src/lib/crdt";
import { mergePayloads, EMPTY_TOMBSTONES } from "../src/lib/merge";
import { emptyPayload, encodePayload, decodePayload, fullUrl, looksLikeMotionFile } from "../src/lib/sync";
import { compressToBase64, decompressBase64ToText } from "../src/lib/encoding";
import { computeWeeksGrid } from "../src/components/WeeksGrid";
import { autoSchedule, findFreeSlot, plannedMinutes, snapToSlot, fmtMinute } from "../src/lib/timebox";
import { focusHeatmap, tagTotals, dailyStats } from "../src/lib/productivity";
import type { Task, FocusSession } from "../src/lib/types";

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log("  ok -", name);
}

/** Async variant of `check`, awaited before the suite finishes. */
async function checkAsync(name: string, fn: () => Promise<void>) {
  await fn();
  passed += 1;
  console.log("  ok -", name);
}

/* ------------------------------- CRDT ------------------------------- */
check("LWW keeps the newer record", () => {
  const a: Task = { id: "t1", title: "old", done: false, priority: "med", createdAt: 1, completedAt: null, due: null, notes: "", estimate: 0, spent: 0, order: 0, remindAt: null, repeat: "none", timesDone: 0, subtasks: [], updatedAt: 100 };
  const b: Task = { ...a, title: "new", updatedAt: 200 };
  const merged = mergeByLww([a], [b], (t) => t.updatedAt ?? t.createdAt);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].title, "new");
});

check("LWW is order independent", () => {
  const a: Task = { id: "t1", title: "a", done: false, priority: "med", createdAt: 1, completedAt: null, due: null, notes: "", estimate: 0, spent: 0, order: 0, remindAt: null, repeat: "none", timesDone: 0, subtasks: [], updatedAt: 100 };
  const b: Task = { ...a, title: "b", updatedAt: 300 };
  const clock = (t: Task) => t.updatedAt ?? t.createdAt;
  const one = mergeByLww([a], [b], clock).map((t) => t.title);
  const two = mergeByLww([b], [a], clock).map((t) => t.title);
  assert.deepEqual(one, two);
});

check("a local deletion beats a stale remote copy but loses to a newer write", () => {
  const local: Task[] = [];
  const remote: Task[] = [
    { id: "t1", title: "from cloud", done: false, priority: "med", createdAt: 1, completedAt: null, due: null, notes: "", estimate: 0, spent: 0, order: 0, remindAt: null, repeat: "none", timesDone: 0, subtasks: [], updatedAt: 100 },
  ];
  const clock = (t: Task) => t.updatedAt ?? t.createdAt;
  const deleted = mergeByLww(local, remote, clock, { t1: 500 }, {});
  assert.equal(deleted.length, 0);
  const resurrected = mergeByLww(local, [{ ...remote[0], updatedAt: 900 }], clock, { t1: 500 }, {});
  assert.equal(resurrected.length, 1);
});

check("merging keeps local ordering", () => {
  const mk = (id: string, order: number, updatedAt: number): Task => ({ id, title: id, done: false, priority: "med", createdAt: 1, completedAt: null, due: null, notes: "", estimate: 0, spent: 0, order, remindAt: null, repeat: "none", timesDone: 0, subtasks: [], updatedAt });
  const local = [mk("a", 0, 10), mk("b", 1, 10)];
  const remote = [mk("c", 2, 10)];
  const merged = mergeByLww(local, remote, (t) => t.updatedAt ?? t.createdAt);
  assert.deepEqual(merged.map((t) => t.id), ["a", "b", "c"]);
});

check("tombstones merge to the newest deletion", () => {
  const merged = mergeTombstones({ a: 10 }, { a: 20, b: 5 });
  assert.equal(merged.a, 20);
  assert.equal(merged.b, 5);
});

/* ---------------------------- Payload merge -------------------------- */
check("payload merge unions both devices", () => {
  const base = emptyPayload();
  const local = { ...base, tasks: [{ id: "t1", title: "phone", updatedAt: 50 }] };
  const remote = { ...base, tasks: [{ id: "t2", title: "desktop", updatedAt: 60 }] };
  const merged = mergePayloads(local, remote);
  assert.equal(merged.tasks.length, 2);
});

check("payload merge resolves the same record by clock", () => {
  const base = emptyPayload();
  const merged = mergePayloads(
    { ...base, tasks: [{ id: "t1", title: "phone", updatedAt: 10 }] },
    { ...base, tasks: [{ id: "t1", title: "desktop", updatedAt: 20 }] },
  );
  assert.equal(merged.tasks.length, 1);
  assert.equal((merged.tasks[0] as { title: string }).title, "desktop");
});

check("payload merge is commutative for survivors", () => {
  const base = emptyPayload();
  const a = { ...base, tasks: [{ id: "t1", title: "a", updatedAt: 1 }, { id: "t2", title: "a2", updatedAt: 5 }] };
  const b = { ...base, tasks: [{ id: "t2", title: "b2", updatedAt: 9 }, { id: "t3", title: "b3", updatedAt: 2 }] };
  const one = mergePayloads(a, b).tasks.map((t) => `${(t as { id: string }).id}:${(t as { title: string }).title}`).sort();
  const two = mergePayloads(b, a).tasks.map((t) => `${(t as { id: string }).id}:${(t as { title: string }).title}`).sort();
  assert.deepEqual(one, two);
  assert.equal(one.length, 3);
});

check("deletions propagate through the payload", () => {
  const base = emptyPayload();
  const local = { ...base, tasks: [], tombstones: { ...EMPTY_TOMBSTONES, tasks: { t1: 500 } } };
  const remote = { ...base, tasks: [{ id: "t1", title: "stale", updatedAt: 100 }] };
  const merged = mergePayloads(local, remote);
  assert.equal(merged.tasks.length, 0);
  assert.equal(merged.tombstones.tasks.t1, 500);
});

check("a cleared plan day does not resurrect", () => {
  const base = emptyPayload();
  const block = { id: "b1", taskId: "t1", title: "old block", startMin: 600, durationMin: 60, done: false, updatedAt: 100 };
  const local = {
    ...base,
    plans: { "2026-09-25": { dateKey: "2026-09-25", blocks: [], updatedAt: 500, clearedAt: 500 } },
  };
  const remote = {
    ...base,
    plans: { "2026-09-25": { dateKey: "2026-09-25", blocks: [block], updatedAt: 100 } },
  };
  const merged = mergePayloads(local, remote);
  assert.equal(merged.plans["2026-09-25"].blocks.length, 0);

  // ...but a newer remote write after the clear does come back.
  const mergedAfter = mergePayloads(local, {
    ...base,
    plans: { "2026-09-25": { dateKey: "2026-09-25", blocks: [{ ...block, updatedAt: 900 }], updatedAt: 900 } },
  });
  assert.equal(mergedAfter.plans["2026-09-25"].blocks.length, 1);
});

/* ----------------------------- Encoding ----------------------------- */
await checkAsync("gzip round-trips JSON", async () => {
  const json = JSON.stringify({ hello: "world", n: 42 });
  const packed = await compressToBase64(json);
  assert.equal(await decompressBase64ToText(packed), json);
});

/* ------------------------------- Crypto ----------------------------- */
const config = { provider: "webdav" as const, url: "https://cloud.example.com/dav/", username: "u", password: "p", path: "motion-os-sync.motion", encrypt: true, passphrase: "correct horse battery staple", lastSyncAt: null, autoSync: false };

await checkAsync("encrypted payload hides the plaintext and needs the passphrase", async () => {
  const payload = { ...emptyPayload(), tasks: [{ id: "t1", title: "secret task" }] };
  const wire = await encodePayload(payload, config);
  assert.ok(!wire.includes("secret task"));

  const good = await decodePayload(wire, config);
  assert.ok(good.payload);
  assert.equal((good.payload.tasks[0] as { title: string }).title, "secret task");

  const bad = await decodePayload(wire, { ...config, passphrase: "wrong" });
  assert.equal(bad.wrongPassphrase, true);
  assert.equal(bad.payload, null);
});

await checkAsync("unencrypted payloads round-trip too", async () => {
  const payload = { ...emptyPayload(), tasks: [{ id: "t1", title: "plain" }] };
  const wire = await encodePayload(payload, { ...config, encrypt: false });
  const decoded = await decodePayload(wire, { ...config, encrypt: false });
  assert.equal((decoded.payload!.tasks[0] as { title: string }).title, "plain");
});

check("fullUrl joins endpoint and file name", () => {
  assert.equal(fullUrl(config), "https://cloud.example.com/dav/motion-os-sync.motion");
  assert.equal(fullUrl({ ...config, url: "https://x.test/dav" }), "https://x.test/dav/motion-os-sync.motion");
});

await checkAsync("looksLikeMotionFile accepts envelopes and rejects junk", async () => {
  const payload = { ...emptyPayload(), tasks: [] };
  const wire = await encodePayload(payload, config);
  assert.equal(looksLikeMotionFile(wire), true);
  assert.equal(looksLikeMotionFile(JSON.stringify({ version: 1, tasks: [] })), true);
  assert.equal(looksLikeMotionFile("just some notes"), false);
});

/* ---------------------------- Weeks grid ---------------------------- */
check("4,000 weeks grid counts lived and remaining", () => {
  const birth = new Date(1990, 0, 1);
  const now = new Date(birth.getFullYear() + 30, 0, 1);
  const grid = computeWeeksGrid(birth, now, 80);
  assert.equal(grid.totalWeeks, 80 * 52);
  const days = Math.floor((now.getTime() - birth.getTime()) / 86_400_000);
  const expectedWeeks = Math.floor(days / 7);
  assert.equal(grid.weeksLived, expectedWeeks);
  assert.equal(grid.weeksRemaining, grid.totalWeeks - grid.weeksLived);
  assert.equal(grid.columns.length, 80);
  assert.equal(grid.columns[0].cells.filter(Boolean).length, 52);
});

/* ------------------------------ Planner ----------------------------- */
check("snapToSlot keeps blocks on the 30-minute grid", () => {
  assert.equal(snapToSlot(9 * 60 + 10), 9 * 60);
  assert.equal(snapToSlot(9 * 60 + 55), 10 * 60);
  assert.equal(snapToSlot(9 * 60 + 40), 9 * 60 + 30);
  assert.equal(snapToSlot(3 * 60), 6 * 60); // clamped to the timeline start
});

check("findFreeSlot skips busy time", () => {
  const blocks = [{ id: "b", taskId: null, title: "t", startMin: 6 * 60, durationMin: 120, done: false }];
  assert.equal(findFreeSlot(blocks, 60), 8 * 60);
  assert.equal(findFreeSlot([], 60), 6 * 60);
});

check("autoSchedule places prioritised tasks in free time", () => {
  const placed = autoSchedule(
    [
      { id: "1", title: "low", priority: "low" as const },
      { id: "2", title: "high", priority: "high" as const },
    ],
    [],
    60,
  );
  assert.equal(placed.length, 2);
  assert.equal(placed[0].title, "high");
  assert.equal(placed[0].startMin, 6 * 60);
  assert.equal(placed[1].startMin, 7 * 60);
});

check("plannedMinutes never double counts overlaps", () => {
  const blocks = [
    { id: "a", taskId: null, title: "a", startMin: 600, durationMin: 60, done: false },
    { id: "b", taskId: null, title: "b", startMin: 630, durationMin: 60, done: false },
  ];
  assert.equal(plannedMinutes(blocks), 90);
});

check("fmtMinute honours 12/24 hour preference", () => {
  assert.equal(fmtMinute(570, true), "09:30");
  assert.equal(fmtMinute(570, false), "9:30 AM");
  assert.equal(fmtMinute(13 * 60 + 5, false), "1:05 PM");
});

/* ------------------------------ Heatmap ----------------------------- */
check("heatmap covers a year of weeks with intensity levels", () => {
  const sessions: FocusSession[] = [];
  const today = new Date();
  for (let i = 0; i < 400; i += 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    sessions.push({ id: `s${i}`, startedAt: d.getTime(), endedAt: d.getTime() + 25 * 60000, durationMs: (i % 5) * 600000, taskId: null, completed: true, tag: i % 2 ? "DeepWork" : "Admin" });
  }
  const map = focusHeatmap(sessions, 53, today);
  assert.equal(map.weeks.length, 53);
  assert.equal(map.weeks[0].length, 7);
  assert.ok(map.max > 0);
  assert.ok(map.weeks.flat().some((c) => c.level === 4));

  const tagged = focusHeatmap(sessions, 53, today, "deepwork");
  assert.ok(tagged.totalMs < map.totalMs);

  const totals = tagTotals(sessions);
  assert.deepEqual(totals.map((t) => t.tag).sort(), ["Admin", "DeepWork"]);
  assert.equal(totals.reduce((n, t) => n + t.sessions, 0), 400);
});

check("dailyStats returns the requested window", () => {
  const now = new Date();
  const days = dailyStats([], [], 7, now);
  assert.equal(days.length, 7);
  assert.equal(days[6].isToday, true);
});

/* ------------------------------- stamp ------------------------------ */
check("stamp sets updatedAt without mutating", () => {
  const original = { id: "x", n: 1 };
  const stamped = stamp(original, 1234);
  assert.equal((original as { updatedAt?: number }).updatedAt, undefined);
  assert.equal((stamped as { updatedAt?: number }).updatedAt, 1234);
});

console.log(`\n${passed} checks passed`);
