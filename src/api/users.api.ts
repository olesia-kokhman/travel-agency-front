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

  // бекенд інколи повертає, але взагалі краще не віддавати пароль
  password?: string | null;

  active?: boolean | null;
  balance?: string | number | null;

  // у тебе в одному місці role, в іншому roles/enabled — залишаю сумісність
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

// ===== Admin endpoints =====
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
