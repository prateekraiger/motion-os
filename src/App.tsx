import { useState, type ReactNode } from "react";
import { SettingsProvider, useSettings } from "./hooks/useSettings";
import { useNow } from "./hooks/useNow";
import { fmtTime } from "./lib/time";
import Onboarding from "./components/Onboarding";
import AgeModule from "./components/AgeModule";
import YearModule from "./components/YearModule";
import WidgetsModule from "./components/WidgetsModule";
import SettingsModule from "./components/SettingsModule";
import { cn } from "./utils/cn";

type Tab = "age" | "year" | "widgets" | "settings";

const TAB_META: Record<Tab, { label: string; header: string; icon: ReactNode }> = {
  age: {
    label: "Life",
    header: "Life clock",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="0.1 3.9" strokeLinecap="round" />
        <circle cx="12" cy="12" r="1.6" />
        <path d="M12 12V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  year: {
    label: "Year",
    header: "Year clock",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
        {[4, 9, 14, 19].map((x) => [5, 10, 15].map((y) => <circle key={`${x}${y}`} cx={x + 1} cy={y + 2} r="1.4" />))}
      </svg>
    ),
  },
  widgets: {
    label: "Widgets",
    header: "Keep it in view",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="3.5" y="3.5" width="7" height="7" rx="2.5" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="3.5" />
        <rect x="3.5" y="13.5" width="17" height="7" rx="3.5" />
      </svg>
    ),
  },
  settings: {
    label: "More",
    header: "Preferences",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
        <circle cx="6" cy="8" r="1.6" />
        <circle cx="15" cy="8" r="1.6" />
        <circle cx="18" cy="16" r="1.6" />
        <circle cx="9" cy="16" r="1.6" />
        <path d="M3 8h18M3 16h18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity=".5" />
      </svg>
    ),
  },
};

function Header({ tab }: { tab: Tab }) {
  const { settings } = useSettings();
  const now = useNow(1);

  return (
    <header className="sticky top-0 z-20 border-b border-white/[0.05] bg-black/85 pt-safe backdrop-blur-md">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-nred shadow-[0_0_14px_rgba(255,0,0,0.65)]" />
          <span className="font-dot text-[15px] tracking-[0.04em] text-paper">MOTION OS</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-[9px] font-medium uppercase tracking-[0.18em] text-dim min-[380px]:inline">{TAB_META[tab].header}</span>
          <time className="font-dot tnum text-[15px] text-mute" dateTime={new Date(now).toISOString()}>
            {fmtTime(new Date(now), settings.h24)}
          </time>
        </div>
      </div>
    </header>
  );
}

function Shell() {
  const { birthDate } = useSettings();
  const [tab, setTab] = useState<Tab>("age");

  if (!birthDate) return <Onboarding />;

  const navigate = (nextTab: Tab) => {
    setTab(nextTab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col sm:border-x sm:border-white/[0.06]">
      <Header tab={tab} />

      <main id="main-content" className="flex-1 px-3 pb-32 pt-1">
        {tab === "age" && <AgeModule />}
        {tab === "year" && <YearModule />}
        {tab === "widgets" && <WidgetsModule />}
        {tab === "settings" && <SettingsModule onResetDone={() => setTab("age")} />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-safe" aria-label="Primary navigation">
        <div className="mb-3 flex w-full max-w-[400px] items-center justify-between rounded-full border border-white/[0.1] bg-[#0b0b0b]/90 p-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          {(Object.keys(TAB_META) as Tab[]).map((id) => {
            const item = TAB_META[id];
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => navigate(id)}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-full py-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper/80",
                  active ? "bg-paper text-ink shadow-[0_2px_12px_rgba(255,255,255,0.16)]" : "text-mute hover:text-paper",
                )}
              >
                {item.icon}
                <span className="text-[9px] font-medium uppercase tracking-[0.16em]">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <Shell />
    </SettingsProvider>
  );
}
