# Motion OS

> Make time count.

Motion OS is a quiet, private productivity app built around one idea: awareness of time should lead to action. It pairs a calm task/focus/habit workflow with a "time in motion" perspective — your day, your year, and your life.

Everything is stored locally on the device. There are no accounts, no servers, and no analytics.

## What is included

- **Today** — a dashboard that greets you, shows how much of the day is left, surfaces your next tasks, habits and next reminder, and puts a one-tap focus timer front and centre.
- **Tasks** — capture, prioritise (low / medium / high), set due dates, add private notes, schedule one-time reminders, repeat tasks daily or weekly, and complete tasks. Filter by Today, Upcoming, All, or Done, search titles and notes, and see a live completion rate.
- **Reminders** — a banner appears at the top of the app when a task reminder is due (always on, works offline, in the WebView), and optionally a browser notification when permission is granted. Each task+moment is announced once; rescheduling re-arms it. Reminders older than 24 h are not re-announced.
- **Focus** — a Pomodoro-style timer with a live dot-ring, configurable work/break lengths, long-break cycles, auto-start, and a soft completion chime. Every block is logged, and you can attach a task so focus time counts toward it.
- **Habits** — daily habit tracking with weekly goals, current/best streaks, a tappable week row, and a 28-day trail. Six accent colours per habit.
- **Stats & history** — a 7-day view of focus time, task completions and habit consistency (week-over-week focus, best day, per-habit streaks), under More.
- **Perspective** — the original Motion OS clocks: a live **Life clock** (age down to the millisecond) and a **Year clock** (day, week, month, quarter, year progress). The birthday is optional.
- **Home-screen widgets** — native Android "Age in motion" and "Year in motion" widgets.
- **Backup & restore** — export all data to a JSON file (or clipboard) and import it back. Imports from older versions are normalised automatically.
- **Themes** — follow your system, or force dark / light from Preferences.
- Reduced-motion support, safe-area spacing, keyboard-friendly controls, and accessible labels/focus states.

## Development

```bash
npm install
npm run typecheck
npm run build
npm run dev
```

`npm run build` creates the single-file web bundle in `dist/index.html`. The `dist/` directory is ignored because it is a build artifact.

To prepare the Capacitor project for Android on a machine with the Android SDK and JDK installed:

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

No APK is committed to this repository. Build the APK locally when you are ready to test on a device.

## Android widget architecture

The WebView's `localStorage` is not readable by an `AppWidgetProvider`, so the app uses a small Capacitor plugin boundary:

- `src/lib/nativeWidgets.ts` exposes `syncSettings` and `requestPinWidget` to the web layer.
- `MotionWidgetsPlugin` stores the minimum widget data in native `SharedPreferences` and refreshes both providers.
- `AgeWidgetProvider` and `YearWidgetProvider` render standard `RemoteViews` layouts.
- The age widget delegates live seconds to Android's `Chronometer`; it does not start a JavaScript timer in the background.
- Tapping either widget opens Motion OS. Updating settings or resetting the profile immediately refreshes existing widgets.

If a launcher does not support the in-app pin request, long-press an empty home-screen area, choose **Widgets**, then choose **Motion OS**. The providers are declared in `AndroidManifest.xml`, so they are visible to the system widget picker after the app is installed.

## Project structure

```text
src/
├── App.tsx                         # App shell, 5-tab navigation, sub-view routing
├── index.css                       # Theme, typography, motion, safe-area helpers
├── lib/
│   ├── time.ts                     # Calendar, progress, and formatting engine
│   ├── types.ts                    # Task / Habit / Focus data models
│   ├── productivity.ts             # Pure helpers: streaks, sorting, aggregations
│   ├── nav.ts                      # Navigation view/tab types
│   └── nativeWidgets.ts            # Defensive Capacitor Android bridge
├── hooks/
│   ├── useNow.ts                   # Visibility-aware live clock
│   ├── useLocalStorage.ts          # Persisted state + id helper
│   ├── useSettings.tsx             # Profile, preferences, theme, native widget sync
│   ├── useReminders.tsx            # Reminder engine: due-check, in-app + web alerts
│   └── useStore.tsx                # Tasks, habits, focus sessions, global timer
└── components/
    ├── ui.tsx                      # Cards, numeric displays, dots, controls, inputs
    ├── icons.tsx                   # Shared inline SVG icon set
    ├── Onboarding.tsx              # First-run flow (birthday optional)
    ├── TodayModule.tsx             # Dashboard
    ├── TasksModule.tsx             # Task management (notes, reminders, recurrence, search)
    ├── FocusModule.tsx             # Pomodoro focus timer
    ├── HabitsModule.tsx            # Habit tracking
    ├── StatsModule.tsx             # 7-day stats & history
    ├── ReminderToast.tsx           # In-app reminder banner
    ├── MoreModule.tsx              # Hub for perspective, stats, widgets, preferences
    ├── AgeModule.tsx               # Life clock
    ├── YearModule.tsx              # Year clock
    ├── WidgetsModule.tsx           # Native widget actions and previews
    └── SettingsModule.tsx          # Profile, notifications, theme, focus config, data, reset

android/app/src/main/
├── java/com/motionos/app/
│   ├── MainActivity.java
│   ├── MotionWidgetsPlugin.java
│   ├── MotionWidgetData.java
│   ├── AgeWidgetProvider.java
│   ├── YearWidgetProvider.java
│   └── WidgetPinReceiver.java
└── res/
    ├── layout/widget_age.xml      # 2 × 2 RemoteViews layout
    ├── layout/widget_year.xml     # 4 × 2 RemoteViews layout
    └── xml/*_widget_info.xml      # Launcher discovery metadata
```

## Design direction

Motion OS uses a monochrome, dot-led visual language with one red signal for the current moment. The interface should feel like an instrument, not a feed: each screen explains what it measures before showing the number.

- `#000000` background, white/muted text, and Nothing red for the live state.
- Doto for large displays and Inter for labels and supporting copy.
- Dots represent completed units; the red dot is the unit currently in motion.
- Milliseconds are available in-app, but home-screen widgets use OS-managed seconds because launcher widgets cannot repaint at 60 fps.

## Recurrence & reminder semantics

- Completing a **recurring task** counts the finish (`×N` badge), keeps the completion moment for stats, and re-arms the due date: daily moves one day forward, weekly moves seven days forward (weekly tasks without a due date are pinned to the same weekday next week). The task returns to the open list; completing it again later marks it done for good.
- **Reminders** are one-time ISO moments per task. While the app is running (or when the tab becomes visible), due reminders raise an in-app banner and — if granted — a browser notification. Each task+moment pair is announced at most once, remembered in `localStorage`, and reminders more than 24 h old are not re-announced.
- "Done today" counts tasks completed today, including recurring tasks that have already re-opened.

## Privacy

There are no accounts, analytics, or app servers. Profile data, preferences and reminder history are stored on the device. Reminders and notifications are local-only — they fire while the app or its tab is active and are never scheduled on a server. Google Fonts are loaded by the web shell when network access is available; the app's calculation engine itself makes no network requests.

## License

MIT — build something that moves.
