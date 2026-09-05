1. **Frontend Build & Sync**:

   ```bash
   cd frontend
   pnpm install
   pnpm run build:mobile
   npx cap sync android
   ```

2. **Assemble Debug APK with Gradle** (for local testing):

   ```bash
   cd android
   .\gradlew.bat assembleDebug
   ```
