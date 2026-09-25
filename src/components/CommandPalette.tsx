import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../hooks/useStore";
import { useSettings } from "../hooks/useSettings";
import { useBackups } from "../hooks/useBackups";
import type { View } from "../lib/nav";
import { exportJsonFile } from "../lib/download";
import { haptic } from "../lib/haptics";
import { cn } from "../utils/cn";

export interface Command {
  id: string;
  label: string;
  group: "Actions" | "Navigate" | "Tasks" | "Habits";
  hint?: string;
  keywords?: string;
  run: () => void;
}

/** Subsequence fuzzy match — good enough for a few dozen commands. */
function fuzzyScore(query: string, text: string): number {
  if (!query) return 1;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let score = 0;
  let ti = 0;
  let streak = 0;
  for (const char of q) {
    const found = t.indexOf(char, ti);
    if (found === -1) return 0;
    streak = found === ti ? streak + 1 : 0;
    score += 10 - Math.min(9, found - ti) + streak * 2;
    ti = found + 1;
  }
  // Prefer matches that start the label.
  if (t.startsWith(q)) score += 25;
  return score;
}

const NAV_ITEMS: { view: View; label: string }[] = [
  { view: "today", label: "Today" },
  { view: "tasks", label: "Tasks" },
  { view: "focus", label: "Focus" },
  { view: "habits", label: "Habits" },
  { view: "planner", label: "Day planner" },
  { view: "more", label: "More" },
  { view: "life", label: "Life clock" },
  { view: "year", label: "Year clock" },
  { view: "stats", label: "Stats & history" },
  { view: "journal", label: "Journal & mood" },
  { view: "widgets", label: "Home widgets" },
  { view: "settings", label: "Preferences" },
];

/**
 * Keyboard command palette (Cmd/Ctrl + K).
 *
 * Implemented in-house rather than pulled from `cmdk` so the bundle stays
 * dependency-free and the palette can drive native actions (haptics, sync,
 * snapshots) as well as navigation.
 */
export default function CommandPalette({
  open,
  onClose,
  onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  onNavigate: (view: View) => void;
}) {
  const store = useStore();
  const { settings, update } = useSettings();
  const { saveNow } = useBackups();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      // Focus after the overlay paints so the keyboard never fights the browser.
      const id = window.setTimeout(() => inputRef.current?.focus(), 20);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const list: Command[] = [];
    const go = (view: View, label: string) => {
      list.push({
        id: `nav-${view}`,
        label: `Go to ${label}`,
        group: "Navigate",
        keywords: label,
        run: () => onNavigate(view),
      });
    };
    NAV_ITEMS.forEach((item) => go(item.view, item.label));

    list.push(
      {
        id: "action-add-task",
        label: query.trim() ? `Add task “${query.trim()}”` : "Add task…",
        group: "Actions",
        hint: "Type the title, then Enter",
        keywords: "new task create capture",
        run: () => {
          const title = query.trim();
          if (title) store.addTask({ title });
        },
      },
      {
        id: "action-focus",
        label: store.timer.status === "running" ? "Pause focus block" : "Start focus block",
        group: "Actions",
        keywords: "timer pomodoro start pause",
        run: () => (store.timer.status === "running" ? store.pauseTimer() : store.startTimer()),
      },
      {
        id: "action-focus-25",
        label: "Start a 25-minute focus block",
        group: "Actions",
        keywords: "tile quick pomodoro deep work",
        run: () => store.startFocusBlock(25),
      },
      {
        id: "action-theme",
        label: `Switch to ${settings.theme === "light" ? "dark" : "light"} theme`,
        group: "Actions",
        keywords: "dark light appearance",
        run: () => update({ theme: settings.theme === "light" ? "dark" : "light" }),
      },
      {
        id: "action-snapshot",
        label: "Save a backup snapshot now",
        group: "Actions",
        keywords: "backup snapshot rolling",
        run: () => void saveNow(),
      },
      {
        id: "action-export",
        label: "Export all data as JSON",
        group: "Actions",
        keywords: "download backup json",
        run: () => exportJsonFile(store.exportData(), `motion-os-backup-${new Date().toISOString().slice(0, 10)}.json`),
      },
      {
        id: "action-haptics",
        label: `${settings.haptics ? "Disable" : "Enable"} haptic feedback`,
        group: "Actions",
        keywords: "vibration tactile",
        run: () => update({ haptics: !settings.haptics }),
      },
    );

    for (const task of store.tasks.filter((t) => !t.done).slice(0, 12)) {
      list.push({
        id: `task-${task.id}`,
        label: task.title,
        group: "Tasks",
        hint: "Complete",
        keywords: "task done complete",
        run: () => store.toggleTask(task.id),
      });
    }
    for (const habit of store.habits.slice(0, 8)) {
      list.push({
        id: `habit-${habit.id}`,
        label: habit.name,
        group: "Habits",
        hint: "Toggle today",
        keywords: "habit streak",
        run: () => store.toggleHabit(habit.id, new Date().toISOString().slice(0, 10)),
      });
    }
    return list;
  }, [onNavigate, query, saveNow, settings.haptics, settings.theme, store, update]);

  const results = useMemo(() => {
    const scored = commands
      .map((command) => ({ command, score: fuzzyScore(query, `${command.label} ${command.keywords ?? ""}`) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);
    // Always offer to create a task from the raw query first.
    const create: { command: Command; score: number }[] = query.trim()
      ? [
          {
            command: {
              id: "action-create",
              label: `Create task “${query.trim()}”`,
              group: "Actions",
              hint: "New",
              run: () => store.addTask({ title: query.trim() }),
            },
            score: 1e6,
          },
        ]
      : [];
    return [...create, ...scored].slice(0, 40);
  }, [commands, query, store]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((i) => Math.min(results.length - 1, i + 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((i) => Math.max(0, i - 1));
      } else if (event.key === "Enter") {
        event.preventDefault();
        const entry = results[active];
        if (!entry) return;
        haptic("tap");
        entry.command.run();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, results, active, onClose]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  let lastGroup = "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink/80 px-4 pb-10 pt-[12vh] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[70vh] w-full max-w-[520px] flex-col overflow-hidden rounded-[24px] border border-paper/[0.12] bg-card shadow-[0_24px_80px_var(--color-shadow)]">
        <div className="flex items-center gap-3 border-b border-paper/[0.06] px-4 py-3.5">
          <span className="font-dot text-[13px] text-dim">›</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search actions, tasks, habits…"
            aria-label="Command"
            className="w-full bg-transparent text-[15px] text-paper outline-none placeholder:text-dim"
          />
          <kbd className="hidden rounded-md border border-paper/[0.12] px-1.5 py-0.5 text-[10px] text-dim sm:block">ESC</kbd>
        </div>

        <div ref={listRef} className="no-scrollbar flex-1 overflow-y-auto py-2">
          {results.length === 0 && (
            <div className="px-4 py-8 text-center text-[13px] text-dim">Nothing matches “{query}”.</div>
          )}
          {results.map((entry, index) => {
            const showGroup = entry.command.group !== lastGroup;
            lastGroup = entry.command.group;
            return (
              <div key={entry.command.id}>
                {showGroup && (
                  <div className="px-4 pb-1 pt-3 text-[9px] font-medium uppercase tracking-[0.18em] text-dim">
                    {entry.command.group}
                  </div>
                )}
                <button
                  type="button"
                  data-active={index === active}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => {
                    haptic("tap");
                    entry.command.run();
                    onClose();
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors",
                    index === active ? "bg-paper/[0.08]" : "hover:bg-paper/[0.04]",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate text-[14px] text-paper">{entry.command.label}</span>
                  {entry.command.hint && <span className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-dim">{entry.command.hint}</span>}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-paper/[0.06] px-4 py-2.5 text-[10px] text-dim">
          <span>↑↓ to move · Enter to run</span>
          <span className="font-dot">MOTION OS</span>
        </div>
      </div>
    </div>
  );
}
