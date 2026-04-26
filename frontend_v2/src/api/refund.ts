import { request } from "./client";// อ้างอิงตัวจัดการ API หลักของโปรเจกต์

// ── 1. กำหนดโครงสร้างข้อมูล (Interfaces) ตามฝั่ง Python ──

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

// ── 2. สร้างออบเจกต์ refundApi สำหรับให้ View เรียกใช้งาน ──

export const refundApi = {
  /**
   * ยื่นฟอร์มขอคืนเงินแบบปกติ (ต้องทำภายใน 7 วันหลังชำระเงิน)
   * Endpoint: POST /api/v1/refunds/request
   */
  requestRefund: async (payload: RefundRequestPayload): Promise<RefundResponse> => {
    return request<RefundResponse>("/api/v1/refunds/request", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * ยื่นฟอร์มขอคืนเงินแบบใช้ Voucher (กรณีที่นั่งโดนยกเลิกจากการปิดโซน)
   * Endpoint: POST /api/v1/refunds/voucher/{booking_id}
   */
  requestVoucherRefund: async (bookingId: number, payload: VoucherRefundPayload): Promise<RefundResponse> => {
    return request<RefundResponse>(`/api/v1/refunds/voucher/${bookingId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
};