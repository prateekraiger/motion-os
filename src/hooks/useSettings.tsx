import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { syncNativeWidgetSettings } from "../lib/nativeWidgets";

export type YearView = "dots" | "bar";
export type WidgetTheme = "system" | "light" | "dark";
/** App-wide appearance: follow the OS, or force dark / light. */
export type AppTheme = "system" | "dark" | "light";

export interface Settings {
  /** ISO string of the birth moment (local time preserved via epoch) */
  birth: string | null;
  name: string;
  motionBlur: boolean;
  showMs: boolean;
  yearView: YearView;
  lifeExpectancy: number;
  h24: boolean;
  widgetTheme: WidgetTheme;
  theme: AppTheme;
  /** Whether the first-run flow has been completed. */
  onboarded: boolean;
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
  widgetTheme: "system",
  theme: "system",
  onboarded: false,
};

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    const merged = { ...DEFAULTS, ...parsed };
    // Existing users who already set a birth moment are considered onboarded.
    if (parsed.onboarded == null && parsed.birth) merged.onboarded = true;
    if (merged.theme !== "dark" && merged.theme !== "light") merged.theme = "system";
    return merged;
  } catch {
    return DEFAULTS;
  }
}

/* ------------------- Document-level theme application --------------- */

function effectiveTheme(theme: AppTheme): "light" | "dark" {
  if (theme !== "system") return theme;
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);

  const eff = effectiveTheme(theme);
  const color = eff === "light" ? "#ffffff" : "#000000";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", color);
  document.querySelector('meta[name="color-scheme"]')?.setAttribute("content", eff);
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
  const themeRef = useRef(settings.theme);
  themeRef.current = settings.theme;

  // Runs before paint, so switching themes (or first load with a saved
  // preference) never flashes the wrong one.
  useLayoutEffect(() => {
    applyTheme(settings.theme);
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      if (themeRef.current === "system") applyTheme("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [settings.theme]);

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
