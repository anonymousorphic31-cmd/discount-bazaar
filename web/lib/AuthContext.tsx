"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AuthUser } from "./types";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  /** True once the localStorage check on mount has finished — protected pages should wait for this before deciding to redirect. */
  isHydrated: boolean;
  isLoginOpen: boolean;
  openLogin: () => void;
  closeLogin: () => void;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const STORAGE_KEY = "discountbazaar.auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoginOpen, setLoginOpen] = useState(false);
  const [isHydrated, setHydrated] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { token: string; user: AuthUser };
        setToken(parsed.token);
        setUser(parsed.user);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setHydrated(true);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      token,
      isHydrated,
      isLoginOpen,
      openLogin: () => setLoginOpen(true),
      closeLogin: () => setLoginOpen(false),
      login: (nextToken, nextUser) => {
        setToken(nextToken);
        setUser(nextUser);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: nextToken, user: nextUser }));
        setLoginOpen(false);
      },
      logout: () => {
        setToken(null);
        setUser(null);
        window.localStorage.removeItem(STORAGE_KEY);
      },
    }),
    [user, token, isHydrated, isLoginOpen],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
