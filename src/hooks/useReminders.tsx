import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "./useStore";
import { dueReminders, reminderKey } from "../lib/productivity";
import { notificationsSupported } from "../lib/notifications";
import type { Task } from "../lib/types";

const FIRED_KEY = "motion-os:reminders:fired:v1";
const MAX_FIRED = 100;
const CHECK_INTERVAL_MS = 10_000;
const AUTO_DISMISS_MS = 12_000;

/* --------------------- Browser notification API -------------------- */

export function webNotificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export type NotifState = "unsupported" | "default" | "granted" | "denied";

export function webNotificationState(): NotifState {
  if (!webNotificationsSupported()) return "unsupported";
  switch (Notification.permission) {
    case "granted":
      return "granted";
    case "denied":
      return "denied";
    default:
      return "default";
  }
}

function pushWebNotification(task: Task, tag: string) {
  // On Android the native reminder notification (with action buttons) already
  // covers this, so pushing a browser notification too would double-alert.
  if (notificationsSupported()) return;
  try {
    if (webNotificationState() !== "granted") return;
    const n = new Notification("Motion OS", { body: task.title, tag, silent: false });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* WebView without Notification support — in-app banner still fires */
  }
}

/* ---------------------- Fired-reminder bookkeeping ----------------- */

function loadFired(): Set<string> {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    const arr: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

function saveFired(set: Set<string>) {
  try {
    localStorage.setItem(FIRED_KEY, JSON.stringify([...set].slice(-MAX_FIRED)));
  } catch {
    /* storage unavailable */
  }
}

/* ------------------------------ Hook -------------------------------- */

export interface ReminderAlert {
  task: Task;
  key: string;
}

/**
 * Watches open tasks whose reminder moment has passed and raises an in-app
 * alert (always) plus a browser notification (when permitted). Each
 * task+moment pair is announced at most once; state survives reloads.
 */
export function useReminders() {
  const { tasks } = useStore();
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  const firedRef = useRef<Set<string> | null>(null);
  if (firedRef.current === null) firedRef.current = loadFired();

  const [alert, setAlert] = useState<ReminderAlert | null>(null);

  useEffect(() => {
    const check = () => {
      const nowMs = Date.now();
      const fired = firedRef.current!;
      const due = dueReminders(tasksRef.current, nowMs).filter((t) => !fired.has(reminderKey(t)));
      if (due.length === 0) return;
      due.forEach((t) => fired.add(reminderKey(t)));
      saveFired(fired);
      const task = due[0];
      const key = reminderKey(task);
      // Keep the newest visible alert; never replace one the user is reading.
      setAlert((prev) => prev ?? { task, key });
      pushWebNotification(task, key);
    };

    check();
    const id = window.setInterval(check, CHECK_INTERVAL_MS);
    const onVisibility = () => {
      if (!document.hidden) check();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (!alert) return;
    const id = window.setTimeout(() => setAlert(null), AUTO_DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [alert]);

  const dismiss = useCallback(() => setAlert(null), []);

  return { alert, dismiss };
}
