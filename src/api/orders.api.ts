// src/api/orders.ts
import { http } from "./http";
import type { ApiSuccessResponse } from "../types/response";

export type OrderResponseDto = {
  id: string;
  orderNumber: string;
  totalAmount: string; // BigDecimal
  status: string;

  userId: string;
  tourId: string;

  review: unknown | null;
  payment: unknown | null;
};

export type OrderCreateDto = {
  tourId: string;
};

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
