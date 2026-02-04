// src/api/orders.ts
import { http } from "./http";
import type { ApiSuccessResponse } from "../types/response";
import type { UserResponseDto } from "./users.api";

// ===== Nested DTOs (під твій бек) =====
export type PaymentResponseDto = {
  id: string;
  paymentMethod: string;
  status: string; // SUCCESS / FAILED / ...
  paidAt?: string | null;
  amount?: number | null;
  failureReason?: string | null;
  orderId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ReviewResponseDto = {
  id: string;
  comment?: string | null;
  rating?: number | null;
  orderId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

// ===== USER Order DTO =====
export type OrderResponseDto = {
  id: string;
  orderNumber: string;
  totalAmount: number | string; // BigDecimal (в JSON часто number)
  status: string; // enum -> string
  tourId: string;

  review: ReviewResponseDto | null;
  payment: PaymentResponseDto | null;

  createdAt: string; // LocalDateTime
  updatedAt: string; // LocalDateTime
};

// ===== ADMIN Order DTO =====
export type AdminOrderResponseDto = {
  id: string;
  orderNumber: string;
  totalAmount: number | string;
  status: string;
  tourId: string;

  user: UserResponseDto;
  review: ReviewResponseDto | null;
  payment: PaymentResponseDto | null;

  createdAt: string;
  updatedAt: string;
};

export type OrderCreateDto = {
  tourId: string;
};

export type OrderStatusUpdateDto = {
  status: string; // e.g. "CANCELED"
};

/**
 * USER endpoints
 */
export async function getMyOrders(userId: string) {
  const res = await http.get<ApiSuccessResponse<OrderResponseDto[]>>(`/api/orders/me/${userId}`);
  return res.data.results;
}

export async function getMyOrderById(orderId: string) {
  const res = await http.get<ApiSuccessResponse<OrderResponseDto>>(`/api/orders/me/order/${orderId}`);
  return res.data.results;
}

export async function createMyOrder(dto: OrderCreateDto) {
  const res = await http.post<ApiSuccessResponse<OrderResponseDto>>(`/api/orders/me`, dto);
  return res.data.results;
}

/**
 * NEW: USER+ADMIN - get all orders by userId
 * Controller: GET /api/orders/me/{user_id}
 * (Так, назва ендпоінта трохи дивна, але ми повторюємо бек)
 */
export async function getOrdersByUser(userId: string) {
  const res = await http.get<ApiSuccessResponse<OrderResponseDto[]>>(`/api/orders/me/${userId}`);
  return res.data.results;
}

/**
 * ADMIN endpoints
 */
export async function getAllOrdersAdmin() {
  const res = await http.get<ApiSuccessResponse<AdminOrderResponseDto[]>>(`/api/orders`);
  return res.data.results;
}

export async function getOrderByIdAdmin(orderId: string) {
  const res = await http.get<ApiSuccessResponse<AdminOrderResponseDto>>(`/api/orders/${orderId}`);
  return res.data.results;
}

export async function updateOrderStatusAdmin(orderId: string, dto: OrderStatusUpdateDto) {
  const res = await http.patch<ApiSuccessResponse<OrderResponseDto>>(`/api/orders/${orderId}/status`, dto);
  return res.data.results;
}

export async function deleteOrderAdmin(orderId: string) {
  const res = await http.delete<ApiSuccessResponse<void>>(`/api/orders/${orderId}`);
  return res.data.results;
}
