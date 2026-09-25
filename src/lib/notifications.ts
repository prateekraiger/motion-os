/**
 * Interactive notifications.
 *
 * Focus blocks and task reminders are surfaced as native Android
 * notifications with action buttons, so a block can be completed, extended or
 * skipped without opening the app. Actions are queued natively and delivered
 * to the web layer either live (while the app is running) or on next launch.
 */
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export type FocusAction = "complete" | "add5" | "skip" | "pause";
export type ReminderAction = "complete" | "snooze" | "open";

export type NotificationPermission = "granted" | "denied" | "prompt" | "unsupported";

interface MotionNotificationsPlugin {
  permissionState(): Promise<{ state: NotificationPermission }>;
  requestPermission(): Promise<{ state: NotificationPermission }>;
  showFocus(options: { title: string; body: string; endsAt: number; ongoing: boolean }): Promise<void>;
  updateFocus(options: { body: string; endsAt: number }): Promise<void>;
  hideFocus(): Promise<void>;
  /** One-shot notification (e.g. "focus block complete"). */
  notify(options: { title: string; body: string }): Promise<void>;
  scheduleReminder(options: { id: string; title: string; body: string; at: number }): Promise<void>;
  cancelReminder(options: { id: string }): Promise<void>;
  /** Actions raised while the app was closed. */
  drainActions(): Promise<{ actions: QueuedAction[] }>;
  addListener(eventName: "focusAction" | "reminderAction", listener: (data: QueuedAction) => void): Promise<PluginListenerHandle>;
}

const Notifications = registerPlugin<MotionNotificationsPlugin>("MotionNotifications");

export interface QueuedAction {
  /** Which kind of action this was. */
  kind: FocusAction | ReminderAction;
  /** Task id for reminder actions, null for focus actions. */
  taskId: string | null;
  /** Epoch ms the action was taken. */
  at: number;
}

export function notificationsSupported(): boolean {
  return Capacitor.getPlatform() === "android";
}

export async function notificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return "unsupported";
  try {
    const res = await Notifications.permissionState();
    return res.state ?? "unsupported";
  } catch {
    return "unsupported";
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return "unsupported";
  try {
    const res = await Notifications.requestPermission();
    return res.state ?? "unsupported";
  } catch {
    return "unsupported";
  }
}

/** Show / refresh the ongoing focus notification (with its action buttons). */
export async function showFocusNotification(options: { title: string; body: string; endsAt: number }): Promise<void> {
  if (!notificationsSupported()) return;
  try {
    await Notifications.showFocus({ ...options, ongoing: true });
  } catch {
    /* notifications are a nicety, never a failure */
  }
}

export async function updateFocusNotification(options: { body: string; endsAt: number }): Promise<void> {
  if (!notificationsSupported()) return;
  try {
    await Notifications.updateFocus(options);
  } catch {
    /* ignore */
  }
}

export async function hideFocusNotification(): Promise<void> {
  if (!notificationsSupported()) return;
  try {
    await Notifications.hideFocus();
  } catch {
    /* ignore */
  }
}

/** Post a one-shot notification (no actions). */
export async function notify(options: { title: string; body: string }): Promise<void> {
  if (!notificationsSupported()) return;
  try {
    await Notifications.notify(options);
  } catch {
    /* ignore */
  }
}

/** Schedule a reminder notification for a task (idempotent per task+moment). */
export async function scheduleReminderNotification(options: {
  id: string;
  title: string;
  body: string;
  at: number;
}): Promise<void> {
  if (!notificationsSupported()) return;
  try {
    await Notifications.scheduleReminder(options);
  } catch {
    /* ignore */
  }
}

export async function cancelReminderNotification(id: string): Promise<void> {
  if (!notificationsSupported()) return;
  try {
    await Notifications.cancelReminder({ id });
  } catch {
    /* ignore */
  }
}

/** Subscribe to actions taken from a notification. */
export async function onNotificationAction(listener: (action: QueuedAction) => void): Promise<PluginListenerHandle | null> {
  if (!notificationsSupported()) return null;
  const handleFocus = await Notifications.addListener("focusAction", listener).catch(() => null);
  const handleReminder = await Notifications.addListener("reminderAction", listener).catch(() => null);
  if (!handleFocus || !handleReminder) return null;
  return {
    remove: async () => {
      await handleFocus.remove();
      await handleReminder.remove();
    },
  } satisfies PluginListenerHandle;
}

/** Actions queued while the app was not running. */
export async function drainNotificationActions(): Promise<QueuedAction[]> {
  if (!notificationsSupported()) return [];
  try {
    const res = await Notifications.drainActions();
    return Array.isArray(res.actions) ? res.actions : [];
  } catch {
    return [];
  }
}
