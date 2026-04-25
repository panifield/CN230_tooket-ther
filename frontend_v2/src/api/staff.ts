import { request } from "./client";
import type { VerifyTicketResponse } from "./types";

export const staffApi = {
  verifyTicket(qrHash: string): Promise<VerifyTicketResponse> {
    return request<VerifyTicketResponse>("/staff/verify-ticket", {
      method: "POST",
      body: { qr_hash: qrHash },
    });
  },
};
