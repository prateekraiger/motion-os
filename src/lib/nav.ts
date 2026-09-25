export type View =
  | "today"
  | "tasks"
  | "focus"
  | "habits"
  | "more"
  | "planner"
  | "life"
  | "year"
  | "stats"
  | "widgets"
  | "settings"
  | "journal";

export type MainTab = "today" | "tasks" | "focus" | "habits" | "more";

export const MAIN_TABS: MainTab[] = ["today", "tasks", "focus", "habits", "more"];
