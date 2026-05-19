import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { jwtDecode } from "jwt-decode";
import { fetchMe, type MeResponse } from "../api/auth";

const TOKEN_KEY = "northstar_token";

// expo-secure-store is native-only. On web fall back to localStorage so the
// app can run in a browser (Expo `w` target) for development.
const isWeb = Platform.OS === "web";

async function storageGet(key: string): Promise<string | null> {
  if (isWeb) {
    try {
      return typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

async function storageSet(key: string, value: string): Promise<void> {
  if (isWeb) {
    try {
      if (typeof window !== "undefined") window.localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function storageDelete(key: string): Promise<void> {
  if (isWeb) {
    try {
      if (typeof window !== "undefined") window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

interface AuthState {
  token: string | null;
  userId: string | null;
  profile: MeResponse | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  token: null,
  userId: null,
  profile: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function extractUserId(token: string): string | null {
  try {
    const payload = jwtDecode<{ sub?: string }>(token);
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Best-effort: refresh /auth/me whenever the token changes. Failure is
  // non-fatal — the rest of the app still works on JWT-sub alone; the
  // profile just powers nicer-to-have UI like avatar initials.
  function refreshProfile(t: string | null) {
    if (!t) {
      setProfile(null);
      return;
    }
    fetchMe(t)
      .then(setProfile)
      .catch(() => setProfile(null));
  }

  useEffect(() => {
    storageGet(TOKEN_KEY)
      .then((stored) => {
        if (stored) {
          const uid = extractUserId(stored);
          if (uid) {
            setToken(stored);
            setUserId(uid);
            refreshProfile(stored);
          } else {
            storageDelete(TOKEN_KEY);
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (newToken: string) => {
    await storageSet(TOKEN_KEY, newToken);
    setToken(newToken);
    setUserId(extractUserId(newToken));
    refreshProfile(newToken);
  };

  const logout = async () => {
    await storageDelete(TOKEN_KEY);
    setToken(null);
    setUserId(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ token, userId, profile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
