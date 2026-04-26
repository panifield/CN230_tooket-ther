// src/api/payment.ts
import { request } from "./client";
import type { GenerateQrResponse, PaymentStatus } from "./types";

// Re-export เพื่อให้ Views เรียกใช้ง่ายๆ
export type { GenerateQrResponse, PaymentStatus };

export const paymentApi = {
  generateQr(bookingId: number, amount: number): Promise<GenerateQrResponse> {
    return request<GenerateQrResponse>("/payment/generate-qr", {
      method: "POST",
      body: { booking_id: bookingId, amount },
    });
  },

  status(transactionRef: string): Promise<PaymentStatus> {
    return request<PaymentStatus>(`/payment/status/${transactionRef}`);
  },
};
