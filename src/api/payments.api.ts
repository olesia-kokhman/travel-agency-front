// src/api/payments.api.ts
import { http } from "./http";
import type { ApiSuccessResponse } from "../types/response";

export type PaymentResponseDto = {
  id: string;

  paymentMethod: string; // enum as string
  status: string;        // enum as string

  paidAt: string | null;
  amount: string | number;

  failureReason: string | null;
  orderId: string;

  createdAt?: string | null;
  updatedAt?: string | null;
};

export type PaymentRequestDto = {
  paymentMethod: string; // e.g. "CARD"
  amount: string;        // BigDecimal -> відправляємо як string
};

// ===== USER ("me") =====
export async function getPaymentByOrderId(orderId: string): Promise<PaymentResponseDto> {
  const { data } = await http.get<ApiSuccessResponse<PaymentResponseDto>>(
    `/api/payments/me/orders/${orderId}`
  );
  return data.results;
}

export async function createPayment(orderId: string, dto: PaymentRequestDto): Promise<PaymentResponseDto> {
  const { data } = await http.post<ApiSuccessResponse<PaymentResponseDto>>(
    `/api/payments/me/orders/${orderId}`,
    dto
  );
  return data.results;
}

// ===== ADMIN =====
export async function getPaymentByOrderIdAdmin(orderId: string): Promise<PaymentResponseDto> {
  const { data } = await http.get<ApiSuccessResponse<PaymentResponseDto>>(
    `/api/payments/orders/${orderId}`
  );
  return data.results;
}

/**
 * NEW: ADMIN - get all payments by userId
 * Controller: GET /api/payments/users/{userId}/payments
 */
export async function getPaymentsByUserAdmin(userId: string): Promise<PaymentResponseDto[]> {
  const { data } = await http.get<ApiSuccessResponse<PaymentResponseDto[]>>(
    `/api/payments/users/${userId}/payments`
  );
  return data.results;
}
