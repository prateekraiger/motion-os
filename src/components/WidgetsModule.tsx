import { useState } from "react";
import { useNow } from "../hooks/useNow";
import { useSettings } from "../hooks/useSettings";
import { computeAge, nextBirthday, yearProgress, pad, fmtTime } from "../lib/time";
import { requestNativeWidget, isAndroidNative, type WidgetKind } from "../lib/nativeWidgets";
import { ActionButton, DotBar, DotGrid, Label, Num, PageIntro, StatusPill, Widget } from "./ui";
import { cn } from "../utils/cn";

function PulseDot({ className }: { className?: string }) {
  return <span className={cn("inline-block h-2 w-2 rounded-full bg-nred animate-dot-pulse", className)} />;
}

function WidgetPreview({
  kind,
  birthDate,
  now,
  h24,
}: {
  kind: WidgetKind;
  birthDate: Date | null;
  now: Date;
  h24: boolean;
}) {
  const birth = birthDate ?? new Date(2000, 0, 1);
  const age = computeAge(birth, now);
  const nb = nextBirthday(birth, now);
  const yp = yearProgress(now);

  if (kind === "age") {
    return (
      <div className="rounded-[22px] border border-white/[0.1] bg-[#111]/90 p-4 shadow-[0_16px_32px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between">
          <Label red>Age in motion</Label>
          <span className="label">2 × 2</span>
        </div>
        <div className="mt-5 flex items-end justify-between">
          <div>
            <div className="flex items-baseline gap-2">
              <Num value={age.years} className="text-[48px] text-paper" />
              <span className="label">years</span>
            </div>
            <div className="label mt-2 text-dim">{pad(age.months)} mo&nbsp; · &nbsp;{pad(age.days)} d</div>
          </div>
          <div className="mb-1 flex items-center gap-2">
            <Num value={`${pad(age.hours)}:${pad(age.minutes)}:${pad(age.seconds)}`} className="text-[14px] text-paper" />
            <PulseDot />
          </div>
        </div>
        <DotBar fraction={nb.fraction} count={32} className="mt-4" size="sm" />
      </div>
    );
  }

  // Keep the preview light; the native Android widget uses the OS Chronometer
  // for the seconds between app refreshes.
  return (
    <div className="rounded-[22px] border border-white/[0.1] bg-[#111]/90 p-4 shadow-[0_16px_32px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between">
        <Label red>Year in motion</Label>
        <Num value={`${yp.percent.toFixed(2)}%`} className="text-[16px] text-paper" />
      </div>
      <DotGrid total={yp.daysInYear} filled={yp.dayOfYear - 1} className="mt-4" dotSize={5} gap={3} />
      <div className="mt-4 flex items-center justify-between">
        <span className="label"><span className="text-paper">{yp.dayOfYear}</span> days done</span>
        <span className="label"><span className="text-paper">{yp.daysRemaining}</span> left</span>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3">
        <span className="label">{fmtTime(now, h24)}</span>
        <PulseDot />
      </div>
    </div>
  );
}

export default function WidgetsModule() {
  const { birthDate, settings } = useSettings();
  const now = new Date(useNow(1));
  const [pending, setPending] = useState<WidgetKind | null>(null);
  const [feedback, setFeedback] = useState<{ kind: WidgetKind; message: string } | null>(null);
  const nativeReady = isAndroidNative();

  const addWidget = async (kind: WidgetKind) => {
    setPending(kind);
    setFeedback(null);
    const result = await requestNativeWidget(kind);

    if (!nativeReady) {
      setFeedback({ kind, message: "One-tap pinning is available in the Android app after a Capacitor sync." });
    } else if (!result.supported) {
      setFeedback({ kind, message: "This launcher does not support one-tap pinning. Use the manual steps below." });
    } else if (result.requested) {
      setFeedback({ kind, message: "Pin prompt opened. Choose a spot on your home screen." });
    } else {
      setFeedback({ kind, message: "The launcher did not open. Try the manual steps below." });
    }
    setPending(null);
  };

  return (
    <div className="flex flex-col gap-3 animate-fade-up">
      <PageIntro
        eyebrow="Home widgets"
        title="Keep time in view"
        description="Add a native clock to your Android home screen. It keeps the living seconds visible without opening the app."
      >
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusPill red>{nativeReady ? "Android ready" : "Android app required"}</StatusPill>
          <StatusPill>Seconds keep moving</StatusPill>
        </div>
      </PageIntro>

      <Widget className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Label red>Life widget</Label>
            <h2 className="mt-2 font-dot text-[24px] leading-none text-paper">Age in motion</h2>
          </div>
          <span className="label rounded-full border border-white/[0.1] px-2.5 py-1.5">2 × 2</span>
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-mute">Your lived time, condensed into one glance. The counter continues through the day.</p>
        <div className="mt-5">
          <WidgetPreview kind="age" birthDate={birthDate} now={now} h24={settings.h24} />
        </div>
        <ActionButton onClick={() => void addWidget("age")} disabled={pending !== null} className="mt-4 w-full">
          {pending === "age" ? "Opening launcher…" : "Add life widget →"}
        </ActionButton>
        {feedback?.kind === "age" && <p className="mt-3 text-[11px] leading-relaxed text-mute" role="status">{feedback.message}</p>}
      </Widget>

      <Widget>
        <div className="flex items-start justify-between gap-4">
          <div>
            <Label red>Progress widget</Label>
            <h2 className="mt-2 font-dot text-[24px] leading-none text-paper">Year in motion</h2>
          </div>
          <span className="label rounded-full border border-white/[0.1] px-2.5 py-1.5">4 × 2</span>
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-mute">A quiet reminder of where this year sits, from January to December.</p>
        <div className="mt-5">
          <WidgetPreview kind="year" birthDate={birthDate} now={now} h24={settings.h24} />
        </div>
        <ActionButton onClick={() => void addWidget("year")} disabled={pending !== null} className="mt-4 w-full">
          {pending === "year" ? "Opening launcher…" : "Add year widget →"}
        </ActionButton>
        {feedback?.kind === "year" && <p className="mt-3 text-[11px] leading-relaxed text-mute" role="status">{feedback.message}</p>}
      </Widget>

      <Widget>
        <Label>Adding on Android</Label>
        <div className="mt-3 space-y-3">
          {[
            ["01", "Tap an add button above", "Android 8 and newer can open the launcher pin dialog directly."],
            ["02", "Choose your home screen", "Move or resize the widget like any other launcher widget."],
            ["03", "Open Motion OS once", "Your profile syncs to the native widget and stays on the device."],
          ].map(([number, title, copy]) => (
            <div key={number} className="flex gap-3 rounded-2xl bg-black p-3.5">
              <span className="font-dot text-[13px] text-nred">{number}</span>
              <div>
                <div className="text-[12px] text-paper">{title}</div>
                <p className="mt-1 text-[11px] leading-relaxed text-dim">{copy}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-dim">
          If your launcher hides the prompt: long-press an empty home-screen space, choose <span className="text-mute">Widgets</span>, then find <span className="text-mute">Motion OS</span>.
        </p>
      </Widget>

      <Widget>
        <Label>Built for a glance</Label>
        <div className="mt-3 space-y-3">
          <div className="flex items-start gap-3 border-b border-white/[0.06] pb-3">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-nred" />
            <p className="text-[12px] leading-relaxed text-mute"><span className="text-paper">Live seconds:</span> Android's native Chronometer keeps the time moving without waking the full app every second.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-paper" />
            <p className="text-[12px] leading-relaxed text-mute"><span className="text-paper">Private by default:</span> only the values needed to draw your widgets are mirrored to local Android storage.</p>
          </div>
        </div>
      </Widget>
    </div>
  );
}
