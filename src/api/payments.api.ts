import { http } from "./http";
import type { ApiSuccessResponse } from "../types/response";

export type PaymentResponseDto = {
  id: string;

  paymentMethod: string; // enum as string
  status: string;        // enum as string

  paidAt: string | null;
  amount: string;

  failureReason: string | null;
  orderId: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentRequestDto = {
  paymentMethod: string; // e.g. "CARD"
  amount: string;        // BigDecimal -> відправляємо як string
};

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
