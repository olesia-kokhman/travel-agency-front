// src/api/auth.api.ts
import { http } from "./http";
import type { ApiSuccessResponse, JwtResponseDto } from "../types/response";
import type { LoginRequestDto, RegisterRequestDto } from "../types/request";
import type { RefreshRequestDto } from "../types/request"; 

export async function login(dto: LoginRequestDto): Promise<JwtResponseDto> {
  const { data } = await http.post<ApiSuccessResponse<JwtResponseDto>>("/api/auth/login", dto);
  return data.results;
}

export async function register(dto: RegisterRequestDto): Promise<void> {
  await http.post<ApiSuccessResponse<JwtResponseDto>>("/api/auth/register", dto);
}

export async function refresh(dto: RefreshRequestDto): Promise<JwtResponseDto> {
  const { data } = await http.post<ApiSuccessResponse<JwtResponseDto>>("/api/auth/refresh", dto);
  return data.results;
}

export async function logout(dto: RefreshRequestDto): Promise<void> {
  await http.post<ApiSuccessResponse<void>>("/api/auth/logout", dto);
}
