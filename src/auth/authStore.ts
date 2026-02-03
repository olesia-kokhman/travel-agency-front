// src/auth/authStore.ts
import { getAccessToken } from "./tokenStorage";
import { getEmailFromToken, getRolesFromToken, getTokenType, getUserIdFromToken, parseJwt, isExpired } from "./jwt";

export type AuthState = {
  token: string | null;
  userId: string | null;
  email: string | null;
  roles: string[];
  tokenType: "ACCESS" | "REFRESH" | null;
  isExpired: boolean;
  isAuthenticated: boolean;
};

function normalizeToken(raw: string): string {
  const t = (raw ?? "").trim();
  return t.toLowerCase().startsWith("bearer ") ? t.slice(7).trim() : t;
}

export function getAuthState(): AuthState {
  const raw = getAccessToken();
  if (!raw) {
    return {
      token: null,
      userId: null,
      email: null,
      roles: [],
      tokenType: null,
      isExpired: false,
      isAuthenticated: false,
    };
  }

  const token = normalizeToken(raw);

  const payload = parseJwt(token);
  const tokenType = getTokenType(token);
  const expired = payload ? isExpired(payload) : true;

  const userId = getUserIdFromToken(token);
  const email = getEmailFromToken(token);
  const roles = getRolesFromToken(token);

  const isAuthenticated = tokenType === "ACCESS" && !expired;

  return { token, userId, email, roles, tokenType, isExpired: expired, isAuthenticated };
}
