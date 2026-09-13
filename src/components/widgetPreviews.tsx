import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "../utils/cn";
import type { WidgetTheme } from "../hooks/useSettings";

/* ------------------------------------------------------------------ */
/* Widget formats — mirrors MotionWidgetSize.Bucket on the native side  */
/* ------------------------------------------------------------------ */

export type WidgetFormat = "micro" | "strip" | "small" | "wide" | "large";

export interface WidgetFormatMeta {
  id: WidgetFormat;
  /** Launcher footprint in grid cells (width × height). */
  cells: string;
  cols: number;
  rows: number;
  blurb: string;
}

export const WIDGET_FORMATS: WidgetFormatMeta[] = [
  { id: "micro", cells: "1 × 1", cols: 1, rows: 1, blurb: "One number. Nothing else." },
  { id: "strip", cells: "2 × 1", cols: 2, rows: 1, blurb: "A single living row for shelves and docks." },
  { id: "small", cells: "2 × 2", cols: 2, rows: 2, blurb: "The signature square: hero, seconds, month rail." },
  { id: "wide", cells: "4 × 2", cols: 4, rows: 2, blurb: "The wide card, roomier type and rail." },
  { id: "large", cells: "4 × 4", cols: 4, rows: 4, blurb: "The full perspective panel." },
];

export const formatMeta = (id: WidgetFormat) => WIDGET_FORMATS.find((f) => f.id === id) ?? WIDGET_FORMATS[2];

/* ------------------------------------------------------------------ */
/* Surface — the same palette the native renderer resolves              */
/* ------------------------------------------------------------------ */

interface Surface {
  bg: string;
  stroke: string;
  text: string;
  mute: string;
  line: string;
  red: string;
}

const DARK: Surface = { bg: "#101010", stroke: "rgba(255,255,255,0.12)", text: "#FFFFFF", mute: "#A0A0A0", line: "#2A2A2A", red: "#FF2525" };
const LIGHT: Surface = { bg: "#F9FAFB", stroke: "rgba(0,0,0,0.08)", text: "#000000", mute: "#6B7280", line: "#E5E7EB", red: "#EF4444" };

function useOsLight(): boolean {
  const [light, setLight] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: light)").matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => setLight(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return light;
}

/** Resolves the saved widget theme exactly like MotionWidgetTheme.resolve. */
export function useWidgetSurface(preference: WidgetTheme): Surface {
  const osLight = useOsLight();
  if (preference === "light") return LIGHT;
  if (preference === "dark") return DARK;
  return osLight ? LIGHT : DARK;
}

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

const pad: Record<WidgetFormat, string> = {
  micro: "p-2",
  strip: "px-3 py-1.5",
  small: "p-3.5",
  wide: "p-4",
  large: "p-5",
};

function Dot({ surface, size = 6, pulse = true }: { surface: Surface; size?: number; pulse?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0 rounded-full", pulse && "animate-dot-pulse")}
      style={{ width: size, height: size, background: surface.red }}
    />
  );
}

/** Twelve-dot month rail — same rule as the native applyRail. */
function Rail({ surface, filled, className }: { surface: Surface; filled: number; className?: string }) {
  const done = Math.max(0, Math.min(12, filled));
  return (
    <div aria-hidden className={cn("grid grid-cols-12 gap-[6px]", className)}>
      {Array.from({ length: 12 }, (_, i) => (
        <span
          key={i}
          className="aspect-square w-full rounded-full"
          style={{ background: i < done ? surface.text : i === done ? surface.red : surface.line }}
        />
      ))}
    </div>
  );
}

function MicroLabel({ children, surface, className }: { children: ReactNode; surface: Surface; className?: string }) {
  return (
    <span
      className={cn("block truncate font-sans font-medium uppercase", className)}
      style={{ color: surface.mute, letterSpacing: "0.16em" }}
    >
      {children}
    </span>
  );
}

function Body({ children, surface, className }: { children: ReactNode; surface: Surface; className?: string }) {
  return (
    <span className={cn("block truncate font-sans", className)} style={{ color: surface.mute, letterSpacing: "0.06em" }}>
      {children}
    </span>
  );
}

export interface AgePreviewData {
  /** Number of years lived; the em dash when no birth moment is saved. */
  years: number | string;
  monthsLabel: string;
  liveLabel: string;
  lifeLabel: string | null;
  railFilled: number;
  title: string;
}

export interface YearPreviewData {
  year: number;
  percent: string;
  percentMicro: string;
  details: string;
  quarters: string;
  clock: string;
  railFilled: number;
}

/* ------------------------------------------------------------------ */
/* Age in motion — one anatomy per format, matching the native layouts  */
/* ------------------------------------------------------------------ */

export function AgeWidgetPreview({
  format,
  data,
  surface,
  live = true,
}: {
  format: WidgetFormat;
  data: AgePreviewData;
  surface: Surface;
  live?: boolean;
}) {
  const card: CSSProperties = { background: surface.bg, border: `1px solid ${surface.stroke}` };

  if (format === "micro") {
    return (
      <div className={cn("flex h-full w-full flex-col items-center justify-center rounded-[16px]", pad.micro)} style={card}>
        <Dot surface={surface} pulse={live} />
        <span className="font-dot tnum mt-1.5 text-[20px] leading-none" style={{ color: surface.text }}>
          {data.years}
        </span>
        <MicroLabel surface={surface} className="mt-1 text-[6px]">
          years
        </MicroLabel>
      </div>
    );
  }

  if (format === "strip") {
    return (
      <div className={cn("flex h-full w-full items-center rounded-[16px]", pad.strip)} style={card}>
        <Dot surface={surface} size={5} pulse={live} />
        <span className="font-dot tnum ml-2 text-[20px] leading-none" style={{ color: surface.text }}>
          {data.years}
        </span>
        <MicroLabel surface={surface} className="ml-2 min-w-0 flex-1 text-[7px]">
          years
        </MicroLabel>
        <span className="font-dot tnum text-[10px] leading-none" style={{ color: surface.text }}>
          {data.liveLabel}
        </span>
      </div>
    );
  }

  const hero = format === "small" ? "text-[34px]" : format === "wide" ? "text-[44px]" : "text-[58px]";

  return (
    <div className={cn("flex h-full w-full flex-col justify-center rounded-[20px]", pad[format])} style={card}>
      <div className="flex items-center gap-2">
        <MicroLabel surface={surface} className="min-w-0 flex-1 text-[8px]">
          {data.title}
        </MicroLabel>
        <Dot surface={surface} size={5} pulse={live} />
      </div>

      <div className={cn("flex items-end gap-2", format === "small" ? "mt-2.5" : "mt-3")}>
        <span className={cn("font-dot tnum leading-none", hero)} style={{ color: surface.text }}>
          {data.years}
        </span>
        <MicroLabel surface={surface} className={cn("min-w-0 flex-1", format === "large" ? "text-[9px]" : "text-[8px]", "mb-1")}>
          years
        </MicroLabel>
        {format !== "large" && (
          <span className="font-dot tnum mb-0.5 text-[11px] leading-none" style={{ color: surface.text }}>
            {data.liveLabel}
          </span>
        )}
      </div>

      {format === "large" && (
        <span className="font-dot tnum mt-2 text-[18px] leading-none" style={{ color: surface.text }}>
          {data.liveLabel}
        </span>
      )}

      <Body surface={surface} className={cn(format === "small" ? "mt-1.5 text-[8px]" : "mt-1.5 text-[9px]")}>
        {data.monthsLabel}
      </Body>

      <div className={cn("flex items-center", format === "large" ? "mt-3 gap-2.5" : "mt-2.5")}>
        {format === "large" && (
          <MicroLabel surface={surface} className="text-[7px]">
            months
          </MicroLabel>
        )}
        <Rail surface={surface} filled={data.railFilled} className="min-w-0 flex-1" />
      </div>

      {format === "large" &&
        (data.lifeLabel ? (
          <Body surface={surface} className="mt-3 text-[9px]">
            {data.lifeLabel}
          </Body>
        ) : null)}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Year in motion                                                       */
/* ------------------------------------------------------------------ */

export function YearWidgetPreview({
  format,
  data,
  surface,
  live = true,
}: {
  format: WidgetFormat;
  data: YearPreviewData;
  surface: Surface;
  live?: boolean;
}) {
  const card: CSSProperties = { background: surface.bg, border: `1px solid ${surface.stroke}` };

  if (format === "micro") {
    return (
      <div className={cn("flex h-full w-full flex-col items-center justify-center rounded-[16px]", pad.micro)} style={card}>
        <Dot surface={surface} pulse={live} />
        <span className="font-dot tnum mt-1.5 text-[16px] leading-none" style={{ color: surface.text }}>
          {data.percentMicro}
        </span>
        <MicroLabel surface={surface} className="mt-1 text-[6px]">
          {data.year}
        </MicroLabel>
      </div>
    );
  }

  if (format === "strip") {
    return (
      <div className={cn("flex h-full w-full items-center rounded-[16px]", pad.strip)} style={card}>
        <Dot surface={surface} size={5} pulse={live} />
        <span className="font-dot tnum ml-2 text-[18px] leading-none" style={{ color: surface.text }}>
          {data.year}
        </span>
        <Body surface={surface} className="ml-2 min-w-0 flex-1 text-[8px]">
          {data.percent}
        </Body>
        <span className="font-dot tnum text-[10px] leading-none" style={{ color: surface.text }}>
          {data.clock}
        </span>
      </div>
    );
  }

  const hero = format === "small" ? "text-[32px]" : format === "wide" ? "text-[44px]" : "text-[58px]";
  const percent = format === "small" ? "text-[11px]" : format === "wide" ? "text-[14px]" : "text-[18px]";

  return (
    <div className={cn("flex h-full w-full flex-col justify-center rounded-[20px]", pad[format])} style={card}>
      <div className="flex items-center gap-2">
        <Dot surface={surface} size={5} pulse={live} />
        <MicroLabel surface={surface} className="min-w-0 flex-1 text-[8px]">
          year in motion
        </MicroLabel>
        <span className={cn("font-dot tnum leading-none", percent)} style={{ color: surface.text }}>
          {data.percent}
        </span>
      </div>

      <span className={cn("font-dot tnum mt-2.5 leading-none", hero)} style={{ color: surface.text }}>
        {data.year}
      </span>

      <Body surface={surface} className={cn(format === "small" ? "mt-1.5 text-[8px]" : "mt-1.5 text-[9px]")}>
        {data.details}
      </Body>

      <div className={cn("flex items-center", format === "large" ? "mt-3 gap-2.5" : "mt-2.5")}>
        {format === "large" && (
          <MicroLabel surface={surface} className="text-[7px]">
            months
          </MicroLabel>
        )}
        <Rail surface={surface} filled={data.railFilled} className="min-w-0 flex-1" />
      </div>

      <div className={cn("flex items-center justify-between", format === "small" ? "mt-2" : "mt-2.5")}>
        <Body surface={surface} className={cn("min-w-0 flex-1", format === "small" ? "text-[8px]" : "text-[9px]")}>
          {data.quarters}
        </Body>
        <span className="font-dot tnum text-[10px] leading-none" style={{ color: surface.text }}>
          {data.clock}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Home-screen mock — a 4-column launcher grid at true cell proportions */
/* ------------------------------------------------------------------ */

export function LauncherGrid({
  cols,
  rows,
  children,
  className,
}: {
  cols: number;
  rows: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("grid w-full", className)}
      style={{
        gridTemplateColumns: "repeat(4, 1fr)",
        gridTemplateRows: "repeat(4, 1fr)",
        aspectRatio: "292 / 472",
        gap: 6,
      }}
    >
      {/* spacer cells keep the grid honest; the widget is placed explicitly */}
      <div style={{ gridColumn: `span ${cols} / span ${cols}`, gridRow: `span ${rows} / span ${rows}` }}>{children}</div>
    </div>
  );
}
