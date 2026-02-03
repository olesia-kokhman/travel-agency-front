// src/auth/AuthContext.tsx
import React, { createContext, useContext, useMemo, useState } from "react";
import * as authApi from "../api/auth.api";
import { clearTokens, getAccessToken, setAccessToken, setRefreshToken } from "./tokenStorage";
import { getEmailFromToken, getRolesFromToken, getUserIdFromToken, parseJwt, isExpired, getTokenType } from "./jwt";

type AuthState = {
  isAuthenticated: boolean;
  email: string | null;
  userId: string | null;
  roles: string[];
};

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
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
  const raw = getAccessToken();
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

  const login = async (email: string, password: string) => {
    // Clean switch between accounts
    clearTokens();
    setState(emptyState());

    const jwt = await authApi.login({ email, password });

    // під твою DTO: jwtAccessToken / jwtRefreshToken
    if (!jwt?.jwtAccessToken) {
      throw new Error("Login response: missing jwtAccessToken");
    }

    setAccessToken(jwt.jwtAccessToken);
    if (jwt.jwtRefreshToken) setRefreshToken(jwt.jwtRefreshToken);

    setState(buildStateFromAccessToken());
  };

  const logout = () => {
    clearTokens();
    setState(buildStateFromAccessToken());
  };

  const value = useMemo(
    () => ({ ...state, login, logout, refreshFromStorage }),
    [state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
