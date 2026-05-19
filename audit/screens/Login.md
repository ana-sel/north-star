# Login

**Route**: Rendered by `AuthGate` when there is no token (no parent Tabs / no header).
**Source**: [mobile/src/screens/LoginScreen.tsx](../../mobile/src/screens/LoginScreen.tsx)
**Backend**: [backend/app/api/auth.py](../../backend/app/api/auth.py), [backend/app/auth.py](../../backend/app/auth.py)

## What it shows
- App branding header.
- Email input.
- Password input.
- Display-name input (Register mode only).
- "Sign in" / "Register" submit button.
- Toggle link "Need an account? Register" / "Already have an account? Sign in".

## Controls
- Email + password (+ display name) inputs.
- Submit button.
- Mode toggle link.

## API calls
- `POST /api/auth/register` `{ email, password, display_name }` → 201 + JWT.
- `POST /api/auth/login` `{ email, password }` → 200 + JWT.
- On success, `AuthContext.setToken` stores the JWT (web: `window.localStorage`, native: `SecureStore`), root navigator swaps to Tabs.

## Observed behavior
- Verified end-to-end in this session: registered `test@northstar.app` / `Test1234!`, JWT returned, navigated to Tabs, browser reload preserves session (localStorage fallback shipped in commit `361f5b7`).

## Bugs / broken / TODO
- No "forgot password" flow.
- No password strength meter.
- Once auth is fully wired (see [SUMMARY.md #1](../SUMMARY.md)), the rest of the app needs to switch off DEV_USER_ID before login is meaningful for data scope.
