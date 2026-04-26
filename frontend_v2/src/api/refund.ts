import { request as apiRequest } from "./client";

// ── Types ──────────────────────────────────────────────────────────────────
// Single source of truth for refund payloads/responses. ห้าม duplicate
// ที่ไฟล์อื่น (เช่น api/types.ts หรือ api/payment.ts)

export interface RefundRequestPayload {
  booking_id: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  reason?: string;
}

export interface VoucherRefundPayload {
  bank_name: string;
  account_number: string;
  account_name: string;
  reason?: string;
}

export interface RefundResponse {
  message: string;
  refund_id: number;
  booking_id: number;
  amount: string;
  status: string;
}

// ── refundApi ──────────────────────────────────────────────────────────────
// Vite proxy (vite.config.ts) rewrite "/refund" → "/api/v1/refunds" ให้แล้ว
// view ฝั่ง frontend จึง import จากไฟล์นี้ที่เดียว

export const refundApi = {
  /**
   * ยื่นฟอร์มขอคืนเงินแบบปกติ (ต้องทำภายใน 7 วันหลังชำระเงิน)
   * Backend: POST /api/v1/refunds/request
   */
  request(payload: RefundRequestPayload): Promise<RefundResponse> {
    return apiRequest<RefundResponse>("/refund/request", {
      method: "POST",
      body: payload,
    });
  },

  /**
   * ยื่นฟอร์มขอคืนเงินแบบใช้ voucher (กรณีที่นั่งโดนยกเลิกจากการปิดโซน)
   * Backend: POST /api/v1/refunds/voucher/{booking_id}
   */
  voucher(
    bookingId: number,
    payload: VoucherRefundPayload
  ): Promise<RefundResponse> {
    return apiRequest<RefundResponse>(`/refund/voucher/${bookingId}`, {
      method: "POST",
      body: payload,
    });
  },
};
