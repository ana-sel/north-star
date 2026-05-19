# Calendar

**Route**: `Tabs > More > Calendar`
**Source**: [mobile/src/screens/CalendarScreen.tsx](../../mobile/src/screens/CalendarScreen.tsx)
**Screenshot**: [../images/12_calendar.png](../images/12_calendar.png)

## What it shows
- Header "Calendar" + back link.
- "Calendar feed" card with explanation: "Paste a secret iCal/ICS URL. Save it to skip the paste step next time — saved URLs are encrypted on the server."
- URL input "https://calendar.google.com/calendar/ical/...".
- "Days ahead" numeric input (default 14).
- **Fetch events** button.

## Controls
- URL input + days-ahead input.
- Fetch events → fetch + parse + show upcoming events.
- (In source) Save URL button persists encrypted URL on the server.

## API calls
- `POST /api/calendar/fetch` with `{ url, days_ahead }`.
- `POST /api/calendar/save-url` (encrypted at rest).
- `GET /api/calendar/saved-url`.

## Observed behavior
- Loads cleanly. Saved URL handling and VTIMEZONE/TZID fix already shipped earlier this session (commit `fd5066f`).
- One of the few screens that already uses `useAuth().userId`.

## Bugs / broken / TODO
- No visible indicator that a saved feed is already in use (see [SUMMARY.md #8](../SUMMARY.md)).
- No "Clear saved feed" button.
