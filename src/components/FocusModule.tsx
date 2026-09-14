import { useMemo } from "react";
import { useNow } from "../hooks/useNow";
import { useStore } from "../hooks/useStore";
import { useAmbientSound } from "../hooks/useAmbientSound";
import { focusMsOn, phaseDurationMs, sessionsOn } from "../lib/productivity";
import { clamp, dateKey, fmtClock, fmtDuration } from "../lib/time";
import type { FocusPhase } from "../lib/types";
import {
  Chip,
  DotRing,
  IconButton,
  Label,
  Num,
  PageIntro,
  Segmented,
  StatTile,
  StatusPill,
  Widget,
} from "./ui";
import { PauseIcon, PlayIcon, ResetIcon, SkipIcon, TargetIcon } from "./icons";
import { cn } from "../utils/cn";

const PHASE_META: Record<FocusPhase, { label: string; hint: string }> = {
  work: { label: "Focus", hint: "Deep work — one thing at a time." },
  shortBreak: { label: "Short break", hint: "Stand up, breathe, look away from the screen." },
  longBreak: { label: "Long break", hint: "Step away. You earned it." },
};

export default function FocusModule() {
  const { timer, focusConfig, sessions, tasks, startTimer, pauseTimer, resetTimer, skipPhase, setTimerTask, setFocusPhase, updateFocusConfig } =
    useStore();
  
  // Start ambient sound engine
  useAmbientSound();
  const now = useNow(timer.status === "running" ? 4 : 1);

  const total = phaseDurationMs(timer.phase, focusConfig);
  const remaining =
    timer.status === "running" && timer.endsAt != null ? Math.max(0, timer.endsAt - now) : timer.remainingMs;
  const elapsedFraction = clamp(1 - remaining / total, 0, 1);
  const isWork = timer.phase === "work";
  const running = timer.status === "running";

  const today = dateKey();
  const todaySessions = useMemo(() => sessionsOn(sessions, today), [sessions, today]);
  const todayFocusMs = useMemo(() => focusMsOn(sessions, today), [sessions, today]);
  const completedToday = todaySessions.filter((s) => s.completed).length;

  const openTasks = useMemo(() => tasks.filter((t) => !t.done).slice(0, 12), [tasks]);
  const linkedTask = tasks.find((t) => t.id === timer.taskId) ?? null;

  const roundsInCycle = focusConfig.roundsBeforeLongBreak;
  const cycleProgress = timer.round % roundsInCycle;

  return (
    <div className="flex flex-col gap-3 animate-fade-up">
      <PageIntro
        eyebrow="Focus"
        title="One block at a time"
        description="Work in focused intervals, then rest. Every completed block is logged and counts toward your day."
      >
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusPill red={running}>{running ? "In motion" : "Ready"}</StatusPill>
          <StatusPill>{fmtDuration(todayFocusMs)} today</StatusPill>
        </div>
      </PageIntro>

      {/* TIMER */}
      <Widget className={cn("flex flex-col items-center pt-7", isWork && running && "border-nred/40")}>
        <Segmented<FocusPhase>
          value={timer.phase}
          options={[
            { value: "work", label: "Focus" },
            { value: "shortBreak", label: "Short" },
            { value: "longBreak", label: "Long" },
          ]}
          onChange={(p) => setFocusPhase(p)}
        />

        <div className="relative mt-7">
          <DotRing fraction={elapsedFraction} size={266} dots={60} dotRadius={2.6}>
            <span className="label">{PHASE_META[timer.phase].label}</span>
            <Num value={fmtClock(remaining)} className="mt-2 text-[58px] leading-none text-paper" />
            <span className="mt-2 font-dot tnum text-[12px] text-dim">
              {Math.round(elapsedFraction * 100)}% · {focusConfig[isWork ? "workMin" : timer.phase === "shortBreak" ? "shortBreakMin" : "longBreakMin"]}m
            </span>
          </DotRing>
        </div>

        {/* round dots */}
        <div className="mt-6 flex items-center gap-2">
          {Array.from({ length: roundsInCycle }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-colors",
                i < cycleProgress ? "bg-nred" : "bg-line",
              )}
            />
          ))}
          <span className="label ml-1">
            Round {cycleProgress + (isWork ? 1 : 0) || roundsInCycle} / {roundsInCycle}
          </span>
        </div>

        <p className="mt-4 max-w-[34ch] text-center text-[12px] leading-relaxed text-mute">{PHASE_META[timer.phase].hint}</p>

        {/* controls */}
        <div className="mt-6 flex items-center gap-4">
          <IconButton aria-label="Reset" onClick={resetTimer} className="h-12 w-12 border border-paper[0.1]">
            <ResetIcon className="h-5 w-5" />
          </IconButton>
          <button
            type="button"
            onClick={running ? pauseTimer : startTimer}
            aria-label={running ? "Pause" : "Start"}
            className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-paper text-ink shadow-[0_8px_30px_var(--color-shadow)] transition-transform active:scale-95"
          >
            {running ? <PauseIcon className="h-7 w-7" /> : <PlayIcon className="ml-0.5 h-7 w-7" />}
          </button>
          <IconButton aria-label="Skip" onClick={skipPhase} className="h-12 w-12 border border-paper[0.1]">
            <SkipIcon className="h-5 w-5" />
          </IconButton>
        </div>
      </Widget>

      {/* TASK LINK */}
      {isWork && (
        <Widget>
          <div className="flex items-center justify-between">
            <Label red={!!linkedTask}>Focusing on</Label>
            {linkedTask && (
              <button type="button" onClick={() => setTimerTask(null)} className="label text-mute hover:text-paper">
                Clear
              </button>
            )}
          </div>
          {linkedTask ? (
            <div className="mt-3 flex items-center gap-3 rounded-2xl bg-ink px-4 py-3">
              <TargetIcon className="h-5 w-5 text-nred" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] text-paper">{linkedTask.title}</div>
                <div className="label mt-0.5">{linkedTask.spent} blocks done</div>
              </div>
            </div>
          ) : openTasks.length === 0 ? (
            <p className="mt-3 text-[12px] leading-relaxed text-dim">
              No open tasks yet. Add tasks and pick one here to track focus against it.
            </p>
          ) : (
            <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
              {openTasks.map((t) => (
                <Chip key={t.id} onClick={() => setTimerTask(t.id)} className="shrink-0 whitespace-nowrap">
                  {t.title.length > 24 ? t.title.slice(0, 24) + "…" : t.title}
                </Chip>
              ))}
            </div>
          )}
        </Widget>
      )}

      {/* AMBIENT SOUND */}
      <Widget>
        <Label>Ambient Sound</Label>
        <div className="mt-4">
          <Segmented<"none" | "white" | "pink" | "brown">
            value={focusConfig.ambientSound}
            options={[
              { value: "none", label: "Off" },
              { value: "white", label: "White" },
              { value: "pink", label: "Pink" },
              { value: "brown", label: "Brown" },
            ]}
            onChange={(v) => updateFocusConfig({ ambientSound: v })}
          />
          {focusConfig.ambientSound !== "none" && (
            <div className="mt-4 flex items-center gap-3">
              <span className="text-[12px] text-mute">Volume</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={focusConfig.ambientVolume}
                onChange={(e) => updateFocusConfig({ ambientVolume: parseFloat(e.target.value) })}
                className="flex-1 accent-nred bg-paper/10 appearance-none h-1 rounded-full outline-none"
              />
            </div>
          )}
        </div>
      </Widget>

      {/* TODAY STATS */}
      <Widget>
        <Label>Today's focus</Label>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <StatTile value={fmtDuration(todayFocusMs)} label="Focused" accent />
          <StatTile value={completedToday} label="Blocks" />
          <StatTile value={todaySessions.length} label="Sessions" />
        </div>
      </Widget>

      {/* RECENT SESSIONS */}
      {todaySessions.length > 0 && (
        <Widget>
          <Label>Session log</Label>
          <div className="mt-3">
            {[...todaySessions]
              .reverse()
              .slice(0, 6)
              .map((s) => {
                const task = tasks.find((t) => t.id === s.taskId);
                const d = new Date(s.startedAt);
                return (
                  <div key={s.id} className="flex items-center justify-between border-b border-paper/[0.05] py-2.5 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className={cn("h-1.5 w-1.5 rounded-full", s.completed ? "bg-nred" : "bg-dim")} />
                      <span className="text-[13px] text-mute">{task ? task.title : "Focus block"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-dot tnum text-[13px] text-paper">{fmtDuration(s.durationMs)}</span>
                      <span className="label w-12 text-right">
                        {String(d.getHours()).padStart(2, "0")}:{String(d.getMinutes()).padStart(2, "0")}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </Widget>
      )}
    </div>
  );
}
