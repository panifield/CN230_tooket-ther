import { request, ApiError } from "./client";
import type {
  CreateConcertPayload,
  OrganizerDashboard,
  OrganizerQueueRow,
} from "./types";
import { authStore } from "../state/auth";

export const organizerApi = {
  listQueues(concertId: number): Promise<OrganizerQueueRow[]> {
    return request<OrganizerQueueRow[]>(
      `/organizer/concerts/${concertId}/queues`
    );
  },

  admit(queueId: number): Promise<{ message: string }> {
    return request(`/organizer/queues/${queueId}/admit`, { method: "POST" });
  },

  updatePriority(
    queueId: number,
    priorityScore: number
  ): Promise<{ message: string }> {
    return request(`/organizer/queues/${queueId}/priority`, {
      method: "PATCH",
      body: { priority_score: priorityScore },
    });
  },

  async createConcert(
    payload: CreateConcertPayload,
    imageFile?: File | null
  ): Promise<{ message: string; concert_id: number }> {
    const fd = new FormData();
    fd.append("title", payload.title);
    fd.append("artist", payload.artist);
    fd.append("venue", payload.venue);
    fd.append("address", payload.address);
    fd.append("concert_datetime", payload.concert_datetime);
    fd.append("sale_open_at", payload.sale_open_at);
    if (payload.sale_close_at) {
      fd.append("sale_close_at", payload.sale_close_at);
    }
    fd.append("zones_json", JSON.stringify(payload.zones));
    if (imageFile) {
      fd.append("image", imageFile);
    }

    // Send as multipart/form-data (don't set Content-Type — browser adds boundary)
    const headers: Record<string, string> = { Accept: "application/json" };
    const token = authStore.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch("/organizer/concerts", {
      method: "POST",
      headers,
      body: fd,
    });

    const data = await res.json();
    if (!res.ok) {
      const detail =
        typeof data?.detail === "string"
          ? data.detail
          : Array.isArray(data?.detail)
            ? data.detail.map((d: any) => d.msg).join(", ")
            : res.statusText;
      throw new ApiError(res.status, detail);
    }
    return data;
  },

  autoSortQueues(concertId: number): Promise<{ message: string }> {
    return request(`/organizer/concerts/${concertId}/queues/auto_sort`, {
      method: "POST",
    });
  },

  closeZone(
    zoneId: number
  ): Promise<{ message: string; affected_bookings: number }> {
    return request(`/organizer/zones/${zoneId}/close`, { method: "POST" });
  },

  dashboard(concertId: number): Promise<OrganizerDashboard> {
    return request<OrganizerDashboard>(
      `/organizer/concerts/${concertId}/dashboard`
    );
  },
};
