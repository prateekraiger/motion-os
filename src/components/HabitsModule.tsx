import { useMemo, useState } from "react";
import { useStore } from "../hooks/useStore";
import {
  habitBestStreak,
  habitCompletionsThisWeek,
  habitDoneOn,
  habitDoneToday,
  habitStreak,
  lastNDays,
  weekKeys,
} from "../lib/productivity";
import { dateKey } from "../lib/time";
import type { Habit } from "../lib/types";
import { HABIT_COLORS } from "../lib/types";
import {
  Checkbox,
  EmptyState,
  IconButton,
  Label,
  PageIntro,
  StatTile,
  StatusPill,
  Widget,
} from "./ui";
import { FlameIcon, PlusIcon, TargetIcon, TrashIcon, XIcon } from "./icons";
import { cn } from "../utils/cn";

const WEEK_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

function Composer({ onClose }: { onClose: () => void }) {
  const { addHabit } = useStore();
  const [name, setName] = useState("");
  const [target, setTarget] = useState(7);
  const [color, setColor] = useState<string>(HABIT_COLORS[0]);

  const submit = () => {
    if (!name.trim()) return;
    addHabit({ name, target, color });
    onClose();
  };

  return (
    <Widget>
      <div className="flex items-center justify-between">
        <Label red>New habit</Label>
        <IconButton aria-label="Cancel" onClick={onClose}>
          <XIcon className="h-4 w-4" />
        </IconButton>
      </div>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="e.g. Read 20 minutes"
        maxLength={40}
        className="mt-4 w-full rounded-2xl border border-paper/[0.08] bg-ink px-4 py-3 text-[15px] text-paper outline-none focus:border-paper/60 placeholder:text-dim"
      />

      <div className="mt-4 flex items-center gap-2.5">
        {HABIT_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Colour ${c}`}
            onClick={() => setColor(c)}
            style={{ background: c }}
            className={cn(
              "h-7 w-7 rounded-full transition-transform",
              color === c ? "scale-110 ring-2 ring-paper ring-offset-2 ring-offset-card" : "opacity-70",
            )}
          />
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <div className="label">Weekly goal</div>
        <div className="flex items-center gap-3">
          <IconButton aria-label="Less" onClick={() => setTarget((t) => Math.max(1, t - 1))} className="border border-paper[0.1]">
            <span className="text-lg leading-none">−</span>
          </IconButton>
          <span className="font-dot tnum w-14 text-center text-[22px] text-paper">{target}×</span>
          <IconButton aria-label="More" onClick={() => setTarget((t) => Math.min(7, t + 1))} className="border border-paper[0.1]">
            <span className="text-lg leading-none">+</span>
          </IconButton>
        </div>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={!name.trim()}
        className={cn(
          "mt-5 w-full rounded-full py-3.5 text-[11px] font-semibold uppercase tracking-[0.2em] transition-all",
          name.trim() ? "bg-paper text-ink active:scale-[0.98]" : "bg-card-2 text-dim",
        )}
      >
        Add habit
      </button>
    </Widget>
  );
}

function HabitCard({ habit }: { habit: Habit }) {
  const { toggleHabit, removeHabit } = useStore();
  const [confirm, setConfirm] = useState(false);
  const today = dateKey();
  const week = useMemo(() => weekKeys(), []);
  const trail = useMemo(() => lastNDays(28), []);

  const streak = habitStreak(habit);
  const best = habitBestStreak(habit);
  const weekCount = habitCompletionsThisWeek(habit);
  const doneToday = habitDoneToday(habit);

  return (
    <Widget>
      <div className="flex items-start gap-3">
        <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full" style={{ background: habit.color }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[16px] text-paper">{habit.name}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-1 text-[11px] text-mute">
              <FlameIcon className={cn("h-3.5 w-3.5", streak > 0 ? "text-nred" : "text-dim")} />
              {streak} day streak
            </span>
            <span className="flex items-center gap-1 text-[11px] text-dim">
              <TargetIcon className="h-3.5 w-3.5" />
              {weekCount}/{habit.target} this week
            </span>
          </div>
        </div>
        <Checkbox checked={doneToday} onChange={() => toggleHabit(habit.id, today)} accent={habit.color} label={`Mark ${habit.name} done`} />
      </div>

      {/* Week toggles */}
      <div className="mt-4 flex items-center justify-between gap-1">
        {week.map((key, i) => {
          const done = habitDoneOn(habit, key);
          const future = key > today;
          const isToday = key === today;
          return (
            <button
              key={key}
              type="button"
              disabled={future}
              onClick={() => toggleHabit(habit.id, key)}
              className="flex flex-1 flex-col items-center gap-1.5 disabled:opacity-30"
            >
              <span className={cn("text-[10px] font-medium", isToday ? "text-paper" : "text-dim")}>{WEEK_LETTERS[i]}</span>
              <span
                className={cn("h-6 w-6 rounded-lg border transition-all", done ? "border-transparent" : "border-line", isToday && !done && "border-mute")}
                style={done ? { background: habit.color } : undefined}
              />
            </button>
          );
        })}
      </div>

      {/* 28-day trail */}
      <div className="mt-4 flex items-center gap-2 border-t border-paper/[0.06] pt-4">
        <span className="label shrink-0">28d</span>
        <div className="flex flex-1 items-center justify-between">
          {trail.map((key) => {
            const done = habitDoneOn(habit, key);
            return (
              <span
                key={key}
                className={cn("h-2 w-2 rounded-[2px]", !done && "bg-line")}
                style={done ? { background: habit.color } : undefined}
              />
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="label">Best streak: <span className="text-paper">{best}</span></span>
        {confirm ? (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setConfirm(false)} className="label text-mute">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => removeHabit(habit.id)}
              className="rounded-full bg-nred/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-paper"
            >
              Delete
            </button>
          </div>
        ) : (
          <IconButton tone="danger" aria-label="Delete habit" onClick={() => setConfirm(true)}>
            <TrashIcon className="h-4 w-4" />
          </IconButton>
        )}
      </div>
    </Widget>
  );
}

export default function HabitsModule() {
  const { habits } = useStore();
  const [composing, setComposing] = useState(false);
  const today = dateKey();

  const doneToday = habits.filter((h) => habitDoneToday(h)).length;
  const bestStreak = habits.reduce((m, h) => Math.max(m, habitStreak(h)), 0);

  return (
    <div className="flex flex-col gap-3 animate-fade-up">
      <PageIntro
        eyebrow="Habits"
        title="Small things, every day"
        description="Consistency compounds. Tap a day to mark it done and watch your streak grow, one dot at a time."
      >
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusPill red>{doneToday}/{habits.length || 0} today</StatusPill>
          <StatusPill>{bestStreak} day best streak</StatusPill>
        </div>
      </PageIntro>

      {habits.length > 0 && (
        <Widget>
          <Label>Today</Label>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <StatTile value={doneToday} label="Done" accent />
            <StatTile value={Math.max(0, habits.length - doneToday)} label="Left" />
            <StatTile value={habits.length ? Math.round((doneToday / habits.length) * 100) : 0} label="% done" />
          </div>
        </Widget>
      )}

      {composing ? (
        <Composer onClose={() => setComposing(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setComposing(true)}
          className="flex items-center justify-center gap-2 rounded-[28px] border border-dashed border-paper/[0.14] py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-mute transition-colors hover:border-paper/40 hover:text-paper"
        >
          <PlusIcon className="h-4 w-4" /> New habit
        </button>
      )}

      {habits.length === 0 && !composing ? (
        <Widget>
          <EmptyState
            icon={<FlameIcon className="h-6 w-6" />}
            title="Build your first habit"
            description="Reading, water, workouts, journaling — anything you want to do consistently."
          />
        </Widget>
      ) : (
        habits.map((h) => <HabitCard key={h.id} habit={h} />)
      )}

      <div className="px-2 pb-2 text-center text-[11px] leading-relaxed text-dim">
        {today && `Streaks reset only when you skip a day. Marked days stay on this device.`}
      </div>
    </div>
  );
}
