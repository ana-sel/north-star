# Settings

**Route**: `Tabs > More > Settings`
**Source**: [mobile/src/screens/SettingsScreen.tsx](../../mobile/src/screens/SettingsScreen.tsx)
**Screenshot**: [../images/14_settings.png](../images/14_settings.png)

## What it shows
- Header "Settings" + back link.
- **Connection** card: API Base URL input + hint `"Current user: 00000000…"`.
- **Notifications** card with 3 switches:
  - Morning review prompt (on) — "Remind to check today's plan at 8:00".
  - Overload alert (on) — "Warn when >5 cards are in-progress".
  - Bedtime reflection (off) — "Evening prompt to write a diary entry".
- **Privacy & AI** card:
  - "Allow external AI" switch (off).
  - "Require approval for external" switch (on).
  - Lock note: "🔒 Diary entries, healing reflections, and private cards never leave this device regardless of these settings."
- **About** card: "North Star — Personal Navigation OS · v0.1.0 (local-first MVP) · All data stays on your device by default."
- **Save settings** button.
- **Log out** button (with confirm dialog).

## Controls
- API URL text input.
- Five toggle switches.
- Save settings — currently **stub**; shows `Alert.alert("Saved", "Settings stored locally.")`. No persistence to AsyncStorage, no backend write.
- Log out — confirmed → `logout()` from AuthContext, which clears the token and bounces back to LoginScreen.

## API calls
- None of the settings actually call the backend on Save.
- Logout: client-side token clear only.

## Bugs / broken / TODO
- **#2 in [SUMMARY.md](../SUMMARY.md)** — "Current user" shows `DEV_USER_ID.slice(0, 8)…` from `mobile/src/config/api.ts` instead of `useAuth().userId`. The screen even imports `useAuth` but never reads `userId`.
- **#3 in [SUMMARY.md](../SUMMARY.md)** — "Save settings" is a stub. None of the toggles persist across reloads.
- No theme toggle despite the More-tab description mentioning "theme".

## Suggested next steps
- Wire each toggle to AsyncStorage on mount + on change.
- Replace the `DEV_USER_ID` hint with the real `userId` from `useAuth()`.
- Once a `/users/me/preferences` endpoint exists, PATCH the externalAI + requireApproval values there too.
