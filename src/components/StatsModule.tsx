import { useMemo, useState } from "react";
import { useNow } from "../hooks/useNow";
import { useStore } from "../hooks/useStore";
import {
  dailyStats,
  focusWeeks,
  habitWindowCompletion,
  habitStreak,
  tagTotals,
  usedTags,
  type DayStat,
} from "../lib/productivity";
import { dateKey, fmtDuration } from "../lib/time";
import { Chip, DotBar, Label, PageIntro, StatTile, StatusPill, Widget } from "./ui";
import Heatmap from "./Heatmap";
import { FlameIcon } from "./icons";
import { cn } from "../utils/cn";

const CHART_HEIGHT = 88;

/** Vertical bar chart in the app's dot-led language: one column per day. */
function DayChart({
  days,
  value,
  format,
}: {
  days: DayStat[];
  value: (d: DayStat) => number;
  format: (v: number) => string;
}) {
  const max = Math.max(1, ...days.map(value));
  return (
    <div className="flex items-end justify-between gap-1.5">
      {days.map((d) => {
        const v = value(d);
        const h = v > 0 ? Math.max(8, Math.round((v / max) * CHART_HEIGHT)) : 3;
        return (
          <div key={d.key} className="flex min-w-0 flex-1 flex-col items-center gap-2" title={format(v)}>
            <div className="flex w-full flex-col items-center justify-end" style={{ height: CHART_HEIGHT }}>
              <div
                className={cn(
                  "w-full max-w-[26px] rounded-t-[6px] transition-all duration-500",
                  v === 0 ? "h-[3px] bg-line" : d.isToday ? "bg-nred" : "bg-paper",
                )}
                style={v > 0 ? { height: h } : undefined}
              />
            </div>
            <span className={cn("text-[10px] font-medium", d.isToday ? "text-paper" : "text-dim")}>{d.label}</span>
            <span className={cn("font-dot tnum text-[9px] leading-none", v === 0 ? "text-dim/60" : "text-mute")}>
              {v === 0 ? "–" : format(v)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function StatsModule() {
  const { tasks, habits, sessions } = useStore();
  const now = useNow(1);
  const today = dateKey(new Date(now));
  const [tag, setTag] = useState<string | null>(null);

  // Recompute once per calendar day, not once per second.
  const days = useMemo(() => dailyStats(sessions, tasks, 7, new Date(now)), [sessions, tasks, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const weeks = useMemo(() => focusWeeks(sessions, new Date(now)), [sessions, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const habitWindow = useMemo(() => habitWindowCompletion(habits, 7, new Date(now)), [habits, today]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Completions of one habit inside the charted 7-day window. */
  const doneInWindow = (history: Record<string, boolean>) =>
    days.reduce((n, d) => n + (history[d.key] ? 1 : 0), 0);

  const weekDone = days.reduce((n, d) => n + d.done, 0);
  const openCount = tasks.filter((t) => !t.done).length;
  const bestTasks = days.reduce((best, d) => (d.done > best.done ? d : best), days[0]);
  const hasFocus = days.some((d) => d.ms > 0);
  const hasCompletions = days.some((d) => d.done > 0);
  const weekDelta = weeks.lastWeek > 0 ? Math.round(((weeks.thisWeek - weeks.lastWeek) / weeks.lastWeek) * 100) : null;

  const tags = useMemo(() => usedTags(sessions), [sessions]);
  const tagBreakdown = useMemo(() => tagTotals(sessions), [sessions]);
  const tagMax = tagBreakdown[0]?.ms ?? 1;
  const taggedSessions = useMemo(
    () => sessions.filter((s) => !tag || (s.tag ?? "").toLowerCase() === tag.toLowerCase()).length,
    [sessions, tag],
  );

  return (
    <div className="flex flex-col gap-3 animate-fade-up">
      <PageIntro
        eyebrow="Stats"
        title="Your motion, measured"
        description="Seven days of focus, tasks and habits at a glance. History is stored on this device — nothing leaves it."
      >
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusPill red>{fmtDuration(weeks.thisWeek)} this week</StatusPill>
          <StatusPill>{weekDone} tasks done · 7d</StatusPill>
        </div>
      </PageIntro>

      {/* FOCUS */}
      <Widget>
        <div className="flex items-center justify-between">
          <Label red>Focus — last 7 days</Label>
          {!hasFocus && <span className="label">No sessions logged yet</span>}
        </div>
        <div className="mt-5">
          <DayChart days={days} value={(d) => d.ms} format={(v) => fmtDuration(v)} />
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <StatTile value={fmtDuration(weeks.thisWeek)} label="This week" accent />
          <StatTile value={fmtDuration(weeks.lastWeek)} label="Last week" />
          <StatTile
            value={weekDelta == null ? "—" : `${weekDelta >= 0 ? "+" : ""}${weekDelta}%`}
            label="Week over week"
          />
        </div>
      </Widget>

      {/* HEATMAP */}
      <Widget>
        <div className="flex items-center justify-between">
          <Label red>Focus heatmap</Label>
          <span className="label">{tag ? `#${tag}` : "all tags"}</span>
        </div>
        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip active={tag === null} onClick={() => setTag(null)}>
              All
            </Chip>
            {tags.map((t) => (
              <Chip key={t} active={tag === t} onClick={() => setTag(tag === t ? null : t)}>
                #{t}
              </Chip>
            ))}
          </div>
        )}
        <Heatmap sessions={sessions} tag={tag} className="mt-4" />
        {taggedSessions === 0 && (
          <p className="mt-3 text-[11px] leading-relaxed text-dim">
            Tag a focus block in the Focus module (for example <span className="text-mute">#DeepWork</span>) and it shows
            up here.
          </p>
        )}
      </Widget>

      {/* TAG BREAKDOWN */}
      {tagBreakdown.length > 0 && (
        <Widget>
          <Label>Where the time went</Label>
          <div className="mt-2">
            {tagBreakdown.map((entry) => (
              <div
                key={entry.tag}
                className="flex items-center gap-3 border-b border-paper/[0.05] py-2.5 last:border-0"
              >
                <span className="w-24 shrink-0 truncate font-dot text-[13px] text-paper">#{entry.tag}</span>
                <span className="min-w-0 flex-1">
                  <DotBar fraction={entry.ms / tagMax} count={20} size="sm" activeRed={false} />
                </span>
                <span className="font-dot tnum w-16 shrink-0 text-right text-[12px] text-mute">
                  {fmtDuration(entry.ms)}
                </span>
                <span className="label w-10 shrink-0 text-right">{entry.sessions}×</span>
              </div>
            ))}
          </div>
        </Widget>
      )}

      {/* TASKS */}
      <Widget>
        <div className="flex items-center justify-between">
          <Label>Tasks — last 7 days</Label>
          {!hasCompletions && <span className="label">Nothing completed yet</span>}
        </div>
        <div className="mt-5">
          <DayChart days={days} value={(d) => d.done} format={(v) => `${v}`} />
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <StatTile value={weekDone} label="Done · 7d" />
          <StatTile value={openCount} label="Open now" />
          <StatTile value={bestTasks.done > 0 ? bestTasks.done : "—"} label="Best day" />
        </div>
      </Widget>

      {/* HABITS */}
      <Widget>
        <div className="flex items-center justify-between">
          <Label>Habits — last 7 days</Label>
          {habits.length > 0 && (
            <span className="font-dot tnum text-[15px] text-paper">
              {habitWindow.possible > 0 ? Math.round((habitWindow.done / habitWindow.possible) * 100) : 0}%
            </span>
          )}
        </div>
        {habits.length === 0 ? (
          <p className="mt-4 text-[12px] leading-relaxed text-dim">Add a habit to see its 7-day consistency here.</p>
        ) : (
          <>
            <DotBar fraction={habitWindow.possible > 0 ? habitWindow.done / habitWindow.possible : 0} count={28} className="mt-4" />
            <div className="mt-4 flex flex-col">
              {habits.map((h) => {
                const streak = habitStreak(h);
                return (
                  <div
                    key={h.id}
                    className="flex items-center gap-3 border-t border-paper/[0.05] py-3 first:border-0"
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: h.color }} />
                    <span className="min-w-0 flex-1 truncate text-[14px] text-paper">{h.name}</span>
                    <span className="font-dot tnum text-[13px] text-mute">{doneInWindow(h.history)}/7</span>
                    <span className="flex items-center gap-1 text-[11px] text-dim">
                      <FlameIcon className={cn("h-3.5 w-3.5", streak > 0 ? "text-nred" : "text-dim")} />
                      {streak}d
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Widget>

      <div className="px-2 pb-2 text-center">
        <div className="font-dot text-[14px] text-mute">MOTION OS</div>
        <div className="label mt-1">Stats & history · Stored on device</div>
      </div>
    </div>
  );
}
