// ====== Common API wrapper ======
export type ApiSuccessResponse<T> = {
  statusCode: string;     // "OK"
  statusMessage: string;  // "User is logged in"
  results: T;             // payload
};

// ====== Enums (як у бекенді) ======
export type UserRole = "USER" | "MANAGER" | "ADMIN";
export type OrderStatus = "REGISTERED" | "PAID" | "CANCELED";
export type PaymentStatus = "NEW" | "PENDING" | "SUCCESS" | "FAILED" | "CANCELED" | "REFUNDED";
export type PaymentMethod = "CARD" | "CASH" | "TRANSFER";
export type TourType = "REST" | "EXCURSION" | "SHOPPING";
export type TransferType = "CAR" | "PLANE" | "SHIP";
export type HotelType =  "THREE" | "FOUR" | "FIVE";


export type JwtResponseDto = {
  jwtAccessToken: string;
  jwtRefreshToken: string;
};

// ====== User DTO ======
export type UserResponseDto = {
  id: string; // UUID
  name: string;
  surname: string;
  email: string;
  phoneNumber: string | null;
  password: string | null;   // у відповіді це поле взагалі краще не мати, але якщо є — типізуємо
  active: boolean;
  balance: string;           // BigDecimal -> string на фронті це найнадійніше
  role: UserRole;
  createdAt: string;         // LocalDateTime -> string
  updatedAt: string;         // LocalDateTime -> string
};

// ====== Tour DTO ======
export type TourResponseDto = {
  id: string; // UUID
  title: string;
  longDescription: string;
  shortDescription: string;

  price: string; // BigDecimal -> string
  country: string;
  city: string;

  hot: boolean;
  active: boolean;
  capacity: number;

  tourType: TourType;
  transferType: TransferType;
  hotelType: HotelType;

  checkIn: string;    // LocalDateTime -> string
  checkOut: string;   // LocalDateTime -> string

  createdAt: string;
  updatedAt: string;
};

// ====== Review DTO ======
export type ReviewResponseDto = {
  id: string; // UUID
  comment: string;
  rating: number;

  orderId: string; // UUID

  createdAt: string;
  updatedAt: string;
};

// ====== Payment DTO ======
export type PaymentResponseDto = {
  id: string; // UUID

  paymentMethod: PaymentMethod;
  status: PaymentStatus;

  paidAt: string | null;     // може бути null, якщо ще не оплачено
  amount: string;            // BigDecimal -> string

  failureReason: string | null;
  orderId: string;

  createdAt: string;
  updatedAt: string;
};

// ====== Order DTO ======
export type OrderResponseDto = {
  id: string; // UUID

  orderNumber: string;
  totalAmount: string;       // BigDecimal -> string
  status: OrderStatus;

  userId: string;
  tourId: string;

  review: ReviewResponseDto | null;
  payment: PaymentResponseDto | null;
};
