import { useRef, useState } from "react";
import { useSync } from "../hooks/useSync";
import { saveTextFile } from "../lib/download";
import { SYNC_FILE_NAME } from "../lib/sync";
import { haptic } from "../lib/haptics";
import { ActionButton, Label, Segmented, StatusPill, Widget } from "./ui";
import { CloudIcon } from "./icons";
import { cn } from "../utils/cn";

const inputCls =
  "w-full rounded-2xl border border-paper/[0.08] bg-ink px-4 py-3 text-[14px] text-paper outline-none focus:border-paper/60 placeholder:text-dim";

/**
 * Bring-your-own-cloud sync settings.
 *
 * There is no Motion OS server: the payload goes to a WebDAV folder the user
 * owns (Nextcloud, ownCloud, a home box) or to an encrypted file they move
 * themselves through iCloud Drive / Google Drive / Dropbox. Either way it is
 * sealed with AES-GCM on the device first.
 */
export default function SyncPanel() {
  const { sync, save, status, message, remote, ready, testConnection, syncNow, mergeFile, buildSyncFile } = useSync();
  const [fileMsg, setFileMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const statusTone =
    status === "ok" ? "text-paper" : status === "error" ? "text-nred" : status === "working" ? "text-mute" : "text-dim";

  const onSync = async () => {
    haptic("tap");
    await syncNow();
  };

  const downloadSyncFile = async () => {
    const text = await buildSyncFile();
    const outcome = await saveTextFile(text, SYNC_FILE_NAME, "application/octet-stream");
    setFileMsg(
      outcome === "shared"
        ? "Handed the encrypted file to the share sheet."
        : outcome === "downloaded"
          ? "Encrypted file downloaded — drop it in your cloud folder."
          : outcome === "clipboard"
            ? "Encrypted file copied to the clipboard."
            : "Could not save the file here.",
    );
    window.setTimeout(() => setFileMsg(""), 4000);
  };

  return (
    <Widget>
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-nred/40 bg-nred/10 text-nred">
          <CloudIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <Label red>Bring your own cloud</Label>
          <div className="mt-1 text-[11px] leading-relaxed text-dim">
            No Motion OS servers. Your state is sealed on this device and merged across devices with a CRDT, so offline
            edits never conflict.
          </div>
        </div>
      </div>

      <div className="mt-4">
        <Segmented<"webdav" | "file">
          value={sync.provider}
          options={[
            { value: "webdav", label: "WebDAV" },
            { value: "file", label: "File" },
          ]}
          onChange={(provider) => save({ provider })}
        />
      </div>

      {sync.provider === "webdav" ? (
        <div className="mt-4 space-y-3">
          <div>
            <div className="label mb-2">Endpoint URL</div>
            <input
              className={inputCls}
              value={sync.url}
              onChange={(event) => save({ url: event.target.value })}
              placeholder="https://cloud.example.com/remote.php/dav/files/you/"
              inputMode="url"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="label mb-2">User</div>
              <input
                className={inputCls}
                value={sync.username}
                onChange={(event) => save({ username: event.target.value })}
                placeholder="you"
                autoCapitalize="off"
                autoCorrect="off"
              />
            </div>
            <div>
              <div className="label mb-2">App password</div>
              <input
                className={inputCls}
                type="password"
                value={sync.password}
                onChange={(event) => save({ password: event.target.value })}
                placeholder="••••••••"
              />
            </div>
          </div>
          <div>
            <div className="label mb-2">File name</div>
            <input
              className={inputCls}
              value={sync.path}
              onChange={(event) => save({ path: event.target.value })}
              placeholder={SYNC_FILE_NAME}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ActionButton secondary onClick={() => void testConnection()}>
              Test
            </ActionButton>
            <ActionButton onClick={() => void onSync()} disabled={!ready || status === "working"}>
              {status === "working" ? "Syncing…" : "Sync now"}
            </ActionButton>
            <button
              type="button"
              onClick={() => save({ autoSync: !sync.autoSync })}
              className={cn(
                "rounded-full border px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors",
                sync.autoSync ? "border-paper bg-paper text-ink" : "border-paper/[0.12] text-paper hover:bg-paper/[0.06]",
              )}
            >
              Auto-sync {sync.autoSync ? "on" : "off"}
            </button>
          </div>

          {remote && (
            <p className="text-[11px] text-dim">
              {remote.exists
                ? `Payload found${remote.lastModified ? ` · modified ${new Date(remote.lastModified).toLocaleString()}` : ""}`
                : "No payload yet — the first sync creates it."}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-[12px] leading-relaxed text-mute">
            Keep the encrypted file in iCloud Drive, Google Drive or Dropbox and move it with your system file manager.
            Download it after changes, merge it on the other device.
          </p>
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={() => void downloadSyncFile()}>Download encrypted file</ActionButton>
            <ActionButton secondary onClick={() => fileRef.current?.click()}>
              Merge a file
            </ActionButton>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".motion,application/octet-stream,application/json,text/plain"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              const text = await file.text();
              const ok = await mergeFile(text);
              setFileMsg(ok ? "Merged into this device." : "That file could not be merged.");
              window.setTimeout(() => setFileMsg(""), 4000);
            }}
          />
        </div>
      )}

      {/* ENCRYPTION */}
      <div className="mt-5 border-t border-paper/[0.06] pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[14px] text-paper">End-to-end encryption</div>
            <div className="label mt-0.5">AES-GCM 256 · key derived on device</div>
          </div>
          <button
            type="button"
            onClick={() => save({ encrypt: !sync.encrypt })}
            className={cn(
              "rounded-full border px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors",
              sync.encrypt ? "border-paper bg-paper text-ink" : "border-paper/[0.12] text-paper hover:bg-paper/[0.06]",
            )}
          >
            {sync.encrypt ? "On" : "Off"}
          </button>
        </div>
        {sync.encrypt && (
          <div className="mt-3">
            <div className="label mb-2">Passphrase</div>
            <input
              className={inputCls}
              type="password"
              value={sync.passphrase}
              onChange={(event) => save({ passphrase: event.target.value })}
              placeholder="Used to seal the payload"
            />
            <p className="mt-2 text-[11px] leading-relaxed text-dim">
              The passphrase never leaves this device and cannot be recovered. Use the same one on every device.
            </p>
          </div>
        )}
      </div>

      {(message || fileMsg) && (
        <p className={cn("mt-4 text-[12px]", status === "error" ? "text-nred" : "text-mute")} role="status">
          {message || fileMsg}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <StatusPill>{sync.lastSyncAt ? `Last sync ${new Date(sync.lastSyncAt).toLocaleString()}` : "Never synced"}</StatusPill>
        {status !== "idle" && <StatusPill red={status === "error"}>{status}</StatusPill>}
        <span className={cn("text-[11px]", statusTone)}>{ready ? "" : "Add an endpoint and passphrase to sync."}</span>
      </div>
    </Widget>
  );
}
