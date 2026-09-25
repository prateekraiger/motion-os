import { useEffect, useRef, useState } from "react";
import { useSettings, type AppTheme, type YearView } from "../hooks/useSettings";
import { useStore } from "../hooks/useStore";
import { useBackups } from "../hooks/useBackups";
import { webNotificationState, webNotificationsSupported, type NotifState } from "../hooks/useReminders";
import { parseLocal, toDateInput, toTimeInput } from "../lib/time";
import type { FocusConfig } from "../lib/types";
import {
  calendarPermission,
  requestCalendarPermission,
  type CalendarPermission,
} from "../lib/calendar";
import {
  notificationPermission,
  requestNotificationPermission,
  type NotificationPermission,
} from "../lib/notifications";
import { hapticsSupported } from "../lib/haptics";
import { MAX_SNAPSHOTS } from "../lib/backups";
import { Widget, Label, Toggle, Segmented, PageIntro, StatusPill, IconButton, ActionButton } from "./ui";
import SyncPanel from "./SyncPanel";
import { BackupIcon, TrashIcon } from "./icons";
import { cn } from "../utils/cn";

function Row({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-paper/[0.06] py-4 last:border-0">
      <div className="min-w-0">
        <div className="text-[14px] text-paper">{title}</div>
        {sub && <div className="mt-0.5 text-[11px] leading-relaxed text-dim">{sub}</div>}
      </div>
      {children}
    </div>
  );
}

function Stepper({
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <IconButton
        aria-label="Decrease"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - step))}
        className="border border-paper/[0.1]"
      >
        <span className="text-lg leading-none">−</span>
      </IconButton>
      <span className="font-dot tnum w-14 text-center text-[20px] text-paper">
        {value}
        {suffix}
      </span>
      <IconButton
        aria-label="Increase"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + step))}
        className="border border-paper/[0.1]"
      >
        <span className="text-lg leading-none">+</span>
      </IconButton>
    </div>
  );
}

const inputCls =
  "w-full rounded-2xl border border-paper/[0.08] bg-ink px-4 py-3 text-[15px] text-paper outline-none focus:border-paper/60 placeholder:text-dim";

export default function SettingsModule({ onResetDone }: { onResetDone?: () => void }) {
  const { settings, birthDate, update, reset } = useSettings();
  const { focusConfig, updateFocusConfig, exportData, importData, clearAllData } = useStore();
  const [notifState, setNotifState] = useState<NotifState>(() => webNotificationState());
  const [date, setDate] = useState(birthDate ? toDateInput(birthDate) : "");
  const [time, setTime] = useState(birthDate ? toTimeInput(birthDate) : "00:00");
  const [name, setName] = useState(settings.name);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [exportMsg, setExportMsg] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [calendarState, setCalendarState] = useState<CalendarPermission>("prompt");
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("prompt");
  const [backupMsg, setBackupMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const backups = useBackups();

  // Both permission helpers are async: resolve them after the first paint.
  useEffect(() => {
    void calendarPermission().then(setCalendarState);
    void notificationPermission().then(setNotifPermission);
  }, []);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 1500);
    return () => clearTimeout(t);
  }, [saved]);

  const parsed = parseLocal(date, time);
  const valid = !!parsed && parsed.getTime() <= Date.now();
  const dirty = Boolean(
    name !== settings.name ||
      (parsed && birthDate && parsed.getTime() !== birthDate.getTime()) ||
      (parsed && !birthDate),
  );

  const save = () => {
    if (!valid || !parsed) return;
    update({ birth: parsed.toISOString(), name: name.trim() });
    setSaved(true);
  };

  const setFocus = (patch: Partial<FocusConfig>) => updateFocusConfig(patch);

  const doExport = async () => {
    const json = exportData();
    try {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `motion-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* download unavailable */
    }
    try {
      await navigator.clipboard.writeText(json);
      setExportMsg("Backup downloaded and copied to clipboard.");
    } catch {
      setExportMsg("Backup downloaded.");
    }
    setTimeout(() => setExportMsg(""), 2500);
  };

  const doImport = (text: string) => {
    const ok = importData(text);
    setImportMsg(ok ? "Data restored." : "Could not read that backup.");
    if (ok) {
      setImportText("");
      setImportOpen(false);
    }
    setTimeout(() => setImportMsg(null), 2500);
  };

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => doImport(String(reader.result ?? ""));
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col gap-3 animate-fade-up">
      <PageIntro
        eyebrow="Preferences"
        title="Make it yours"
        description="Tune how Motion OS counts, focuses, and looks. Everything is saved locally on this device."
      >
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusPill>Stored locally</StatusPill>
          <StatusPill>No account needed</StatusPill>
        </div>
      </PageIntro>

      {/* PROFILE */}
      <Widget className="pt-6">
        <Label red>Profile</Label>
        <div className="mt-4 space-y-3">
          <div>
            <div className="label mb-2">Name (optional)</div>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={24} />
          </div>
          <div className="grid grid-cols-[1.4fr_1fr] gap-3">
            <div>
              <div className="label mb-2">Date of birth</div>
              <input className={inputCls} type="date" value={date} max={toDateInput(new Date())} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <div className="label mb-2">Time</div>
              <input className={inputCls} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          {!valid && date && <div className="text-[11px] text-nred">Enter a valid date in the past.</div>}
          <button
            type="button"
            onClick={save}
            disabled={!valid || !dirty}
            className={cn(
              "mt-1 w-full rounded-full py-3.5 text-[11px] font-semibold uppercase tracking-[0.2em] transition-all",
              saved ? "bg-paper text-ink" : valid && dirty ? "bg-paper text-ink active:scale-[0.98]" : "bg-card-2 text-dim",
            )}
          >
            {saved ? "Saved ●" : "Save changes"}
          </button>
        </div>
      </Widget>

      {/* FOCUS TIMER */}
      <Widget>
        <Label red>Focus timer</Label>
        <div className="mt-1">
          <Row title="Focus length" sub="Length of one deep-work block">
            <Stepper value={focusConfig.workMin} min={5} max={90} step={5} suffix="m" onChange={(v) => setFocus({ workMin: v })} />
          </Row>
          <Row title="Short break">
            <Stepper value={focusConfig.shortBreakMin} min={1} max={30} suffix="m" onChange={(v) => setFocus({ shortBreakMin: v })} />
          </Row>
          <Row title="Long break">
            <Stepper value={focusConfig.longBreakMin} min={5} max={45} step={5} suffix="m" onChange={(v) => setFocus({ longBreakMin: v })} />
          </Row>
          <Row title="Blocks per long break" sub="Focus rounds before a long break">
            <Stepper value={focusConfig.roundsBeforeLongBreak} min={2} max={8} onChange={(v) => setFocus({ roundsBeforeLongBreak: v })} />
          </Row>
          <Row title="Auto-start breaks" sub="Begin the break as soon as a block ends">
            <Toggle checked={focusConfig.autoStartBreaks} onChange={(v) => setFocus({ autoStartBreaks: v })} label="Auto-start breaks" />
          </Row>
          <Row title="Auto-start focus" sub="Begin the next block after a break">
            <Toggle checked={focusConfig.autoStartWork} onChange={(v) => setFocus({ autoStartWork: v })} label="Auto-start focus" />
          </Row>
          <Row title="Chime on finish" sub="Play a soft tone when a block completes">
            <Toggle checked={focusConfig.sound} onChange={(v) => setFocus({ sound: v })} label="Chime on finish" />
          </Row>
        </div>
      </Widget>

      {/* REMINDERS & NOTIFICATIONS */}
      <Widget>
        <Label>Reminders & notifications</Label>
        <div className="mt-1">
          <Row
            title="In-app reminder banners"
            sub="Shown at the top of the app when a task reminder is due"
          >
            <StatusPill>Always on</StatusPill>
          </Row>
          <Row
            title="Browser notifications"
            sub="Also alert you when Motion OS isn't the focused window (when supported)"
          >
            {notifState === "granted" ? (
              <StatusPill>On</StatusPill>
            ) : notifState === "denied" ? (
              <span className="text-[11px] text-dim">Blocked by browser</span>
            ) : notifState === "unsupported" ? (
              <span className="text-[11px] text-dim">Not supported here</span>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  if (!webNotificationsSupported()) return;
                  try {
                    await Notification.requestPermission();
                  } catch {
                    /* permission request unavailable */
                  }
                  setNotifState(webNotificationState());
                }}
                className="rounded-full border border-paper/[0.12] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-paper hover:bg-paper/[0.06]"
              >
                Enable
              </button>
            )}
          </Row>
        </div>
      </Widget>

      {/* MOTION */}
      <Widget>
        <Label>Display</Label>
        <div className="mt-1">
          <Row title="Theme" sub="Follow your system, or force dark or light">
            <Segmented<AppTheme>
              value={settings.theme}
              options={[
                { value: "system", label: "Auto" },
                { value: "dark", label: "Dark" },
                { value: "light", label: "Light" },
              ]}
              onChange={(v) => update({ theme: v })}
            />
          </Row>
          <Row title="Show milliseconds" sub="60 fps counter in the Life clock">
            <Toggle checked={settings.showMs} onChange={(v) => update({ showMs: v })} label="Show milliseconds" />
          </Row>
          <Row title="Motion blur" sub="Subtle blur on the fastest digits">
            <Toggle checked={settings.motionBlur} onChange={(v) => update({ motionBlur: v })} label="Motion blur" />
          </Row>
          <Row title="24-hour clock">
            <Toggle checked={settings.h24} onChange={(v) => update({ h24: v })} label="24-hour clock" />
          </Row>
          <Row title="Year view">
            <Segmented<YearView>
              value={settings.yearView}
              options={[
                { value: "dots", label: "Dots" },
                { value: "bar", label: "Bar" },
              ]}
              onChange={(v) => update({ yearView: v })}
            />
          </Row>
        </div>
      </Widget>

      {/* LIFE HORIZON */}
      <Widget>
        <Label>Life horizon</Label>
        <div className="py-4">
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-dim">Dots shown in the “Life in years” grid</div>
            <span className="font-dot tnum text-2xl text-paper">{settings.lifeExpectancy}</span>
          </div>
          <input
            type="range"
            min={50}
            max={120}
            step={1}
            value={settings.lifeExpectancy}
            onChange={(e) => update({ lifeExpectancy: Number(e.target.value) })}
            className="mt-4 w-full accent-paper"
          />
          <div className="mt-1 flex justify-between">
            <span className="label">50</span>
            <span className="label">120</span>
          </div>
        </div>
      </Widget>

      {/* DATA */}
      <Widget>
        <Label>Data</Label>
        <div className="mt-1">
          <Row title="Back up data" sub="Download tasks, habits and focus history as JSON">
            <button
              type="button"
              onClick={doExport}
              className="rounded-full border border-paper/[0.12] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-paper hover:bg-paper/[0.06]"
            >
              Export
            </button>
          </Row>
          <Row title="Restore data" sub="Load a backup file or paste JSON">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-full border border-paper/[0.12] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-paper hover:bg-paper/[0.06]"
              >
                File
              </button>
              <button
                type="button"
                onClick={() => setImportOpen((v) => !v)}
                className="rounded-full border border-paper/[0.12] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-paper hover:bg-paper/[0.06]"
              >
                Paste
              </button>
            </div>
          </Row>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
        {importOpen && (
          <div className="mt-3">
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste backup JSON here…"
              rows={4}
              className={cn(inputCls, "resize-none font-mono text-[12px]")}
            />
            <button
              type="button"
              onClick={() => doImport(importText)}
              disabled={!importText.trim()}
              className="mt-2 w-full rounded-full bg-paper py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink disabled:bg-card-2 disabled:text-dim"
            >
              Import
            </button>
          </div>
        )}
        {(exportMsg || importMsg) && (
          <p className="mt-3 text-[11px] text-mute" role="status">
            {exportMsg || importMsg}
          </p>
        )}
      </Widget>

      {/* SYNC & BACKUPS */}
      <Widget>
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-paper/[0.08] bg-ink text-mute">
            <BackupIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <Label>Rolling backups</Label>
            <div className="mt-1 text-[11px] leading-relaxed text-dim">
              A snapshot is taken automatically once a day and the last {MAX_SNAPSHOTS} are kept on this device.
              Nothing is uploaded anywhere.
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <ActionButton secondary onClick={() => void backups.saveNow().then((created) => {
            setBackupMsg(created ? "Snapshot saved." : "Nothing changed since the last snapshot.");
            window.setTimeout(() => setBackupMsg(""), 2500);
          })}>
            Save snapshot now
          </ActionButton>
        </div>
        <div className="mt-3">
          {backups.snapshots.length === 0 ? (
            <p className="text-[12px] text-dim">No snapshots yet — the first one is taken when you open the app.</p>
          ) : (
            backups.snapshots.map((snapshot) => (
              <div
                key={snapshot.id}
                className="flex items-center justify-between gap-3 border-b border-paper/[0.05] py-2.5 last:border-0"
              >
                <div className="min-w-0">
                  <div className="text-[13px] text-paper">{snapshot.label}</div>
                  <div className="label">{new Date(snapshot.at).toLocaleString()}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void backups.restore(snapshot.id).then((ok) => {
                      setBackupMsg(ok ? "Snapshot restored." : "Could not read that snapshot.");
                      window.setTimeout(() => setBackupMsg(""), 2500);
                    })}
                    className="rounded-full border border-paper/[0.12] px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-paper hover:bg-paper/[0.06]"
                  >
                    Restore
                  </button>
                  <IconButton
                    tone="danger"
                    aria-label="Delete snapshot"
                    onClick={() => backups.remove(snapshot.id)}
                    className="h-8 w-8"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </IconButton>
                </div>
              </div>
            ))
          )}
        </div>
        {backupMsg && (
          <p className="mt-3 text-[11px] text-mute" role="status">
            {backupMsg}
          </p>
        )}
      </Widget>

      <SyncPanel />

      {/* CALENDAR, NOTIFICATIONS & HAPTICS */}
      <Widget>
        <Label>Calendar, alerts & feel</Label>
        <div className="mt-1">
          <Row
            title="Calendar overlay"
            sub="Show system events on Today and the planner (read-only, never stored)"
          >
            {calendarState === "granted" ? (
              <Toggle
                checked={settings.calendarOverlay}
                onChange={(v) => update({ calendarOverlay: v })}
                label="Calendar overlay"
              />
            ) : calendarState === "unsupported" ? (
              <span className="text-[11px] text-dim">Android app only</span>
            ) : (
              <button
                type="button"
                onClick={() => void requestCalendarPermission().then(setCalendarState)}
                className="rounded-full border border-paper/[0.12] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-paper hover:bg-paper/[0.06]"
              >
                Allow
              </button>
            )}
          </Row>
          <Row title="Native notifications" sub="Focus blocks and reminders with action buttons">
            {notifPermission === "granted" ? (
              <Toggle
                checked={settings.focusNotifications}
                onChange={(v) => update({ focusNotifications: v })}
                label="Native notifications"
              />
            ) : notifPermission === "unsupported" ? (
              <span className="text-[11px] text-dim">Android app only</span>
            ) : (
              <button
                type="button"
                onClick={() => void requestNotificationPermission().then(setNotifPermission)}
                className="rounded-full border border-paper/[0.12] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-paper hover:bg-paper/[0.06]"
              >
                Allow
              </button>
            )}
          </Row>
          <Row title="Haptic feedback" sub="A short buzz when you complete a task, tap a habit or finish a block">
            {hapticsSupported() ? (
              <Toggle checked={settings.haptics} onChange={(v) => update({ haptics: v })} label="Haptic feedback" />
            ) : (
              <span className="text-[11px] text-dim">No motor here</span>
            )}
          </Row>
        </div>
      </Widget>

      {/* DANGER ZONE */}
      <Widget>
        <Label>Reset</Label>
        <div className="mt-1">
          <Row title="Clear tasks, habits & focus" sub="Removes all productivity data, keeps your profile">
            {confirmClear ? (
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirmClear(false)} className="rounded-full border border-line px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-mute">
                  No
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearAllData();
                    setConfirmClear(false);
                  }}
                  className="rounded-full bg-nred px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-paper"
                >
                  Clear
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmClear(true)} className="rounded-full border border-nred/60 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-nred">
                Clear
              </button>
            )}
          </Row>
          <Row title="Reset everything" sub="Clears your profile and all preferences from this device">
            {confirm ? (
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirm(false)} className="rounded-full border border-line px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-mute">
                  No
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearAllData();
                    reset();
                    setConfirm(false);
                    onResetDone?.();
                  }}
                  className="rounded-full bg-nred px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-paper"
                >
                  Yes
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirm(true)} className="rounded-full border border-nred/60 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-nred">
                Reset
              </button>
            )}
          </Row>
        </div>
      </Widget>

      <div className="px-2 pb-2 text-center">
        <div className="font-dot text-[14px] text-mute">MOTION OS</div>
        <div className="label mt-1">v2.0 · Productivity · Stored locally</div>
      </div>
    </div>
  );
}
