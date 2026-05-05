/**
 * API base URL for the North Star backend.
 *
 * - For Expo web preview (`npm run web`): `http://localhost:8000` works.
 * - For Expo Go on a physical device on the same Wi-Fi: replace localhost
 *   with your dev machine's LAN IP (e.g. `http://192.168.1.42:8000`).
 *   You can run `ipconfig` on Windows to find it.
 * - For Android emulator: `http://10.0.2.2:8000` reaches the host machine.
 *
 * Auth (JWT + Expo SecureStore) lands in a later phase. Until then we use
 * a dev-mode `userId` constant so the approval screens work end-to-end.
 */
export const API_BASE_URL = "http://localhost:8000";

/**
 * Dev-only fixed user_id. Replace with the user_id whose pending approvals
 * you want to see (matches what you'd pass to the HTML demo page).
 *
 * In Phase 7+ this will be replaced by the JWT-decoded user id.
 */
export const DEV_USER_ID = "00000000-0000-0000-0000-000000000000";
