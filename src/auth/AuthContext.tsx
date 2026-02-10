// src/auth/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as authApi from "../api/auth.api";
import {
  clearTokens,
  setAccessToken,
  setRefreshToken,
  getRefreshToken,
  onTokensChanged,
} from "./tokenStorage";
import { getEmailFromToken, getRolesFromToken, getUserIdFromToken, parseJwt, isExpired, getTokenType } from "./jwt";

type AuthState = {
  isAuthenticated: boolean;
  email: string | null;
  userId: string | null;
  roles: string[];
};

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshFromStorage: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeToken(raw: string): string {
  const t = (raw ?? "").trim();
  return t.toLowerCase().startsWith("bearer ") ? t.slice(7).trim() : t;
}

function emptyState(): AuthState {
  return { isAuthenticated: false, email: null, userId: null, roles: [] };
}

function buildStateFromAccessToken(): AuthState {
  const raw = localStorage.getItem("access_token");
  if (!raw) return emptyState();

  const token = normalizeToken(raw);
  const payload = parseJwt(token);
  if (!payload) return emptyState();

  const tokenType = getTokenType(token);
  const expired = isExpired(payload);
  const isAuthenticated = tokenType === "ACCESS" && !expired;

  return {
    isAuthenticated,
    email: getEmailFromToken(token),
    userId: getUserIdFromToken(token),
    roles: getRolesFromToken(token),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => buildStateFromAccessToken());

  const refreshFromStorage = () => setState(buildStateFromAccessToken());

  useEffect(() => {
    // custom event (setAccessToken/setRefreshToken/clearTokens)
    const off = onTokensChanged(() => setState(buildStateFromAccessToken()));

    // optional: якщо токени змінилися в іншій вкладці
    const onStorage = (e: StorageEvent) => {
      if (e.key === "access_token" || e.key === "refresh_token") {
        setState(buildStateFromAccessToken());
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      off();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const login = async (email: string, password: string) => {
    clearTokens();
    setState(emptyState());

    const jwt = await authApi.login({ email, password });

    if (!jwt?.jwtAccessToken) throw new Error("Login response: missing jwtAccessToken");

    setAccessToken(jwt.jwtAccessToken);
    if (jwt.jwtRefreshToken) setRefreshToken(jwt.jwtRefreshToken);

    setState(buildStateFromAccessToken());
  };

  const logout = async () => {
    // best-effort backend logout
    const rt = getRefreshToken();
    try {
      if (rt) await authApi.logout({ refreshToken: rt });
    } catch {
      // ігноруємо помилку, локально все одно вичищаємо
    } finally {
      clearTokens();
      setState(buildStateFromAccessToken());
    }
  };

  const value = useMemo(() => ({ ...state, login, logout, refreshFromStorage }), [state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
