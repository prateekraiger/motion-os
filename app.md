# Motion OS — build notes

Motion OS is a Capacitor web app with native Android home-screen widgets. The web UI lives in `src/`; the Android widget providers and Capacitor bridge live in `android/app/src/main/`.

## Local development

```bash
npm install
npm run dev
```

Before syncing Android, create the production web bundle:

```bash
npm run typecheck
npm run build
npx cap sync android
```

The APK is intentionally not built or committed here. When you are ready, use a machine with JDK 21 and Android SDK API 36 installed:

```bash
cd android
./gradlew assembleDebug
```

## Widget testing checklist

1. Install the resulting APK on an Android 8+ device or emulator, including Android 16.
2. Open Motion OS and complete the birth-moment setup.
3. Open **Widgets** and tap **Add life widget** or **Add year widget**.
4. Approve the launcher pin prompt, or use the launcher’s **Widgets → Motion OS** picker.
5. Change the profile or clock settings and confirm existing widgets refresh.
6. Tap a widget and confirm it opens the app.

The age widget uses Android `Chronometer` for the moving seconds. Calendar values are refreshed by the launcher on its normal widget cadence and whenever the app syncs settings.
