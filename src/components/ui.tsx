import { memo, type ReactNode, type CSSProperties } from "react";
import { cn } from "../utils/cn";

/* ------------------------------------------------------------------ */
/* Widget container (Nothing OS style)                                 */
/* ------------------------------------------------------------------ */
export function Widget({
  children,
  className,
  glass = false,
  style,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  glass?: boolean;
  style?: CSSProperties;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={cn(
        "relative overflow-hidden rounded-[28px] border border-white/[0.06] p-5",
        glass ? "bg-black/55 backdrop-blur-xl" : "bg-card",
        onClick && "cursor-pointer active:scale-[0.985] transition-transform",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Label({ children, className, red }: { children: ReactNode; className?: string; red?: boolean }) {
  return (
    <div className={cn("label flex items-center gap-2", className)}>
      {red && <span className="inline-block h-1.5 w-1.5 rounded-full bg-nred" />}
      {children}
    </div>
  );
}

export function PageIntro({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="px-2 pb-2 pt-4">
      <Label red>{eyebrow}</Label>
      <h1 className="font-dot mt-4 max-w-[12ch] text-[34px] leading-[0.98] text-paper">{title}</h1>
      <p className="mt-3 max-w-[38ch] text-[13px] leading-relaxed text-mute">{description}</p>
      {children}
    </div>
  );
}

export function ActionButton({
  children,
  onClick,
  disabled = false,
  secondary = false,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  secondary?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-full px-4 text-[10px] font-semibold uppercase tracking-[0.16em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper/80 disabled:cursor-not-allowed disabled:opacity-50",
        secondary
          ? "border border-white/[0.12] bg-white/[0.04] text-paper hover:bg-white/[0.1] active:scale-[0.98]"
          : "bg-paper text-ink hover:bg-white/85 active:scale-[0.98]",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function StatusPill({ children, red = false }: { children: ReactNode; red?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[9px] font-medium uppercase tracking-[0.16em]", red ? "border-nred/40 text-nred" : "border-white/[0.1] text-mute")}>
      <span className={cn("h-1.5 w-1.5 rounded-full", red ? "bg-nred animate-dot-pulse" : "bg-mute")} />
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Fixed-width numeric display – prevents jitter/blink                 */
/* ------------------------------------------------------------------ */
export function Num({
  value,
  className,
  style,
}: {
  value: string | number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span className={cn("font-dot tnum live inline-block leading-none", className)} style={style}>
      {value}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Dotted horizontal progress bar                                      */
/* ------------------------------------------------------------------ */
export function DotBar({
  fraction,
  count = 36,
  className,
  size = "md",
  activeRed = true,
}: {
  fraction: number;
  count?: number;
  className?: string;
  size?: "sm" | "md" | "lg";
  activeRed?: boolean;
}) {
  const filled = Math.floor(fraction * count);
  const sz = size === "sm" ? "h-1 w-1" : size === "lg" ? "h-2 w-2" : "h-1.5 w-1.5";
  return (
    <div className={cn("flex w-full items-center justify-between", className)} aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const isCurrent = i === filled && filled < count;
        return (
          <span
            key={i}
            className={cn(
              "rounded-full transition-colors duration-500",
              sz,
              i < filled ? "bg-paper" : isCurrent ? (activeRed ? "bg-nred animate-dot-pulse" : "bg-paper animate-dot-pulse") : "bg-line",
            )}
          />
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dot grid – one dot per unit (e.g. 365 days). Memoized.              */
/* ------------------------------------------------------------------ */
export const DotGrid = memo(function DotGrid({
  total,
  filled,
  className,
  dotSize = 8,
  gap = 6,
  currentRed = true,
}: {
  total: number;
  filled: number; // number fully completed
  className?: string;
  dotSize?: number;
  gap?: number;
  currentRed?: boolean;
}) {
  return (
    <div
      className={cn("grid", className)}
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(${dotSize}px, 1fr))`,
        gap,
      }}
      aria-hidden
    >
      {Array.from({ length: total }, (_, i) => {
        const isCurrent = i === filled;
        return (
          <span
            key={i}
            className={cn(
              "aspect-square w-full rounded-full",
              i < filled ? "bg-paper" : isCurrent ? (currentRed ? "bg-nred animate-dot-pulse" : "bg-paper animate-dot-pulse") : "bg-line",
            )}
          />
        );
      })}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Dotted progress ring                                                */
/* ------------------------------------------------------------------ */
export function DotRing({
  fraction,
  size = 120,
  dots = 48,
  dotRadius = 2.4,
  children,
  className,
}: {
  fraction: number;
  size?: number;
  dots?: number;
  dotRadius?: number;
  children?: ReactNode;
  className?: string;
}) {
  const r = size / 2 - dotRadius * 2;
  const c = size / 2;
  const filled = Math.floor(fraction * dots);
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0" aria-hidden>
        {Array.from({ length: dots }, (_, i) => {
          const a = (i / dots) * Math.PI * 2 - Math.PI / 2;
          const x = c + r * Math.cos(a);
          const y = c + r * Math.sin(a);
          const isCurrent = i === filled && filled < dots;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={isCurrent ? dotRadius * 1.5 : dotRadius}
              className={cn(i < filled ? "fill-paper" : isCurrent ? "fill-nred" : "fill-line")}
              style={isCurrent ? { transformOrigin: `${x}px ${y}px`, animation: "dot-pulse 1s ease-in-out infinite" } : undefined}
            />
          );
        })}
      </svg>
      <div className="relative flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Segmented control                                                   */
/* ------------------------------------------------------------------ */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex rounded-full border border-white/[0.08] bg-black p-1", className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full px-4 py-1.5 text-[10px] font-medium uppercase tracking-[0.16em] transition-colors",
            value === o.value ? "bg-paper text-ink" : "text-mute hover:text-paper",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Toggle switch                                                       */
/* ------------------------------------------------------------------ */
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full border transition-colors",
        checked ? "border-paper bg-paper" : "border-line bg-black",
      )}
    >
      <span
        className={cn(
          "absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full transition-all",
          checked ? "left-[26px] bg-ink" : "left-1 bg-mute",
        )}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Stat row                                                            */
/* ------------------------------------------------------------------ */
export function StatRow({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.06] py-3 last:border-0">
      <div>
        <div className="label">{label}</div>
        {sub && <div className="mt-0.5 text-[11px] text-dim">{sub}</div>}
      </div>
      <div className="font-dot tnum text-xl text-paper">{value}</div>
    </div>
  );
}

/* Small "glyph" dot decoration */
export function GlyphDots({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-1", className)} aria-hidden>
      <span className="h-1 w-1 rounded-full bg-paper" />
      <span className="h-1 w-1 rounded-full bg-mute" />
      <span className="h-1 w-1 rounded-full bg-dim" />
    </div>
  );
}
