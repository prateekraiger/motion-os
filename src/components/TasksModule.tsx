import { useMemo, useState } from "react";
import { useStore } from "../hooks/useStore";
import { useSettings } from "../hooks/useSettings";
import { isOverdue, sortTasks } from "../lib/productivity";
import { dateKey, relativeDay } from "../lib/time";
import type { Priority, Task } from "../lib/types";
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
import { CalendarIcon, ListIcon, PlusIcon, TrashIcon } from "./icons";
import { cn } from "../utils/cn";

type Filter = "today" | "upcoming" | "all" | "done";

const PRIORITY_LABEL: Record<Priority, string> = { high: "High", med: "Med", low: "Low" };
const PRIORITY_CYCLE: Priority[] = ["med", "high", "low"];

function Composer() {
  const { addTask } = useStore();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("med");
  const [due, setDue] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const submit = () => {
    if (!title.trim()) return;
    addTask({ title, priority, due });
    setTitle("");
    setDue(null);
    setPriority("med");
    setOpen(false);
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
        <IconButton tone="solid" onClick={submit} disabled={!title.trim()} aria-label="Add task">
          <PlusIcon className="h-4 w-4" />
        </IconButton>
      </div>

      {open && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-3">
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
                : "border-white/[0.1] text-mute hover:text-paper",
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
        </div>
      )}
    </Widget>
  );
}

function TaskRow({ task }: { task: Task }) {
  const { toggleTask, removeTask, updateTask } = useStore();
  const overdue = isOverdue(task);

  return (
    <div className="group flex items-center gap-3 border-b border-white/[0.05] py-3 last:border-0">
      <Checkbox checked={task.done} onChange={() => toggleTask(task.id)} label={task.title} />
      <button
        type="button"
        onClick={() =>
          updateTask(task.id, {
            priority: PRIORITY_CYCLE[(PRIORITY_CYCLE.indexOf(task.priority) + 1) % PRIORITY_CYCLE.length],
          })
        }
        disabled={task.done}
        className="min-w-0 flex-1 text-left"
        aria-label="Task"
      >
        <div className={cn("truncate text-[15px]", task.done ? "text-dim line-through" : "text-paper")}>
          {task.title}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          {!task.done && (
            <span className="flex items-center gap-1.5">
              <PriorityDot priority={task.priority} />
              <span className="text-[10px] uppercase tracking-[0.14em] text-dim">{PRIORITY_LABEL[task.priority]}</span>
            </span>
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
          {task.spent > 0 && (
            <span className="text-[10px] uppercase tracking-[0.12em] text-dim">
              {task.spent} focus{task.spent > 1 ? "es" : ""}
            </span>
          )}
        </div>
      </button>

      <IconButton tone="danger" aria-label="Delete task" onClick={() => removeTask(task.id)}>
        <TrashIcon className="h-4 w-4" />
      </IconButton>
    </div>
  );
}

export default function TasksModule() {
  const { tasks, clearCompletedTasks } = useStore();
  const { settings } = useSettings();
  const [filter, setFilter] = useState<Filter>("today");
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
    switch (filter) {
      case "today":
        return sorted.filter((t) => !t.done && ((t.due && t.due <= today) || !t.due));
      case "upcoming":
        return sorted.filter((t) => !t.done && t.due && t.due > today);
      case "done":
        return sorted.filter((t) => t.done).sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
      default:
        return sorted.filter((t) => !t.done);
    }
  }, [tasks, filter, today]);

  const completedToday = tasks.filter((t) => t.done && t.completedAt && dateKey(new Date(t.completedAt)) === today).length;

  return (
    <div className="flex flex-col gap-3 animate-fade-up">
      <PageIntro
        eyebrow="Tasks"
        title={settings.name ? `${settings.name}'s task list` : "What matters today"}
        description="Capture it, prioritise it, do it. Tasks are stored on your device and can power your focus sessions."
      >
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusPill red>{counts.all} open</StatusPill>
          <StatusPill>{completedToday} done today</StatusPill>
        </div>
      </PageIntro>

      <Composer />

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

      <Widget className="px-4 py-1">
        {visible.length === 0 ? (
          <EmptyState
            icon={<ListIcon className="h-6 w-6" />}
            title={filter === "done" ? "Nothing completed yet" : "All clear"}
            description={
              filter === "done"
                ? "Completed tasks will collect here."
                : "Add a task above to start planning your day."
            }
          />
        ) : (
          visible.map((t) => <TaskRow key={t.id} task={t} />)
        )}
      </Widget>

      {filter === "done" && counts.done > 0 && (
        <div className="px-2">
          <button
            type="button"
            onClick={clearCompletedTasks}
            className="w-full rounded-full border border-white/[0.1] py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-mute transition-colors hover:border-nred/50 hover:text-nred"
          >
            Clear completed
          </button>
        </div>
      )}

      <Widget>
        <SectionHeader title="Today at a glance" />
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-2xl bg-black py-4">
            <Num value={counts.all} className="text-[30px] text-paper" />
            <div className="label mt-1">open</div>
          </div>
          <div className="rounded-2xl bg-black py-4">
            <Num value={completedToday} className="text-[30px] text-paper" />
            <div className="label mt-1">done</div>
          </div>
          <div className="rounded-2xl bg-black py-4">
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
