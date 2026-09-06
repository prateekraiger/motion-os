import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { syncNativeWidgetSettings } from "../lib/nativeWidgets";

export type YearView = "dots" | "bar";

export interface Settings {
  /** ISO string of the birth moment (local time preserved via epoch) */
  birth: string | null;
  name: string;
  motionBlur: boolean;
  showMs: boolean;
  yearView: YearView;
  lifeExpectancy: number;
  h24: boolean;
}

const KEY = "motion-os:settings:v1";

const DEFAULTS: Settings = {
  birth: null,
  name: "",
  motionBlur: true,
  showMs: true,
  yearView: "dots",
  lifeExpectancy: 80,
  h24: true,
};

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

interface Ctx {
  settings: Settings;
  birthDate: Date | null;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
}

const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      /* ignore quota errors */
    }

    // AppWidgetProvider cannot read a WebView's localStorage. Mirror only the
    // minimum display data into native SharedPreferences on Android.
    void syncNativeWidgetSettings(settings);
  }, [settings]);

  const update = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), []);
  const reset = useCallback(() => setSettings({ ...DEFAULTS }), []);

  const birthDate = useMemo(() => {
    if (!settings.birth) return null;
    const d = new Date(settings.birth);
    return isNaN(d.getTime()) ? null : d;
  }, [settings.birth]);

  const value = useMemo(() => ({ settings, birthDate, update, reset }), [settings, birthDate, update, reset]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
