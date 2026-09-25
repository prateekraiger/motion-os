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
- **Stats & history** — a 7-day view of focus time, task completions and habit consistency (week-over-week focus, best day, per-habit streaks), plus a **GitHub-style focus heatmap** for the last year and a per-tag breakdown of where the time actually went.
- **Perspective** — the original Motion OS clocks: a live **Life clock** (age down to the millisecond) and a **Year clock** (day, week, month, quarter, year progress). The Life clock also carries the **"4,000 weeks" grid**: one square per week lived against the weeks remaining.
- **Day planner (timeboxing)** — drag prioritised tasks onto a 06:00–24:00 timeline (or tap a task, then tap a slot), auto-fill free time with the highest-priority work, and track planned versus done. On touch, tap-to-place replaces dragging because WebViews do not give reliable native drag events.
- **Home & lock-screen widgets** — native Android "Age in motion" and "Year in motion" widgets in five responsive formats (1 × 1, 2 × 1, 2 × 2, 4 × 2, 4 × 4), rendered in the same dot-matrix typeface as the app and offered to lock-screen widget hosts as well.
- **Bring-your-own-cloud sync** — sync across devices through a WebDAV folder you already own (Nextcloud, ownCloud, a home box) or an encrypted file you move through iCloud Drive / Google Drive / Dropbox. The payload is sealed with **AES-GCM 256** on the device (PBKDF2-derived key, passphrase never leaves it) and merged with a **CRDT** (per-record last-write-wins with tombstones), so offline edits on two devices converge instead of overwriting each other. There are still no Motion OS servers.
- **Automated rolling backups** — a snapshot of the whole local state is taken automatically once a day (and on demand), gzip-compressed and kept for the last seven days on the device. Restore any of them from Preferences.
- **Command palette** — `Cmd/Ctrl + K` (or the header button) to navigate, add tasks, complete tasks, toggle habits, start a focus block, switch theme, export, snapshot or sync — entirely from the keyboard.
- **Local voice-to-text** — dictate a task or note with the device's own speech recognition (Android `SpeechRecognizer`; Web Speech API in desktop browsers). Nothing is sent to a transcription service.
- **Tactile haptics** — short vibration feedback when you complete a task, tap a habit, or finish a focus block (`@capacitor`-style native vibrator, with `navigator.vibrate` as the web fallback). Switchable in Preferences.
- **Backup & restore** — export all data to a JSON file (or clipboard) and import it back. Imports from older versions are normalised automatically.
- **Themes** — follow your system, or force dark / light from Preferences.
- Reduced-motion support, safe-area spacing, keyboard-friendly controls, and accessible labels/focus states.

## Development

```bash
npm install
npm run typecheck
npm test          # pure-logic suite (CRDT merge, crypto, planner, heatmap)
npm run build
npm run dev
```

`npm test` bundles `tests/logic.test.ts` with esbuild (a Vite dependency) and runs it with Node — no test framework or network required.

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
- `MotionWidgetsPlugin` stores the minimum widget data (birth moment, name, 12/24 h, surface theme, life expectancy) in native `SharedPreferences` and refreshes both providers.
- `AgeWidgetProvider` and `YearWidgetProvider` render `RemoteViews` layouts, one per size bucket.
- The age widget delegates live seconds to Android's `Chronometer`; the year widget's clock is a `TextClock`. Both tick inside the launcher process, so no JavaScript timer runs in the background.
- Tapping either widget opens Motion OS. Updating settings or resetting the profile immediately refreshes existing widgets.

### Responsive formats

Each provider serves five layouts keyed to launcher footprints (dips, for a typical 5 × 4 handset grid):

| Format | Cells | Typical footprint | Contents |
| --- | --- | --- | --- |
| 1 × 1 | micro | 57 × 102 | one number and the live dot |
| 2 × 1 | strip | 130 × 102 | number, unit, live seconds |
| 2 × 2 | small | 203 × 220 | header, hero, seconds, month rail |
| 4 × 2 | wide | 276 × 220 | the square, roomier |
| 4 × 4 | large | 276 × 456 | hero, seconds, month rail, life line |

On Android 12+ the provider hands the launcher a `Map<SizeF, RemoteViews>`; the launcher inflates the closest fitting layout and swaps it while the user resizes, without waking the app. On older versions the provider reads `OPTION_APPWIDGET_MIN_WIDTH/HEIGHT` and re-renders in `onAppWidgetOptionsChanged`. `MotionWidgetSize.pick` mirrors the framework's own closest-fit rule and is covered by unit tests.

### Type, dots and theme

- Numerals use **Doto**, the app's dot-matrix face, bundled as a static instance (`res/font/doto.ttf`, ROND 100 / wght 800, SIL OFL 1.1 — licence in `res/raw/doto_license.txt`). Font resources resolve in the launcher process from Android 8; older releases fall back to the platform monospace face via `values/styles.xml` vs `values-v26/styles.xml`.
- Progress is a twelve-dot month rail (`res/layout/widget_rail.xml`); each dot is an `ImageView` repainted with `setImageViewResource`, so the rail never depends on font metrics.
- The saved surface preference (auto / light / dark) is resolved by `MotionWidgetTheme` into a palette and painted with remotable setters (`setBackgroundResource`, `setTextColor`, `setImageViewResource`). The in-app gallery previews use the same palette, so what you see is what the launcher shows.
- Refreshes come from the 30-minute update cycle, the exempt `TIME_SET` / `TIMEZONE_CHANGED` / `LOCALE_CHANGED` broadcasts, and one inexact midnight alarm (`ACTION_WIDGET_DAY_ROLL`) so day counters roll over on time.

### Lock screen

Both providers declare `android:widgetCategory="home_screen|keyguard"`. Lock-screen widget hosts (Pixel Tablet, and Pixel phones on Android 16 QPR2 and newer) can therefore place them on the lock screen; every other launcher simply keeps them on the home screen. Older Android versions removed keyguard widgets entirely, so nothing changes there.

If a launcher does not support the in-app pin request, long-press an empty home-screen area, choose **Widgets**, then choose **Motion OS**. The providers are declared in `AndroidManifest.xml`, so they are visible to the system widget picker after the app is installed.

## Sync, privacy and the merge

Motion OS still has no servers, so "the cloud" is a folder the user owns:

- **WebDAV** (Nextcloud, ownCloud, self-hosted) is the automatic path: pull → merge → push, with `MKCOL` retry when the parent collection does not exist yet.
- **File** is the manual path: download an encrypted `motion-os-sync.motion` and move it through the system share sheet / file manager, then merge it on the other device.

Every record carries an `updatedAt` write clock and deletions are remembered as tombstones, so merging is a per-record last-write-wins register — associative, commutative and idempotent. A task deleted on the phone does not resurrect from a stale desktop backup, but re-creating it later does come back. `src/lib/crdt.ts` holds the merge, `src/lib/merge.ts` composes whole payloads, `src/lib/crypto.ts` seals them, and `src/lib/sync.ts` is transport only.

Credentials and the passphrase live in the app's own local storage on the device; nothing but the sealed payload is ever uploaded.

## Android integration beyond widgets

| Feature | Native side | Web side |
| --- | --- | --- |
| Share intent → task | `ACTION_SEND` intent-filter on `MainActivity` (`singleTask`) | `MotionIntentsPlugin` queues the intent, `QuickCapture` turns it into a task |
| Quick Settings tile | `FocusTileService` (`QS_TILE`, `BIND_QUICK_SETTINGS_TILE`) | Starts a 25-minute block through the same intent path |
| Interactive notifications | `MotionNotificationsPlugin` + `NotificationActionReceiver`, `AlarmManager` for reminders | Actions (complete / +5 min / skip / snooze) are queued and applied by `useNativeBridge` |
| Read-only calendar | `MotionCalendarPlugin` over `CalendarContract.Instances`, `READ_CALENDAR` at runtime | `useCalendarEvents` renders events on Today and the planner; nothing is stored |
| Voice-to-text | `MotionSpeechPlugin` over `SpeechRecognizer`, `RECORD_AUDIO` at runtime | `startDictation` streams partial/final transcripts |
| Haptics | `MotionHapticsPlugin` over `Vibrator`/`VibratorManager` | `haptic()` with `navigator.vibrate` fallback |

Events that arrive while the app is closed (a share, a notification action) are queued in native `SharedPreferences` by `MotionBus` and drained on the next launch, so nothing is dropped. Every bridge is defensive: on the web, or when a plugin is missing, each feature silently no-ops and the app keeps working.

## Project structure

```text
src/
├── App.tsx                         # App shell, 5-tab navigation, sub-view routing
├── index.css                       # Theme, typography, motion, safe-area helpers
├── lib/
│   ├── time.ts                     # Calendar, progress, and formatting engine
│   ├── types.ts                    # Task / Habit / Focus / plan / sync data models
│   ├── productivity.ts             # Pure helpers: streaks, sorting, heatmap, tags
│   ├── nav.ts                      # Navigation view/tab types
│   ├── nativeWidgets.ts            # Defensive Capacitor Android bridge
│   ├── crdt.ts                     # Last-write-wins merge + tombstones
│   ├── merge.ts                    # Whole-payload (two-device) merge
│   ├── normalize.ts                # Storage normalisers for every collection
│   ├── crypto.ts                   # AES-GCM 256 envelope + PBKDF2 key derivation
│   ├── encoding.ts                 # base64 / UTF-8 / gzip helpers
│   ├── sync.ts                     # BYOC transport (WebDAV) + payload codec
│   ├── backups.ts                  # Rolling daily snapshots (last 7)
│   ├── timebox.ts                  # Day planner maths: slots, free time, auto-plan
│   ├── reminders.ts                # Stable native notification ids
│   ├── haptics.ts                  # Native vibrator bridge + web fallback
│   ├── speech.ts                   # Native dictation bridge + Web Speech fallback
│   ├── calendar.ts                 # Read-only calendar bridge
│   ├── notifications.ts            # Focus / reminder notification bridge
│   ├── intents.ts                  # Share intent + Quick Settings tile bridge
│   └── download.ts                 # Save / share files out of the app
├── hooks/
│   ├── useNow.ts                   # Visibility-aware live clock
│   ├── useLocalStorage.ts          # Persisted state + id helper
│   ├── useSettings.tsx             # Profile, preferences, theme, native widget sync
│   ├── useReminders.tsx            # Reminder engine: due-check, in-app + web alerts
│   ├── useStore.tsx                # Tasks, habits, focus sessions, planner, sync merge
│   ├── useSync.ts                  # BYOC sync engine (pull → merge → push)
│   ├── useBackups.ts               # Rolling snapshots
│   ├── useNativeBridge.ts          # Share intents, tile, notification actions
│   └── useCalendarEvents.ts        # Read-only calendar overlay for one day
└── components/
    ├── ui.tsx                      # Cards, numeric displays, dots, controls, inputs
    ├── icons.tsx                   # Shared inline SVG icon set
    ├── Onboarding.tsx              # First-run flow (birthday optional)
    ├── TodayModule.tsx             # Dashboard
    ├── TasksModule.tsx             # Task management (notes, reminders, recurrence, search)
    ├── FocusModule.tsx             # Pomodoro focus timer
    ├── HabitsModule.tsx            # Habit tracking
    ├── StatsModule.tsx             # 7-day stats, focus heatmap, tag breakdown
    ├── Heatmap.tsx                 # GitHub-style contribution grid
    ├── WeeksGrid.tsx               # The "4,000 weeks" life grid
    ├── PlannerModule.tsx           # Day planner / timeboxing timeline
    ├── CommandPalette.tsx          # Cmd/Ctrl + K palette
    ├── QuickCapture.tsx            # Share-intent + voice quick capture
    ├── SyncPanel.tsx               # BYOC sync settings
    ├── ReminderToast.tsx           # In-app reminder banner
    ├── MoreModule.tsx              # Hub for perspective, stats, widgets, preferences
    ├── AgeModule.tsx               # Life clock
    ├── YearModule.tsx              # Year clock
    ├── WidgetsModule.tsx           # Widget gallery: formats, lock screen, surface theme
    ├── widgetPreviews.tsx          # Faithful web previews of every native widget format
    └── SettingsModule.tsx          # Profile, notifications, theme, focus config, data, reset

android/app/src/main/
├── java/io/motionos/app/
│   ├── MainActivity.java           # Plugin registration + share/tile intent intake
│   ├── MotionWidgetsPlugin.java    # Capacitor bridge: settings → SharedPreferences
│   ├── MotionIntentsPlugin.java    # Share intents + Quick Settings tile → web
│   ├── MotionNotificationsPlugin.java # Focus/reminder notifications with actions
│   ├── NotificationActionReceiver.java # Notification action buttons
│   ├── MotionCalendarPlugin.java   # Read-only calendar queries
│   ├── MotionSpeechPlugin.java     # On-device dictation
│   ├── MotionHapticsPlugin.java    # System vibrator
│   ├── MotionBus.java              # Queues + fan-out for intents and actions
│   ├── MotionTile.java             # Tile constants
│   └── FocusTileService.java       # Quick Settings tile
│   ├── MotionWidgetData.java       # Calendar maths, rail + theme painting, day-roll alarm
│   ├── MotionWidgetSize.java       # Size buckets and the closest-fit picker
│   ├── MotionWidgetTheme.java      # Saved surface preference → widget palette
│   ├── AgeWidgetProvider.java      # Life clock, five layouts
│   ├── YearWidgetProvider.java     # Year clock, five layouts
│   └── WidgetPinReceiver.java
└── res/
    ├── font/doto.ttf              # Doto instance (ROND 100 / wght 800), OFL 1.1
    ├── layout/widget_{age,year}_{micro,strip,small,wide,large}.xml
    ├── layout/widget_rail.xml     # Shared twelve-dot rail
    └── xml/*_widget_info.xml      # Launcher discovery metadata, home + keyguard
```

## Design direction

Motion OS uses a monochrome, dot-led visual language with one red signal for the current moment. The interface should feel like an instrument, not a feed: each screen explains what it measures before showing the number.

- `#000000` background, white/muted text, and Nothing red for the live state.
- Doto for large displays and Inter for labels and supporting copy.
- Dots represent completed units; the red dot is the unit currently in motion.
- Milliseconds are available in-app, but home-screen widgets use OS-managed seconds because launcher widgets cannot repaint at 60 fps.
- The native widgets bundle the same Doto face (as a static font resource), so the dot voice survives outside the WebView.

## Recurrence & reminder semantics

- Completing a **recurring task** counts the finish (`×N` badge), keeps the completion moment for stats, and re-arms the due date: daily moves one day forward, weekly moves seven days forward (weekly tasks without a due date are pinned to the same weekday next week). The task returns to the open list; completing it again later marks it done for good.
- **Reminders** are one-time ISO moments per task. While the app is running (or when the tab becomes visible), due reminders raise an in-app banner and — if granted — a browser notification. Each task+moment pair is announced at most once, remembered in `localStorage`, and reminders more than 24 h old are not re-announced.
- "Done today" counts tasks completed today, including recurring tasks that have already re-opened.

## Privacy

There are no accounts, analytics, or app servers. Profile data, preferences and reminder history are stored on the device. Reminders and notifications are local-only — they fire while the app or its tab is active and are never scheduled on a server. Google Fonts are loaded by the web shell when network access is available; the app's calculation engine itself makes no network requests.

Optional features that touch the outside world are all opt-in and all local-first:

- **BYOC sync** uploads a sealed payload to an endpoint the user typed in, and to nowhere else. Without the passphrase the payload is opaque bytes.
- **Calendar overlay** reads system events for the visible day and discards them; nothing is written to Motion OS storage.
- **Voice-to-text** uses the device recogniser; transcripts are not sent anywhere by Motion OS.
- **Rolling backups** stay in the device's own local storage until the user exports them.

## License

MIT — build something that moves.
