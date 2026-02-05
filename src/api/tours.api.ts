// src/api/tours.api.ts
import { http } from "./http";
import type { ApiSuccessResponse, TourResponseDto } from "../types/response";

export type TourHotUpdateDto = {
  hot: boolean;
};

export type TourUpdateDto = {
  title?: string | null;
  longDescription?: string | null;
  shortDescription?: string | null;

  price?: any;
  country?: string | null;
  city?: string | null;

  hot?: boolean | null;
  active?: boolean | null;
  capacity?: number | null;

  tourType?: string | null;
  transferType?: string | null;
  hotelType?: string | null;

  checkIn?: string | null;
  checkOut?: string | null;
};

export type TourCreateDto = {
  title: string;
  longDescription: string;
  shortDescription: string;

  price: any;
  country: string;
  city: string;

  hot: boolean;
  active: boolean;
  capacity: number;

  tourType: string;
  transferType: string;
  hotelType: string;

  checkIn: string;
  checkOut: string;
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

// ===== NEW: Filter type (matches TourFilter) =====
export type TourFilter = {
  q?: string;
  types?: string[]; // TourType enum names
  transferTypes?: string[]; // TransferType enum names
  hotelTypes?: string[]; // HotelType enum names

  minPrice?: string; // BigDecimal as string
  maxPrice?: string;

  country?: string;
  city?: string;

  hot?: boolean;
  active?: boolean;

  minCapacity?: number;
  maxCapacity?: number;

  // LocalDateTime ISO, e.g. 2026-02-05T00:00:00
  checkInFrom?: string;
  checkInTo?: string;
  checkOutFrom?: string;
  checkOutTo?: string;
};

export type ToursPageRequest = {
  filter?: TourFilter;
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
export async function getToursPage(req: ToursPageRequest = {}): Promise<ApiPageResponse<TourResponseDto>> {
  const params = new URLSearchParams();

  const page = req.page ?? 0;
  const size = req.size ?? 10;

  params.set("page", String(page));
  params.set("size", String(size));

  const sort = req.sort;
  if (sort?.property) {
    // Spring pageable expects: sort=field,asc
    params.append("sort", `${sort.property},${sort.direction}`);
  }

  const f = req.filter ?? {};
  appendIf(params, "q", f.q);

  appendList(params, "types", f.types);
  appendList(params, "transferTypes", f.transferTypes);
  appendList(params, "hotelTypes", f.hotelTypes);

  appendIf(params, "minPrice", f.minPrice);
  appendIf(params, "maxPrice", f.maxPrice);

  appendIf(params, "country", f.country);
  appendIf(params, "city", f.city);

  if (typeof f.hot === "boolean") appendIf(params, "hot", f.hot);
  if (typeof f.active === "boolean") appendIf(params, "active", f.active);

  appendIf(params, "minCapacity", f.minCapacity);
  appendIf(params, "maxCapacity", f.maxCapacity);

  appendIf(params, "checkInFrom", f.checkInFrom);
  appendIf(params, "checkInTo", f.checkInTo);
  appendIf(params, "checkOutFrom", f.checkOutFrom);
  appendIf(params, "checkOutTo", f.checkOutTo);

  const { data } = await http.get<ApiPageResponse<TourResponseDto>>(`/api/tours?${params.toString()}`);
  return data;
}

// залишаю для сумісності, але краще вже не використовувати
export async function getAllTours(): Promise<TourResponseDto[]> {
  const { data } = await http.get<ApiSuccessResponse<TourResponseDto[]>>("/api/tours");
  return data.results;
}

export async function getTourById(tourId: string): Promise<TourResponseDto> {
  const { data } = await http.get<ApiSuccessResponse<TourResponseDto>>(`/api/tours/${tourId}`);
  return data.results;
}

// ADMIN
export async function createTour(dto: TourCreateDto): Promise<TourResponseDto> {
  const { data } = await http.post<ApiSuccessResponse<TourResponseDto>>("/api/tours", dto);
  return data.results;
}

// ADMIN
export async function updateTour(tourId: string, dto: TourUpdateDto): Promise<TourResponseDto> {
  const { data } = await http.patch<ApiSuccessResponse<TourResponseDto>>(`/api/tours/${tourId}`, dto);
  return data.results;
}

// ADMIN
export async function deleteTour(tourId: string): Promise<void> {
  await http.delete<ApiSuccessResponse<void>>(`/api/tours/${tourId}`);
}

// MANAGER + ADMIN
export async function updateTourHot(tourId: string, dto: TourHotUpdateDto): Promise<TourResponseDto> {
  const { data } = await http.patch<ApiSuccessResponse<TourResponseDto>>(`/api/tours/${tourId}/hot`, dto);
  return data.results;
}
