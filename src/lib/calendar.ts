/**
 * Read-only calendar overlay.
 *
 * The Today dashboard can show the user's system calendar events so tasks can
 * be timeboxed around real meetings. Nothing is copied into Motion OS storage:
 * events are queried for the visible day and dropped when the view closes, and
 * the permission is requested only when the user turns the overlay on.
 */
import { Capacitor, registerPlugin } from "@capacitor/core";

export interface CalendarEvent {
  id: string;
  title: string;
  /** Epoch ms. */
  startMs: number;
  endMs: number;
  allDay: boolean;
  /** Calendar colour as #RRGGBB when the provider exposes one. */
  color: string | null;
  calendarName: string | null;
}

export type CalendarPermission = "granted" | "denied" | "prompt" | "unsupported";

interface MotionCalendarPlugin {
  permissionState(): Promise<{ state: CalendarPermission }>;
  requestPermission(): Promise<{ state: CalendarPermission }>;
  eventsForDay(options: { dayKey: string }): Promise<{ events: CalendarEvent[] }>;
}

const Calendar = registerPlugin<MotionCalendarPlugin>("MotionCalendar");

export function calendarSupported(): boolean {
  return Capacitor.getPlatform() === "android";
}

export async function calendarPermission(): Promise<CalendarPermission> {
  if (!calendarSupported()) return "unsupported";
  try {
    const res = await Calendar.permissionState();
    return res.state ?? "unsupported";
  } catch {
    return "unsupported";
  }
}

export async function requestCalendarPermission(): Promise<CalendarPermission> {
  if (!calendarSupported()) return "unsupported";
  try {
    const res = await Calendar.requestPermission();
    return res.state ?? "unsupported";
  } catch {
    return "unsupported";
  }
}

/** Events overlapping the given local day key ("YYYY-MM-DD"). */
export async function eventsForDay(dayKey: string): Promise<CalendarEvent[]> {
  if (!calendarSupported()) return [];
  try {
    const res = await Calendar.eventsForDay({ dayKey });
    return Array.isArray(res.events) ? res.events : [];
  } catch {
    return [];
  }
}
