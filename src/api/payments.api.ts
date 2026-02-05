// src/api/payments.api.ts
import { http } from "./http";
import type { ApiSuccessResponse } from "../types/response";

export type PaymentResponseDto = {
  id: string;

  paymentMethod: string; // enum as string
  status: string; // enum as string

  paidAt: string | null;
  amount: string | number;

  failureReason: string | null;
  orderId: string;

  createdAt?: string | null;
  updatedAt?: string | null;
};

export type PaymentRequestDto = {
  paymentMethod: string; // e.g. "CARD"
  amount: string; // BigDecimal -> send string
};

// ===== page response (matches backend ApiPageResponse) =====
export type ApiPageResponse<T> = {
  statusCode: number;
  statusMessage: string;
  results: T[];

  page: number;
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

// ===== matches PaymentFilter =====
export type PaymentFilter = {
  statuses?: string[];
  methods?: string[];

  minAmount?: string; // BigDecimal
  maxAmount?: string;

  paidFrom?: string; // ISO local datetime
  paidTo?: string;

  hasFailureReason?: boolean;
};

export type PaymentsPageAdminRequest = {
  filter?: PaymentFilter;
  page?: number;
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

// ===== USER ("me") =====
export async function getPaymentByOrderId(orderId: string): Promise<PaymentResponseDto> {
  const { data } = await http.get<ApiSuccessResponse<PaymentResponseDto>>(`/api/payments/me/orders/${orderId}`);
  return data.results;
}

export async function createPayment(orderId: string, dto: PaymentRequestDto): Promise<PaymentResponseDto> {
  const { data } = await http.post<ApiSuccessResponse<PaymentResponseDto>>(`/api/payments/me/orders/${orderId}`, dto);
  return data.results;
}

// ===== ADMIN single =====
export async function getPaymentByOrderIdAdmin(orderId: string): Promise<PaymentResponseDto> {
  const { data } = await http.get<ApiSuccessResponse<PaymentResponseDto>>(`/api/payments/orders/${orderId}`);
  return data.results;
}

// ✅ NEW: ADMIN page list (GET /api/payments)
export async function getPaymentsPageAdmin(
  req: PaymentsPageAdminRequest = {}
): Promise<ApiPageResponse<PaymentResponseDto>> {
  const params = new URLSearchParams();
  params.set("page", String(req.page ?? 0));
  params.set("size", String(req.size ?? 10));

  if (req.sort?.property) {
    params.append("sort", `${req.sort.property},${req.sort.direction}`);
  }

  const f = req.filter ?? {};
  appendList(params, "statuses", f.statuses);
  appendList(params, "methods", f.methods);

  appendIf(params, "minAmount", f.minAmount);
  appendIf(params, "maxAmount", f.maxAmount);

  appendIf(params, "paidFrom", f.paidFrom);
  appendIf(params, "paidTo", f.paidTo);

  if (typeof f.hasFailureReason === "boolean") appendIf(params, "hasFailureReason", f.hasFailureReason);

  const { data } = await http.get<ApiPageResponse<PaymentResponseDto>>(`/api/payments?${params.toString()}`);
  return data;
}
