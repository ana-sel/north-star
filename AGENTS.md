# Agent Instructions — Compass

Private personal navigation app. V1 = sleep tracking; V2 = energy/mood; V3 = planning.

## Source of Truth
- Architecture decisions: `Compass/architecture.html` — follow it; do not reintroduce
  removed approaches (no local Ollama, no Cloudflare Tunnel).
- V1 product spec: `Compass/compass-v1-design.md`
- App structure & feature pattern: `Compass/mobile/ARCHITECTURE.md`
- Backend schema & RLS: `Compass/backend/README.md`

## Stack
- Expo 51 + React Native 0.74 + TypeScript (strict). Backend: Supabase. State: Zustand.

## Commands (run in `Compass/mobile`)
| Task | Command |
|------|---------|
| Typecheck (ALWAYS before committing) | `npx tsc --noEmit` |
| Install deps | `npm install --legacy-peer-deps` |
| Start | `npm start` |

## Emulator — how to start and verify changes

All commands below run in PowerShell. Set env vars once per terminal session before using `adb` or `expo`.

### 1 — Environment (set once per terminal session)
```powershell
$env:ANDROID_HOME = "${env:ProgramFiles(x86)}\Android\android-sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:JAVA_HOME = "$env:LOCALAPPDATA\Programs\Microsoft\jdk-17.0.19+10"
```

### 2 — Start the emulator (leave this terminal running)
```powershell
& "$env:ANDROID_HOME\emulator\emulator.exe" -avd Galaxy_S25_FE -no-snapshot-load
```
AVD name: `Galaxy_S25_FE` (1080×2340, 420dpi, Android 34, PlayStore).
Wait until the home screen is fully visible before proceeding.

### 3 — Start Metro and push the app (separate terminal)
```powershell
cd "d:\My Archive\Compass\Compass\mobile"
# Set env vars (same block as step 1)
npx expo start --port 8083
```
Press **`a`** once the Metro QR code appears → installs the app on `emulator-5554`.

After the first install, **every file save triggers a fast-refresh automatically** — no action needed to see changes.

### 4 — Force a full reload if things look stuck
- In the emulator press **Ctrl+M** (or shake gesture) → **Reload**
- Or restart Metro with `--clear`: `npx expo start --clear --port 8083`

### 5 — Take a screenshot and pull it (for verification)
```powershell
$adb = "${env:ProgramFiles(x86)}\Android\android-sdk\platform-tools\adb.exe"
& $adb shell screencap -p /sdcard/screen.png
& $adb pull /sdcard/screen.png "d:\My Archive\Compass\screen.png"
```
Then use `view_image` on `d:\My Archive\Compass\screen.png` to inspect.

### 6 — Tap a point on screen (device pixels, 420dpi → 1dp = 2.625px)
```powershell
& $adb shell input tap <x> <y>    # coordinates in device pixels
```
Key tap targets (device pixels, 1080×2340 screen):
- Gear/Settings button: `985 147`
- Today tab: `180 2290`
- Week tab: `540 2290`
- History tab: `900 2290`

### 7 — Switch to 3-button nav (prevents gesture zone eating tab bar taps)
```powershell
& $adb shell settings put secure navigation_mode 0
```

## Validation Rules
- `npx tsc --noEmit` is the source of truth for errors — the editor diagnostics miss
  unused imports and wrong library APIs. Never commit without a clean tsc run.
- `npm install` needs `--legacy-peer-deps` (testing-library wants React 19, app is on 18).

## Library Gotchas
- `date-fns-tz` is v2: use `zonedTimeToUtc`, `utcToZonedTime`, `formatInTimeZone`.
  The v3 names `fromZonedTime`/`toZonedTime` fail to import.
- React 17+ JSX transform: do NOT `import React` solely for JSX (triggers noUnusedLocals).
- supabase-js v2 has no `.from(...).on(...)` realtime API — do not use that pattern.
- Local domain types import via relative path (`../types/index`), never `@types/*`
  (that alias collides with the reserved TS `@types/` namespace).

## Conventions
- IDs are UUIDs everywhere.
- Auth lives in `AuthGate` + `useAuthStore` (Zustand). There is no `useAuth` hook.
- Feature-based folders under `src/features/<feature>/{screens,components}`; add new
  versions as new feature modules — never refactor V1 to bolt on V2/V3.
- Use the design system in `src/styles/theme.ts`; no hard-coded colors/spacing.
- Concise one-line `//` comments, not JSDoc banners. Keep code compact; remove dead code.

## GDPR / Privacy
- Only duration numbers may reach the AI Edge Function — never `user_id` or personal data.
- Store the minimum: sleep times (UTC) + the IANA timezone they were logged in.
- Row-Level Security must isolate every user's rows.

## Git
- Never stage/commit/push without explicit approval from the user.
