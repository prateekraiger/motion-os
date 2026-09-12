import { useState } from "react";
import { useNow } from "../hooks/useNow";
import { useSettings } from "../hooks/useSettings";
import { parseLocal, toDateInput } from "../lib/time";
import { Num } from "./ui";
import { FlameIcon, ListIcon, SunIcon, TargetIcon } from "./icons";
import { cn } from "../utils/cn";

const inputCls =
  "w-full rounded-2xl border border-paper/[0.1] bg-card px-4 py-4 text-[16px] text-paper outline-none transition-colors focus:border-paper/70 placeholder:text-dim";

export default function Onboarding() {
  const { update } = useSettings();
  const now = useNow(10);
  const [step, setStep] = useState<0 | 1>(0);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("00:00");

  const parsed = parseLocal(date, time);
  const dateValid = !date || (!!parsed && parsed.getTime() <= Date.now());
  const d = new Date(now);
  const ms = String(d.getMilliseconds()).padStart(3, "0");

  const finish = () => {
    if (!dateValid) return;
    update({
      name: name.trim(),
      birth: parsed && date ? parsed.toISOString() : null,
      onboarded: true,
    });
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-5 pt-safe pb-safe">
      <div className="flex flex-1 flex-col justify-center py-10">
        {step === 0 ? (
          <div className="animate-fade-up">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-nred shadow-[0_0_14px_rgba(255,0,0,0.65)] animate-dot-pulse" />
              <span className="label text-paper">A personal productivity OS</span>
            </div>
            <h1 className="font-dot mt-6 text-[52px] leading-[0.9] text-paper min-[380px]:text-[60px]">
              MAKE TIME
              <br />
              COUNT.
            </h1>
            <p className="mt-6 max-w-[34ch] text-[15px] leading-relaxed text-mute">
              Motion OS turns awareness of time into action: plan your tasks, focus in blocks, build habits, and see the
              bigger picture — all in one calm, private place.
            </p>

            <div className="mt-8 overflow-hidden rounded-[28px] border border-paper/[0.07] bg-card">
              {[
                [<ListIcon className="h-4 w-4" />, "Tasks", "Capture and prioritise what matters"],
                [<TargetIcon className="h-4 w-4" />, "Focus", "Work in blocks, track every minute"],
                [<FlameIcon className="h-4 w-4" />, "Habits", "Build streaks, one day at a time"],
                [<SunIcon className="h-4 w-4" />, "Perspective", "Your day, year, and life in motion"],
              ].map(([icon, title, copy], i) => (
                <div key={i} className="flex items-center gap-4 border-b border-paper/[0.06] px-5 py-4 last:border-0">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-paper/[0.08] bg-ink text-nred">
                    {icon}
                  </span>
                  <div>
                    <div className="text-[14px] text-paper">{title as string}</div>
                    <div className="mt-0.5 text-[11px] text-dim">{copy as string}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-2 px-1 text-[11px] text-dim">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-mute" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <rect x="5" y="10" width="14" height="10" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
              Everything stays on this device. No accounts, no cloud.
            </div>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="mt-8 w-full rounded-full bg-paper py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-ink transition-transform hover:bg-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper/80 active:scale-[0.98]"
            >
              Get started <span className="ml-1">→</span>
            </button>
          </div>
        ) : (
          <div className="animate-fade-up">
            <button type="button" onClick={() => setStep(0)} className="label mb-6 text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper/80">
              ← Back
            </button>
            <h2 className="font-dot text-[36px] leading-[0.95] text-paper min-[380px]:text-[40px]">A FEW BASICS.</h2>
            <p className="mt-4 text-[13px] leading-relaxed text-mute">
              Tell us your name so the app can greet you. Adding your birthday unlocks the Life clock — it's optional and
              you can add it later in Preferences.
            </p>

            <div className="mt-8 space-y-4">
              <div>
                <div className="label mb-2">Name (optional)</div>
                <input
                  className={inputCls}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="How should we call you?"
                  maxLength={24}
                  autoComplete="given-name"
                />
              </div>
              <div className="grid grid-cols-[1.4fr_1fr] gap-3">
                <div>
                  <div className="label mb-2">Birthday (optional)</div>
                  <input
                    className={inputCls}
                    type="date"
                    value={date}
                    max={toDateInput(new Date())}
                    onChange={(e) => setDate(e.target.value)}
                    aria-describedby={date && !dateValid ? "birth-error" : undefined}
                  />
                </div>
                <div>
                  <div className="label mb-2">Time</div>
                  <input className={inputCls} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                </div>
              </div>
              {!dateValid && (
                <div id="birth-error" className="text-[11px] text-nred" role="alert">
                  Please enter a date in the past.
                </div>
              )}
            </div>

            <div className="mt-8 rounded-[24px] border border-white/[0.06] bg-card p-5">
              <div className="label">Right now</div>
              <div className="mt-2 flex items-baseline gap-1">
                <Num
                  value={`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`}
                  className="text-[34px] text-paper"
                />
                <Num value={`.${ms}`} className="ms-motion text-[16px] text-mute" />
              </div>
            </div>

            <button
              type="button"
              onClick={finish}
              disabled={!dateValid}
              className={cn(
                "mt-8 w-full rounded-full py-4 text-[11px] font-semibold uppercase tracking-[0.22em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper/80",
                dateValid ? "bg-paper text-ink hover:bg-white/85 active:scale-[0.98]" : "bg-card-2 text-dim",
              )}
            >
              Enter Motion OS
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 pb-6" aria-label={`Setup step ${step + 1} of 2`}>
        <span className={cn("h-1.5 w-1.5 rounded-full", step === 0 ? "bg-paper" : "bg-dim")} />
        <span className={cn("h-1.5 w-1.5 rounded-full", step === 1 ? "bg-paper" : "bg-dim")} />
      </div>
    </div>
  );
}
