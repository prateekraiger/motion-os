import { useEffect, useState } from "react";
import { useSettings, type YearView } from "../hooks/useSettings";
import { parseLocal, toDateInput, toTimeInput } from "../lib/time";
import { Widget, Label, Toggle, Segmented } from "./ui";
import { cn } from "../utils/cn";

function Row({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] py-4 last:border-0">
      <div className="min-w-0">
        <div className="text-[14px] text-paper">{title}</div>
        {sub && <div className="mt-0.5 text-[11px] leading-relaxed text-dim">{sub}</div>}
      </div>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-2xl border border-white/[0.08] bg-black px-4 py-3 text-[15px] text-paper outline-none focus:border-paper/60 placeholder:text-dim";

export default function SettingsModule({ onResetDone }: { onResetDone?: () => void }) {
  const { settings, birthDate, update, reset } = useSettings();
  const [date, setDate] = useState(birthDate ? toDateInput(birthDate) : "");
  const [time, setTime] = useState(birthDate ? toTimeInput(birthDate) : "00:00");
  const [name, setName] = useState(settings.name);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 1500);
    return () => clearTimeout(t);
  }, [saved]);

  const parsed = parseLocal(date, time);
  const valid = !!parsed && parsed.getTime() <= Date.now();
  const dirty = name !== settings.name || (parsed && birthDate && parsed.getTime() !== birthDate.getTime()) || (parsed && !birthDate);

  const save = () => {
    if (!valid || !parsed) return;
    update({ birth: parsed.toISOString(), name: name.trim() });
    setSaved(true);
  };

  return (
    <div className="flex flex-col gap-3 animate-fade-up">
      <Widget className="pt-6">
        <Label red>Profile</Label>
        <div className="mt-4 space-y-3">
          <div>
            <div className="label mb-2">Name (optional)</div>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={24} />
          </div>
          <div className="grid grid-cols-[1.4fr_1fr] gap-3">
            <div>
              <div className="label mb-2">Date of birth</div>
              <input className={inputCls} type="date" value={date} max={toDateInput(new Date())} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <div className="label mb-2">Time</div>
              <input className={inputCls} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          {!valid && date && <div className="text-[11px] text-nred">Enter a valid date in the past.</div>}
          <button
            onClick={save}
            disabled={!valid || !dirty}
            className={cn(
              "mt-1 w-full rounded-full py-3.5 text-[11px] font-semibold uppercase tracking-[0.2em] transition-all",
              saved ? "bg-paper text-ink" : valid && dirty ? "bg-paper text-ink active:scale-[0.98]" : "bg-card-2 text-dim",
            )}
          >
            {saved ? "Saved ●" : "Save changes"}
          </button>
        </div>
      </Widget>

      <Widget>
        <Label>Motion</Label>
        <div className="mt-1">
          <Row title="Show milliseconds" sub="60 fps counter in the Age module">
            <Toggle checked={settings.showMs} onChange={(v) => update({ showMs: v })} label="Show milliseconds" />
          </Row>
          <Row title="Motion blur" sub="Subtle blur on the fastest digits. Off = steady dim digits.">
            <Toggle checked={settings.motionBlur} onChange={(v) => update({ motionBlur: v })} label="Motion blur" />
          </Row>
          <Row title="24-hour clock">
            <Toggle checked={settings.h24} onChange={(v) => update({ h24: v })} label="24-hour clock" />
          </Row>
        </div>
      </Widget>

      <Widget>
        <Label>Year in motion</Label>
        <div className="mt-1">
          <Row title="Default view">
            <Segmented<YearView>
              value={settings.yearView}
              options={[
                { value: "dots", label: "Dots" },
                { value: "bar", label: "Bar" },
              ]}
              onChange={(v) => update({ yearView: v })}
            />
          </Row>
        </div>
      </Widget>

      <Widget>
        <Label>Age in motion</Label>
        <div className="mt-1">
          <div className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[14px] text-paper">Life horizon</div>
                <div className="mt-0.5 text-[11px] text-dim">Dots shown in the “Life in years” grid</div>
              </div>
              <span className="font-dot tnum text-2xl text-paper">{settings.lifeExpectancy}</span>
            </div>
            <input
              type="range"
              min={50}
              max={120}
              step={1}
              value={settings.lifeExpectancy}
              onChange={(e) => update({ lifeExpectancy: Number(e.target.value) })}
              className="mt-4 w-full accent-white"
            />
            <div className="mt-1 flex justify-between">
              <span className="label">50</span>
              <span className="label">120</span>
            </div>
          </div>
        </div>
      </Widget>

      <Widget>
        <Label>Data</Label>
        <div className="mt-1">
          <Row title="Reset Motion OS" sub="Clears your profile and preferences from this device.">
            {confirm ? (
              <div className="flex gap-2">
                <button onClick={() => setConfirm(false)} className="rounded-full border border-line px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-mute">
                  No
                </button>
                <button
                  onClick={() => {
                    reset();
                    setConfirm(false);
                    onResetDone?.();
                  }}
                  className="rounded-full bg-nred px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-paper"
                >
                  Yes
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirm(true)} className="rounded-full border border-nred/60 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-nred">
                Reset
              </button>
            )}
          </Row>
        </div>
      </Widget>

      <div className="px-2 pb-2 text-center">
        <div className="font-dot text-[14px] text-mute">MOTION OS</div>
        <div className="label mt-1">v1.0 · Stored locally · No accounts</div>
      </div>
    </div>
  );
}
