// src/api/passwordReset.api.ts
import { http } from "./http";

type ApiSuccessResponse<T> = {
  statusCode?: number;     // якщо у тебе інколи statusCode number
  status?: string;         // або status string (старі)
  message?: string;
  statusMessage?: string;
  results: T;
};

export type PasswordResetRequestDto = {
  email: string;
};

export type PasswordResetConfirmDto = {
  token: string;
  newPassword: string;
};

export async function requestPasswordReset(email: string): Promise<void> {
  await http.post<ApiSuccessResponse<null>>("/api/auth/password-reset/request", { email });
}

export async function confirmPasswordReset(token: string, newPassword: string): Promise<void> {
  await http.post<ApiSuccessResponse<null>>("/api/auth/password-reset/confirm", {
    token,
    newPassword,
  });
}
