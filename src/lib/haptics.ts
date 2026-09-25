/**
 * Tactile feedback.
 *
 * On Android this calls a tiny Capacitor plugin backed by the system
 * `Vibrator`, so the feedback is real haptics rather than a web approximation.
 * In the browser (and as a fallback everywhere) it uses `navigator.vibrate`,
 * which is a no-op on hardware without a motor. Users can switch the whole
 * thing off in Preferences.
 */
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export type HapticKind = "tap" | "toggle" | "success" | "warning" | "select" | "timer";

interface MotionHapticsPlugin {
  impact(options: { style: "light" | "medium" | "heavy" }): Promise<void>;
  notification(options: { type: "success" | "warning" | "error" }): Promise<void>;
  selection(): Promise<void>;
}

const Haptics = registerPlugin<MotionHapticsPlugin>("MotionHaptics");

let enabled = true;

/** Called from Preferences so the rest of the app can just fire and forget. */
export function setHapticsEnabled(value: boolean) {
  enabled = value;
}

/** Vibration pattern (ms) used when the native bridge is unavailable. */
const WEB_PATTERNS: Record<HapticKind, number | number[]> = {
  tap: 8,
  toggle: 14,
  success: [12, 40, 20],
  warning: [18, 60, 18],
  select: 5,
  timer: [24, 60, 24, 60, 40],
};

const NATIVE: Record<HapticKind, () => Promise<void>> = {
  tap: () => Haptics.impact({ style: "light" }),
  toggle: () => Haptics.impact({ style: "medium" }),
  success: () => Haptics.notification({ type: "success" }),
  warning: () => Haptics.notification({ type: "warning" }),
  select: () => Haptics.selection(),
  timer: () => Haptics.notification({ type: "success" }),
};

/** Fire a haptic. Never throws, never blocks the UI. */
export function haptic(kind: HapticKind = "tap") {
  if (!enabled) return;
  if (Capacitor.getPlatform() === "android") {
    void NATIVE[kind]().catch(() => undefined);
    return;
  }
  try {
    navigator.vibrate?.(WEB_PATTERNS[kind]);
  } catch {
    /* no motor */
  }
}

export function hapticsSupported(): boolean {
  if (Capacitor.getPlatform() === "android") return true;
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

export type { PluginListenerHandle };
