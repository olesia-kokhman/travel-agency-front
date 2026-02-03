import { http } from "./http";
import type { ApiSuccessResponse, TourResponseDto } from "../types/response";

export async function getAllTours(): Promise<TourResponseDto[]> {
  const { data } = await http.get<ApiSuccessResponse<TourResponseDto[]>>("/api/tours");
  return data.results;
}

export async function getTourById(tourId: string): Promise<TourResponseDto> {
  const { data } = await http.get<ApiSuccessResponse<TourResponseDto>>(`/api/tours/${tourId}`);
  return data.results;
}
