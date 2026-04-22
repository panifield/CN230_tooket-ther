import { request } from "./client";
import type {
  GenerateQrResponse,
  PaymentStatus,
  RefundRequestPayload,
} from "./types";

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

export const refundApi = {
  request(payload: RefundRequestPayload): Promise<{ message: string }> {
    return request("/refund/request", { method: "POST", body: payload });
  },

  voucher(
    bookingId: number,
    payload: { bank_name: string; account_number: string; account_name: string; reason?: string }
  ): Promise<{ message: string }> {
    return request(`/refund/voucher/${bookingId}`, {
      method: "POST",
      body: payload,
    });
  },
};
