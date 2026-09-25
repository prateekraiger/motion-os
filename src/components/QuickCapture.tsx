import { useEffect, useRef, useState } from "react";
import { useStore } from "../hooks/useStore";
import { startDictation, voiceSupported, type Dictation } from "../lib/speech";
import { haptic } from "../lib/haptics";
import type { Priority } from "../lib/types";
import { ActionButton, Label, Widget } from "./ui";
import { MicIcon, XIcon } from "./icons";
import { cn } from "../utils/cn";

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "high", label: "High" },
  { value: "med", label: "Medium" },
  { value: "low", label: "Low" },
];

/**
 * Quick capture sheet.
 *
 * Opened by an Android share intent (text shared from any app) or by the mic
 * button. Dictation runs on-device: Android uses the native speech recogniser,
 * desktop browsers use the Web Speech API.
 */
export default function QuickCapture({
  open,
  initialText,
  onClose,
}: {
  open: boolean;
  initialText: string;
  onClose: () => void;
}) {
  const { addTask } = useStore();
  const [title, setTitle] = useState(initialText);
  const [priority, setPriority] = useState<Priority>("med");
  const [listening, setListening] = useState(false);
  const [dictationNote, setDictationNote] = useState("");
  const dictationRef = useRef<Dictation | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setTitle(initialText);
      setPriority("med");
      setDictationNote("");
      const id = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(id);
    }
  }, [open, initialText]);

  useEffect(() => () => dictationRef.current?.stop(), []);

  if (!open) return null;

  const submit = () => {
    const clean = title.trim();
    if (!clean) return;
    addTask({ title: clean, priority });
    haptic("success");
    onClose();
  };

  const toggleDictation = async () => {
    if (listening) {
      dictationRef.current?.stop();
      dictationRef.current = null;
      setListening(false);
      return;
    }
    setDictationNote("");
    const handle = await startDictation((event, value) => {
      if (event === "partial") {
        setDictationNote(value);
        setTitle((prev) => `${prev.replace(/\s*$/, "")}${prev ? " " : ""}${value}`.trim());
      } else if (event === "final") {
        setDictationNote("");
      } else if (event === "error") {
        setDictationNote(value === "not-allowed" ? "Microphone permission denied." : "Could not hear that.");
        setListening(false);
      }
    });
    dictationRef.current = handle;
    setListening(true);
    haptic("tap");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/80 px-3 pb-6 pt-[10vh] backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Quick capture"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[430px] animate-fade-up">
        <Widget className="p-5">
          <div className="flex items-center justify-between">
            <Label red>Quick capture</Label>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-full text-mute hover:bg-paper/[0.06] hover:text-paper"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>

          <textarea
            ref={inputRef}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            rows={3}
            placeholder="What needs doing?"
            className="mt-4 w-full resize-none rounded-2xl border border-paper/[0.08] bg-ink px-4 py-3 text-[15px] text-paper outline-none focus:border-paper/60 placeholder:text-dim"
          />

          <div className="mt-3 flex items-center gap-2">
            <span className="label">Priority</span>
            {PRIORITIES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPriority(option.value)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[11px] transition-colors",
                  priority === option.value
                    ? "border-paper bg-paper text-ink"
                    : "border-paper/[0.1] text-mute hover:border-paper/25 hover:text-paper",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {dictationNote && <p className="mt-3 text-[11px] text-dim">{dictationNote}</p>}

          <div className="mt-5 flex items-center gap-2">
            <ActionButton onClick={submit} className="flex-1" >
              Add task
            </ActionButton>
            <button
              type="button"
              onClick={() => void toggleDictation()}
              disabled={!voiceSupported()}
              aria-label={listening ? "Stop dictation" : "Dictate"}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full border transition-colors disabled:opacity-40",
                listening ? "border-nred bg-nred/15 text-nred" : "border-paper/[0.12] text-mute hover:text-paper",
              )}
            >
              <MicIcon className={cn("h-5 w-5", listening && "animate-dot-pulse")} />
            </button>
          </div>
          {!voiceSupported() && (
            <p className="mt-2 text-[10px] text-dim">Voice input needs the Android app or a browser with speech recognition.</p>
          )}
        </Widget>
      </div>
    </div>
  );
}
