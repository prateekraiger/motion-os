import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Persisted state backed by localStorage. Mirrors the useState signature and
 * tolerates quota / serialization errors so the UI never crashes on storage.
 */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return initial;
      return JSON.parse(raw) as T;
    } catch {
      return initial;
    }
  });

  // Keep a ref so callbacks reading the latest value stay stable.
  const ref = useRef(value);
  ref.current = value;

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore quota / serialization errors */
    }
  }, [key, value]);

  const update = useCallback((next: T | ((prev: T) => T)) => {
    setValue((prev) => (typeof next === "function" ? (next as (p: T) => T)(prev) : next));
  }, []);

  return [value, update, ref] as const;
}

/** Small collision-resistant id generator (no external deps). */
export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
