/**
 * Bring-your-own-cloud sync.
 *
 * Motion OS has no servers, so the "cloud" is a folder the user already owns:
 * a WebDAV endpoint (Nextcloud, ownCloud, a self-hosted box) or a plain
 * encrypted file that can live in iCloud Drive, Google Drive or Dropbox and be
 * moved around with the system file manager.
 *
 * Everything here is transport only. The merge itself lives in `crdt.ts`, and
 * the encryption in `crypto.ts`, so this module never sees plaintext state when
 * `encrypt` is on.
 */
import { decryptEnvelope, encryptString, isEnvelope } from "./crypto";
import { compressToBase64, decompressBase64ToText } from "./encoding";
import type { DayPlan, SyncConfig } from "./types";

export interface TombstoneSets {
  tasks: Record<string, number>;
  habits: Record<string, number>;
  sessions: Record<string, number>;
  journals: Record<string, number>;
}

/** The wire format. Versioned so older payloads can still be read. */
export interface SyncPayload {
  v: 2;
  updatedAt: number;
  device: string;
  tasks: unknown[];
  habits: unknown[];
  sessions: unknown[];
  journals: unknown[];
  plans: Record<string, DayPlan>;
  focusConfig: unknown;
  /** Writer clock for `focusConfig` (last-write-wins across devices). */
  configUpdatedAt: number;
  tombstones: TombstoneSets;
}

export const SYNC_FILE_NAME = "motion-os-sync.motion";

/** A payload with no records — used when the remote side is empty. */
export function emptyPayload(): SyncPayload {
  return {
    v: 2,
    updatedAt: 0,
    device: deviceLabel(),
    tasks: [],
    habits: [],
    sessions: [],
    journals: [],
    plans: {},
    focusConfig: {},
    configUpdatedAt: 0,
    tombstones: { tasks: {}, habits: {}, sessions: {}, journals: {} },
  };
}

export function deviceLabel(): string {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Mac/i.test(ua)) return "mac";
  if (/Windows/i.test(ua)) return "windows";
  if (/Linux/i.test(ua)) return "linux";
  return "web";
}

export function fullUrl(config: SyncConfig): string {
  const base = config.url.replace(/\/+$/, "");
  const path = (config.path || SYNC_FILE_NAME).replace(/^\/+/, "");
  return `${base}/${path}`;
}

/* ------------------------------------------------------------------ */
/* WebDAV transport                                                    */
/* ------------------------------------------------------------------ */

function authHeader(config: SyncConfig): string {
  if (!config.username) return "";
  const raw = `${config.username}:${config.password}`;
  return `Basic ${btoa(unescape(encodeURIComponent(raw)))}`;
}

export interface RemoteInfo {
  exists: boolean;
  lastModified: string | null;
  size: number | null;
}

/** PROPFIND depth 0 — cheap existence + mtime probe. */
export async function webdavInfo(config: SyncConfig): Promise<RemoteInfo> {
  const res = await fetch(fullUrl(config), {
    method: "PROPFIND",
    headers: { Authorization: authHeader(config), Depth: "0" },
  });
  if (res.status === 404) return { exists: false, lastModified: null, size: null };
  if (!res.ok) throw new Error(`WebDAV PROPFIND failed (${res.status})`);
  const text = await res.text();
  const lastModified = /<(?:[a-zA-Z]+:)?getlastmodified>([^<]+)</.exec(text)?.[1] ?? null;
  const sizeMatch = /<(?:[a-zA-Z]+:)?getcontentlength>(\d+)</.exec(text);
  return { exists: true, lastModified, size: sizeMatch ? Number(sizeMatch[1]) : null };
}

/** GET the remote payload as text, or null when it does not exist yet. */
export async function webdavDownload(config: SyncConfig): Promise<string | null> {
  const res = await fetch(fullUrl(config), { headers: { Authorization: authHeader(config) } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`WebDAV GET failed (${res.status})`);
  return res.text();
}

/** PUT the payload, creating the parent collection first when needed. */
export async function webdavUpload(config: SyncConfig, body: string): Promise<void> {
  const res = await fetch(fullUrl(config), {
    method: "PUT",
    headers: {
      Authorization: authHeader(config),
      "Content-Type": "application/octet-stream",
    },
    body,
  });
  if (res.status === 409) {
    // Parent collection missing (Nextcloud needs MKCOL first).
    const parent = fullUrl(config).replace(/\/[^/]*$/, "");
    await fetch(parent, { method: "MKCOL", headers: { Authorization: authHeader(config) } });
    const retry = await fetch(fullUrl(config), {
      method: "PUT",
      headers: { Authorization: authHeader(config), "Content-Type": "application/octet-stream" },
      body,
    });
    if (!retry.ok) throw new Error(`WebDAV PUT failed (${retry.status})`);
    return;
  }
  if (!res.ok) throw new Error(`WebDAV PUT failed (${res.status})`);
}

/* ------------------------------------------------------------------ */
/* Payload codec                                                       */
/* ------------------------------------------------------------------ */

/** Serialise a payload for the wire (optionally gzip + encrypt). */
export async function encodePayload(payload: SyncPayload, config: SyncConfig): Promise<string> {
  const json = JSON.stringify(payload);
  const packed = await compressToBase64(json);
  if (!config.encrypt) return packed;
  const envelope = await encryptString(packed, config.passphrase);
  return JSON.stringify(envelope);
}

export interface DecodedPayload {
  payload: SyncPayload | null;
  /** True when the remote file could not be read as a Motion OS payload. */
  unreadable: boolean;
  /** True when the remote file is encrypted and the passphrase was wrong. */
  wrongPassphrase: boolean;
}

/** Parse a wire payload, decrypting when the remote file is an envelope. */
export async function decodePayload(text: string, config: SyncConfig): Promise<DecodedPayload> {
  let raw = text.trim();
  if (!raw) return { payload: null, unreadable: false, wrongPassphrase: false };

  try {
    const parsed: unknown = JSON.parse(raw);
    if (isEnvelope(parsed)) {
      if (!config.passphrase) return { payload: null, unreadable: false, wrongPassphrase: true };
      try {
        raw = await decryptEnvelope(parsed, config.passphrase);
      } catch {
        return { payload: null, unreadable: false, wrongPassphrase: true };
      }
    }
  } catch {
    // Not JSON at all: might be a gzip blob written by an older build.
  }

  try {
    const json = await decompressBase64ToText(raw);
    const payload = JSON.parse(json) as SyncPayload;
    if (typeof payload !== "object" || payload === null || !("tasks" in payload)) {
      return { payload: null, unreadable: true, wrongPassphrase: false };
    }
    return { payload, unreadable: false, wrongPassphrase: false };
  } catch {
    return { payload: null, unreadable: true, wrongPassphrase: false };
  }
}

/** Quick shape check used before offering "merge this file". */
export function looksLikeMotionFile(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (t.startsWith("{")) {
    try {
      const p = JSON.parse(t) as Record<string, unknown>;
      return isEnvelope(p) || ("tasks" in p && Array.isArray(p.tasks));
    } catch {
      return false;
    }
  }
  // Base64 of a gzip blob or of plain JSON. Require a plausible payload:
  // base64 alphabet only (no spaces, so prose is rejected) and long enough
  // that an empty file cannot pass.
  if (t.length < 64) return false;
  return /^[A-Za-z0-9+/\r\n]+={0,2}$/.test(t);
}
