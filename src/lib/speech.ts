/**
 * Local voice-to-text for capturing tasks and notes.
 *
 * Android WebView has no Web Speech API, so the primary path is a Capacitor
 * plugin wrapping `android.speech.SpeechRecognizer` — recognition happens
 * on-device and only the final transcript crosses the bridge. On the desktop
 * browser the standard `webkitSpeechRecognition` is used instead.
 */
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export interface SpeechEvents {
  /** Interim transcript while the user is still speaking. */
  partial: string;
  /** Final transcript for one utterance. */
  final: string;
  /** Error message, e.g. "no-speech" or "not-allowed". */
  error: string;
}

interface MotionSpeechPlugin {
  requestPermission(): Promise<{ granted: boolean }>;
  start(options: { locale?: string }): Promise<void>;
  stop(): Promise<void>;
  addListener(eventName: "speechPartial" | "speechFinal" | "speechError", listener: (data: SpeechEvents) => void): Promise<PluginListenerHandle>;
}

const Speech = registerPlugin<MotionSpeechPlugin>("MotionSpeech");

type Listener = (event: keyof SpeechEvents, value: string) => void;

/* ------------------------- Browser fallback ------------------------- */

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
}

function webRecognition(): SpeechRecognitionLike | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

class WebDictation {
  private rec: SpeechRecognitionLike | null = null;
  constructor(private onEvent: Listener) {}
  start(locale?: string) {
    const rec = webRecognition();
    if (!rec) {
      this.onEvent("error", "unsupported");
      return;
    }
    this.rec = rec;
    rec.lang = locale || navigator.language || "en-US";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (event) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) text += event.results[i][0].transcript;
      const last = event.results[event.results.length - 1];
      this.onEvent(last?.isFinal ? "final" : "partial", text.trim());
    };
    rec.onerror = (event) => this.onEvent("error", event.error ?? "failed");
    rec.onend = () => this.onEvent("final", "");
    rec.start();
  }
  stop() {
    this.rec?.stop();
    this.rec = null;
  }
}

/* ----------------------------- Public API --------------------------- */

export function voiceSupported(): boolean {
  if (Capacitor.getPlatform() === "android") return true;
  return webRecognition() !== null;
}

export interface Dictation {
  stop(): void;
}

/**
 * Start dictating. Returns a handle to stop early; the caller receives
 * partial and final transcripts plus errors through `onEvent`.
 */
export async function startDictation(onEvent: Listener, locale?: string): Promise<Dictation> {
  if (Capacitor.getPlatform() === "android") {
    try {
      await Speech.requestPermission();
    } catch {
      onEvent("error", "not-allowed");
      return { stop: () => undefined };
    }
    const handles: PluginListenerHandle[] = [];
    const attach = async (name: "speechPartial" | "speechFinal" | "speechError", key: keyof SpeechEvents) => {
      handles.push(
        await Speech.addListener(name, (data) => {
          onEvent(key, String(data[key] ?? ""));
        }),
      );
    };
    await Promise.all([attach("speechPartial", "partial"), attach("speechFinal", "final"), attach("speechError", "error")]);
    try {
      await Speech.start({ locale });
    } catch {
      onEvent("error", "failed");
    }
    return {
      stop: () => {
        void Speech.stop().catch(() => undefined);
        handles.forEach((h) => void h.remove());
      },
    };
  }

  const web = new WebDictation(onEvent);
  web.start(locale);
  return { stop: () => web.stop() };
}
