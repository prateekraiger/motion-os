import { useMemo } from "react";
import { useNow } from "../hooks/useNow";
import { useSettings } from "../hooks/useSettings";
import {
  computeAge,
  nextBirthday,
  nextDayMilestone,
  pad,
  fmtInt,
  fmtCompact,
  fmtDate,
  MS,
} from "../lib/time";
import { Widget, Label, Num, DotBar, DotGrid, DotRing, StatRow, GlyphDots, PageIntro, StatusPill, EmptyState } from "./ui";
import { SunIcon } from "./icons";
import { cn } from "../utils/cn";

function Cell({ value, label, className }: { value: string; label: string; className?: string }) {
  return (
    <div className={cn("flex flex-col items-start gap-1", className)}>
      <Num value={value} className="text-[34px] sm:text-[38px] text-paper" />
      <span className="label">{label}</span>
    </div>
  );
}

export default function AgeModule() {
  const { birthDate, settings } = useSettings();
  const now = useNow(settings.showMs ? "raf" : 1);
  const birth = birthDate ?? new Date(2000, 0, 1);
  const nowDate = useMemo(() => new Date(now), [now]);

  if (!birthDate) {
    return (
      <div className="flex flex-col gap-3 animate-fade-up">
        <PageIntro
          eyebrow="Life clock"
          title="See your life in motion"
          description="Add your date of birth to start a live count of the time you've lived, down to the second."
        />
        <Widget>
          <EmptyState
            icon={<SunIcon className="h-6 w-6" />}
            title="No birthday set"
            description="Open More → Preferences and add your date of birth to unlock the Life clock."
          />
        </Widget>
      </div>
    );
  }

  const age = computeAge(birth, nowDate);
  const nb = nextBirthday(birth, nowDate);

  const daysLived = Math.floor(age.totalMs / MS.day);
  const hoursLived = Math.floor(age.totalMs / MS.hour);
  const minutesLived = age.totalMs / MS.minute;
  const nextDays = nextDayMilestone(daysLived);
  const daysToMilestone = nextDays - daysLived;

  const heartbeats = minutesLived * 72;
  const breaths = minutesLived * 16;
  const moons = daysLived / 29.530588;
  const sleeps = daysLived;
  const seasons = Math.floor(age.decimalYears * 4);

  const lifeExp = settings.lifeExpectancy;
  const lifeFraction = Math.min(1, age.decimalYears / lifeExp);

  const birthdayIsToday = nb.isToday;
  const msClass = settings.motionBlur ? "ms-motion" : "ms-still";

  return (
    <div className="flex flex-col gap-3 animate-fade-up">
      <PageIntro
        eyebrow="Life clock"
        title={settings.name ? `${settings.name}'s life in motion` : "Your life in motion"}
        description="A live count of the time you have already lived. The small numbers are the point: notice where you are, not just how old you are."
      >
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusPill red>Live now</StatusPill>
          <StatusPill>Private on device</StatusPill>
        </div>
      </PageIntro>

      {/* HERO */}
      <Widget className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <Label red>Age in motion</Label>
            {settings.name && <div className="mt-1 text-[13px] text-paper">{settings.name}</div>}
          </div>
          <GlyphDots />
        </div>

        <div className="mt-6 flex items-end gap-3">
          <Num value={age.years} className="text-[96px] sm:text-[112px] text-paper" />
          <div className="mb-4 flex flex-col">
            <span className="label">years</span>
            <Num
              value={`.${pad(Math.floor((age.decimalYears % 1) * 1_000_000), 6)}`}
              className="mt-1 text-[16px] text-mute"
            />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-y-5 border-t border-white/[0.06] pt-5">
          <Cell value={pad(age.months)} label="months" />
          <Cell value={pad(age.days)} label="days" />
          <Cell value={pad(age.hours)} label="hours" />
          <Cell value={pad(age.minutes)} label="minutes" />
          <Cell value={pad(age.seconds)} label="seconds" />
          {settings.showMs ? (
            <div className="flex flex-col items-start gap-1">
              <Num value={pad(age.ms, 3)} className={cn("text-[34px] sm:text-[38px] text-paper", msClass)} />
              <span className="label">millis</span>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-1">
              <Num value="···" className="text-[34px] sm:text-[38px] text-dim" />
              <span className="label">millis</span>
            </div>
          )}
        </div>
      </Widget>

      {/* NEXT MILESTONE */}
      <Widget className={cn(birthdayIsToday && "border-nred/60")}>
        <div className="flex items-center justify-between">
          <Label red={birthdayIsToday}>{birthdayIsToday ? "Happy birthday" : "Next milestone"}</Label>
          <span className="label text-paper">{fmtDate(nb.date)}</span>
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-[13px] text-mute">Turning</span>
          <Num value={nb.turning} className="text-[40px] text-paper" />
          <span className="text-[13px] text-mute">in</span>
        </div>
        <div className="mt-3 flex items-end gap-4">
          <div className="flex items-end gap-1">
            <Num value={nb.remaining.days} className="text-[28px] text-paper" />
            <span className="label mb-1">d</span>
          </div>
          <div className="flex items-end gap-1">
            <Num value={pad(nb.remaining.hours)} className="text-[28px] text-paper" />
            <span className="label mb-1">h</span>
          </div>
          <div className="flex items-end gap-1">
            <Num value={pad(nb.remaining.minutes)} className="text-[28px] text-paper" />
            <span className="label mb-1">m</span>
          </div>
          <div className="flex items-end gap-1">
            <Num value={pad(nb.remaining.seconds)} className="text-[28px] text-paper" />
            <span className="label mb-1">s</span>
          </div>
        </div>
        <DotBar fraction={nb.fraction} count={40} className="mt-5" />
        <div className="mt-2 flex justify-between">
          <span className="label">Year {age.years + 1} of life</span>
          <span className="label tnum text-paper">{nb.percent.toFixed(4)}%</span>
        </div>
      </Widget>

      {/* TWO SQUARES */}
      <div className="grid grid-cols-2 gap-3">
        <Widget className="flex aspect-square flex-col justify-between">
          <Label>Days alive</Label>
          <Num value={fmtInt(daysLived)} className="text-[30px] sm:text-[34px] text-paper" />
          <div>
            <DotBar fraction={1 - daysToMilestone / (nextDays < 10_000 ? 1000 : 5000)} count={14} size="sm" />
            <div className="label mt-2 leading-relaxed">
              <span className="text-paper">{fmtInt(nextDays)}</span> in {daysToMilestone} d
            </div>
          </div>
        </Widget>

        <Widget className="flex aspect-square flex-col items-center justify-center rounded-full">
          <DotRing fraction={lifeFraction} size={128} dots={40}>
            <Num value={(lifeFraction * 100).toFixed(1)} className="text-[26px] text-paper" />
            <span className="label mt-1">of {lifeExp} yrs</span>
          </DotRing>
        </Widget>
      </div>

      {/* LIFE GRID */}
      <Widget>
        <div className="flex items-center justify-between">
          <Label>Life in years</Label>
          <span className="label">
            <span className="text-paper">{age.years}</span> / {lifeExp}
          </span>
        </div>
        <DotGrid total={lifeExp} filled={age.years} className="mt-4" dotSize={12} gap={8} />
        <div className="mt-3 text-[11px] leading-relaxed text-dim">
          Each dot is one orbit around the sun. The red dot is the one you're in right now.
        </div>
      </Widget>

      {/* STATS */}
      <Widget>
        <Label>In motion since {fmtDate(birth)}</Label>
        <div className="mt-2">
          <StatRow label="Hours alive" value={fmtInt(hoursLived)} />
          <StatRow label="Heartbeats" value={fmtCompact(heartbeats)} sub="≈ 72 bpm" />
          <StatRow label="Breaths" value={fmtCompact(breaths)} sub="≈ 16 / min" />
          <StatRow label="Full moons" value={fmtInt(moons)} sub="29.53 day cycle" />
          <StatRow label="Seasons" value={fmtInt(seasons)} />
          <StatRow label="Nights slept" value={fmtInt(sleeps)} sub="give or take" />
        </div>
      </Widget>
    </div>
  );
}
