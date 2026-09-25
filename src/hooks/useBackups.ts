import { useCallback, useEffect, useState } from "react";
import { useStore } from "./useStore";
import { listSnapshots, restoreSnapshot, saveSnapshot, snapshotDue, deleteSnapshot, type Snapshot } from "../lib/backups";

/**
 * Automated rolling backups: one snapshot per day, last seven kept.
 *
 * Snapshots are taken in the background when the app opens (and on demand from
 * Preferences), so there is always something to fall back to without the user
 * having to remember to export.
 */
export function useBackups() {
  const { exportData, importData } = useStore();
  const [snapshots, setSnapshots] = useState<Snapshot[]>(() => listSnapshots());
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => setSnapshots(listSnapshots()), []);

  // Daily snapshot on open.
  useEffect(() => {
    if (!snapshotDue()) return;
    let cancelled = false;
    void saveSnapshot(exportData()).then(() => {
      if (!cancelled) refresh();
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveNow = useCallback(async () => {
    setBusy(true);
    try {
      const snapshot = await saveSnapshot(exportData());
      refresh();
      return snapshot != null;
    } finally {
      setBusy(false);
    }
  }, [exportData, refresh]);

  const restore = useCallback(
    async (id: string) => {
      const json = await restoreSnapshot(id);
      if (!json) return false;
      setBusy(true);
      try {
        const ok = importData(json);
        refresh();
        return ok;
      } finally {
        setBusy(false);
      }
    },
    [importData, refresh],
  );

  const remove = useCallback(
    (id: string) => {
      deleteSnapshot(id);
      refresh();
    },
    [refresh],
  );

  return { snapshots, saveNow, restore, remove, busy, refresh };
}
