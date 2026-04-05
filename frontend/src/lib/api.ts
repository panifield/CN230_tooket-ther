import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function getOAuthRedirectUri(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`;
  }
  return process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI ?? 'http://localhost:3000/auth/callback';
}

export const authApi = {
  getAuthorizeUrl: (provider: 'line' | 'facebook', state: string, redirectUri?: string) =>
    api.get<{ authorization_url: string; state: string }>(
      `/auth/oauth/${provider}/authorize-url`,
      { params: { state, redirect_uri: redirectUri ?? getOAuthRedirectUri() } }
    ),

  exchangeToken: (provider: 'line' | 'facebook', code: string, redirectUri?: string) =>
    api.post<{ access_token: string; token_type: string }>('/auth/oauth/token', {
      provider,
      code,
      redirect_uri: redirectUri ?? getOAuthRedirectUri(),
    }),
};

export type ConcertListItem = {
  id: string;
  title: string;
  venue: string;
  starts_at: string;
  sales_starts_at: string;
  host_country_code: string;
  poster_url: string | null;
  min_price: string | null;
  max_price: string | null;
};

export type ZonePublic = {
  id: string;
  name: string;
  price: string;
  total_seats: number;
  available_seats: number;
  status: string;
};

export type ConcertDetail = {
  id: string;
  title: string;
  venue: string;
  starts_at: string;
  ends_at: string | null;
  sales_starts_at: string;
  host_country_code: string;
  poster_url: string | null;
  lineup: string[];
  zones: ZonePublic[];
};

export type QueueStatus = {
  in_queue: boolean;
  status: string | null;
  position?: number | null;
  total?: number | null;
  queue_entry_id?: string | null;
  note?: string | null;
};

export const queueApi = {
  join: (concertId: string) =>
    api.post<{ queue_entry_id: string; priority_score: number }>(
      `/queue/concerts/${concertId}/queue/join`
    ),
  status: (concertId: string) =>
    api.get<QueueStatus>(`/queue/concerts/${concertId}/queue/status`),
  admit: (concertId: string) =>
    api.post<{ admission_token: string; expires_in_seconds: number }>(
      `/queue/concerts/${concertId}/queue/admit`
    ),
};

export const ADMISSION_STORAGE_KEY = (concertId: string) => `admission_token_${concertId}`;

export const CHECKOUT_QUEUE_KEY = 'tooket_checkout_booking_ids';

export function readCheckoutQueue(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(CHECKOUT_QUEUE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function writeCheckoutQueue(ids: string[]) {
  if (typeof window === 'undefined') return;
  if (ids.length === 0) sessionStorage.removeItem(CHECKOUT_QUEUE_KEY);
  else sessionStorage.setItem(CHECKOUT_QUEUE_KEY, JSON.stringify(ids));
}

export type SeatMapSeat = {
  id: string;
  row_label: string;
  seat_no: string;
  status: string;
  locked_until: string | null;
};

export type SeatMapZone = {
  id: string;
  name: string;
  price: string;
  status: string;
  seats: SeatMapSeat[];
};

export type ConcertSeatMap = {
  concert_id: string;
  zones: SeatMapZone[];
};

export type BookingRow = {
  id: string;
  concert_id: string;
  seat_id: string;
  status: string;
  locked_until: string | null;
  created_at: string;
  holder_name?: string | null;
  delivery_method?: string | null;
};

export type HoldResponse = { bookings: BookingRow[] };

export type BookingDetail = BookingRow & {
  concert_title: string;
  zone_name: string;
  seat_row: string;
  seat_no: string;
  ticket_token: string | null;
};

export type PaymentDto = {
  id: string;
  booking_id: string;
  amount: number;
  method: string;
  status: string;
  external_ref: string | null;
  created_at: string;
  qr_code_url: string | null;
};

export type RefundRequest = {
  id: string;
  booking_id: string;
  status: string;
  created_at: string;
  processed_at: string | null;
  concert_title?: string;
  user_display_name?: string;
  seat_info?: string;
  amount?: number;
};

export type ZoneOccupancy = {
  zone_id: string;
  zone_name: string;
  total_seats: number;
  sold_seats: number;
  locked_seats: number;
  available_seats: number;
  occupancy_pct: number;
  revenue: number;
  status: string;
};

export type OrganizerDashboard = {
  concert_id: string;
  concert_title: string;
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  total_tickets_sold: number;
  zones: ZoneOccupancy[];
  refund_requests: RefundRequest[];
};

export type CheckinResult = {
  success: boolean;
  message: string;
  booking_id?: string;
  seat_info?: string;
  holder_name?: string;
  already_checked_in?: boolean;
};

export const concertApi = {
  list: (params?: { venue?: string; date_from?: string; date_to?: string }) =>
    api.get<ConcertListItem[]>('/concerts', { params }),
  get: (id: string) => api.get<ConcertDetail>(`/concerts/${id}`),
  getSeatMap: (id: string) => api.get<ConcertSeatMap>(`/concerts/${id}/seats`),
};

export const bookingApi = {
  createHold: (concertId: string, seatIds: string[], admissionToken: string) =>
    api.post<HoldResponse>(
      '/bookings/holds',
      { concert_id: concertId, seat_ids: seatIds },
      { headers: { 'X-Admission-Token': admissionToken } }
    ),
  get: (id: string) => api.get<BookingDetail>(`/bookings/${id}`),
  list: () => api.get('/bookings/my'),
  update: (id: string, body: { holder_name?: string; delivery_method?: string }) =>
    api.patch(`/bookings/${id}`, body),
  requestRefund: (id: string, bankAccount: string) =>
    api.post(`/bookings/${id}/refund`, { bank_account_encrypted: bankAccount }),
};

export const paymentApi = {
  create: (bookingId: string) =>
    api.post<PaymentDto>(`/payments/bookings/${bookingId}`),
  getByBooking: (bookingId: string) =>
    api.get<PaymentDto>(`/payments/bookings/${bookingId}`),
  stubComplete: (paymentId: string) =>
    api.post<{ success: boolean; message: string }>(`/payments/${paymentId}/stub-complete`),
};

export const organizerApi = {
  getDashboard: (concertId: string) =>
    api.get<OrganizerDashboard>(`/organizer/concerts/${concertId}/dashboard`),
  closeZone: (concertId: string, zoneId: string) =>
    api.post(`/organizer/concerts/${concertId}/zones/${zoneId}/close`),
  approveRefund: (refundId: string) =>
    api.post(`/organizer/refunds/${refundId}/approve`),
  rejectRefund: (refundId: string) =>
    api.post(`/organizer/refunds/${refundId}/reject`),
};

export const checkerApi = {
  checkin: (token: string) =>
    api.post<CheckinResult>('/checker/checkin', { ticket_token: token }),
};
