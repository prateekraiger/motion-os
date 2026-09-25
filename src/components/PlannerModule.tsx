import { useMemo, useRef, useState } from "react";
import { useNow } from "../hooks/useNow";
import { useSettings } from "../hooks/useSettings";
import { useStore } from "../hooks/useStore";
import { useCalendarEvents } from "../hooks/useCalendarEvents";
import { sortTasks } from "../lib/productivity";
import {
  PLAN_CLOSE_MIN,
  PLAN_OPEN_MIN,
  PLAN_SLOTS,
  fmtMinute,
  planFor,
  plannedMinutes,
  planProgress,
  snapToSlot,
  timelineSlots,
} from "../lib/timebox";
import { dateKey, fmtDuration } from "../lib/time";
import { PLAN_SLOT_MIN } from "../lib/types";
import type { CalendarEvent } from "../lib/calendar";
import { ActionButton, Chip, Label, PageIntro, StatTile, StatusPill, Widget } from "./ui";
import { CalendarIcon, CheckIcon, PlusIcon, TrashIcon } from "./icons";
import { haptic } from "../lib/haptics";
import { cn } from "../utils/cn";

const ROW_HEIGHT = 42;
const RAIL_WIDTH = 52;
const TIMELINE_HEIGHT = PLAN_SLOTS * ROW_HEIGHT;

type DragPayload = { kind: "task"; id: string } | { kind: "block"; id: string } | null;

/** Minutes from midnight for a pointer position inside the timeline. */
function minuteAt(clientY: number, timeline: HTMLElement | null): number | null {
  if (!timeline) return null;
  const rect = timeline.getBoundingClientRect();
  if (rect.height === 0) return null;
  const ratio = (clientY - rect.top) / rect.height;
  return PLAN_OPEN_MIN + ratio * (PLAN_CLOSE_MIN - PLAN_OPEN_MIN);
}

/**
 * Day planner — drag prioritised tasks onto a timeline.
 *
 * Works with a mouse (HTML5 drag and drop) and with touch (tap a task or a
 * block to select it, then tap a slot to place it), because WebViews on Android
 * do not give us reliable native drag events.
 */
export default function PlannerModule() {
  const { settings, update } = useSettings();
  const { tasks, plans, addPlanBlock, movePlanBlock, removePlanBlock, togglePlanBlock, autoPlanDay, clearPlanDay } =
    useStore();
  const now = useNow(1);
  const today = dateKey(new Date(now));
  const plan = planFor(today, plans);
  const slots = useMemo(() => timelineSlots(settings.h24), [settings.h24]);

  const [drag, setDrag] = useState<DragPayload>(null);
  const [hoverMin, setHoverMin] = useState<number | null>(null);
  const [selected, setSelected] = useState<{ kind: "task" | "block"; id: string } | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const calendar = useCalendarEvents(today, settings.calendarOverlay);

  const openTasks = useMemo(() => tasks.filter((t) => !t.done).sort(sortTasks), [tasks]);
  const planned = plannedMinutes(plan.blocks);
  const progress = planProgress(plan.blocks);
  const nowMinutes = new Date(now).getHours() * 60 + new Date(now).getMinutes();
  const nowOffset = ((nowMinutes - PLAN_OPEN_MIN) / (PLAN_CLOSE_MIN - PLAN_OPEN_MIN)) * TIMELINE_HEIGHT;

  const placeAt = (minute: number) => {
    const startMin = snapToSlot(minute);
    if (!selected) return;
    if (selected.kind === "task") {
      const task = tasks.find((t) => t.id === selected.id);
      if (!task) return;
      addPlanBlock(today, {
        taskId: task.id,
        title: task.title,
        startMin,
        durationMin: 60,
      });
      haptic("toggle");
    } else {
      movePlanBlock(today, selected.id, startMin);
      haptic("tap");
    }
    setSelected(null);
    setHoverMin(null);
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const minute = minuteAt(event.clientY, timelineRef.current);
    setDrag(null);
    setHoverMin(null);
    if (minute == null || !drag) return;
    const startMin = snapToSlot(minute);
    if (drag.kind === "task") {
      const task = tasks.find((t) => t.id === drag.id);
      if (!task) return;
      addPlanBlock(today, { taskId: task.id, title: task.title, startMin, durationMin: 60 });
      haptic("toggle");
    } else {
      movePlanBlock(today, drag.id, startMin);
      haptic("tap");
    }
  };

  const position = (startMin: number, durationMin: number) => {
    const top = ((startMin - PLAN_OPEN_MIN) / (PLAN_CLOSE_MIN - PLAN_OPEN_MIN)) * TIMELINE_HEIGHT;
    const height = (durationMin / (PLAN_CLOSE_MIN - PLAN_OPEN_MIN)) * TIMELINE_HEIGHT;
    return { top, height: Math.max(28, height - 2) };
  };

  return (
    <div className="flex flex-col gap-3 animate-fade-up">
      <PageIntro
        eyebrow="Day planner"
        title="Timebox the day"
        description="Drag prioritised tasks onto the timeline, or tap a task then tap a slot. Plan blocks stay on this device like everything else."
      >
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusPill red>{fmtDuration(planned)} planned</StatusPill>
          <StatusPill>{Math.round(progress * 100)}% done</StatusPill>
        </div>
      </PageIntro>

      <div className="grid grid-cols-3 gap-3">
        <StatTile value={plan.blocks.length} label="Blocks" />
        <StatTile value={fmtDuration(planned)} label="Planned" accent />
        <StatTile value={openTasks.length} label="Unplanned tasks" />
      </div>

      {/* TASK TRAY */}
      <Widget>
        <div className="flex items-center justify-between">
          <Label>Tasks</Label>
          <span className="label">Tap, then tap a slot</span>
        </div>
        {openTasks.length === 0 ? (
          <p className="mt-3 text-[12px] text-dim">No open tasks. Add some in Tasks, then plan them here.</p>
        ) : (
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
            {openTasks.slice(0, 14).map((task) => (
              <button
                key={task.id}
                type="button"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/plain", task.id);
                  event.dataTransfer.effectAllowed = "copy";
                  setDrag({ kind: "task", id: task.id });
                }}
                onDragEnd={() => setDrag(null)}
                onClick={() => setSelected((prev) => (prev?.id === task.id ? null : { kind: "task", id: task.id }))}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-[12px] transition-colors",
                  selected?.id === task.id
                    ? "border-paper bg-paper text-ink"
                    : "border-paper/[0.1] text-mute hover:border-paper/25 hover:text-paper",
                )}
              >
                <PlusIcon className="h-3.5 w-3.5" />
                <span className="max-w-[160px] truncate">{task.title}</span>
              </button>
            ))}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <ActionButton
            onClick={() => {
              const added = autoPlanDay(today, 60);
              if (added === 0) haptic("warning");
            }}
          >
            Auto-plan free time
          </ActionButton>
          <ActionButton secondary onClick={() => clearPlanDay(today)}>
            Clear day
          </ActionButton>
        </div>
      </Widget>

      {/* CALENDAR PERMISSION PROMPT */}
      {settings.calendarOverlay && calendar.permission === "prompt" && (
        <Widget className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-paper/[0.1] text-mute">
            <CalendarIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] text-paper">Show today's calendar events</div>
            <div className="label mt-0.5">Read-only · nothing is stored</div>
          </div>
          <ActionButton secondary onClick={() => void calendar.ask()}>
            Allow
          </ActionButton>
        </Widget>
      )}

      {/* TIMELINE */}
      <Widget className="px-3 py-4">
        <div className="flex items-center justify-between px-2">
          <Label>Timeline</Label>
          <span className="label">{plan.blocks.length ? `${plan.blocks.length} blocks` : "empty day"}</span>
        </div>

        <div className="relative mt-3 flex" style={{ height: TIMELINE_HEIGHT }}>
          {/* hour rail */}
          <div className="relative shrink-0" style={{ width: RAIL_WIDTH }}>
            {slots.map((slot, index) => (
              <span
                key={slot.startMin}
                className={cn(
                  "absolute right-2 -translate-y-1/2 font-dot tnum text-[10px]",
                  slot.startMin % 60 === 0 ? "text-mute" : "text-dim/60",
                )}
                style={{ top: index * ROW_HEIGHT + ROW_HEIGHT / 2 }}
              >
                {slot.startMin % 60 === 0 ? slot.label : "·"}
              </span>
            ))}
          </div>

          {/* slots + blocks */}
          <div
            ref={timelineRef}
            className="relative flex-1"
            onDragOver={(event) => {
              if (!drag) return;
              event.preventDefault();
              const minute = minuteAt(event.clientY, timelineRef.current);
              setHoverMin(minute == null ? null : snapToSlot(minute));
            }}
            onDragLeave={() => setHoverMin(null)}
            onDrop={onDrop}
          >
            {slots.map((slot, index) => {
              const isSelectedTarget = selected != null && hoverMin === slot.startMin;
              return (
                <button
                  key={slot.startMin}
                  type="button"
                  aria-label={`Place at ${slot.label}`}
                  onClick={() => selected && placeAt(slot.startMin)}
                  className={cn(
                    "absolute inset-x-0 border-t border-paper/[0.05] transition-colors",
                    selected ? "hover:bg-paper/[0.06]" : "cursor-default",
                    isSelectedTarget && "bg-paper/[0.08]",
                  )}
                  style={{ top: index * ROW_HEIGHT, height: ROW_HEIGHT }}
                />
              );
            })}

            {/* read-only calendar events */}
            {calendar.events.map((event) => (
              <CalendarStrip key={`cal-${event.id}`} event={event} h24={settings.h24} />
            ))}

            {/* plan blocks */}
            {plan.blocks.map((block) => {
              const style = position(block.startMin, block.durationMin);
              const isSelected = selected?.kind === "block" && selected.id === block.id;
              return (
                <div
                  key={block.id}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/plain", block.id);
                    event.dataTransfer.effectAllowed = "move";
                    setDrag({ kind: "block", id: block.id });
                  }}
                  onDragEnd={() => setDrag(null)}
                  onClick={() => setSelected((prev) => (prev?.id === block.id ? null : { kind: "block", id: block.id }))}
                  className={cn(
                    "absolute inset-x-1 flex flex-col justify-center gap-1 overflow-hidden rounded-2xl border px-3 py-2 transition-all",
                    block.done
                      ? "border-transparent bg-paper/[0.06] text-mute"
                      : "border-paper/[0.14] bg-card-2 text-paper",
                    isSelected && "border-paper shadow-[0_0_0_1px_var(--color-paper)]",
                  )}
                  style={{ top: style.top, height: style.height }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-dot tnum text-[10px] text-dim">{fmtMinute(block.startMin, settings.h24)}</span>
                    <span className={cn("min-w-0 flex-1 truncate text-[13px]", block.done && "line-through")}>
                      {block.title}
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        aria-label={block.done ? "Mark not done" : "Mark done"}
                        onClick={(event) => {
                          event.stopPropagation();
                          togglePlanBlock(today, block.id);
                        }}
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full border",
                          block.done ? "border-paper bg-paper text-ink" : "border-line text-transparent hover:border-mute",
                        )}
                      >
                        <CheckIcon className="h-3 w-3" strokeWidth={3} />
                      </button>
                      <button
                        type="button"
                        aria-label="Remove block"
                        onClick={(event) => {
                          event.stopPropagation();
                          removePlanBlock(today, block.id);
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded-full text-dim hover:bg-nred/15 hover:text-nred"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </div>
                  {style.height > 44 && (
                    <div className="label">
                      {fmtDuration(block.durationMin * 60_000)}
                      {block.done ? " · done" : ""}
                    </div>
                  )}
                </div>
              );
            })}

            {/* now line */}
            {nowOffset > 0 && nowOffset < TIMELINE_HEIGHT && (
              <div className="pointer-events-none absolute inset-x-0 flex items-center" style={{ top: nowOffset }}>
                <span className="h-1.5 w-1.5 rounded-full bg-nred shadow-[0_0_10px_rgba(255,0,0,0.8)]" />
                <span className="h-px flex-1 bg-nred/50" />
              </div>
            )}
          </div>
        </div>
      </Widget>

      {/* CALENDAR OVERLAY TOGGLE */}
      <Widget>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[14px] text-paper">Calendar overlay</div>
            <div className="label mt-0.5">Show system events on the timeline (read-only)</div>
          </div>
          <Chip active={settings.calendarOverlay} onClick={() => update({ calendarOverlay: !settings.calendarOverlay })}>
            {settings.calendarOverlay ? "On" : "Off"}
          </Chip>
        </div>
      </Widget>

      <div className="px-2 pb-2 text-center">
        <div className="font-dot text-[14px] text-mute">MOTION OS</div>
        <div className="label mt-1">Day planner · Stored on device</div>
      </div>
    </div>
  );
}

/** Read-only calendar event strip on the timeline. */
function CalendarStrip({ event, h24 }: { event: CalendarEvent; h24: boolean }) {
  const start = new Date(event.startMs);
  const end = new Date(event.endMs);
  const startMin = start.getHours() * 60 + start.getMinutes();
  const endMin = end.getHours() * 60 + end.getMinutes();
  const clampedStart = Math.max(PLAN_OPEN_MIN, startMin);
  const clampedEnd = Math.min(PLAN_CLOSE_MIN, Math.max(endMin, clampedStart + PLAN_SLOT_MIN));
  const top = ((clampedStart - PLAN_OPEN_MIN) / (PLAN_CLOSE_MIN - PLAN_OPEN_MIN)) * TIMELINE_HEIGHT;
  const height = Math.max(24, ((clampedEnd - clampedStart) / (PLAN_CLOSE_MIN - PLAN_OPEN_MIN)) * TIMELINE_HEIGHT - 2);

  return (
    <div
      className="pointer-events-none absolute inset-x-1 overflow-hidden rounded-2xl border border-dashed border-paper/[0.14] bg-paper/[0.03] px-3 py-1.5"
      style={{ top, height }}
      title={`${event.title} · ${fmtMinute(clampedStart, h24)}–${fmtMinute(clampedEnd, h24)}`}
    >
      <div className="flex items-center gap-2">
        <span className="font-dot tnum text-[10px] text-dim">{fmtMinute(clampedStart, h24)}</span>
        <span className="min-w-0 flex-1 truncate text-[12px] text-mute">{event.title}</span>
      </div>
    </div>
  );
}
