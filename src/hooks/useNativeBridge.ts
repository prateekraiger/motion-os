import { useEffect, useRef } from "react";
import { useSettings } from "./useSettings";
import { useStore } from "./useStore";
import { consumeIntent, onIntent } from "../lib/intents";
import {
  drainNotificationActions,
  hideFocusNotification,
  onNotificationAction,
  showFocusNotification,
  updateFocusNotification,
  type QueuedAction,
} from "../lib/notifications";
import { haptic } from "../lib/haptics";
import { fmtClock } from "../lib/time";

/**
 * Wires the Android side of the app into the web layer:
 *
 * - share intents ("share to Motion OS") and the Quick Settings tile,
 * - notification action buttons (complete / +5 min / skip / snooze),
 * - the ongoing focus notification while a block runs in the background.
 *
 * Everything is defensive: on the web, or when a plugin is missing, each part
 * silently does nothing.
 */
export function useNativeBridge({ onShare }: { onShare: (text: string) => void }) {
  const { settings } = useSettings();
  const { timer, tasks, toggleTask, updateTask, skipPhase, pauseTimer, resetTimer, extendTimer, startFocusBlock } =
    useStore();
  const onShareRef = useRef(onShare);
  onShareRef.current = onShare;

  /* ---------------------- Share intents & tile ---------------------- */
  useEffect(() => {
    let handle: { remove: () => void } | null = null;
    let cancelled = false;

    const applyIntent = (intent: { type: string; text?: string; minutes?: number }) => {
      if (intent.type === "share" && typeof intent.text === "string" && intent.text.trim()) {
        haptic("tap");
        onShareRef.current(intent.text);
        return;
      }
      if (intent.type === "focus" && typeof intent.minutes === "number") {
        startFocusBlock(intent.minutes);
      }
    };

    void consumeIntent().then((intent) => {
      if (!cancelled && intent) applyIntent(intent);
    });
    void onIntent(applyIntent).then((h) => {
      if (cancelled) h?.remove();
      else handle = h;
    });

    return () => {
      cancelled = true;
      handle?.remove();
    };
  }, [startFocusBlock]);

  /* ------------------- Notification action buttons ------------------ */
  useEffect(() => {
    let handle: { remove: () => void } | null = null;
    let cancelled = false;

    const applyAction = (action: QueuedAction) => {
      haptic("tap");
      switch (action.kind) {
        case "add5":
          extendTimer(5);
          break;
        case "skip":
          skipPhase();
          break;
        case "pause":
          pauseTimer();
          break;
        case "complete":
          // Focus action: finish the linked task and stop the block.
          if (action.taskId) toggleTask(action.taskId);
          else if (timer.taskId) toggleTask(timer.taskId);
          resetTimer();
          break;
        case "snooze":
          if (action.taskId) {
            const task = tasks.find((t) => t.id === action.taskId);
            if (task) updateTask(task.id, { remindAt: new Date(action.at + 10 * 60_000).toISOString() });
          }
          break;
        default:
          break;
      }
    };

    // Actions taken while the app was closed are queued natively.
    void drainNotificationActions().then((actions) => {
      if (cancelled) return;
      actions.forEach(applyAction);
    });
    void onNotificationAction(applyAction).then((h) => {
      if (cancelled) h?.remove();
      else handle = h;
    });

    return () => {
      cancelled = true;
      handle?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extendTimer, skipPhase, pauseTimer, resetTimer, toggleTask, updateTask]);

  /* --------------------- Ongoing focus notification ------------------ */
  const focusNotifs = settings.focusNotifications;
  const running = timer.status === "running" && timer.phase === "work";
  const endsAt = timer.endsAt;

  useEffect(() => {
    if (!focusNotifs || !running || endsAt == null) return;
    const publish = () => {
      const task = tasks.find((t) => t.id === timer.taskId);
      const body = task ? `${task.title} · ${fmtClock(Math.max(0, endsAt - Date.now()))} left` : `${fmtClock(Math.max(0, endsAt - Date.now()))} left`;
      void showFocusNotification({ title: "Focus in motion", body, endsAt });
    };
    publish();
    const id = window.setInterval(() => void updateFocusNotification({
      body: `${fmtClock(Math.max(0, endsAt - Date.now()))} left`,
      endsAt,
    }), 30_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNotifs, running, endsAt, timer.taskId]);

  // Hide it as soon as the user comes back to the app or the block stops.
  useEffect(() => {
    if (!running) void hideFocusNotification();
  }, [running]);

  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden) void hideFocusNotification();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);
}
