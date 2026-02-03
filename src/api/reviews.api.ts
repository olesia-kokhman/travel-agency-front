import { http } from "./http";
import type { ApiSuccessResponse } from "../types/response";

export type ReviewResponseDto = {
  id: string;
  comment: string | null;
  rating: number;
  orderId: string;
  createdAt: string;
  updatedAt: string;
};

export type ReviewCreateDto = {
  comment?: string;
  rating: number;
};

export type ReviewUpdateDto = {
  comment?: string;
  rating?: number;
};

export async function createReview(orderId: string, dto: ReviewCreateDto): Promise<ReviewResponseDto> {
  const { data } = await http.post<ApiSuccessResponse<ReviewResponseDto>>(
    `/api/orders/${orderId}/reviews`,
    dto
  );
  return data.results;
}

export async function updateReview(reviewId: string, dto: ReviewUpdateDto): Promise<ReviewResponseDto> {
  const { data } = await http.patch<ApiSuccessResponse<ReviewResponseDto>>(
    `/api/reviews/${reviewId}`,
    dto
  );
  return data.results;
}

export async function getReviewsByTour(tourId: string) {
    const res = await http.get<ApiSuccessResponse<ReviewResponseDto[]>>(
        `/api/tours/${tourId}/reviews`
    );
    return res.data.results;
}
