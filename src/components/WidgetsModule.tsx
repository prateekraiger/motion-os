import { useMemo, useState } from "react";
import { useNow } from "../hooks/useNow";
import { useSettings } from "../hooks/useSettings";
import { computeAge, fmtTime, pad, yearProgress } from "../lib/time";
import { requestNativeWidget, isAndroidNative } from "../lib/nativeWidgets";
import {
  AgeWidgetPreview,
  LauncherGrid,
  WIDGET_FORMATS,
  YearWidgetPreview,
  formatMeta,
  useWidgetSurface,
  type AgePreviewData,
  type WidgetFormat,
  type YearPreviewData,
} from "./widgetPreviews";
import { ActionButton, Label, PageIntro, StatusPill, Widget, Segmented } from "./ui";
import { cn } from "../utils/cn";

type WidgetKind = "age" | "year";

export default function WidgetsModule() {
  const { birthDate, settings, update } = useSettings();
  const now = new Date(useNow(1));
  const surface = useWidgetSurface(settings.widgetTheme);
  const [kind, setKind] = useState<WidgetKind>("age");
  const [format, setFormat] = useState<WidgetFormat>("small");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const nativeReady = isAndroidNative();

  const meta = formatMeta(format);

  const ageData: AgePreviewData = useMemo(() => {
    if (!birthDate) {
      return {
        years: 0,
        monthsLabel: "OPEN THE APP TO START",
        liveLabel: "00:00:00",
        lifeLabel: null,
        railFilled: 0,
        title: "AGE IN MOTION",
      };
    }
    const age = computeAge(birthDate, now);
    const expectancy = settings.lifeExpectancy;
    const ahead = Math.max(0, expectancy - age.years);
    return {
      years: age.years,
      monthsLabel: `${pad(age.months)} MONTHS • ${pad(age.days)} DAYS`,
      liveLabel: `${pad(age.hours)}:${pad(age.minutes)}:${pad(age.seconds)}`,
      lifeLabel: expectancy > 0 ? `LIFE ${Math.min(100, Math.round((age.years * 100) / expectancy))}% • ${ahead} YEARS AHEAD` : null,
      railFilled: age.months,
      title: settings.name ? settings.name.toUpperCase() : "AGE IN MOTION",
    };
  }, [birthDate, now, settings.lifeExpectancy, settings.name]);

  const yearData: YearPreviewData = useMemo(() => {
    const yp = yearProgress(now);
    return {
      year: yp.year,
      percent: `${yp.percent.toFixed(2)}%`,
      percentMicro: `${Math.round(yp.percent)}%`,
      details: `DAY ${yp.dayOfYear} OF ${yp.daysInYear} • ${yp.daysRemaining} LEFT`,
      quarters: `Q${yp.quarter} • WEEK ${pad(yp.weekOfYear)}`,
      clock: fmtTime(now, settings.h24),
      railFilled: Math.min(12, Math.floor(yp.fraction * 12)),
    };
  }, [now, settings.h24]);

  // No birth moment saved yet: mirror the native dash in the hero slot.
  const ageYears: number | string = birthDate ? ageData.years : "—";

  const addWidget = async () => {
    setPending(true);
    setFeedback(null);
    const result = await requestNativeWidget(kind);
    if (!nativeReady) setFeedback("One-tap pinning is available in the Android app after a Capacitor sync.");
    else if (!result.supported) setFeedback("This launcher does not support one-tap pinning. Use the manual steps below.");
    else if (result.requested) setFeedback("Pin prompt opened. Drop it on a spot, then resize to taste.");
    else setFeedback("The launcher did not open. Try the manual steps below.");
    setPending(false);
  };

  return (
    <div className="flex flex-col gap-3 animate-fade-up">
      <PageIntro
        eyebrow="Home & lock screen"
        title="Any size, one voice"
        description="Five native formats — from a single cell to a full panel — in the same dot-matrix voice as the app. The launcher picks the right one as you resize, and lock-screen hosts can show them too."
      >
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusPill red>{nativeReady ? "Android ready" : "Android app required"}</StatusPill>
          <StatusPill>Seconds keep moving</StatusPill>
          <StatusPill>Lock screen on 16+</StatusPill>
        </div>
      </PageIntro>

      {/* Live gallery */}
      <Widget className="pt-6">
        <div className="flex items-center justify-between gap-3">
          <Label red>{kind === "age" ? "Life widget" : "Progress widget"}</Label>
          <Segmented<WidgetKind>
            value={kind}
            options={[
              { value: "age", label: "Age" },
              { value: "year", label: "Year" },
            ]}
            onChange={setKind}
          />
        </div>

        <div className="no-scrollbar -mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1">
          {WIDGET_FORMATS.map((f) => {
            const active = f.id === format;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFormat(f.id)}
                aria-pressed={active}
                className={cn(
                  "w-[104px] shrink-0 rounded-2xl border p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper/70",
                  active ? "border-paper/40 bg-paper/[0.06]" : "border-paper/[0.08] hover:border-paper/25",
                )}
              >
                <div className="flex h-[68px] items-center justify-center">
                  <div
                    className="h-full w-full"
                    style={{
                      maxWidth: f.cols >= f.rows ? "100%" : `${(f.cols / f.rows) * 100}%`,
                      aspectRatio: `${f.cols} / ${f.rows}`,
                      maxHeight: "100%",
                    }}
                  >
                    {kind === "age" ? (
                      <AgeWidgetPreview format={f.id} data={{ ...ageData, years: ageYears }} surface={surface} live={false} />
                    ) : (
                      <YearWidgetPreview format={f.id} data={yearData} surface={surface} live={false} />
                    )}
                  </div>
                </div>
                <div className={cn("mt-2 text-center font-dot text-[11px] leading-none", active ? "text-paper" : "text-mute")}>
                  {f.cells}
                </div>
              </button>
            );
          })}
        </div>

        {/* Placed on a launcher grid at true cell proportions */}
        <div className="mt-4 rounded-[24px] border border-paper/[0.08] bg-ink p-4">
          <LauncherGrid cols={meta.cols} rows={meta.rows}>
            {kind === "age" ? (
              <AgeWidgetPreview format={format} data={{ ...ageData, years: ageYears }} surface={surface} />
            ) : (
              <YearWidgetPreview format={format} data={yearData} surface={surface} />
            )}
          </LauncherGrid>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="label">
              {meta.cells} · {meta.blurb}
            </span>
            <span className="font-dot tnum text-[11px] text-dim">{fmtTime(now, settings.h24)}</span>
          </div>
        </div>

        <ActionButton onClick={() => void addWidget()} disabled={pending} className="mt-4 w-full">
          {pending ? "Opening launcher…" : `Add ${kind === "age" ? "life" : "year"} widget →`}
        </ActionButton>
        {feedback && (
          <p className="mt-3 text-[11px] leading-relaxed text-mute" role="status">
            {feedback}
          </p>
        )}
        <p className="mt-3 text-[11px] leading-relaxed text-dim">
          Resize it on the home screen and the widget re-dresses itself — no app open needed on Android 12 and newer.
        </p>
      </Widget>

      {/* Lock screen */}
      <Widget>
        <Label red>Lock screen</Label>
        <p className="mt-3 text-[12px] leading-relaxed text-mute">
          Both widgets declare the <span className="text-paper">keyguard</span> category, so launchers that host lock-screen
          widgets can place them there — Android 16 QPR2 and newer on Pixel phones and tablets. Older versions simply keep
          them on the home screen.
        </p>
        <div className="mt-4 space-y-3">
          {[
            ["01", "Open lock-screen settings", "Settings → Display & touch → Lock screen → Widgets on lock screen."],
            ["02", "Add Motion OS", "Swipe to the widgets page, press and hold, then add Age or Year in motion."],
            ["03", "Glance, don't unlock", "Live seconds keep ticking; tapping opens the app after unlock."],
          ].map(([number, title, copy]) => (
            <div key={number} className="flex gap-3 rounded-2xl bg-ink p-3.5">
              <span className="font-dot text-[13px] text-nred">{number}</span>
              <div>
                <div className="text-[12px] text-paper">{title}</div>
                <p className="mt-1 text-[11px] leading-relaxed text-dim">{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </Widget>

      {/* Surface theme */}
      <Widget>
        <Label red>Widget surface</Label>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[12px] text-paper">Theme preference</span>
          <Segmented
            value={settings.widgetTheme}
            options={[
              { value: "system", label: "Auto" },
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
            onChange={(theme) => update({ widgetTheme: theme })}
          />
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-dim">
          The previews above use the surface your widgets will render on. Changes sync to the native widgets the moment you
          make them.
        </p>
      </Widget>

      {/* Manual path */}
      <Widget>
        <Label>Adding without the prompt</Label>
        <p className="mt-3 text-[11px] leading-relaxed text-dim">
          Long-press an empty home-screen space, choose <span className="text-mute">Widgets</span>, then find{" "}
          <span className="text-mute">Motion OS</span>. Drag a corner to move between the five formats.
        </p>
      </Widget>
    </div>
  );
}
