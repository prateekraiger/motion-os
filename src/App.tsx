import { useState, type ReactNode } from "react";
import { SettingsProvider, useSettings } from "./hooks/useSettings";
import { StoreProvider, useStore } from "./hooks/useStore";
import { useNow } from "./hooks/useNow";
import { fmtClock, fmtTime } from "./lib/time";
import { MAIN_TABS, type MainTab, type View } from "./lib/nav";
import Onboarding from "./components/Onboarding";
import TodayModule from "./components/TodayModule";
import TasksModule from "./components/TasksModule";
import FocusModule from "./components/FocusModule";
import HabitsModule from "./components/HabitsModule";
import MoreModule from "./components/MoreModule";
import AgeModule from "./components/AgeModule";
import YearModule from "./components/YearModule";
import StatsModule from "./components/StatsModule";
import WidgetsModule from "./components/WidgetsModule";
import SettingsModule from "./components/SettingsModule";
import JournalModule from "./components/JournalModule";
import ReminderToast from "./components/ReminderToast";
import { useReminders } from "./hooks/useReminders";
import { ChevronLeft, FlameIcon, ListIcon, SunIcon, TargetIcon } from "./components/icons";
import { cn } from "./utils/cn";

const TAB_META: Record<MainTab, { label: string; icon: (active: boolean) => ReactNode }> = {
  today: { label: "Today", icon: () => <SunIcon className="h-[22px] w-[22px]" /> },
  tasks: { label: "Tasks", icon: () => <ListIcon className="h-[22px] w-[22px]" /> },
  focus: { label: "Focus", icon: () => <TargetIcon className="h-[22px] w-[22px]" /> },
  habits: { label: "Habits", icon: () => <FlameIcon className="h-[22px] w-[22px]" /> },
  more: {
    label: "More",
    icon: () => (
      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="currentColor" aria-hidden="true">
        <circle cx="5" cy="12" r="2" />
        <circle cx="12" cy="12" r="2" />
        <circle cx="19" cy="12" r="2" />
      </svg>
    ),
  },
};

const SUB_TITLES: Partial<Record<View, string>> = {
  life: "Life clock",
  year: "Year clock",
  stats: "Stats & history",
  widgets: "Home widgets",
  settings: "Preferences",
  journal: "Journal & Mood",
};

function FocusIndicator() {
  const { timer } = useStore();
  const now = useNow(timer.status === "running" ? 2 : 0.25);
  if (timer.status !== "running" || timer.endsAt == null) return null;
  const remaining = Math.max(0, timer.endsAt - now);
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-nred/40 px-2.5 py-1">
      <span className="h-1.5 w-1.5 rounded-full bg-nred animate-dot-pulse" />
      <span className="font-dot tnum text-[12px] text-paper">{fmtClock(remaining)}</span>
    </span>
  );
}

function Header({ view, onBack }: { view: View; onBack: () => void }) {
  const { settings } = useSettings();
  const now = useNow(1);
  const isSub = view in SUB_TITLES;

  return (
    <header className="sticky top-0 z-20 border-b border-paper/[0.05] bg-ink/85 pt-safe backdrop-blur-md">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          {isSub ? (
            <button
              type="button"
              onClick={onBack}
              className="-ml-2 flex items-center gap-1 rounded-full py-1 pl-1 pr-2 text-mute transition-colors hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper/70"
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="text-[13px]">More</span>
            </button>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-nred shadow-[0_0_14px_rgba(255,0,0,0.65)]" />
              <span className="font-dot text-[15px] tracking-[0.04em] text-paper">MOTION OS</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isSub && <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-dim">{SUB_TITLES[view]}</span>}
          <FocusIndicator />
          <time className="font-dot tnum text-[15px] text-mute" dateTime={new Date(now).toISOString()}>
            {fmtTime(new Date(now), settings.h24)}
          </time>
        </div>
      </div>
    </header>
  );
}

function isMainTab(v: View): v is MainTab {
  return (MAIN_TABS as string[]).includes(v);
}

function Shell() {
  const { settings } = useSettings();
  const [view, setView] = useState<View>("today");
  const reminder = useReminders();

  if (!settings.onboarded) return <Onboarding />;

  const navigate = (next: View) => {
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const activeTab: MainTab = isMainTab(view) ? view : "more";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col sm:border-x sm:border-paper/[0.06]">
      {reminder.alert && (
        <ReminderToast
          task={reminder.alert.task}
          onView={() => {
            reminder.dismiss();
            navigate("tasks");
          }}
          onDismiss={reminder.dismiss}
        />
      )}
      <Header view={view} onBack={() => navigate("more")} />

      <main id="main-content" className="flex-1 px-3 pb-32 pt-1">
        {view === "today" && <TodayModule onNavigate={navigate} />}
        {view === "tasks" && <TasksModule />}
        {view === "focus" && <FocusModule />}
        {view === "habits" && <HabitsModule />}
        {view === "more" && <MoreModule onNavigate={navigate} />}
        {view === "life" && <AgeModule />}
        {view === "year" && <YearModule />}
        {view === "stats" && <StatsModule />}
        {view === "widgets" && <WidgetsModule />}
        {view === "settings" && <SettingsModule onResetDone={() => navigate("today")} />}
        {view === "journal" && <JournalModule />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-safe" aria-label="Primary navigation">
        <div className="mb-3 flex w-full max-w-[400px] items-center justify-between rounded-full border border-paper/[0.1] bg-ink/80 p-1.5 shadow-[0_10px_40px_var(--color-shadow)] backdrop-blur-2xl">
          {MAIN_TABS.map((id) => {
            const item = TAB_META[id];
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => navigate(id)}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-full py-2 transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper/80",
                  active ? "bg-paper text-ink shadow-[0_0_16px_color-mix(in_srgb,var(--color-paper)_40%,transparent)] scale-105" : "text-mute hover:text-paper hover:bg-paper/[0.04]",
                )}
              >
                {item.icon(active)}
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
      <StoreProvider>
        <Shell />
      </StoreProvider>
    </SettingsProvider>
  );
}
