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

  price?: any; // BigDecimal -> number|string (safe)
  country?: string | null;
  city?: string | null;

  hot?: boolean | null;
  active?: boolean | null;
  capacity?: number | null;

  tourType?: string | null;
  transferType?: string | null;
  hotelType?: string | null;

  checkIn?: string | null;  // ISO string
  checkOut?: string | null; // ISO string
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

  checkIn: string;  // ISO string
  checkOut: string; // ISO string
};

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
