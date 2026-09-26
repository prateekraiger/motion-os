1. **Frontend Build & Sync**:

   ```bash
   pnpm install
   pnpm run build
   npx cap sync android
   ```

2. **Assemble Debug APK with Gradle** (for local testing):

   ```bash
   cd android
   .\gradlew.bat assembleDebug
   ```

aab

cd android; .\gradlew bundleRelease
