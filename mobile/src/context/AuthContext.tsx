import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { jwtDecode } from "jwt-decode";

const TOKEN_KEY = "northstar_token";

interface AuthState {
  token: string | null;
  userId: string | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  token: null,
  userId: null,
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync(TOKEN_KEY)
      .then((stored) => {
        if (stored) {
          const uid = extractUserId(stored);
          if (uid) {
            setToken(stored);
            setUserId(uid);
          } else {
            SecureStore.deleteItemAsync(TOKEN_KEY);
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (newToken: string) => {
    await SecureStore.setItemAsync(TOKEN_KEY, newToken);
    setToken(newToken);
    setUserId(extractUserId(newToken));
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setToken(null);
    setUserId(null);
  };

  return (
    <AuthContext.Provider value={{ token, userId, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
