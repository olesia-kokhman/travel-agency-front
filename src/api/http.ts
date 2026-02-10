// src/api/http.ts
import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken, clearTokens } from "../auth/tokenStorage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

export const http = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// окремий клієнт БЕЗ інтерсепторів для refresh/logout, щоб не ловити рекурсію
const authHttp = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

function normalizeToken(raw: string): string {
  const t = (raw ?? "").trim();
  return t.toLowerCase().startsWith("bearer ") ? t.slice(7).trim() : t;
}

http.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();

    // ----- DEBUG (можеш прибрати)
    const method = (config.method ?? "GET").toUpperCase();
    const fullUrl = `${config.baseURL ?? ""}${config.url ?? ""}`;
    console.log("[HTTP]", method, fullUrl);
    console.log("[HTTP] token exists?", Boolean(token), "len:", token?.length ?? 0);
    // ----------------------------

    config.headers = config.headers ?? {};

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete (config.headers as any).Authorization;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ===== Refresh orchestration (single-flight + queue) =====
let isRefreshing = false;
let refreshWaiters: Array<(token: string | null) => void> = [];

function notifyWaiters(newAccessToken: string | null) {
  refreshWaiters.forEach((cb) => cb(newAccessToken));
  refreshWaiters = [];
}

async function doRefresh(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token");

  // бек: POST /api/auth/refresh { refreshToken }
  const { data } = await authHttp.post("/api/auth/refresh", { refreshToken });

  // очікуємо ApiSuccessResponse<JwtResponseDto>
  const jwt = data?.results;
  if (!jwt?.jwtAccessToken) throw new Error("Refresh response: missing jwtAccessToken");

  setAccessToken(jwt.jwtAccessToken);
  if (jwt.jwtRefreshToken) setRefreshToken(jwt.jwtRefreshToken);

  return normalizeToken(jwt.jwtAccessToken);
}

function isAuthEndpoint(url?: string) {
  if (!url) return false;
  return url.includes("/api/auth/login") || url.includes("/api/auth/register") || url.includes("/api/auth/refresh") || url.includes("/api/auth/logout");
}

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (!original) return Promise.reject(error);

    // Не рефрешимо на auth endpoint-ах і не робимо retry більше 1 разу
    if (status !== 401 || original._retry || isAuthEndpoint(original.url)) {
      return Promise.reject(error);
    }

    original._retry = true;

    // якщо refresh уже йде — чекаємо
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshWaiters.push((newToken) => {
          if (!newToken) {
            reject(error);
            return;
          }
          original.headers = original.headers ?? {};
          original.headers.Authorization = `Bearer ${newToken}`;
          resolve(http(original));
        });
      });
    }

    // стартуємо refresh
    isRefreshing = true;

    try {
      const newToken = await doRefresh();
      notifyWaiters(newToken);

      original.headers = original.headers ?? {};
      original.headers.Authorization = `Bearer ${newToken}`;

      return http(original);
    } catch (e) {
      // refresh помер → чистимо токени, всі очікуючі запити падають
      clearTokens();
      notifyWaiters(null);
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  }
);
