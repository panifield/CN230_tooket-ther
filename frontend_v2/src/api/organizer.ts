import { request } from "./client";
import type {
  CreateConcertPayload,
  OrganizerDashboard,
  OrganizerQueueRow,
} from "./types";

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

  createConcert(
    payload: CreateConcertPayload | FormData
  ): Promise<{ message: string; concert_id: number }> {
    return request("/organizer/concerts", { method: "POST", body: payload });
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
