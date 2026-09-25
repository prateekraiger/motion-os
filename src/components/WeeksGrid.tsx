import { useMemo } from "react";
import { MS } from "../lib/time";

const WEEKS_PER_YEAR = 52;

export interface WeeksGridProps {
  /** Date of birth. */
  birth: Date;
  /** Reference "now". */
  now: Date;
  /** Life expectancy in years — the grid's height. */
  lifeExpectancy: number;
  className?: string;
}

export interface WeeksGrid {
  totalWeeks: number;
  weeksLived: number;
  weeksRemaining: number;
  /** Column = year of life, row = week inside that year. */
  columns: { year: number; cells: boolean[] }[];
  currentWeekIndex: number;
  percentLived: number;
}

/**
 * The "4,000 Weeks" grid: one checkbox per week of a life.
 *
 * Filled cells are weeks already lived, the red one is the week in progress,
 * and the empty ones are what is left. It is deliberately blunt — the point is
 * to make the passage of time visible rather than comfortable.
 */
export function computeWeeksGrid(birth: Date, now: Date, lifeExpectancy: number): WeeksGrid {
  const livedMs = Math.max(0, now.getTime() - birth.getTime());
  const weeksLived = Math.floor(livedMs / (7 * MS.day));
  const totalWeeks = Math.max(1, Math.round(lifeExpectancy * WEEKS_PER_YEAR));
  const clampedLived = Math.min(weeksLived, totalWeeks);

  const columns: { year: number; cells: boolean[] }[] = [];
  for (let year = 0; year < Math.ceil(totalWeeks / WEEKS_PER_YEAR); year += 1) {
    const cells: boolean[] = [];
    for (let week = 0; week < WEEKS_PER_YEAR; week += 1) {
      const index = year * WEEKS_PER_YEAR + week;
      cells.push(index < clampedLived);
    }
    columns.push({ year: year + 1, cells });
  }

  return {
    totalWeeks,
    weeksLived: clampedLived,
    weeksRemaining: Math.max(0, totalWeeks - clampedLived),
    columns,
    currentWeekIndex: clampedLived,
    percentLived: totalWeeks > 0 ? clampedLived / totalWeeks : 0,
  };
}

/** Visual grid of weeks — one cell per week, ten per row inside each year. */
export default function WeeksGrid({ birth, now, lifeExpectancy, className }: WeeksGridProps) {
  const grid = useMemo(() => computeWeeksGrid(birth, now, lifeExpectancy), [birth, now, lifeExpectancy]);

  return (
    <div className={className}>
      <div className="no-scrollbar max-h-[420px] overflow-y-auto pr-1">
        <div className="flex flex-wrap gap-x-3 gap-y-4">
          {grid.columns.map((column) => {
            const isCurrentYear = column.year === Math.floor(grid.currentWeekIndex / WEEKS_PER_YEAR) + 1;
            return (
              <div key={column.year} className="flex flex-col gap-1.5">
                <span className={isCurrentYear ? "font-dot text-[10px] text-paper" : "font-dot text-[10px] text-dim"}>
                  {String(column.year).padStart(2, "0")}
                </span>
                <div className="grid grid-cols-10 gap-[3px]">
                  {column.cells.map((lived, index) => {
                    const weekIndex = (column.year - 1) * WEEKS_PER_YEAR + index;
                    const isCurrent = weekIndex === grid.currentWeekIndex;
                    // Exact week start, for the tooltip.
                    const weekStart = new Date(birth.getTime() + weekIndex * 7 * MS.day);
                    const title = `Week ${weekIndex + 1} · from ${weekStart.toDateString()}`;
                    return (
                      <span
                        key={index}
                        title={title}
                        className={
                          lived
                            ? "h-[7px] w-[7px] rounded-[1px] bg-paper"
                            : isCurrent
                              ? "h-[7px] w-[7px] rounded-[1px] bg-nred animate-dot-pulse"
                              : "h-[7px] w-[7px] rounded-[1px] bg-line"
                        }
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <span className="label">
          <span className="text-paper">{grid.weeksLived.toLocaleString("en-US")}</span> weeks lived ·{" "}
          {grid.weeksRemaining.toLocaleString("en-US")} left
        </span>
        <span className="label">{(grid.percentLived * 100).toFixed(1)}% of {grid.totalWeeks.toLocaleString("en-US")}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-[1px] bg-paper" />
          <span className="label">Lived</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-[1px] bg-nred" />
          <span className="label">This week</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-[1px] bg-line" />
          <span className="label">Remaining</span>
        </span>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-dim">
        Each square is one week — about {Math.round(7 * 24)} hours you will never get back. Based on a {lifeExpectancy}
        -year horizon, which you can change in Preferences.
      </p>
    </div>
  );
}
