/**
 * API base URL for the North Star backend.
 *
 * - For Expo web preview (`npm run web`): `http://localhost:8000` works.
 * - For Expo Go on a physical device on the same Wi-Fi: replace localhost
 *   with your dev machine's LAN IP (e.g. `http://192.168.1.42:8000`).
 *   You can run `ipconfig` on Windows to find it.
 * - For Android emulator: `http://10.0.2.2:8000` reaches the host machine.
 */
export const API_BASE_URL = "http://localhost:8000";

/**
 * Fallback user_id for dev mode (no auth server running).
 * Screens should prefer `useAuth().userId` from AuthContext.
 * This constant is kept for backward compatibility during migration.
 */
export const DEV_USER_ID = "00000000-0000-0000-0000-000000000000";
