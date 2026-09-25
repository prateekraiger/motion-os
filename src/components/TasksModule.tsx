import { useEffect, useMemo, useRef, useState, memo } from "react";
import { useStore } from "../hooks/useStore";
import { uid } from "../hooks/useLocalStorage";
import { useSettings } from "../hooks/useSettings";
import { isOverdue, sortTasks, tasksCompletedOn } from "../lib/productivity";
import { dateKey, fmtTime, parseLocal, relativeDay, toDateInput, toTimeInput } from "../lib/time";
import type { Priority, Repeat, Task } from "../lib/types";
import {
  Checkbox,
  Chip,
  EmptyState,
  IconButton,
  Num,
  PageIntro,
  PriorityDot,
  SectionHeader,
  StatusPill,
  Widget,
} from "./ui";
import {
  CalendarIcon,
  ChevronDown,
  ClockIcon,
  ListIcon,
  MicIcon,
  NoteIcon,
  PlusIcon,
  RepeatIcon,
  SearchIcon,
  TrashIcon,
} from "./icons";
import { startDictation, voiceSupported } from "../lib/speech";
import { cancelReminderNotification, scheduleReminderNotification } from "../lib/notifications";
import { reminderNotificationId } from "../lib/reminders";
import { cn } from "../utils/cn";

type Filter = "today" | "upcoming" | "all" | "done";

const PRIORITY_LABEL: Record<Priority, string> = { high: "High", med: "Med", low: "Low" };
const PRIORITY_CYCLE: Priority[] = ["med", "high", "low"];
const REPEAT_OPTIONS: [Repeat, string][] = [
  ["none", "None"],
  ["daily", "Daily"],
  ["weekly", "Weekly"],
];

const panelInputCls =
  "w-full rounded-xl border border-paper/[0.08] bg-ink px-3 py-2.5 text-[14px] text-paper outline-none focus:border-paper/60";

function Composer() {
  const { addTask } = useStore();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("med");
  const [due, setDue] = useState<string | null>(null);
  const [repeat, setRepeat] = useState<Repeat>("none");
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const dictationRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => () => dictationRef.current?.stop(), []);

  const submit = () => {
    if (!title.trim()) return;
    addTask({ title, priority, due, repeat });
    setTitle("");
    setDue(null);
    setPriority("med");
    setRepeat("none");
    setOpen(false);
  };

  const dictate = async () => {
    if (listening) {
      dictationRef.current?.stop();
      dictationRef.current = null;
      setListening(false);
      return;
    }
    setOpen(true);
    const handle = await startDictation((event, value) => {
      if (event === "partial") setTitle((prev) => `${prev.replace(/\s*$/, "")}${prev ? " " : ""}${value}`.trim());
      if (event === "final" || event === "error") {
        setListening(false);
        dictationRef.current = null;
      }
    });
    dictationRef.current = handle;
    setListening(true);
  };

  const today = dateKey();
  const tomorrow = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return dateKey(d);
  })();

  return (
    <Widget className="p-3">
      <div className="flex items-center gap-2">
        <span className="pl-1">
          <PriorityDot priority={priority} />
        </span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="Add a task…"
          maxLength={120}
          className="min-w-0 flex-1 bg-transparent py-2 text-[15px] text-paper outline-none placeholder:text-dim"
        />
        <IconButton
          tone="solid"
          onClick={submit}
          disabled={!title.trim()}
          aria-label="Add task"
          className="mr-1"
        >
          <PlusIcon className="h-4 w-4" />
        </IconButton>
        <IconButton
          onClick={() => void dictate()}
          disabled={!voiceSupported()}
          aria-label={listening ? "Stop dictation" : "Dictate a task"}
          className={cn(listening && "text-nred")}
        >
          <MicIcon className={cn("h-4.5 w-4.5", listening && "animate-dot-pulse")} />
        </IconButton>
      </div>

      {open && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-paper/[0.06] pt-3">
          {PRIORITY_CYCLE.map((p) => (
            <Chip key={p} active={priority === p} onClick={() => setPriority(p)}>
              <PriorityDot priority={p} />
              {PRIORITY_LABEL[p]}
            </Chip>
          ))}
          <span className="mx-1 h-4 w-px bg-line" />
          <Chip active={due === today} onClick={() => setDue(due === today ? null : today)}>
            Today
          </Chip>
          <Chip active={due === tomorrow} onClick={() => setDue(due === tomorrow ? null : tomorrow)}>
            Tomorrow
          </Chip>
          <label
            className={cn(
              "relative inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors",
              due && due !== today && due !== tomorrow
                ? "border-paper bg-paper text-ink"
                : "border-paper/[0.1] text-mute hover:text-paper",
            )}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            {due && due !== today && due !== tomorrow ? relativeDay(due) : "Date"}
            <input
              type="date"
              value={due ?? ""}
              min={today}
              onChange={(e) => setDue(e.target.value || null)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
          <span className="mx-1 h-4 w-px bg-line" />
          {REPEAT_OPTIONS.map(([v, label]) => (
            <Chip key={v} active={repeat === v} onClick={() => setRepeat(v)}>
              <RepeatIcon className="h-3 w-3" />
              {label}
            </Chip>
          ))}
        </div>
      )}
    </Widget>
  );
}

const TaskRow = memo(function TaskRow({ 
  task,
  onToggle,
  onRemove,
  onUpdate
}: { 
  task: Task;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Task>) => void;
}) {
  const { settings } = useSettings();
  const overdue = isOverdue(task);
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(task.notes);
  const [rDate, setRDate] = useState("");
  const [rTime, setRTime] = useState("09:00");
  const subtasks = task.subtasks || [];

  function renderTitle(title: string) {
    const parts = title.split(/(#[\w-]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("#")) return <span key={i} className="text-nred">{part}</span>;
      return <span key={i}>{part}</span>;
    });
  }

  // Keep local editor state in sync with the store (e.g. after import/reset).
  useEffect(() => {
    const d = task.remindAt ? new Date(task.remindAt) : null;
    if (d && !isNaN(d.getTime())) {
      setRDate(toDateInput(d));
      setRTime(toTimeInput(d));
    } else {
      setRDate("");
      setRTime("09:00");
    }
  }, [task.id, task.remindAt]);

  useEffect(() => {
    setNotes(task.notes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  const commitNotes = () => {
    if (notes !== task.notes) onUpdate(task.id, { notes });
  };

  const applyReminder = (date: string, time: string) => {
    const previousId = task.remindAt ? reminderNotificationId(task.id, task.remindAt) : null;
    if (!date) {
      if (task.remindAt) {
        onUpdate(task.id, { remindAt: null });
        if (previousId) void cancelReminderNotification(previousId);
      }
      return;
    }
    const d = parseLocal(date, time);
    const iso = d ? d.toISOString() : null;
    onUpdate(task.id, { remindAt: iso });
    if (d && iso) {
      const nextId = reminderNotificationId(task.id, iso);
      // Moving a reminder re-arms it: drop the alarm we no longer want.
      if (previousId && previousId !== nextId) void cancelReminderNotification(previousId);
      // Native alarms survive the app being closed, unlike the in-WebView check.
      void scheduleReminderNotification({ id: nextId, title: "Reminder", body: task.title, at: d.getTime() });
    }
  };

  const reminderDate = task.remindAt ? new Date(task.remindAt) : null;

  return (
    <div className="border-b border-paper/[0.05] py-3 last:border-0">
      <div className="flex items-center gap-3">
        <Checkbox checked={task.done} onChange={() => onToggle(task.id)} label={task.title} />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? `Hide details for ${task.title}` : `Show details for ${task.title}`}
            className="block w-full text-left"
          >
            <span className={cn("block truncate text-[15px]", task.done ? "text-dim line-through" : "text-paper")}>
              {renderTitle(task.title)}
            </span>
          </button>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            {!task.done && (
              <button
                type="button"
                onClick={() =>
                  onUpdate(task.id, {
                    priority: PRIORITY_CYCLE[(PRIORITY_CYCLE.indexOf(task.priority) + 1) % PRIORITY_CYCLE.length],
                  })
                }
                aria-label={`Change priority (currently ${PRIORITY_LABEL[task.priority]})`}
                className="flex items-center gap-1.5"
              >
                <PriorityDot priority={task.priority} />
                <span className="text-[10px] uppercase tracking-[0.14em] text-dim">{PRIORITY_LABEL[task.priority]}</span>
              </button>
            )}
            {task.due && !task.done && (
              <span
                className={cn(
                  "flex items-center gap-1 text-[10px] uppercase tracking-[0.12em]",
                  overdue ? "text-nred" : "text-mute",
                )}
              >
                <CalendarIcon className="h-3 w-3" />
                {relativeDay(task.due)}
              </span>
            )}
            {task.remindAt && !task.done && reminderDate && (
              <span className="flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-mute">
                <ClockIcon className="h-3 w-3" />
                {fmtTime(reminderDate, settings.h24)}
              </span>
            )}
            {task.repeat !== "none" && (
              <span className="flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-mute">
                <RepeatIcon className="h-3 w-3" />
                {task.repeat === "daily" ? "Daily" : "Weekly"}
                {task.timesDone > 0 && <span className="font-dot tnum text-paper">×{task.timesDone}</span>}
              </span>
            )}
            {task.spent > 0 && (
              <span className="text-[10px] uppercase tracking-[0.12em] text-dim">
                {task.spent} focus{task.spent > 1 ? "es" : ""}
              </span>
            )}
            {subtasks.length > 0 && (
              <span className="flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-dim">
                <ListIcon className="h-3 w-3" />
                {subtasks.filter((s) => s.done).length}/{subtasks.length}
              </span>
            )}
            {task.notes.trim() !== "" && <NoteIcon className="h-3 w-3 text-dim" />}
          </div>
        </div>

        <IconButton
          aria-label={expanded ? "Hide details" : "Show details"}
          onClick={() => setExpanded((v) => !v)}
          className={cn("h-8 w-8 transition-transform", expanded && "rotate-180")}
        >
          <ChevronDown className="h-4 w-4" />
        </IconButton>
        <IconButton tone="danger" aria-label="Delete task" onClick={() => onRemove(task.id)}>
          <TrashIcon className="h-4 w-4" />
        </IconButton>
      </div>

      {expanded && (
        <div className="mt-3 flex flex-col gap-4 pl-9 pr-1">
          {/* Notes */}
          <div>
            <div className="label mb-2">Notes</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={commitNotes}
              onKeyDown={(e) => {
                if (e.key === "Escape") (e.target as HTMLTextAreaElement).blur();
              }}
              rows={3}
              maxLength={1000}
              placeholder="Add notes… (private, stored on this device)"
              className={cn(panelInputCls, "resize-none")}
            />
          </div>

          {/* Subtasks */}
          <div>
            <div className="label mb-2">Checklist</div>
            <div className="flex flex-col gap-2">
              {subtasks.map((st) => (
                <div key={st.id} className="flex items-center gap-2 group">
                  <Checkbox checked={st.done} onChange={() => {
                    const next = subtasks.map((x) => (x.id === st.id ? { ...x, done: !x.done } : x));
                    onUpdate(task.id, { subtasks: next });
                  }} label="" size={18} />
                  <input
                    value={st.title}
                    onChange={(e) => {
                      const next = subtasks.map((x) => (x.id === st.id ? { ...x, title: e.target.value } : x));
                      onUpdate(task.id, { subtasks: next });
                    }}
                    placeholder="Checklist item"
                    className={cn(
                      "flex-1 bg-transparent text-[14px] outline-none placeholder:text-dim",
                      st.done ? "text-dim line-through" : "text-paper"
                    )}
                  />
                  <IconButton tone="danger" className="h-6 w-6 opacity-0 group-hover:opacity-100 focus:opacity-100" onClick={() => {
                    onUpdate(task.id, { subtasks: subtasks.filter((x) => x.id !== st.id) });
                  }}>
                    <TrashIcon className="h-3 w-3" />
                  </IconButton>
                </div>
              ))}
              <div className="flex items-center gap-2 mt-1">
                <PlusIcon className="h-4 w-4 text-dim ml-0.5" />
                <input
                  placeholder="Add item..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.currentTarget.value.trim()) {
                      const next = [...subtasks, { id: uid(), title: e.currentTarget.value.trim(), done: false }];
                      onUpdate(task.id, { subtasks: next });
                      e.currentTarget.value = "";
                    }
                  }}
                  className="flex-1 bg-transparent text-[14px] text-paper outline-none placeholder:text-dim"
                />
              </div>
            </div>
          </div>

          {/* Reminder */}
          <div>
            <div className="label mb-2">Reminder</div>
            <div className="grid grid-cols-[1.4fr_1fr] gap-2">
              <input
                type="date"
                value={rDate}
                onChange={(e) => {
                  const v = e.target.value;
                  setRDate(v);
                  applyReminder(v, rTime);
                }}
                aria-label="Reminder date"
                className={panelInputCls}
              />
              <input
                type="time"
                value={rTime}
                onChange={(e) => {
                  const v = e.target.value;
                  setRTime(v);
                  if (rDate) applyReminder(rDate, v);
                }}
                aria-label="Reminder time"
                className={panelInputCls}
              />
            </div>
            {task.remindAt && reminderDate ? (
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] text-mute">
                  Reminds you {relativeDay(toDateInput(reminderDate))} at {fmtTime(reminderDate, settings.h24)}
                </span>
                <button
                  type="button"
                  onClick={() => onUpdate(task.id, { remindAt: null })}
                  className="label text-dim transition-colors hover:text-nred"
                >
                  Clear
                </button>
              </div>
            ) : (
              <div className="mt-2 text-[11px] text-dim">No reminder set.</div>
            )}
          </div>

          {/* Recurrence */}
          <div>
            <div className="label mb-2">Repeat</div>
            <div className="flex gap-2">
              {REPEAT_OPTIONS.map(([v, label]) => (
                <Chip key={v} active={task.repeat === v} onClick={() => onUpdate(task.id, { repeat: v })}>
                  {v !== "none" && <RepeatIcon className="h-3 w-3" />}
                  {label}
                </Chip>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-dim">
              {task.repeat === "none"
                ? "One-off task."
                : task.repeat === "daily"
                  ? "Completing it re-arms the task for the next day and counts each finish."
                  : "Completing it re-arms the task for the same day next week and counts each finish."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
});

export default function TasksModule() {
  const { tasks, clearCompletedTasks, toggleTask, removeTask, updateTask } = useStore();
  const { settings } = useSettings();
  const [filter, setFilter] = useState<Filter>("today");
  const [search, setSearch] = useState("");
  const today = dateKey();

  const counts = useMemo(() => {
    const open = tasks.filter((t) => !t.done);
    return {
      today: open.filter((t) => (t.due && t.due <= today) || !t.due).length,
      upcoming: open.filter((t) => t.due && t.due > today).length,
      all: open.length,
      done: tasks.filter((t) => t.done).length,
    };
  }, [tasks, today]);

  const visible = useMemo(() => {
    const sorted = [...tasks].sort(sortTasks);
    const q = search.trim().toLowerCase();
    const matches = (t: Task) =>
      q === "" || t.title.toLowerCase().includes(q) || t.notes.toLowerCase().includes(q);
    switch (filter) {
      case "today":
        return sorted.filter((t) => !t.done && ((t.due && t.due <= today) || !t.due) && matches(t));
      case "upcoming":
        return sorted.filter((t) => !t.done && t.due && t.due > today && matches(t));
      case "done":
        return sorted
          .filter((t) => t.done && matches(t))
          .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
      default:
        return sorted.filter((t) => !t.done && matches(t));
    }
  }, [tasks, filter, today, search]);

  const completedToday = tasksCompletedOn(tasks, today);
  const searching = search.trim() !== "";

  const tags = useMemo(() => {
    const set = new Set<string>();
    for (const t of tasks) {
      if (t.done && filter !== "done") continue;
      const matches = t.title.match(/#[\w-]+/g);
      if (matches) matches.forEach((m) => set.add(m.toLowerCase()));
    }
    return Array.from(set).sort();
  }, [tasks, filter]);

  return (
    <div className="flex flex-col gap-3 animate-fade-up">
      <PageIntro
        eyebrow="Tasks"
        title={settings.name ? `${settings.name}'s task list` : "What matters today"}
        description="Capture it, prioritise it, do it. Tasks support notes, reminders and daily or weekly recurrence — all stored on your device."
      >
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusPill red>{counts.all} open</StatusPill>
          <StatusPill>{completedToday} done today</StatusPill>
        </div>
      </PageIntro>

      <Composer />

      <Widget className="flex items-center gap-2.5 p-3">
        <SearchIcon className="h-4 w-4 shrink-0 text-dim" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tasks & notes…"
          aria-label="Search tasks"
          className="min-w-0 flex-1 bg-transparent py-2 text-[15px] text-paper outline-none placeholder:text-dim"
        />
        {searching && (
          <button type="button" onClick={() => setSearch("")} className="label text-mute transition-colors hover:text-paper">
            Clear
          </button>
        )}
      </Widget>

      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1">
        {(
          [
            ["today", "Today", counts.today],
            ["upcoming", "Upcoming", counts.upcoming],
            ["all", "All", counts.all],
            ["done", "Done", counts.done],
          ] as [Filter, string, number][]
        ).map(([id, label, n]) => (
          <Chip key={id} active={filter === id} onClick={() => setFilter(id)}>
            {label}
            <span className={cn("font-dot tnum text-[11px]", filter === id ? "text-ink/70" : "text-dim")}>{n}</span>
          </Chip>
        ))}
      </div>

      {tags.length > 0 && (
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          {tags.map((tag) => {
            const active = search.toLowerCase().includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  if (active) {
                    setSearch(search.replace(new RegExp(`\\s*${tag}\\s*`, "gi"), " ").trim());
                  } else {
                    setSearch((search + " " + tag).trim());
                  }
                }}
                className={cn(
                  "rounded-md border px-2 py-1 text-[11px] transition-colors",
                  active
                    ? "border-nred bg-nred/10 text-nred"
                    : "border-paper/[0.08] text-mute hover:bg-paper/[0.04] hover:text-paper"
                )}
              >
                {tag}
              </button>
            );
          })}
        </div>
      )}

      <Widget className="px-4 py-1">
        {visible.length === 0 ? (
          <EmptyState
            icon={<ListIcon className="h-6 w-6" />}
            title={searching ? "No matches" : filter === "done" ? "Nothing completed yet" : "All clear"}
            description={
              searching
                ? `Nothing matches “${search.trim()}”.`
                : filter === "done"
                  ? "Completed tasks will collect here."
                  : "Add a task above to start planning your day."
            }
          />
        ) : (
          visible.map((t) => <TaskRow key={t.id} task={t} onToggle={toggleTask} onRemove={removeTask} onUpdate={updateTask} />)
        )}
      </Widget>

      {filter === "done" && counts.done > 0 && (
        <div className="px-2">
          <button
            type="button"
            onClick={clearCompletedTasks}
            className="w-full rounded-full border border-paper/[0.1] py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-mute transition-colors hover:border-nred/50 hover:text-nred"
          >
            Clear completed
          </button>
        </div>
      )}

      <Widget>
        <SectionHeader title="Today at a glance" />
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-2xl bg-ink py-4">
            <Num value={counts.all} className="text-[30px] text-paper" />
            <div className="label mt-1">open</div>
          </div>
          <div className="rounded-2xl bg-ink py-4">
            <Num value={completedToday} className="text-[30px] text-paper" />
            <div className="label mt-1">done</div>
          </div>
          <div className="rounded-2xl bg-ink py-4">
            <Num
              value={counts.all + completedToday === 0 ? 0 : Math.round((completedToday / (counts.all + completedToday)) * 100)}
              className="text-[30px] text-nred"
            />
            <div className="label mt-1">% done</div>
          </div>
        </div>
      </Widget>
    </div>
  );
}
