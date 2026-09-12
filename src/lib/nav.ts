export type View =
  | "today"
  | "tasks"
  | "focus"
  | "habits"
  | "more"
  | "life"
  | "year"
  | "stats"
  | "widgets"
  | "settings";

export type MainTab = "today" | "tasks" | "focus" | "habits" | "more";

export const MAIN_TABS: MainTab[] = ["today", "tasks", "focus", "habits", "more"];
