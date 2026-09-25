/**
 * Android share intents and the Quick Settings tile.
 *
 * Text shared from any app lands here as a quick-capture task, and the
 * notification-shade tile starts a focus block. Both arrive as a pending
 * intent: delivered live when the app is running, or queued natively and
 * consumed the next time the app opens.
 */
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export type MotionIntent =
  | { type: "share"; text: string; at: number }
  | { type: "focus"; minutes: number; at: number };

interface MotionIntentsPlugin {
  consume(): Promise<{ intent: MotionIntent | null }>;
  addListener(eventName: "motionIntent", listener: (intent: MotionIntent) => void): Promise<PluginListenerHandle>;
}

const Intents = registerPlugin<MotionIntentsPlugin>("MotionIntents");

export function intentsSupported(): boolean {
  return Capacitor.getPlatform() === "android";
}

/** Take the oldest queued intent, if any. */
export async function consumeIntent(): Promise<MotionIntent | null> {
  if (!intentsSupported()) return null;
  try {
    const res = await Intents.consume();
    return res.intent ?? null;
  } catch {
    return null;
  }
}

/** Subscribe to intents that arrive while the app is open. */
export async function onIntent(listener: (intent: MotionIntent) => void): Promise<PluginListenerHandle | null> {
  if (!intentsSupported()) return null;
  try {
    return await Intents.addListener("motionIntent", listener);
  } catch {
    return null;
  }
}
