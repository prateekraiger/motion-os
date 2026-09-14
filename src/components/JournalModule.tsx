import { useState, useMemo } from "react";
import { useStore } from "../hooks/useStore";
import { dateKey } from "../lib/time";
import type { Mood } from "../lib/types";
import { Label, PageIntro, Widget } from "./ui";
import { cn } from "../utils/cn";
import { CheckIcon } from "./icons";

const MOODS: { val: Mood; label: string; emoji: string }[] = [
  { val: 1, label: "Awful", emoji: "😫" },
  { val: 2, label: "Bad", emoji: "🙁" },
  { val: 3, label: "Okay", emoji: "😐" },
  { val: 4, label: "Good", emoji: "🙂" },
  { val: 5, label: "Great", emoji: "🤩" },
];

export default function JournalModule() {
  const { journals, upsertJournal } = useStore();
  const todayKey = dateKey();
  
  // Find today's journal or default to empty state
  const todayEntry = useMemo(() => journals.find((j) => j.dateKey === todayKey), [journals, todayKey]);
  
  const [mood, setMood] = useState<Mood | null>(todayEntry?.mood ?? null);
  const [content, setContent] = useState(todayEntry?.content ?? "");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    upsertJournal(todayKey, { mood, content });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col gap-3 animate-fade-up">
      <PageIntro
        eyebrow="Journal"
        title="Daily Reflection"
        description="Take a moment to reflect on your day. Track your mood and write down your thoughts."
      />

      <Widget>
        <Label>How are you feeling today?</Label>
        <div className="mt-4 flex justify-between gap-2">
          {MOODS.map((m) => {
            const active = mood === m.val;
            return (
              <button
                key={m.val}
                type="button"
                onClick={() => setMood(m.val)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-2xl p-3 flex-1 transition-all duration-200",
                  active
                    ? "bg-paper text-ink shadow-[0_4px_20px_var(--color-shadow)] scale-110"
                    : "bg-paper/5 text-mute hover:bg-paper/10",
                )}
              >
                <span className="text-[24px] leading-none">{m.emoji}</span>
                <span className={cn("text-[10px] font-medium tracking-wide uppercase mt-1", active && "font-bold")}>
                  {m.label}
                </span>
              </button>
            );
          })}
        </div>
      </Widget>

      <Widget className="flex-1 min-h-[250px] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <Label>Notes & Reflection</Label>
          {saved && (
            <span className="flex items-center gap-1 text-[11px] text-nred animate-fade-in font-medium">
              <CheckIcon className="w-3.5 h-3.5" /> Saved
            </span>
          )}
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind today?"
          className="flex-1 w-full bg-transparent border-0 text-[15px] leading-relaxed text-paper placeholder:text-dim resize-none focus:ring-0 focus:outline-none p-1"
        />
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={!content.trim() && !mood}
            className="rounded-full bg-paper px-4 py-2 text-[13px] font-medium text-ink transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Entry
          </button>
        </div>
      </Widget>

      {/* RECENT ENTRIES (if any) */}
      {journals.length > 1 && (
        <Widget>
          <Label>Past Entries</Label>
          <div className="mt-3 flex flex-col gap-3">
            {[...journals]
              .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
              .filter(j => j.dateKey !== todayKey)
              .slice(0, 5)
              .map((j) => {
                const jMood = MOODS.find((m) => m.val === j.mood);
                return (
                  <div key={j.id} className="border-b border-paper/[0.05] pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-dot tnum text-[12px] text-mute">{j.dateKey}</span>
                      {jMood && <span className="text-[14px]">{jMood.emoji}</span>}
                    </div>
                    {j.content && (
                      <p className="text-[14px] text-paper/80 leading-relaxed line-clamp-2">
                        {j.content}
                      </p>
                    )}
                  </div>
                );
              })}
          </div>
        </Widget>
      )}
    </div>
  );
}
