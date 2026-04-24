export type Role = "customer" | "organizer" | "staff";

export interface AuthResponse {
  access_token: string;
  token_type: "bearer";
  user_id: number;
  role: Role;
}

export interface OAuthAuthorizeResponse {
  provider: string;
  authorize_url: string;
}

export interface CurrentUser {
  user_id: number;
  role: Role;
  name: string;
  email: string;
  customer_profile_id?: number;
  organizer_profile_id?: number;
  [key: string]: unknown;
}

export interface RegisterPayload {
  id_card: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  password: string;
  role: Role;
}

export interface UpdateProfilePayload {
  name?: string;
  phone?: string;
  address?: string;
  id_card?: string;
}

export interface ForgotPasswordPayload {
  email: string;
  id_card: string;
  new_password: string;
}

export type ConcertStatus =
  | "draft"
  | "upcoming"
  | "on_sale"
  | "closed"
  | "cancelled";

export interface Concert {
  concert_id: number;
  title: string;
  artist: string;
  venue: string;
  address: string;
  concert_datetime: string | null;
  status: ConcertStatus;
}

export interface Zone {
  zone_id: number;
  zone_name: string;
  price: number;
  total_seats: number;
  is_active: boolean;
  available_count: number;
}

export type SeatStatus = "available" | "locked" | "sold";

export interface Seat {
  seat_id: number;
  seat_row: string;
  seat_number: number;
  status: SeatStatus;
}

export interface QueueStatus {
  queue_id: number;
  priority_score: number;
  entered_at: string;
  status: "waiting" | "admitted" | "completed" | "expired";
  position_in_queue: number | null;
  total_waiting: number;
}

export interface JoinQueueResponse {
  message: string;
  queue_id: number;
  priority_score?: number;
  entered_at?: string;
  status?: QueueStatus["status"];
}

export interface BookResponse {
  message: string;
  booking_id: number;
  total_amount: number;
  seat_count: number;
  expired_at: string;
}

export interface BookingSummary {
  zone: string;
  event_date: string | null;
  venue: string;
  seat_label: string;
  booking_id: number;
  concert_title: string;
  concert_datetime: string | null;
  total_tickets: number;
  total_amount: number;
  status: string;
  created_at: string | null;
}

export interface ConfirmBookingResponse {
  message: string;
  booking_id: number;
  status: "paid";
  payment_id: number;
  transaction_ref: string;
}

export interface GenerateQrResponse {
  payment_id: number;
  transaction_ref: string;
  qr_payload: string;
  qr_image_data_url?: string;
  amount: number;
  expired_at: string;
  promptpay_id?: string;
}

export interface PaymentStatus {
  payment_status: any;
  seconds_remaining: any;
  transaction_ref: string;
  status: "pending" | "paid" | "expired" | "failed";
  paid_at: string | null;
  amount: number;
  booking_id: number;
}

export interface CreateZonePayload {
  zone_name: string;
  price: number;
  total_seats: number;
  rows: number;
  cols: number;
}

export interface CreateConcertPayload {
  title: string;
  artist: string;
  venue: string;
  address: string;
  concert_datetime: string;
  sale_open_at: string;
  sale_close_at: string;
  zones: CreateZonePayload[];
}

export interface OrganizerQueueRow {
  queue_id: number;
  customer_id: number;
  customer_name: string;
  priority_score: number;
  entered_at: string;
  status: string;
}

export interface OrganizerZoneRow {
  zone_id: number;
  zone_name: string;
  price: number;
  total_seats: number;
  is_active: boolean;
  available_count: number;
}

export interface DailyStat {
  date: string;
  income: number;
  expense: number;
  net_profit: number;
}

export interface GrandTotals {
  total_income: number;
  total_expense: number;
  total_net_profit: number;
}

export interface OrganizerDashboard {
  concert_id: number;
  daily_stats: DailyStat[];
  grand_totals: GrandTotals;
}

export interface RefundRequestPayload {
  booking_id: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  reason?: string;
}
