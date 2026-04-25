import { request } from "./client";
import type {
  BookingSummary,
  BookResponse,
  Concert,
  ConfirmBookingResponse,
  JoinQueueResponse,
  QueueStatus,
  Seat,
  Zone,
} from "./types";

export const bookingApi = {
  listConcerts(): Promise<Concert[]> {
    return request<Concert[]>("/booking/concerts", { auth: false });
  },

  joinQueue(concertId: number): Promise<JoinQueueResponse> {
    return request<JoinQueueResponse>(
      `/booking/concerts/${concertId}/queue/join`,
      { method: "POST" }
    );
  },

  queueStatus(concertId: number): Promise<QueueStatus> {
    return request<QueueStatus>(`/booking/concerts/${concertId}/queue/status`);
  },

  listZones(concertId: number): Promise<Zone[]> {
    return request<Zone[]>(`/booking/concerts/${concertId}/zones`, { auth: false });
  },

  listSeats(concertId: number, zoneId: number): Promise<Seat[]> {
    return request<Seat[]>(
      `/booking/concerts/${concertId}/zones/${zoneId}/seats`,
      { auth: false }
    );
  },

  book(payload: {
    concert_id: number;
    seat_ids: number[];
    delivery_type?: "digital" | "pickup" | "postal";
  }): Promise<BookResponse> {
    return request<BookResponse>("/booking/book", {
      method: "POST",
      body: { delivery_type: "digital", ...payload },
    });
  },

  myBookings(): Promise<BookingSummary[]> {
    return request<BookingSummary[]>("/booking/my");
  },

  confirm(bookingId: number): Promise<ConfirmBookingResponse> {
    return request<ConfirmBookingResponse>(`/booking/${bookingId}/confirm`, {
      method: "POST",
    });
  },

  rebook(
    bookingId: number,
    newSeatIds: number[]
  ): Promise<{ booking_id: number; status: string }> {
    return request(`/booking/${bookingId}/rebook`, {
      method: "POST",
      body: { new_seat_ids: newSeatIds },
    });
  },

  getBookingTickets(bookingId: number): Promise<Ticket[]> {
    return request<Ticket[]>(`/booking/${bookingId}/tickets`);
  },
};
