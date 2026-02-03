// src/auth/tokenStorage.ts
const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";

function normalizeToken(token: string): string {
  const t = (token ?? "").trim();
  return t.toLowerCase().startsWith("bearer ") ? t.slice(7).trim() : t;
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function setAccessToken(token: string) {
  // IMPORTANT: store only raw jwt, no "Bearer "
  localStorage.setItem(ACCESS_KEY, normalizeToken(token));
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setRefreshToken(token: string) {
  // IMPORTANT: store only raw jwt, no "Bearer "
  localStorage.setItem(REFRESH_KEY, normalizeToken(token));
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}
