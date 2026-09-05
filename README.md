# Motion OS

> A live perspective on time. Not the date — the *motion* of your life and the current year, down to the millisecond.

Motion OS is a minimalist, dot-matrix time companion inspired by the **Nothing OS** aesthetic. It ships two modules:

| Module | What it does |
| :-- | :-- |
| **Age In Motion** | A 60 fps life clock: years · months · days · hours · minutes · seconds · **milliseconds**, next-birthday countdown, day milestones, "life in years" dot grid and life stats (heartbeats, breaths, full moons…). |
| **Year In Motion** | Annual progress to **6 decimal places**, a 365/366-dot grid or dotted progress bar, "Day X of Y / N remaining", today/week/month rings, quarter & month breakdown, New Year countdown. |

Plus a **Widgets** gallery (2×2 and 4×2 previews for both modules, black or glass-on-wallpaper) and **Settings** for customization.

---

## ✨ Features

- **Real-time counters** driven by `requestAnimationFrame`, auto-paused when the tab is hidden and re-synced on return.
- **No blinking / jitter** — all numerals use tabular figures with fixed-width slots. The millisecond "motion" effect is a constant, subtle CSS blur (respects `prefers-reduced-motion`) instead of per-frame flicker.
- **Dot-matrix typography** using the *Doto* variable font (round dots, heavy weight) as a web-safe stand-in for Nothing's NDot55; *Inter* for micro labels.
- **Strict monochrome palette** — `#000000` background, `#FFFFFF` / `#A0A0A0` foreground, Nothing Red `#FF0000` only for the "now" dot, warnings and milestones.
- **Mobile-first** — 430 px max width, safe-area insets, floating pill tab bar, native date/time pickers, PWA meta tags for "Add to Home Screen".
- **Customization** — name, birth date/time, milliseconds on/off, motion blur on/off, 12/24 h clock, Dots vs Bar default view, life horizon (50–120 years), reset.
- **Private by default** — everything is stored in `localStorage`; no accounts, no network calls (besides Google Fonts).

---

## 🛠 Tech stack

- [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- [Vite 7](https://vitejs.dev)
- [Tailwind CSS 4](https://tailwindcss.com)
- Fonts: [Doto](https://fonts.google.com/specimen/Doto) (dot matrix) & [Inter](https://fonts.google.com/specimen/Inter)

---

## 🚀 Getting started

```bash
# install
npm install

# develop
npm run dev

# production build (outputs a single-file dist/index.html)
npm run build

# preview the production build
npm run preview
```

---

## 📁 Project structure

```
src/
├── App.tsx                    # Shell: header, tab bar, routing, onboarding gate
├── index.css                  # Tailwind theme, fonts, animations, mobile helpers
├── lib/
│   └── time.ts                # Core engine: age, birthdays, year/month/week/day progress
├── hooks/
│   ├── useNow.ts              # rAF clock (60 fps or throttled), visibility-aware
│   └── useSettings.tsx        # Persistent settings context (localStorage)
└── components/
    ├── ui.tsx                 # Widget, DotBar, DotGrid, DotRing, Segmented, Toggle…
    ├── Onboarding.tsx         # First-run: name + birth date/time
    ├── AgeModule.tsx          # Age In Motion
    ├── YearModule.tsx         # Year In Motion
    ├── WidgetsModule.tsx      # 2×2 / 4×2 widget previews + native timer notes
    └── SettingsModule.tsx     # Customization
```

---

## 🧮 Core engine notes

- **Age** is computed with real calendar arithmetic: whole years via anniversaries (Feb 29 clamps to Feb 28 in non-leap years), then whole months (day-of-month clamped), then DST-safe day stepping, then the millisecond remainder.
- **Year progress** = `(now − Jan 1) / (next Jan 1 − Jan 1)` in local time, formatted to 6 decimals. Day-of-year uses UTC date math to avoid DST drift.
- Week progress starts on **Monday**.

---

## 📱 Widgets: the refresh challenge

Mobile OSes won't let a home-screen widget repaint every millisecond. Motion OS follows this plan:

- **In-app:** full 60 fps millisecond counter.
- **On-widget:** show **seconds** with a red **dot-pulse** to imply motion, and let the OS drive the count:
  - **iOS (SwiftUI):** `Text(timerInterval: birth...Date.distantFuture, countsDown: false)`
  - **Android (RemoteViews):** `Chronometer` with `setBase(...)`

The **Widgets** tab previews the 2×2 and 4×2 layouts (with glassmorphism when placed on a wallpaper).

---

## 🎨 Design rules

- Widgets: 28 px radius cards on pitch black; circular variants for rings.
- Labels: 10 px uppercase, 0.18 em tracking, `#A0A0A0`.
- Progress is always **dots** — a row (bar), a grid (365 days), or a ring (48 dots). Filled = white, remaining = `#262626`, the current unit = pulsing red.

---

## 🗺 Roadmap

- [x] Phase 1 — Core engine (6-decimal precision)
- [x] Phase 2 — Monochrome dot-matrix UI
- [x] Phase 3 — 2×2 / 4×2 widget designs (web previews)
- [x] Phase 4 — Dots grid ↔ progress bar toggle & customization
- [ ] Native wrappers (Capacitor / Expo) with real home-screen widgets
- [ ] Bundle the official Nothing typeface once licensed

---

## 📄 License

MIT — build something that moves.
