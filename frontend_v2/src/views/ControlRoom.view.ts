import { bookingApi } from "../api/booking";
import { organizerApi } from "../api/organizer";
import type {
  Concert,
  OrganizerDashboard,
  OrganizerQueueRow,
  Zone,
} from "../api/types";
import { authStore } from "../state/auth";
import { events } from "../state/events";
import { router } from "../router";
import { el, mount } from "../utils/dom";
import {
  formatBaht,
  formatDateTime,
  statusLabel,
} from "../utils/format";

export function renderControlRoomView(): HTMLElement {
  if (!authStore.isAuthenticated() || authStore.getRole() !== "organizer") {
    router.navigate("/login");
    return el("div");
  }

  const state = {
    concerts: [] as Concert[],
    selectedConcertId: null as number | null,
    queues: [] as OrganizerQueueRow[],
    dashboard: null as OrganizerDashboard | null,
    concertZones: [] as Zone[],
  };

  const concertListHost = el("div");
  const queueHost = el("div");
  const dashboardHost = el("div");
  const concertZonesHost = el("div");

  const refreshConcerts = async (): Promise<void> => {
    state.concerts = await bookingApi.listConcerts();
    renderConcerts();
  };

  const renderConcerts = (): void => {
    if (state.concerts.length === 0) {
      mount(concertListHost, el("div", { class: "empty-cart", text: "NO CONCERTS YET." }));
      return;
    }
    mount(
      concertListHost,
      el("div", { class: "table-wrap" }, [
        el("table", { class: "table" }, [
          el("thead", {}, [
            el("tr", {}, [
              el("th", { text: "Concert Info" }),
              el("th", { text: "Date & Venue" }),
              el("th", { text: "Status" }),
              el("th", { attrs: { style: "text-align: right;" }, text: "Actions" }),
            ]),
          ]),
          el(
            "tbody",
            {},
            state.concerts.map((c) => {
              // แก้ไข: จัดการสีของ Status และแก้ปัญหา TypeScript แดง
              const statusStr = String(c.status).toLowerCase();
              let statusClass = "pill--muted"; // ค่าเริ่มต้น (สีเทา)
              
              if (statusStr === "upcoming") {
                statusClass = "pill--ok"; // สีฟ้า (Sky Tint) สำหรับ UPCOMING
              } else if (statusStr === "on_sale" || statusStr === "on sale") {
                statusClass = "pill--warn"; // สีเหลือง (Cream) สำหรับ ON SALE
              }

              return el("tr", { attrs: { style: state.selectedConcertId === c.concert_id ? "background: var(--color-sky-tint);" : "" } }, [
                el("td", {}, [
                  el("div", { attrs: { style: "font-weight: 500; font-size: 16px; color: var(--color-midnight);" }, text: c.title }),
                  el("div", { class: "label-mono", attrs: { style: "margin-top: 4px;" }, text: c.artist }),
                ]),
                el("td", {}, [
                  el("div", { text: formatDateTime(c.concert_datetime) }),
                  el("div", { class: "label-mono", attrs: { style: "margin-top: 4px;" }, text: c.venue }),
                ]),
                el("td", {}, [
                  el("span", {
                    class: `pill ${statusClass}`,
                    text: statusLabel(c.status).toUpperCase(),
                  }),
                ]),
                el("td", { attrs: { style: "text-align: right;" } }, [
                  el("div", { class: "form-actions", attrs: { style: "justify-content: flex-end; margin-top: 0;" } }, [
                    el(
                      "button",
                      {
                        class: "btn btn--secondary btn--sm",
                        attrs: { type: "button" },
                        on: {
                          click: () => {
                            state.selectedConcertId = c.concert_id;
                            renderConcerts();
                            void Promise.all([loadQueues(), loadDashboard(), loadZones()]);
                          },
                        },
                      },
                      ["MANAGE"]
                    ),
                    el(
                      "button",
                      {
                        class: "btn btn--ghost btn--sm",
                        attrs: { type: "button" },
                        on: {
                          click: async () => {
                            try {
                              const r = await organizerApi.autoSortQueues(c.concert_id);
                              events.emit("log", { level: "info", message: r.message });
                            } catch (err) {
                              events.emit("log", {
                                level: "error",
                                message: err instanceof Error ? err.message : String(err),
                              });
                            }
                          },
                        },
                      },
                      ["AUTO-SORT"]
                    ),
                  ]),
                ]),
              ]);
            })
          ),
        ]),
      ])
    );
  };

  const loadQueues = async (): Promise<void> => {
    if (state.selectedConcertId === null) return;
    try {
      state.queues = await organizerApi.listQueues(state.selectedConcertId);
    } catch {
      state.queues = [];
    }
    renderQueues();
  };

  const renderQueues = (): void => {
    if (state.queues.length === 0) {
      mount(queueHost, el("div", { class: "empty-cart", text: "NO CUSTOMERS IN QUEUE." }));
      return;
    }
    mount(
      queueHost,
      el("div", { class: "table-wrap", attrs: { style: "max-height: 400px; overflow-y: auto;" } }, [
        el("table", { class: "table" }, [
          el("thead", {}, [
            el("tr", {}, [
              el("th", { text: "Customer" }),
              el("th", { text: "Priority" }),
              el("th", { text: "Status" }),
              el("th", { attrs: { style: "text-align: right;" }, text: "Action" }),
            ]),
          ]),
          el(
            "tbody",
            {},
            state.queues.map((q) => {
              const statusStr = String(q.status).toLowerCase();
              const statusClass = statusStr === 'waiting' ? "pill--warn" : "pill--ok";

              return el("tr", {}, [
                el("td", { attrs: { style: "font-weight: 500;" }, text: q.customer_name }),
                el("td", { text: String(q.priority_score) }),
                el("td", {}, [
                  el("span", {
                    class: `pill ${statusClass}`,
                    text: statusLabel(q.status).toUpperCase(),
                  }),
                ]),
                el("td", { attrs: { style: "text-align: right;" } }, [
                  statusStr === "waiting"
                    ? el(
                        "button",
                        {
                          class: "btn btn--primary btn--sm",
                          attrs: { type: "button", title: "Admit" },
                          on: {
                            click: async () => {
                              try {
                                await organizerApi.admit(q.queue_id);
                                await loadQueues();
                              } catch (err) {
                                events.emit("log", {
                                  level: "error",
                                  message: err instanceof Error ? err.message : String(err),
                                });
                              }
                            },
                          },
                        },
                        ["ADMIT"]
                      )
                    : el("span", { class: "label-mono", text: "—" }),
                ]),
              ]);
            })
          ),
        ]),
      ])
    );
  };

  const loadZones = async (): Promise<void> => {
    if (state.selectedConcertId === null) return;
    try {
      state.concertZones = await bookingApi.listZones(state.selectedConcertId);
    } catch {
      state.concertZones = [];
    }
    renderConcertZones();
  };

  const renderConcertZones = (): void => {
    if (state.selectedConcertId === null) {
      mount(
        concertZonesHost,
        el("div", { class: "empty-cart", text: "SELECT A CONCERT TO VIEW ITS ZONES." })
      );
      return;
    }
    if (state.concertZones.length === 0) {
      mount(
        concertZonesHost,
        el("div", { class: "empty-cart", text: "NO ZONES FOR THIS CONCERT." })
      );
      return;
    }
    mount(
      concertZonesHost,
      el("div", { class: "table-wrap", attrs: { style: "max-height: 400px; overflow-y: auto;" } }, [
        el("table", { class: "table" }, [
          el("thead", {}, [
            el("tr", {}, [
              el("th", { text: "Zone Name" }),
              el("th", { text: "Available" }),
              el("th", { text: "Status" }),
              el("th", { attrs: { style: "text-align: right;" }, text: "Action" }),
            ]),
          ]),
          el(
            "tbody",
            {},
            state.concertZones.map((z) => {
              return el("tr", { attrs: { style: !z.is_active ? "opacity: 0.5;" : "" } }, [
                el("td", { attrs: { style: "font-weight: 500;" }, text: z.zone_name }),
                el("td", { class: "label-mono", text: `${z.available_count} / ${z.total_seats}` }),
                el("td", {}, [
                  el("span", {
                    class: `pill ${z.is_active ? "pill--ok" : "pill--muted"}`,
                    text: z.is_active ? "ACTIVE" : "CLOSED",
                  }),
                ]),
                el("td", { attrs: { style: "text-align: right;" } }, [
                  z.is_active
                    ? el(
                        "button",
                        {
                          class: "btn btn--ghost btn--sm",
                          attrs: { type: "button" },
                          on: {
                            click: async () => {
                              if (!window.confirm(`Close zone "${z.zone_name}"? This cannot be undone.`)) return;
                              try {
                                const r = await organizerApi.closeZone(z.zone_id);
                                events.emit("log", {
                                  level: "warn",
                                  message: `${r.message} — ${r.affected_bookings} bookings affected`,
                                });
                                await Promise.all([loadZones(), loadDashboard()]);
                              } catch (err) {
                                events.emit("log", {
                                  level: "error",
                                  message: err instanceof Error ? err.message : String(err),
                                });
                              }
                            },
                          },
                        },
                        ["CLOSE ZONE"]
                      )
                    : el("span", { class: "label-mono", text: "—" }),
                ]),
              ]);
            })
          ),
        ]),
      ])
    );
  };

  const loadDashboard = async (): Promise<void> => {
    if (state.selectedConcertId === null) return;
    try {
      state.dashboard = await organizerApi.dashboard(state.selectedConcertId);
    } catch {
      state.dashboard = null;
    }
    renderDashboard();
  };

  const renderDashboard = (): void => {
    if (!state.dashboard) {
      mount(
        dashboardHost,
        el("div", { class: "empty-cart", text: "SELECT A CONCERT TO VIEW FINANCIALS." })
      );
      return;
    }
    const { grand_totals, daily_stats } = state.dashboard;

    const summary = el(
      "div",
      { attrs: { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-4); margin-bottom: var(--space-6);" } },
      [
        statCard("TOTAL INCOME", formatBaht(grand_totals.total_income)),
        statCard("TOTAL EXPENSE", formatBaht(grand_totals.total_expense)),
        statCard("NET PROFIT", formatBaht(grand_totals.total_net_profit)),
      ]
    );

    const breakdown =
      daily_stats.length === 0
        ? el("div", { class: "empty-cart", text: "NO TRANSACTIONS YET." })
        : el("div", { class: "table-wrap" }, [
            el("table", { class: "table" }, [
              el("thead", {}, [
                el("tr", {}, [
                  el("th", { text: "Date" }),
                  el("th", { text: "Income" }),
                  el("th", { text: "Expense" }),
                  el("th", { attrs: { style: "text-align: right;" }, text: "Net Profit" }),
                ]),
              ]),
              el(
                "tbody",
                {},
                daily_stats.map((d) =>
                  el("tr", {}, [
                    el("td", { attrs: { style: "font-weight: 500;" }, text: d.date }),
                    el("td", { text: formatBaht(d.income) }),
                    el("td", { text: formatBaht(d.expense) }),
                    el("td", { attrs: { style: "text-align: right;" } }, [
                      el("span", {
                        class: `pill ${d.net_profit >= 0 ? "pill--ok" : "pill--muted"}`,
                        text: formatBaht(d.net_profit),
                      }),
                    ]),
                  ])
                )
              ),
            ]),
          ]);

    mount(dashboardHost, summary, breakdown);
  };

  void refreshConcerts();
  renderQueues();
  renderConcertZones();
  renderDashboard();

  return el("div", { class: "coastal-page" }, [
    el("div", { attrs: { style: "max-width: 1400px; margin: 0 auto; display: flex; flex-direction: column; gap: var(--space-6);" } }, [
      
      el("div", { class: "selection-header", attrs: { style: "margin-bottom: 0;" } }, [
        el("div", {}, [
          el("span", { class: "label-mono", text: "PORTAL / ORGANIZER" }),
          el("h1", { class: "coastal-title", text: "Control Room" }),
        ]),
      ]),

      // 1. Active Events (เต็มจอ ด้านบน)
      el("section", { class: "card" }, [
        el("div", { class: "card__header" }, [
          el("h3", { class: "card__title", text: "Active Events" }),
          el("button", { class: "btn btn--ghost btn--sm", attrs: { type: "button" }, on: { click: () => void refreshConcerts() } }, ["REFRESH"]),
        ]),
        concertListHost,
      ]),

      // 2. Queue กับ Zones (แบ่งครึ่ง ซ้าย-ขวา)
      el("div", { attrs: { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: var(--space-6);" } }, [
        el("section", { class: "card" }, [
          el("div", { class: "card__header" }, [
            el("h3", { class: "card__title", text: "Real-time Queue" }),
            el("button", { class: "btn btn--ghost btn--sm", attrs: { type: "button" }, on: { click: () => void loadQueues() } }, ["RELOAD"]),
          ]),
          queueHost,
        ]),

        el("section", { class: "card" }, [
          el("div", { class: "card__header" }, [
            el("h3", { class: "card__title", text: "Zone Availability" }),
            el("button", { class: "btn btn--ghost btn--sm", attrs: { type: "button" }, on: { click: () => void loadZones() } }, ["RELOAD"]),
          ]),
          concertZonesHost,
        ]),
      ]),

      // 3. Financial Dashboard (เต็มจอ อยู่ล่างสุดก่อนถึง Log)
      el("section", { class: "card card--dark" }, [
        el("div", { class: "card__header" }, [
          el("h3", { class: "card__title", text: "Financial Dashboard" }),
          el("button", { class: "btn btn--dark btn--sm", attrs: { type: "button" }, on: { click: () => void loadDashboard() } }, ["RELOAD"]),
        ]),
        dashboardHost,
      ]),

    ]),
  ]);
}

function statCard(label: string, value: string): HTMLElement {
  return el("div", { class: "stat", attrs: { style: "background: var(--color-glass-light); padding: var(--space-4); border-radius: var(--radius-control);" } }, [
    el("span", { class: "stat__value", attrs: { style: "color: var(--color-white);" }, text: value }),
    el("span", { class: "stat__label", attrs: { style: "color: var(--color-primary-blue);" }, text: label }),
  ]);
}