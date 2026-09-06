# Motion OS

> See time while it is happening.

Motion OS is a quiet, personal time dashboard for two questions:

1. **How much life have I lived?** — a live age clock with calendar-accurate years, months, days, hours, minutes, seconds, and optional milliseconds.
2. **Where am I in this year?** — a year clock with day, week, month, quarter, and year progress.

The app is intentionally simple: set one birth moment, then use the Life clock, Year clock, or a home-screen widget whenever you want a little context.

## What is included

- A focused mobile-first interface with clear Life, Year, Widgets, and Preferences sections.
- Calendar-aware age arithmetic, including leap years, clamped February 29 anniversaries, and daylight-saving-safe day stepping.
- Six-decimal year progress and dot-based visualisations for years, days, months, quarters, and life horizon.
- Native Android home-screen widgets:
  - **Age in motion** — a 2 × 2 life clock with a native `Chronometer` for moving seconds.
  - **Year in motion** — a 4 × 2 year-progress widget with day counts and a native progress bar.
- One-tap launcher pinning from the Widgets screen using Android's `requestPinAppWidget` API. Manual launcher instructions remain available for launchers that do not support pinning requests.
- Android 16-ready widget metadata: exported providers, previews, resize support, and a 30-minute host refresh period for calendar values.
- Local-only profile and preferences. The Android bridge mirrors only the birth epoch, display name, and clock format needed to draw widgets.
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
├── App.tsx                         # App shell, navigation, and onboarding gate
├── index.css                       # Theme, typography, motion, safe-area helpers
├── lib/
│   ├── time.ts                     # Calendar and progress engine
│   └── nativeWidgets.ts            # Defensive Capacitor Android bridge
├── hooks/
│   ├── useNow.ts                   # Visibility-aware live clock
│   └── useSettings.tsx             # Local settings and native widget sync
└── components/
    ├── ui.tsx                     # Cards, numeric displays, dots, controls
    ├── Onboarding.tsx             # Clear first-run explanation and profile setup
    ├── AgeModule.tsx              # Life clock
    ├── YearModule.tsx             # Year clock
    ├── WidgetsModule.tsx           # Native widget actions and previews
    └── SettingsModule.tsx          # Profile and display preferences

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
