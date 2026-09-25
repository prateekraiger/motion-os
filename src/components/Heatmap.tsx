import { useMemo } from "react";
import { focusHeatmap } from "../lib/productivity";
import { dateKey, fmtDuration, parseDateKey } from "../lib/time";
import type { FocusSession } from "../lib/types";
import { cn } from "../utils/cn";

const WEEKDAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * GitHub-style contribution heatmap of focus time.
 *
 * One cell per day, 53 weeks wide, Monday-first columns. Intensity is relative
 * to the busiest day in the window, so a light year still shows shape.
 */
export default function Heatmap({
  sessions,
  weeks = 53,
  tag,
  className,
}: {
  sessions: FocusSession[];
  weeks?: number;
  tag?: string | null;
  className?: string;
}) {
  const now = useMemo(() => new Date(), []);
  const map = useMemo(() => focusHeatmap(sessions, weeks, now, tag), [sessions, weeks, now, tag]);

  // Month labels sit above the column that starts a new month.
  const monthLabels = useMemo(() => {
    const labels: { index: number; text: string }[] = [];
    let lastMonth = -1;
    map.weeks.forEach((column, index) => {
      const first = parseDateKey(column[0].key);
      if (!first) return;
      if (first.getMonth() !== lastMonth) {
        lastMonth = first.getMonth();
        labels.push({ index, text: MONTHS[first.getMonth()] });
      }
    });
    return labels;
  }, [map.weeks]);

  const cellTone = (level: number) =>
    cn(
      "aspect-square w-full rounded-[3px] transition-colors",
      level === 0 && "bg-line",
      level === 1 && "bg-paper/25",
      level === 2 && "bg-paper/45",
      level === 3 && "bg-paper/70",
      level === 4 && "bg-paper",
    );

  return (
    <div className={className}>
      <div className="no-scrollbar overflow-x-auto pb-1">
        <div className="min-w-[540px]">
          {/* month labels */}
          <div className="relative mb-1 h-3">
            {monthLabels.map((label) => (
              <span
                key={`${label.text}-${label.index}`}
                className="absolute text-[9px] text-dim"
                style={{ left: `${(label.index / map.weeks.length) * 100}%` }}
              >
                {label.text}
              </span>
            ))}
          </div>

          <div className="flex gap-[3px]">
            {/* weekday rail */}
            <div className="mr-1 flex flex-col gap-[3px] pt-[1px]">
              {WEEKDAY_LETTERS.map((letter, index) => (
                <span key={index} className="flex h-[11px] items-center text-[8px] leading-none text-dim">
                  {index % 2 === 0 ? letter : ""}
                </span>
              ))}
            </div>

            {map.weeks.map((column, columnIndex) => (
              <div key={columnIndex} className="flex flex-1 flex-col gap-[3px]">
                {column.map((cell) => {
                  const date = parseDateKey(cell.key);
                  const title = date
                    ? `${date.toDateString()} · ${cell.ms > 0 ? fmtDuration(cell.ms) : "no focus"}`
                    : cell.key;
                  return (
                    <span
                      key={cell.key}
                      title={title}
                      className={cn(cellTone(cell.level), cell.isFuture && "opacity-25")}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="label">
          {map.activeDays} active {map.activeDays === 1 ? "day" : "days"} · {fmtDuration(map.totalMs)} total
          {tag ? ` · #${tag}` : ""}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="label">Less</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <span key={level} className={cn(cellTone(level), "h-2.5 w-2.5")} />
          ))}
          <span className="label">More</span>
        </span>
      </div>
    </div>
  );
}

/** Today's key, exported so callers can label the heatmap card. */
export const todayKey = () => dateKey();
