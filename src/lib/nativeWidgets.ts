import { Capacitor, registerPlugin } from "@capacitor/core";

export type WidgetKind = "age" | "year";

interface MotionWidgetsPlugin {
  syncSettings(options: {
    birthEpochMs: string;
    name: string;
    h24: boolean;
  }): Promise<void>;
  requestPinWidget(options: { kind: WidgetKind }): Promise<{
    requested: boolean;
    supported: boolean;
  }>;
}

const MotionWidgets = registerPlugin<MotionWidgetsPlugin>("MotionWidgets");

/**
 * The web app is also shipped as a normal browser experience. Keep the
 * native bridge behind a small, defensive boundary so the rest of the UI
 * never needs to know whether it is running inside Capacitor.
 */
export const isAndroidNative = () => Capacitor.getPlatform() === "android";

export async function syncNativeWidgetSettings(options: {
  birth: string | null;
  name: string;
  h24: boolean;
}) {
  if (!isAndroidNative()) return;

  try {
    await MotionWidgets.syncSettings({
      birthEpochMs: options.birth ? String(new Date(options.birth).getTime()) : "0",
      name: options.name,
      h24: options.h24,
    });
  } catch {
    // A widget should never make the main app fail. It can be synced again
    // the next time settings change or the app is opened.
  }
}

export async function requestNativeWidget(kind: WidgetKind) {
  if (!isAndroidNative()) return { requested: false, supported: false };

  try {
    return await MotionWidgets.requestPinWidget({ kind });
  } catch {
    return { requested: false, supported: false };
  }
}
