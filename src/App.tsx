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

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  {
    id: "age",
    label: "Age",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="0.1 3.9" strokeLinecap="round" />
        <circle cx="12" cy="12" r="1.6" />
        <path d="M12 12V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "year",
    label: "Year",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        {[4, 9, 14, 19].map((x) => [5, 10, 15].map((y) => <circle key={`${x}${y}`} cx={x + 1} cy={y + 2} r="1.4" />))}
      </svg>
    ),
  },
  {
    id: "widgets",
    label: "Widgets",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3.5" y="3.5" width="7" height="7" rx="2.5" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="3.5" />
        <rect x="3.5" y="13.5" width="17" height="7" rx="3.5" />
      </svg>
    ),
  },
  {
    id: "settings",
    label: "Settings",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <circle cx="6" cy="8" r="1.6" />
        <circle cx="15" cy="8" r="1.6" />
        <circle cx="18" cy="16" r="1.6" />
        <circle cx="9" cy="16" r="1.6" />
        <path d="M3 8h18M3 16h18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity=".5" />
      </svg>
    ),
  },
];

function Header() {
  const { settings } = useSettings();
  const now = useNow(1);
  return (
    <header className="sticky top-0 z-20 bg-black/85 backdrop-blur-md pt-safe">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-nred" />
          <span className="font-dot text-[15px] text-paper">MOTION OS</span>
        </div>
        <span className="font-dot tnum text-[15px] text-mute">{fmtTime(new Date(now), settings.h24)}</span>
      </div>
    </header>
  );
}

function Shell() {
  const { birthDate } = useSettings();
  const [tab, setTab] = useState<Tab>("age");

  if (!birthDate) return <Onboarding />;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col sm:border-x sm:border-white/[0.06]">
      <Header />

      <main className="flex-1 px-3 pb-32 pt-1">
        {tab === "age" && <AgeModule />}
        {tab === "year" && <YearModule />}
        {tab === "widgets" && <WidgetsModule />}
        {tab === "settings" && <SettingsModule onResetDone={() => setTab("age")} />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-safe">
        <div className="mb-4 flex w-full max-w-[400px] items-center justify-between rounded-full border border-white/[0.08] bg-[#0b0b0b]/90 p-1.5 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                aria-label={t.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 rounded-full py-2.5 transition-colors",
                  active ? "bg-paper text-ink" : "text-mute hover:text-paper",
                )}
              >
                {t.icon}
                <span className="text-[9px] font-medium uppercase tracking-[0.16em]">{t.label}</span>
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
