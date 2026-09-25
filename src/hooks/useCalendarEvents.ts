import { useCallback, useEffect, useState } from "react";
import {
  calendarPermission,
  eventsForDay,
  requestCalendarPermission,
  type CalendarEvent,
  type CalendarPermission,
} from "../lib/calendar";

/**
 * Read-only calendar overlay for one day.
 *
 * Events are fetched on demand and never written to storage: they exist only
 * while the planner / dashboard is showing them.
 */
export function useCalendarEvents(dayKey: string, enabled: boolean) {
  const [permission, setPermission] = useState<CalendarPermission>("unsupported");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void calendarPermission().then((state) => {
      if (!cancelled) setPermission(state);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const next = await eventsForDay(dayKey);
      setEvents(next);
      setPermission(await calendarPermission());
    } finally {
      setLoading(false);
    }
  }, [dayKey, enabled]);

  useEffect(() => {
    if (!enabled) {
      setEvents([]);
      return;
    }
    void load();
  }, [enabled, load]);

  const ask = useCallback(async () => {
    const state = await requestCalendarPermission();
    setPermission(state);
    if (state === "granted") await load();
    return state;
  }, [load]);

  return { events, permission, loading, ask, reload: load };
}
