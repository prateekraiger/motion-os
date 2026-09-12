import { useMemo } from "react";
import { useNow } from "../hooks/useNow";
import { useSettings } from "../hooks/useSettings";
import { useStore } from "../hooks/useStore";
import { focusMsOn, habitDoneToday, isOverdue, nextReminder, sortTasks, tasksCompletedOn } from "../lib/productivity";
import {
  computeAge,
  dateKey,
  dayProgress,
  fmtClock,
  fmtDate,
  fmtDuration,
  fmtTime,
  greeting,
  yearProgress,
} from "../lib/time";
import type { View } from "../lib/nav";
import { Checkbox, DotBar, IconButton, Label, Num, PriorityDot, StatTile, Widget } from "./ui";
import { BoltIcon, ChevronRight, ClockIcon, FlameIcon, PauseIcon, PlayIcon } from "./icons";
import { cn } from "../utils/cn";

function CardLink({ children, onClick, className }: { children: React.ReactNode; onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={cn("w-full text-left", className)}>
      {children}
    </button>
  );
}

export default function TodayModule({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { settings, birthDate } = useSettings();
  const { tasks, habits, sessions, timer, startTimer, pauseTimer, toggleTask, toggleHabit } = useStore();
  const now = useNow(timer.status === "running" ? 4 : 1);
  const nowDate = useMemo(() => new Date(now), [now]);
  const today = dateKey(nowDate);

  const dp = dayProgress(nowDate);
  const yp = yearProgress(nowDate);
  const age = birthDate ? computeAge(birthDate, nowDate) : null;

  const openTasks = useMemo(
    () =>
      [...tasks]
        .filter((t) => !t.done && ((t.due && t.due <= today) || !t.due))
        .sort(sortTasks)
        .slice(0, 4),
    [tasks, today],
  );
  const openCount = tasks.filter((t) => !t.done).length;
  const doneToday = tasksCompletedOn(tasks, today);
  const overdueCount = tasks.filter((t) => isOverdue(t, nowDate)).length;
  const nextRem = useMemo(() => nextReminder(tasks, now), [tasks, now]);

  const focusToday = focusMsOn(sessions, today);
  const habitsDone = habits.filter((h) => habitDoneToday(h, nowDate)).length;

  const running = timer.status === "running";
  const remaining = running && timer.endsAt != null ? Math.max(0, timer.endsAt - now) : timer.remainingMs;

  const dayLeftHours = Math.floor(dp.remainingMs / 3_600_000);
  const dayLeftMin = Math.floor((dp.remainingMs % 3_600_000) / 60_000);

  return (
    <div className="flex flex-col gap-3 animate-fade-up">
      {/* GREETING */}
      <div className="px-2 pb-1 pt-4">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-nred animate-dot-pulse" />
          <span className="label text-mute">{fmtDate(nowDate)}</span>
        </div>
        <h1 className="font-dot mt-3 text-[32px] leading-[1] text-paper whitespace-nowrap overflow-hidden text-ellipsis">
          {greeting(nowDate)}
          {settings.name ? `,` : "."}
          {settings.name && <span className="text-mute"> {settings.name}.</span>}
        </h1>
        <p className="mt-2 text-[13px] text-mute">
          {openCount === 0
            ? "No open tasks. Enjoy the clear runway."
            : `${openCount} open ${openCount === 1 ? "task" : "tasks"}${overdueCount ? ` · ${overdueCount} overdue` : ""}.`}
        </p>
      </div>

      {/* NEXT REMINDER */}
      {nextRem && (
        <button
          type="button"
          onClick={() => onNavigate("tasks")}
          className="flex w-full items-center gap-3 rounded-[20px] border border-paper/[0.08] bg-card px-4 py-3 text-left transition-colors hover:border-paper/[0.2]"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-nred/40 bg-nred/10 text-nred">
            <ClockIcon className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="label block text-nred">Next reminder</span>
            <span className="block truncate text-[13px] text-paper">{nextRem.task.title}</span>
          </span>
          <span className="shrink-0 text-right">
            <span className="font-dot tnum block text-[14px] text-paper">{fmtTime(new Date(nextRem.at), settings.h24)}</span>
            <span className="label block">{fmtDuration(nextRem.at - now)}</span>
          </span>
        </button>
      )}

      {/* DAY PROGRESS */}
      <Widget>
        <div className="flex items-center justify-between">
          <Label red>Today</Label>
          <time className="font-dot tnum text-[15px] text-paper">{fmtTime(nowDate, settings.h24)}</time>
        </div>
        <DotBar fraction={dp.fraction} count={40} className="mt-4" />
        <div className="mt-3 flex items-center justify-between">
          <span className="label">{Math.round(dp.fraction * 100)}% of the day gone</span>
          <span className="label text-paper">
            {dayLeftHours}h {dayLeftMin}m left
          </span>
        </div>
      </Widget>

      {/* QUICK STATS */}
      <div className="grid grid-cols-3 gap-3">
        <CardLink onClick={() => onNavigate("tasks")}>
          <StatTile value={doneToday} label="Done today" />
        </CardLink>
        <CardLink onClick={() => onNavigate("focus")}>
          <StatTile value={fmtDuration(focusToday)} label="Focused" accent />
        </CardLink>
        <CardLink onClick={() => onNavigate("habits")}>
          <StatTile value={`${habitsDone}/${habits.length || 0}`} label="Habits" />
        </CardLink>
      </div>

      {/* FOCUS CTA */}
      <Widget className={cn(running && "border-nred/40 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-nred/10 via-card to-card shadow-[0_0_20px_rgba(255,0,0,0.05)]")}>
        <div className="flex items-center justify-between">
          <div>
            <Label red={running}>{running ? "Focus in motion" : "Focus"}</Label>
            <div className="mt-2 flex items-baseline gap-2">
              <Num value={fmtClock(remaining)} className="text-[40px] text-paper" />
              <span className="label">{timer.phase === "work" ? "focus" : "break"}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={running ? pauseTimer : startTimer}
              aria-label={running ? "Pause" : "Start"}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-paper text-ink transition-transform active:scale-95"
            >
              {running ? <PauseIcon className="h-6 w-6" /> : <PlayIcon className="ml-0.5 h-6 w-6" />}
            </button>
            <IconButton aria-label="Open focus" onClick={() => onNavigate("focus")} className="h-14 w-10">
              <ChevronRight className="h-5 w-5" />
            </IconButton>
          </div>
        </div>
      </Widget>

      {/* TASKS */}
      <Widget className="px-4">
        <div className="flex items-center justify-between py-1">
          <Label>Up next</Label>
          <button type="button" onClick={() => onNavigate("tasks")} className="label flex items-center gap-1 text-mute hover:text-paper">
            All tasks <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        {openTasks.length === 0 ? (
          <div className="flex items-center gap-3 py-4 text-[13px] text-dim">
            <BoltIcon className="h-4 w-4" /> Nothing queued. Add a task to get moving.
          </div>
        ) : (
          openTasks.map((t) => (
            <div key={t.id} className="flex items-center gap-3 border-t border-paper/[0.05] py-3">
              <Checkbox checked={t.done} onChange={() => toggleTask(t.id)} label={t.title} size={22} />
              <span className="min-w-0 flex-1 truncate text-[14px] text-paper">{t.title}</span>
              {isOverdue(t, nowDate) && <span className="text-[10px] uppercase tracking-[0.12em] text-nred">Overdue</span>}
              <PriorityDot priority={t.priority} />
            </div>
          ))
        )}
      </Widget>

      {/* HABITS */}
      {habits.length > 0 && (
        <Widget>
          <div className="flex items-center justify-between">
            <Label>Habits today</Label>
            <button type="button" onClick={() => onNavigate("habits")} className="label flex items-center gap-1 text-mute hover:text-paper">
              All <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {habits.slice(0, 4).map((h) => {
              const done = habitDoneToday(h, nowDate);
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => toggleHabit(h.id, today)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-colors",
                    done ? "border-transparent bg-paper/[0.05]" : "border-paper/[0.06] bg-ink",
                  )}
                >
                  <span
                    className={cn("flex h-6 w-6 items-center justify-center rounded-full border-2 text-ink", !done && "border-line")}
                    style={done ? { background: h.color, borderColor: h.color } : undefined}
                  >
                    {done && <span className="text-[13px] leading-none">✓</span>}
                  </span>
                  <span className={cn("flex-1 text-[14px]", done ? "text-mute line-through" : "text-paper")}>{h.name}</span>
                  <FlameIcon className={cn("h-4 w-4", done ? "text-nred" : "text-dim")} />
                </button>
              );
            })}
          </div>
        </Widget>
      )}

      {/* PERSPECTIVE */}
      <CardLink onClick={() => onNavigate("year")}>
        <Widget className="active:scale-[0.99] transition-transform">
          <div className="flex items-center justify-between">
            <Label>Perspective</Label>
            <ChevronRight className="h-4 w-4 text-dim" />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <Num value={`${yp.percent.toFixed(2)}%`} className="text-[30px] text-paper" />
              <div className="label mt-1">of {yp.year}</div>
            </div>
            {age && (
              <div className="text-right">
                <Num value={age.decimalYears.toFixed(4)} className="text-[30px] text-paper" />
                <div className="label mt-1">years lived</div>
              </div>
            )}
          </div>
          <DotBar fraction={yp.fraction} count={40} className="mt-4" />
        </Widget>
      </CardLink>
    </div>
  );
}
