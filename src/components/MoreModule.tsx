import { useMemo } from "react";
import type { ReactNode } from "react";
import { useSettings } from "../hooks/useSettings";
import { useStore } from "../hooks/useStore";
import { focusMsTotal } from "../lib/productivity";
import { computeAge, fmtDuration, yearProgress } from "../lib/time";
import type { View } from "../lib/nav";
import { Label, PageIntro, StatTile, Widget } from "./ui";
import { CalendarIcon, ChevronRight, ClockIcon, SunIcon } from "./icons";
import { cn } from "../utils/cn";

function NavRow({
  icon,
  title,
  sub,
  onClick,
  accent,
}: {
  icon: ReactNode;
  title: string;
  sub: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 border-b border-white/[0.05] px-1 py-4 text-left last:border-0 transition-colors hover:bg-white/[0.02]"
    >
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border",
          accent ? "border-nred/40 bg-nred/10 text-nred" : "border-white/[0.08] bg-black text-mute",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] text-paper">{title}</span>
        <span className="mt-0.5 block text-[12px] text-dim">{sub}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-dim" />
    </button>
  );
}

export default function MoreModule({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { settings, birthDate } = useSettings();
  const { sessions, tasks } = useStore();

  const totalFocus = useMemo(() => focusMsTotal(sessions), [sessions]);
  const totalDone = tasks.filter((t) => t.done).length;
  const yp = yearProgress(new Date());
  const age = birthDate ? computeAge(birthDate, new Date()) : null;

  return (
    <div className="flex flex-col gap-3 animate-fade-up">
      <PageIntro
        eyebrow="More"
        title="Perspective & setup"
        description="Zoom out to the bigger picture, put clocks on your home screen, and tune the app to fit you."
      />

      {/* Lifetime stats */}
      <Widget>
        <Label>All time</Label>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <StatTile value={fmtDuration(totalFocus)} label="Focused" accent />
          <StatTile value={totalDone} label="Tasks done" />
          <StatTile value={sessions.length} label="Sessions" />
        </div>
      </Widget>

      {/* Perspective */}
      <Widget className="py-2">
        <NavRow
          icon={<SunIcon className="h-5 w-5" />}
          title="Life clock"
          sub={age ? `${age.years} years, ${age.months} months in motion` : "Your age in real time"}
          onClick={() => onNavigate("life")}
          accent
        />
        <NavRow
          icon={<CalendarIcon className="h-5 w-5" />}
          title="Year clock"
          sub={`${yp.percent.toFixed(1)}% of ${yp.year} · ${yp.daysRemaining} days left`}
          onClick={() => onNavigate("year")}
        />
      </Widget>

      {/* Tools */}
      <Widget className="py-2">
        <NavRow
          icon={<ClockIcon className="h-5 w-5" />}
          title="Home-screen widgets"
          sub="Add live clocks to your Android launcher"
          onClick={() => onNavigate("widgets")}
        />
        <NavRow
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <circle cx="12" cy="12" r="3.2" />
              <path d="M12 3.5v2.4M12 18.1v2.4M3.5 12h2.4M18.1 12h2.4M6 6l1.7 1.7M16.3 16.3L18 18M6 18l1.7-1.7M16.3 7.7L18 6" />
            </svg>
          }
          title="Preferences"
          sub={`Profile, focus timings, data${settings.name ? ` · ${settings.name}` : ""}`}
          onClick={() => onNavigate("settings")}
        />
      </Widget>

      <div className="px-2 pb-2 text-center">
        <div className="font-dot text-[14px] text-mute">MOTION OS</div>
        <div className="label mt-1">Time, made useful · Stored on device</div>
      </div>
    </div>
  );
}
