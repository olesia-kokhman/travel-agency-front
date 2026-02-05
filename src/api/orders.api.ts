// src/api/orders.api.ts
import { http } from "./http";
import type { ApiSuccessResponse } from "../types/response";
import type { UserResponseDto } from "./users.api";

// ===== Nested DTOs =====
export type PaymentResponseDto = {
  id: string;
  paymentMethod: string;
  status: string;
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
  totalAmount: number | string;
  status: string;
  tourId: string;

  review: ReviewResponseDto | null;
  payment: PaymentResponseDto | null;

  createdAt: string;
  updatedAt: string;
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

export type OrderCreateDto = { tourId: string };
export type OrderStatusUpdateDto = { status: string };

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

// ===== NEW: OrderFilter (matches backend) =====
export type OrderFilter = {
  statuses?: string[]; // enum names
  minTotalAmount?: string; // BigDecimal as string
  maxTotalAmount?: string;

  createdFrom?: string; // ISO LocalDateTime
  createdTo?: string;

  hasPayment?: boolean;
  hasReview?: boolean;
};

export type OrdersPageAdminRequest = {
  filter?: OrderFilter;
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

// ===== NEW: ADMIN page endpoint: GET /api/orders with filter+pageable =====
export async function getOrdersPageAdmin(
  req: OrdersPageAdminRequest = {}
): Promise<ApiPageResponse<AdminOrderResponseDto>> {
  const params = new URLSearchParams();

  params.set("page", String(req.page ?? 0));
  params.set("size", String(req.size ?? 10));

  if (req.sort?.property) {
    params.append("sort", `${req.sort.property},${req.sort.direction}`);
  }

  const f = req.filter ?? {};
  appendList(params, "statuses", f.statuses);

  appendIf(params, "minTotalAmount", f.minTotalAmount);
  appendIf(params, "maxTotalAmount", f.maxTotalAmount);

  appendIf(params, "createdFrom", f.createdFrom);
  appendIf(params, "createdTo", f.createdTo);

  if (typeof f.hasPayment === "boolean") appendIf(params, "hasPayment", f.hasPayment);
  if (typeof f.hasReview === "boolean") appendIf(params, "hasReview", f.hasReview);

  const { data } = await http.get<ApiPageResponse<AdminOrderResponseDto>>(`/api/orders?${params.toString()}`);
  return data;
}

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

export async function getOrdersByUser(userId: string) {
  const res = await http.get<ApiSuccessResponse<OrderResponseDto[]>>(`/api/orders/me/${userId}`);
  return res.data.results;
}

/**
 * ADMIN endpoints (старі лишаємо, але сторінка тепер використовує getOrdersPageAdmin)
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
