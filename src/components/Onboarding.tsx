import { useState } from "react";
import { useSettings } from "../hooks/useSettings";
import { parseLocal, toDateInput } from "../lib/time";
import { useNow } from "../hooks/useNow";
import { Num } from "./ui";
import { cn } from "../utils/cn";

const inputCls =
  "w-full rounded-2xl border border-white/[0.1] bg-card px-4 py-4 text-[16px] text-paper outline-none focus:border-paper/70 placeholder:text-dim";

export default function Onboarding() {
  const { update } = useSettings();
  const now = useNow(10);
  const [step, setStep] = useState<0 | 1>(0);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("00:00");

  const parsed = parseLocal(date, time);
  const valid = !!parsed && parsed.getTime() <= Date.now();
  const d = new Date(now);
  const ms = String(d.getMilliseconds()).padStart(3, "0");

  const start = () => {
    if (!valid || !parsed) return;
    update({ birth: parsed.toISOString(), name: name.trim() });
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-5 pt-safe pb-safe">
      <div className="flex flex-1 flex-col justify-center py-10">
        {step === 0 ? (
          <div className="animate-fade-up">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-nred animate-dot-pulse" />
              <span className="label text-paper">Welcome</span>
            </div>
            <h1 className="font-dot mt-6 text-[64px] leading-[0.9] text-paper">
              MOTION
              <br />
              OS
            </h1>
            <p className="mt-6 max-w-[30ch] text-[15px] leading-relaxed text-mute">
              A live perspective on time. Not the date — the motion of your life and the current year, down to the
              millisecond.
            </p>

            <div className="mt-10 rounded-[28px] border border-white/[0.06] bg-card p-5">
              <div className="label">Right now</div>
              <div className="mt-2 flex items-baseline gap-1">
                <Num
                  value={`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`}
                  className="text-[40px] text-paper"
                />
                <Num value={`.${ms}`} className="text-[20px] text-mute ms-motion" />
              </div>
            </div>

            <button
              onClick={() => setStep(1)}
              className="mt-8 w-full rounded-full bg-paper py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-ink active:scale-[0.98] transition-transform"
            >
              Set up →
            </button>
          </div>
        ) : (
          <div className="animate-fade-up">
            <button onClick={() => setStep(0)} className="label mb-6 text-paper">
              ← Back
            </button>
            <h2 className="font-dot text-[40px] leading-none text-paper">WHEN DID YOU START?</h2>
            <p className="mt-3 text-[13px] leading-relaxed text-mute">
              Your birth moment powers the Age In Motion clock. Time is optional — it just makes the count more precise.
              Everything stays on your device.
            </p>

            <div className="mt-8 space-y-4">
              <div>
                <div className="label mb-2">Name (optional)</div>
                <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="How should we call you?" maxLength={24} />
              </div>
              <div>
                <div className="label mb-2">Date of birth</div>
                <input className={inputCls} type="date" value={date} max={toDateInput(new Date())} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <div className="label mb-2">Time of birth</div>
                <input className={inputCls} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
              {!valid && date && <div className="text-[11px] text-nred">Please enter a valid date in the past.</div>}
            </div>

            <button
              onClick={start}
              disabled={!valid}
              className={cn(
                "mt-8 w-full rounded-full py-4 text-[11px] font-semibold uppercase tracking-[0.22em] transition-all",
                valid ? "bg-paper text-ink active:scale-[0.98]" : "bg-card-2 text-dim",
              )}
            >
              Start the clock
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 pb-6">
        <span className={cn("h-1.5 w-1.5 rounded-full", step === 0 ? "bg-paper" : "bg-dim")} />
        <span className={cn("h-1.5 w-1.5 rounded-full", step === 1 ? "bg-paper" : "bg-dim")} />
      </div>
    </div>
  );
}
