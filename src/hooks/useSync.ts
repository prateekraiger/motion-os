import { useCallback, useEffect, useRef, useState } from "react";
import { useSettings } from "./useSettings";
import { useStore } from "./useStore";
import {
  decodePayload,
  emptyPayload,
  encodePayload,
  looksLikeMotionFile,
  webdavDownload,
  webdavInfo,
  webdavUpload,
  type RemoteInfo,
} from "../lib/sync";
import type { SyncConfig } from "../lib/types";

export type SyncStatus = "idle" | "working" | "ok" | "error";

/**
 * Bring-your-own-cloud sync engine.
 *
 * Pull → merge (CRDT) → push. The merge is per record, so a phone edited
 * offline and a desktop edited offline converge without the user choosing a
 * winner. Nothing is ever sent anywhere except the endpoint the user typed in.
 */
export function useSync() {
  const { settings, update } = useSettings();
  const { mergeRemoteData } = useStore();
  const sync = settings.sync;

  const syncRef = useRef(sync);
  syncRef.current = sync;

  const [status, setStatus] = useState<SyncStatus>("idle");
  const [message, setMessage] = useState("");
  const [remote, setRemote] = useState<RemoteInfo | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const save = useCallback(
    (patch: Partial<SyncConfig>) => update({ sync: { ...syncRef.current, ...patch } }),
    [update],
  );

  const fail = useCallback((text: string) => {
    setStatus("error");
    setMessage(text);
    setLastError(text);
  }, []);

  const testConnection = useCallback(async () => {
    const config = syncRef.current;
    if (config.provider !== "webdav") {
      setMessage("File sync uses encrypted files you move yourself — no connection to test.");
      setStatus("idle");
      return;
    }
    if (!config.url.trim()) {
      fail("Add your WebDAV URL first.");
      return;
    }
    setStatus("working");
    setMessage("Checking endpoint…");
    try {
      const info = await webdavInfo(config);
      setRemote(info);
      setStatus("ok");
      setMessage(info.exists ? "Endpoint reachable · payload found." : "Endpoint reachable · no payload yet.");
    } catch (error) {
      setRemote(null);
      fail(error instanceof Error ? error.message : "Could not reach that endpoint.");
    }
  }, [fail]);

  const syncNow = useCallback(async (): Promise<boolean> => {
    const config = syncRef.current;
    if (config.provider === "webdav" && !config.url.trim()) {
      fail("Add your WebDAV URL first.");
      return false;
    }
    setStatus("working");
    setMessage("Syncing…");
    try {
      const remoteText = config.provider === "webdav" ? await webdavDownload(config) : null;
      const decoded = await decodePayload(remoteText ?? "", config);
      if (decoded.wrongPassphrase) {
        fail("Wrong passphrase — the remote payload is encrypted.");
        return false;
      }
      if (decoded.unreadable) {
        fail("That file is not a Motion OS payload.");
        return false;
      }

      // Merge locally first: the returned payload is the converged state.
      const merged = mergeRemoteData(decoded.payload ?? emptyPayload());

      if (config.provider === "webdav") {
        await webdavUpload(config, await encodePayload(merged, config));
        setRemote(await webdavInfo(config).catch(() => null));
      }

      save({ lastSyncAt: Date.now() });
      setStatus("ok");
      setMessage(decoded.payload ? "Merged both devices and uploaded." : "Uploaded to your cloud.");
      setLastError(null);
      return true;
    } catch (error) {
      fail(error instanceof Error ? error.message : "Sync failed.");
      return false;
    }
  }, [fail, mergeRemoteData, save]);

  /** Merge an encrypted (or plain) payload the user picked from a file. */
  const mergeFile = useCallback(
    async (text: string): Promise<boolean> => {
      if (!looksLikeMotionFile(text)) {
        fail("That file does not look like a Motion OS sync file.");
        return false;
      }
      const decoded = await decodePayload(text, syncRef.current);
      if (decoded.wrongPassphrase) {
        fail("Wrong passphrase for this file.");
        return false;
      }
      if (!decoded.payload) {
        fail("Could not read that file.");
        return false;
      }
      mergeRemoteData(decoded.payload);
      setStatus("ok");
      setMessage("Merged the file into this device.");
      setLastError(null);
      return true;
    },
    [fail, mergeRemoteData],
  );

  /** Build the encrypted payload for manual (iCloud / Drive / Dropbox) sync. */
  const buildSyncFile = useCallback(async (): Promise<string> => {
    const config = syncRef.current;
    const merged = mergeRemoteData(emptyPayload());
    return encodePayload(merged, config);
  }, [mergeRemoteData]);

  // Auto-sync: a few seconds after the last local change, when enabled.
  const autoArmed = sync.provider === "webdav" && sync.autoSync && !!sync.url.trim();
  const { tasks, habits, sessions, journals, plans } = useStore();
  const changeKey = `${tasks.length}:${habits.length}:${sessions.length}:${journals.length}:${Object.keys(plans).length}`;
  const changeKeyRef = useRef(changeKey);
  changeKeyRef.current = changeKey;

  useEffect(() => {
    if (!autoArmed) return;
    const id = window.setTimeout(() => {
      void syncNow();
    }, 8000);
    return () => window.clearTimeout(id);
    // Re-arm whenever the local data shape changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoArmed, changeKey]);

  const ready =
    sync.provider === "webdav" ? !!sync.url.trim() && (sync.encrypt ? sync.passphrase.length > 0 : true) : true;

  return {
    sync,
    save,
    status,
    message,
    remote,
    lastError,
    ready,
    testConnection,
    syncNow,
    mergeFile,
    buildSyncFile,
  };
}
