// src/api/auth.api.ts
import { http } from "./http";
import type { ApiSuccessResponse, JwtResponseDto } from "../types/response";
import type { LoginRequestDto, RegisterRequestDto } from "../types/request";

export async function login(dto: LoginRequestDto): Promise<JwtResponseDto> {
  const { data } = await http.post<ApiSuccessResponse<JwtResponseDto>>("/api/auth/login", dto);
  return data.results;
}

export async function register(dto: RegisterRequestDto): Promise<void> {
  // бек повертає results = null, тому просто виклик
  await http.post<ApiSuccessResponse<JwtResponseDto>>("/api/auth/register", dto);
}
