import { bookingApi } from "../api/booking";
import type {
  BookingSummary,
  Concert,
  QueueStatus,
  Seat,
  Zone,
} from "../api/types";
import { openPaymentModal } from "../components/paymentModal";
import { openRefundModal } from "../components/refundModal";
import { renderSeatGrid } from "../components/seatGrid";
import { authStore } from "../state/auth";
import { events } from "../state/events";
import { router } from "../router";
import { clear, el, mount } from "../utils/dom";
import {
  formatBaht,
  formatDateTime,
  statusLabel,
  statusPillClass,
} from "../utils/format";

interface CustomerState {
  concerts: Concert[];
  selectedConcertId: number | null;
  zones: Zone[];
  selectedZoneId: number | null;
  seats: Seat[];
  selectedSeatIds: Set<number>;
  bookings: BookingSummary[];
  queue: QueueStatus | null;
}

export function renderCustomerDashboard(): HTMLElement {
  if (!authStore.isAuthenticated()) {
    router.navigate("/login");
    return el("div");
  }

  const state: CustomerState = {
    concerts: [],
    selectedConcertId: null,
    zones: [],
    selectedZoneId: null,
    seats: [],
    selectedSeatIds: new Set(),
    bookings: [],
    queue: null,
  };

  const concertsHost = el("div", { class: "list" });
  const queueHost = el("div");
  const zonesHost = el("div", { class: "list" });
  const seatsHost = el("div");
  const bookingsHost = el("div", { class: "list" });

  const refreshConcerts = async (): Promise<void> => {
    const concerts = await bookingApi.listConcerts();
    state.concerts = concerts;
    renderConcerts();
  };

  const refreshBookings = async (): Promise<void> => {
    state.bookings = await bookingApi.myBookings();
    renderBookings();
  };

  const renderConcerts = (): void => {
    if (state.concerts.length === 0) {
      mount(concertsHost, el("div", { class: "empty-state", text: "No concerts available." }));
      return;
    }
    mount(
      concertsHost,
      ...state.concerts.map((c) => {
        const isSelected = state.selectedConcertId === c.concert_id;
        return el(
          "article",
          {
            class: "list-item",
            attrs: isSelected ? { style: "border-color:var(--color-midnight);" } : {},
          },
          [
            el("div", { class: "list-item__row" }, [
              el("div", {}, [
                el("span", { class: "list-item__title", text: c.title }),
                el("p", {
                  class: "label-mono",
                  text: `${c.artist} · ${c.venue} · ${formatDateTime(c.concert_datetime)}`,
                }),
              ]),
              el("span", {
                class: statusPillClass(c.status),
                text: statusLabel(c.status),
              }),
            ]),
            el("div", { class: "form-actions" }, [
              el(
                "button",
                {
                  class: "btn btn--secondary btn--sm",
                  attrs: { type: "button" },
                  on: {
                    click: () => {
                      state.selectedConcertId = c.concert_id;
                      state.selectedZoneId = null;
                      state.zones = [];
                      state.seats = [];
                      state.selectedSeatIds.clear();
                      renderConcerts();
                      void loadZonesAndQueue();
                    },
                  },
                },
                ["Select"]
              ),
              c.status === "on_sale"
                ? el(
                    "button",
                    {
                      class: "btn btn--primary btn--sm",
                      attrs: { type: "button" },
                      on: {
                        click: async () => {
                          try {
                            const r = await bookingApi.joinQueue(c.concert_id);
                            events.emit("log", {
                              level: "info",
                              message: r.message,
                            });
                            state.selectedConcertId = c.concert_id;
                            await loadZonesAndQueue();
                          } catch (err) {
                            events.emit("log", {
                              level: "error",
                              message:
                                err instanceof Error ? err.message : String(err),
                            });
                          }
                        },
                      },
                    },
                    ["Enter queue"]
                  )
                : null,
            ]),
          ]
        );
      })
    );
  };

  const loadZonesAndQueue = async (): Promise<void> => {
    if (state.selectedConcertId === null) return;
    try {
      state.zones = await bookingApi.listZones(state.selectedConcertId);
    } catch {
      state.zones = [];
    }
    try {
      state.queue = await bookingApi.queueStatus(state.selectedConcertId);
    } catch {
      state.queue = null;
    }
    renderZones();
    renderQueue();
  };

  const renderQueue = (): void => {
    if (state.selectedConcertId === null || !state.queue) {
      clear(queueHost);
      return;
    }
    const q = state.queue;
    mount(
      queueHost,
      el("div", { class: "card card--cream", attrs: { style: "margin-bottom:16px;" } }, [
        el("div", { class: "card__header" }, [
          el("h3", { text: "Your queue position" }),
          el("span", {
            class: statusPillClass(q.status),
            text: statusLabel(q.status),
          }),
        ]),
        el("p", {
          text: `Position ${q.position_in_queue ?? "—"} of ${q.total_waiting} waiting · priority ${q.priority_score} · entered ${formatDateTime(q.entered_at)}`,
        }),
      ])
    );
  };

  const renderZones = (): void => {
    if (state.zones.length === 0) {
      mount(zonesHost, el("div", { class: "empty-state", text: "Select a concert to view zones." }));
      return;
    }
    mount(
      zonesHost,
      ...state.zones.map((z) =>
        el("article", { class: "list-item" }, [
          el("div", { class: "list-item__row" }, [
            el("div", {}, [
              el("span", { class: "list-item__title", text: z.zone_name }),
              el("p", {
                class: "label-mono",
                text: `${z.available_count}/${z.total_seats} available · ${formatBaht(z.price)}`,
              }),
            ]),
            el(
              "button",
              {
                class: "btn btn--primary btn--sm",
                attrs: {
                  type: "button",
                  ...(z.is_active ? {} : { disabled: "true" }),
                },
                on: {
                  click: () => {
                    state.selectedZoneId = z.zone_id;
                    state.selectedSeatIds.clear();
                    void loadSeats();
                  },
                },
              },
              ["Choose seats"]
            ),
          ]),
        ])
      )
    );
  };

  const loadSeats = async (): Promise<void> => {
    if (state.selectedConcertId === null || state.selectedZoneId === null) return;
    state.seats = await bookingApi.listSeats(
      state.selectedConcertId,
      state.selectedZoneId
    );
    renderSeats();
  };

  const renderSeats = (): void => {
    if (state.selectedZoneId === null) {
      clear(seatsHost);
      return;
    }
    const grid = renderSeatGrid({
      seats: state.seats,
      selected: state.selectedSeatIds,
      onToggle: (id) => {
        if (state.selectedSeatIds.has(id)) state.selectedSeatIds.delete(id);
        else state.selectedSeatIds.add(id);
        renderSeats();
      },
    });

    const zone = state.zones.find((z) => z.zone_id === state.selectedZoneId);
    const total = zone ? zone.price * state.selectedSeatIds.size : 0;

    mount(
      seatsHost,
      el("div", { attrs: { style: "margin-top:16px;" } }, [
        grid,
        el("div", { class: "form-actions", attrs: { style: "margin-top:16px;" } }, [
          el("span", {
            class: "label-mono",
            text: `${state.selectedSeatIds.size} seats · ${formatBaht(total)}`,
          }),
          el(
            "button",
            {
              class: "btn btn--primary",
              attrs: {
                type: "button",
                ...(state.selectedSeatIds.size === 0
                  ? { disabled: "true" }
                  : {}),
              },
              on: {
                click: async () => {
                  if (state.selectedConcertId === null) return;
                  try {
                    const r = await bookingApi.book({
                      concert_id: state.selectedConcertId,
                      seat_ids: [...state.selectedSeatIds],
                    });
                    events.emit("log", { level: "info", message: r.message });
                    state.selectedSeatIds.clear();
                    await loadSeats();
                    await refreshBookings();
                  } catch (err) {
                    events.emit("log", {
                      level: "error",
                      message:
                        err instanceof Error ? err.message : String(err),
                    });
                  }
                },
              },
            },
            ["Confirm & book"]
          ),
        ]),
      ])
    );
  };

  const renderBookings = (): void => {
    if (state.bookings.length === 0) {
      mount(bookingsHost, el("div", { class: "empty-state", text: "No bookings yet." }));
      return;
    }
    mount(
      bookingsHost,
      ...state.bookings.map((b) =>
        el("article", { class: "list-item" }, [
          el("div", { class: "list-item__row" }, [
            el("div", {}, [
              el("span", { class: "list-item__title", text: b.concert_title }),
              el("p", {
                class: "label-mono",
                text: `${b.total_tickets} tickets · ${formatBaht(b.total_amount)} · ${formatDateTime(b.created_at)}`,
              }),
            ]),
            el("span", {
              class: statusPillClass(b.status),
              text: statusLabel(b.status),
            }),
          ]),
          el("div", { class: "form-actions" }, bookingActions(b)),
        ])
      )
    );
  };

  const bookingActions = (b: BookingSummary): HTMLElement[] => {
    const actions: HTMLElement[] = [];
    if (b.status === "pending") {
      actions.push(
        el(
          "button",
          {
            class: "btn btn--primary btn--sm",
            attrs: { type: "button" },
            on: {
              click: () =>
                void openPaymentModal({
                  bookingId: b.booking_id,
                  amount: b.total_amount,
                  onPaid: () => void refreshBookings(),
                }),
            },
          },
          ["Pay now"]
        )
      );
    }
    if (b.status === "paid") {
      actions.push(
        el(
          "button",
          {
            class: "btn btn--danger btn--sm",
            attrs: { type: "button" },
            on: {
              click: () =>
                openRefundModal({
                  bookingId: b.booking_id,
                  voucher: false,
                  onSuccess: () => void refreshBookings(),
                }),
            },
          },
          ["Request refund"]
        )
      );
    }
    if (b.status === "zone_closed_action_required") {
      actions.push(
        el(
          "button",
          {
            class: "btn btn--danger btn--sm",
            attrs: { type: "button" },
            on: {
              click: () =>
                openRefundModal({
                  bookingId: b.booking_id,
                  voucher: true,
                  onSuccess: () => void refreshBookings(),
                }),
            },
          },
          ["Voucher refund"]
        )
      );
    }
    return actions;
  };

  void refreshConcerts();
  void refreshBookings();

  return el("section", { class: "section" }, [
    el("div", { class: "container" }, [
      el("p", { class: "label-mono", text: "Customer / Dashboard" }),
      el("h2", { text: "Your events." }),
      el("div", { attrs: { style: "display:grid; gap:32px; margin-top:24px;" } }, [
        el("section", { class: "card" }, [
          el("div", { class: "card__header" }, [
            el("h3", { text: "Upcoming concerts" }),
            el(
              "button",
              {
                class: "btn btn--ghost btn--sm",
                attrs: { type: "button" },
                on: { click: () => void refreshConcerts() },
              },
              ["Refresh"]
            ),
          ]),
          concertsHost,
        ]),
        queueHost,
        el("section", { class: "card" }, [
          el("div", { class: "card__header" }, [
            el("h3", { text: "Zones" }),
            el(
              "button",
              {
                class: "btn btn--ghost btn--sm",
                attrs: { type: "button" },
                on: { click: () => void loadZonesAndQueue() },
              },
              ["Reload"]
            ),
          ]),
          zonesHost,
          seatsHost,
        ]),
        el("section", { class: "card" }, [
          el("div", { class: "card__header" }, [
            el("h3", { text: "My bookings" }),
            el(
              "button",
              {
                class: "btn btn--ghost btn--sm",
                attrs: { type: "button" },
                on: { click: () => void refreshBookings() },
              },
              ["Refresh"]
            ),
          ]),
          bookingsHost,
        ]),
      ]),
    ]),
  ]);
}
