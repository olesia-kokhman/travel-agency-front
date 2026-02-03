// src/api/http.ts
import axios, { type InternalAxiosRequestConfig } from "axios";
import { getAccessToken } from "../auth/tokenStorage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

export const http = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

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
