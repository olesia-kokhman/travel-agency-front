// src/api/users.api.ts
import { http } from "./http";

type ApiSuccessResponse<T> = {
  status: string;
  message: string;
  results: T;
};

// ===== DTOs =====
export type UserRole = string;

export type UserResponseDto = {
  id: string;

  name?: string | null;
  surname?: string | null;

  email: string;
  phoneNumber?: string | null;

  password?: string | null;

  active?: boolean | null;
  balance?: string | number | null;

  role?: UserRole | null;
  roles?: string[] | null;
  enabled?: boolean | null;

  createdAt?: string | null;
  updatedAt?: string | null;
};

export type UserUpdateProfileDto = {
  name?: string | null;
  surname?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  password?: string | null;
  balance?: number | null;
};

// ===== NEW: ApiPageResponse (matches backend) =====
export type ApiPageResponse<T> = {
  statusCode: number;
  statusMessage: string;
  results: T[];

  page: number; // 0-based
  size: number;
  totalElements: number;
  totalPages: number;
  numberOfElements: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  hasPrevious: boolean;

  sort: { property: string; direction: string }[];
};

// ===== NEW: UserFilter (matches backend) =====
export type UserFilter = {
  q?: string; // <=120

  roles?: string[]; // UserRole enum names
  active?: boolean;

  minBalance?: string; // BigDecimal as string
  maxBalance?: string;

  // LocalDateTime ISO: 2026-02-05T00:00:00
  createdFrom?: string;
  createdTo?: string;
};

export type UsersPageRequest = {
  filter?: UserFilter;
  page?: number; // 0-based
  size?: number;
  sort?: { property: string; direction: "asc" | "desc" } | null;
};

function appendIf(params: URLSearchParams, key: string, value: any) {
  if (value === null || value === undefined) return;
  if (typeof value === "string" && value.trim() === "") return;
  params.append(key, String(value));
}

function appendList(params: URLSearchParams, key: string, values?: string[]) {
  if (!values || values.length === 0) return;
  values.filter(Boolean).forEach((v) => params.append(key, v));
}

// ===== NEW: server-side paging/filter/sort =====
export async function getUsersPage(req: UsersPageRequest = {}): Promise<ApiPageResponse<UserResponseDto>> {
  const params = new URLSearchParams();

  params.set("page", String(req.page ?? 0));
  params.set("size", String(req.size ?? 10));

  if (req.sort?.property) {
    params.append("sort", `${req.sort.property},${req.sort.direction}`);
  }

  const f = req.filter ?? {};
  appendIf(params, "q", f.q);

  appendList(params, "roles", f.roles);

  if (typeof f.active === "boolean") appendIf(params, "active", f.active);

  appendIf(params, "minBalance", f.minBalance);
  appendIf(params, "maxBalance", f.maxBalance);

  appendIf(params, "createdFrom", f.createdFrom);
  appendIf(params, "createdTo", f.createdTo);

  const { data } = await http.get<ApiPageResponse<UserResponseDto>>(`/api/users?${params.toString()}`);
  return data;
}

// ===== Admin endpoints (старі, можна лишити) =====
export async function getAllUsers(): Promise<UserResponseDto[]> {
  const { data } = await http.get<ApiSuccessResponse<UserResponseDto[]>>("/api/users");
  return data.results;
}

export async function getUserById(userId: string): Promise<UserResponseDto> {
  const { data } = await http.get<ApiSuccessResponse<UserResponseDto>>(`/api/users/${userId}`);
  return data.results;
}

// ===== "Me" endpoints =====
export async function getMe(): Promise<UserResponseDto> {
  const { data } = await http.get<ApiSuccessResponse<UserResponseDto>>("/api/users/me");
  return data.results;
}

export async function updateMe(payload: UserUpdateProfileDto): Promise<UserResponseDto> {
  const { data } = await http.patch<ApiSuccessResponse<UserResponseDto>>("/api/users/me", payload);
  return data.results;
}
