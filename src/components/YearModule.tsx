import { useMemo } from "react";
import { useNow } from "../hooks/useNow";
import { useSettings, type YearView } from "../hooks/useSettings";
import {
  yearProgress,
  dayProgress,
  weekProgress,
  monthProgress,
  quarterProgress,
  monthFraction,
  breakdownMs,
  pad,
  MONTHS_SHORT,
  DAYS_SHORT,
} from "../lib/time";
import { Widget, Label, Num, DotBar, DotGrid, DotRing, Segmented, GlyphDots } from "./ui";
import { cn } from "../utils/cn";

function RingWidget({ label, fraction, caption }: { label: string; fraction: number; caption: string }) {
  return (
    <Widget className="flex flex-col items-center justify-center px-2 py-4">
      <DotRing fraction={fraction} size={92} dots={32} dotRadius={2}>
        <Num value={Math.floor(fraction * 100)} className="text-[24px] text-paper" />
        <span className="text-[9px] tracking-[0.15em] text-mute">%</span>
      </DotRing>
      <span className="label mt-3">{label}</span>
      <span className="mt-0.5 text-[11px] text-dim">{caption}</span>
    </Widget>
  );
}

export default function YearModule() {
  const { settings, update } = useSettings();
  const now = useNow("raf");
  const nowDate = useMemo(() => new Date(now), [now]);

  const yp = yearProgress(nowDate);
  const dp = dayProgress(nowDate);
  const wp = weekProgress(nowDate);
  const mp = monthProgress(nowDate);
  const qp = quarterProgress(nowDate);
  const toNewYear = breakdownMs(yp.remainingMs);

  const [intPart, fracPart] = yp.percent.toFixed(6).split(".");
  const msClass = settings.motionBlur ? "ms-motion" : "ms-still";
  const dow = (nowDate.getDay() + 6) % 7;

  return (
    <div className="flex flex-col gap-3 animate-fade-up">
      {/* HERO */}
      <Widget className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <Label red>Year in motion</Label>
            <div className="mt-1 text-[13px] text-paper">{yp.year}</div>
          </div>
          <GlyphDots />
        </div>

        <div className="mt-5 flex items-baseline">
          <Num value={intPart} className="text-[88px] sm:text-[104px] text-paper" />
          <Num value="." className="text-[40px] text-mute" />
          <div className="flex items-baseline">
            <Num value={fracPart.slice(0, 2)} className="text-[40px] text-paper" />
            <Num value={fracPart.slice(2)} className={cn("text-[40px] text-paper", msClass)} />
          </div>
          <Num value="%" className="ml-1 text-[22px] text-mute" />
        </div>
        <div className="label -mt-1">completed</div>

        <div className="mt-6 flex items-center justify-between">
          <div className="label">
            Day <span className="text-paper">{yp.dayOfYear}</span> of {yp.daysInYear}
          </div>
          <Segmented<YearView>
            value={settings.yearView}
            options={[
              { value: "dots", label: "Dots" },
              { value: "bar", label: "Bar" },
            ]}
            onChange={(v) => update({ yearView: v })}
          />
        </div>

        {settings.yearView === "dots" ? (
          <DotGrid total={yp.daysInYear} filled={yp.dayOfYear - 1} className="mt-4" dotSize={8} gap={5} />
        ) : (
          <div className="mt-6 space-y-3">
            <DotBar fraction={yp.fraction} count={40} size="lg" />
            <DotBar fraction={yp.fraction} count={40} size="sm" className="opacity-40" />
          </div>
        )}

        <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4">
          <div>
            <Num value={yp.dayOfYear - 1} className="text-[26px] text-paper" />
            <div className="label mt-1">days done</div>
          </div>
          <div className="text-right">
            <Num value={yp.daysRemaining} className={cn("text-[26px]", yp.daysRemaining <= 7 ? "text-nred" : "text-paper")} />
            <div className="label mt-1">remaining</div>
          </div>
        </div>
      </Widget>

      {/* RINGS */}
      <div className="grid grid-cols-3 gap-3">
        <RingWidget label="Today" fraction={dp.fraction} caption={DAYS_SHORT[dow]} />
        <RingWidget label="Week" fraction={wp.fraction} caption={`W${pad(yp.weekOfYear)}`} />
        <RingWidget label="Month" fraction={mp.fraction} caption={MONTHS_SHORT[nowDate.getMonth()]} />
      </div>

      {/* QUARTER */}
      <Widget>
        <div className="flex items-center justify-between">
          <Label>Quarter {yp.quarter}</Label>
          <span className="label tnum text-paper">{qp.percent.toFixed(2)}%</span>
        </div>
        <DotBar fraction={qp.fraction} count={36} className="mt-4" />
        <div className="mt-3 flex justify-between">
          {[1, 2, 3, 4].map((q) => (
            <span key={q} className={cn("label", q === yp.quarter ? "text-paper" : q < yp.quarter ? "text-mute" : "text-dim")}>
              Q{q}
            </span>
          ))}
        </div>
      </Widget>

      {/* MONTHS */}
      <Widget>
        <Label>Months</Label>
        <div className="mt-4 space-y-3">
          {MONTHS_SHORT.map((m, i) => {
            const f = monthFraction(yp.year, i, nowDate);
            const isCurrent = i === nowDate.getMonth();
            return (
              <div key={m} className="flex items-center gap-4">
                <span className={cn("label w-8", isCurrent ? "text-paper" : f === 1 ? "text-mute" : "text-dim")}>{m}</span>
                <DotBar fraction={f} count={24} size="sm" className="flex-1" activeRed={isCurrent} />
                <span className="label tnum w-9 text-right">{Math.floor(f * 100)}%</span>
              </div>
            );
          })}
        </div>
      </Widget>

      {/* COUNTDOWN */}
      <Widget>
        <div className="flex items-center justify-between">
          <Label red={yp.daysRemaining <= 1}>Until {yp.year + 1}</Label>
          <span className="label">Week {yp.weekOfYear} / 52</span>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {[
            [toNewYear.days, "days"],
            [pad(toNewYear.hours), "hours"],
            [pad(toNewYear.minutes), "min"],
            [pad(toNewYear.seconds), "sec"],
          ].map(([v, l]) => (
            <div key={l} className="rounded-2xl bg-black px-3 py-3">
              <Num value={v} className="text-[26px] text-paper" />
              <div className="label mt-1">{l}</div>
            </div>
          ))}
        </div>
      </Widget>
    </div>
  );
}
