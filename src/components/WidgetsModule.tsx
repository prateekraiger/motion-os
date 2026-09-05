import { useMemo, useState } from "react";
import { useNow } from "../hooks/useNow";
import { useSettings } from "../hooks/useSettings";
import { computeAge, nextBirthday, yearProgress, pad, fmtTime } from "../lib/time";
import { Widget, Label, Num, DotBar, DotGrid, DotRing, Segmented } from "./ui";
import { cn } from "../utils/cn";

type Size = "2x2" | "4x2";
type Bg = "black" | "wallpaper";

function PulseDot({ className }: { className?: string }) {
  return <span className={cn("inline-block h-2 w-2 rounded-full bg-nred animate-dot-pulse", className)} />;
}

export default function WidgetsModule() {
  const { birthDate, settings } = useSettings();
  const now = useNow(4); // widgets: seconds only – no need for 60fps
  const nowDate = useMemo(() => new Date(now), [now]);
  const [size, setSize] = useState<Size>("4x2");
  const [bg, setBg] = useState<Bg>("wallpaper");

  const birth = birthDate ?? new Date(2000, 0, 1);
  const age = computeAge(birth, nowDate);
  const nb = nextBirthday(birth, nowDate);
  const yp = yearProgress(nowDate);
  const glass = bg === "wallpaper";

  return (
    <div className="flex flex-col gap-3 animate-fade-up">
      <Widget className="pt-6">
        <Label red>Widgets</Label>
        <p className="mt-2 text-[13px] leading-relaxed text-mute">
          Home-screen previews. Widgets can't refresh every millisecond, so they show{" "}
          <span className="text-paper">seconds with a dot-pulse</span> while the app gives you the full millisecond
          experience.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Segmented<Size>
            value={size}
            options={[
              { value: "2x2", label: "2 × 2" },
              { value: "4x2", label: "4 × 2" },
            ]}
            onChange={setSize}
          />
          <Segmented<Bg>
            value={bg}
            options={[
              { value: "black", label: "Black" },
              { value: "wallpaper", label: "Wallpaper" },
            ]}
            onChange={setBg}
          />
        </div>
      </Widget>

      {/* Home-screen mock */}
      <div
        className={cn(
          "relative overflow-hidden rounded-[32px] border border-white/[0.06] p-4",
          bg === "black" ? "bg-black" : "",
        )}
        style={
          bg === "wallpaper"
            ? {
                background:
                  "radial-gradient(120% 80% at 20% 0%, #3a3a3a 0%, #151515 45%, #000 100%), repeating-radial-gradient(circle at 80% 90%, rgba(255,255,255,0.06) 0 1px, transparent 1px 14px)",
              }
            : undefined
        }
      >
        <div className="mb-3 flex items-center justify-between px-2">
          <span className="font-dot tnum text-[14px] text-paper">{fmtTime(nowDate, settings.h24)}</span>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-paper" />
            <span className="h-1.5 w-1.5 rounded-full bg-paper" />
            <span className="h-1.5 w-1.5 rounded-full bg-mute" />
          </div>
        </div>

        <div className={cn("grid gap-3", size === "2x2" ? "grid-cols-2" : "grid-cols-1")}>
          {/* AGE WIDGET */}
          {size === "2x2" ? (
            <Widget glass={glass} className="flex aspect-square flex-col justify-between p-4">
              <Label red>Age</Label>
              <div>
                <Num value={age.years} className="text-[44px] text-paper" />
                <div className="label mt-1">years</div>
              </div>
              <div className="flex items-center justify-between">
                <Num value={`${pad(age.hours)}:${pad(age.minutes)}:${pad(age.seconds)}`} className="text-[14px] text-mute" />
                <PulseDot />
              </div>
            </Widget>
          ) : (
            <Widget glass={glass} className="p-5">
              <div className="flex items-center justify-between">
                <Label red>Age in motion</Label>
                <span className="label">
                  <span className="text-paper">{nb.remaining.days}</span> d to {nb.turning}
                </span>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div className="flex items-end gap-3">
                  <Num value={age.years} className="text-[56px] text-paper" />
                  <div className="mb-2 flex gap-3">
                    <div>
                      <Num value={pad(age.months)} className="text-[22px] text-paper" />
                      <div className="label">mo</div>
                    </div>
                    <div>
                      <Num value={pad(age.days)} className="text-[22px] text-paper" />
                      <div className="label">d</div>
                    </div>
                  </div>
                </div>
                <div className="mb-2 flex items-center gap-2">
                  <Num value={`${pad(age.hours)}:${pad(age.minutes)}:${pad(age.seconds)}`} className="text-[18px] text-paper" />
                  <PulseDot />
                </div>
              </div>
              <DotBar fraction={nb.fraction} count={40} className="mt-4" size="sm" />
            </Widget>
          )}

          {/* YEAR WIDGET */}
          {size === "2x2" ? (
            <Widget glass={glass} className="flex aspect-square flex-col items-center justify-center rounded-full p-4">
              <DotRing fraction={yp.fraction} size={120} dots={36}>
                <Num value={Math.floor(yp.percent)} className="text-[34px] text-paper" />
                <span className="label">{yp.year}</span>
              </DotRing>
            </Widget>
          ) : (
            <Widget glass={glass} className="p-5">
              <div className="flex items-center justify-between">
                <Label red>Year in motion</Label>
                <Num value={`${yp.percent.toFixed(2)}%`} className="text-[18px] text-paper" />
              </div>
              <DotGrid total={yp.daysInYear} filled={yp.dayOfYear - 1} className="mt-4" dotSize={6} gap={4} />
              <div className="mt-4 flex justify-between">
                <span className="label">
                  <span className="text-paper">{yp.dayOfYear}</span> days completed
                </span>
                <span className="label">
                  <span className="text-paper">{yp.daysRemaining}</span> remaining
                </span>
              </div>
            </Widget>
          )}
        </div>

        {/* dock dots */}
        <div className="mt-6 flex justify-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-paper" />
          <span className="h-1.5 w-1.5 rounded-full bg-dim" />
          <span className="h-1.5 w-1.5 rounded-full bg-dim" />
        </div>
      </div>

      {/* Native implementation notes */}
      <Widget>
        <Label>Native timers</Label>
        <div className="mt-3 space-y-3 text-[12px] leading-relaxed text-mute">
          <div className="rounded-2xl bg-black p-4">
            <div className="label mb-1 text-paper">iOS · SwiftUI</div>
            <code className="font-mono text-[11px] text-mute">Text(timerInterval: birth...distantFuture, countsDown: false)</code>
            <p className="mt-2">The OS animates the count on the home screen without waking the app.</p>
          </div>
          <div className="rounded-2xl bg-black p-4">
            <div className="label mb-1 text-paper">Android · RemoteViews</div>
            <code className="font-mono text-[11px] text-mute">Chronometer.setBase(birthElapsedRealtime)</code>
            <p className="mt-2">Chronometer in a RemoteViews layout counts seconds natively, battery-free.</p>
          </div>
        </div>
      </Widget>
    </div>
  );
}
