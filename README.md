# Motion OS

> Make time count.

Motion OS is a quiet, private productivity app built around one idea: awareness of time should lead to action. It pairs a calm task/focus/habit workflow with a "time in motion" perspective — your day, your year, and your life.

Everything is stored locally on the device. There are no accounts, no servers, and no analytics.

## What is included

- **Today** — a dashboard that greets you, shows how much of the day is left, surfaces your next tasks and habits, and puts a one-tap focus timer front and centre.
- **Tasks** — capture, prioritise (low / medium / high), set due dates, and complete tasks. Filter by Today, Upcoming, All, or Done, and see a live completion rate.
- **Focus** — a Pomodoro-style timer with a live dot-ring, configurable work/break lengths, long-break cycles, auto-start, and a soft completion chime. Every block is logged, and you can attach a task so focus time counts toward it.
- **Habits** — daily habit tracking with weekly goals, current/best streaks, a tappable week row, and a 28-day trail. Six accent colours per habit.
- **Perspective** — the original Motion OS clocks: a live **Life clock** (age down to the millisecond) and a **Year clock** (day, week, month, quarter, year progress). The birthday is optional.
- **Home-screen widgets** — native Android "Age in motion" and "Year in motion" widgets.
- **Backup & restore** — export all data to a JSON file (or clipboard) and import it back.
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
│   ├── useSettings.tsx             # Profile, preferences, native widget sync
│   └── useStore.tsx                # Tasks, habits, focus sessions, global timer
└── components/
    ├── ui.tsx                      # Cards, numeric displays, dots, controls, inputs
    ├── icons.tsx                   # Shared inline SVG icon set
    ├── Onboarding.tsx              # First-run flow (birthday optional)
    ├── TodayModule.tsx             # Dashboard
    ├── TasksModule.tsx             # Task management
    ├── FocusModule.tsx             # Pomodoro focus timer
    ├── HabitsModule.tsx            # Habit tracking
    ├── MoreModule.tsx              # Hub for perspective, widgets, preferences
    ├── AgeModule.tsx               # Life clock
    ├── YearModule.tsx              # Year clock
    ├── WidgetsModule.tsx           # Native widget actions and previews
    └── SettingsModule.tsx          # Profile, focus config, data, reset

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

## Privacy

There are no accounts, analytics, or app servers. Profile data and preferences are stored on the device. Google Fonts are loaded by the web shell when network access is available; the app's calculation engine itself makes no network requests.

## License

MIT — build something that moves.
