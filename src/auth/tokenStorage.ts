// src/auth/tokenStorage.ts
const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";

const TOKENS_EVENT = "auth:tokens-changed";

function normalizeToken(token: string): string {
  const t = (token ?? "").trim();
  return t.toLowerCase().startsWith("bearer ") ? t.slice(7).trim() : t;
}

function emitTokensChanged() {
  window.dispatchEvent(new Event(TOKENS_EVENT));
}

export function onTokensChanged(handler: () => void) {
  window.addEventListener(TOKENS_EVENT, handler);
  return () => window.removeEventListener(TOKENS_EVENT, handler);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function setAccessToken(token: string) {
  localStorage.setItem(ACCESS_KEY, normalizeToken(token));
  emitTokensChanged();
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setRefreshToken(token: string) {
  localStorage.setItem(REFRESH_KEY, normalizeToken(token));
  emitTokensChanged();
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  emitTokensChanged();
}
