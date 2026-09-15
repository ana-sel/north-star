// True when real Supabase credentials are present. When false, the app runs in
// a local preview mode (mock user) so the UI can be explored without a backend.
export const supabaseConfigured =
  !!process.env.EXPO_PUBLIC_SUPABASE_URL && !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
