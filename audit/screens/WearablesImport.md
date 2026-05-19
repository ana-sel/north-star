# Wearables import

**Route**: `Tabs > More > WearablesImport`
**Source**: [mobile/src/screens/WearablesImportScreen.tsx](../../mobile/src/screens/WearablesImportScreen.tsx)
**Screenshot**: [../images/19_wearables.png](../images/19_wearables.png)

## What it shows
- Header "Wearables" + back link.
- "Import wearable data" card with explanation: choose a JSON file exported from Apple Health, Fitbit, Garmin or Oura. Existing health log rows for the same dates are **merged** — only the fields you send overwrite existing values.
- "Default source" input (default `apple_health`) used if the file omits it.
- **Pick JSON file & import** button.
- Expected fields per day documented: `log_date (YYYY-MM-DD)`, `sleep_minutes`, `steps`, `weight_kg`, `calories`, `bedtime`, `wake_time`.

## Controls
- Default source input.
- Pick JSON file & import button — uses `expo-document-picker`.

## API calls
- `POST /api/health/import` with array of daily rows.

## Observed behavior
- Loads cleanly, copy is clear, defaults sensible.

## Bugs / broken / TODO
- DEV_USER_ID scope.
- No post-import summary banner (rows imported / merged / rejected).
