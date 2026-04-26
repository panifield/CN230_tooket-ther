import { bookingApi } from "../api/booking";
import { organizerApi } from "../api/organizer";
import type {
  Concert,
  OrganizerDashboard,
  OrganizerQueueRow,
  PendingRefund,
  Zone,
} from "../api/types";
import { authStore } from "../state/auth";
import { events } from "../state/events";
import { router } from "../router";
import { el, mount, clear } from "../utils/dom";
import {
  formatBaht,
  formatDateTime,
  statusLabel,
} from "../utils/format";

// ── 🌟 Premium Glassmorphism Styles ──
const cardStyle = "background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(0, 0, 0, 0.08); box-shadow: 0px 8px 32px rgba(1, 1, 32, 0.04); border-radius: 12px; padding: 32px; display: flex; flex-direction: column; gap: 24px; transition: transform 0.3s ease, box-shadow 0.3s ease;";
const darkCardStyle = "background: #010120; color: #FFFFFF; border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0px 12px 48px rgba(1, 1, 32, 0.15); border-radius: 12px; padding: 32px; display: flex; flex-direction: column; gap: 24px; transition: transform 0.3s ease;";
const inputStyle = "padding: 12px 16px; background: rgba(255, 255, 255, 0.6); border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 8px; font-size: 14px; font-family: 'The Future', sans-serif; outline: none; transition: all 0.3s ease;";

// Card Hover Setup Function
const applyCardHover = (element: HTMLElement) => {
  element.addEventListener('mouseenter', () => {
    element.style.transform = "translateY(-2px)";
    if (!element.style.background.includes("#010120")) {
      element.style.boxShadow = "0px 12px 48px rgba(1, 1, 32, 0.08)";
    }
  });
  element.addEventListener('mouseleave', () => {
    element.style.transform = "none";
    if (!element.style.background.includes("#010120")) {
      element.style.boxShadow = "0px 8px 32px rgba(1, 1, 32, 0.04)";
    }
  });
  return element;
};

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
    pendingRefunds: [] as PendingRefund[],
    
    searchQuery: "",
    sortBy: "event_date" as "event_date" | "creation_date" | "status",
    sortDirection: "asc" as "asc" | "desc",
  };

  const concertListHost = el("div");
  const queueHost = el("div");
  const dashboardHost = el("div");
  const concertZonesHost = el("div");
  const refundsHost = el("div");

  const refreshConcerts = async (): Promise<void> => {
    state.concerts = await bookingApi.listConcerts();
    renderConcerts();
  };

  const getProcessedConcerts = (): Concert[] => {
    let filtered = state.concerts.filter(c => 
      c.title.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      c.artist.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      c.venue.toLowerCase().includes(state.searchQuery.toLowerCase())
    );

    filtered.sort((a, b) => {
      let valA: number | string, valB: number | string;
      if (state.sortBy === "event_date") {
        valA = a.concert_datetime ? new Date(a.concert_datetime).getTime() : 0;
        valB = b.concert_datetime ? new Date(b.concert_datetime).getTime() : 0;
      } else if (state.sortBy === "creation_date") {
        valA = a.concert_id;
        valB = b.concert_id;
      } else {
        valA = String(a.status).toLowerCase();
        valB = String(b.status).toLowerCase();
      }
      if (valA < valB) return state.sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return state.sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  };

  const renderConcerts = (): void => {
    clear(concertListHost);
    const processedConcerts = getProcessedConcerts();

    if (processedConcerts.length === 0) {
      mount(concertListHost, el("div", { class: "empty-cart", attrs: { style: "padding: 32px; text-align: center; color: rgba(1,1,32,0.5); font-family: 'The Future', sans-serif;" } }, ["NO EVENTS FOUND."]));
      return;
    }

    mount(
      concertListHost,
      el("div", { class: "table-wrap", attrs: { style: "overflow-x: auto;" } }, [
        el("table", { class: "table", attrs: { style: "width: 100%; border-collapse: collapse; text-align: left;" } }, [
          el("thead", {}, [
            el("tr", { attrs: { style: "border-bottom: 1px solid rgba(0,0,0,0.08);" } }, [
              el("th", { class: "label-mono", attrs: { style: "padding: 16px 8px; color: #967E67;" } }, ["CONCERT INFO"]),
              el("th", { class: "label-mono", attrs: { style: "padding: 16px 8px; color: #967E67;" } }, ["DATE & VENUE"]),
              el("th", { class: "label-mono", attrs: { style: "padding: 16px 8px; color: #967E67;" } }, ["STATUS"]),
              el("th", { class: "label-mono", attrs: { style: "padding: 16px 8px; color: #967E67; text-align: right;" } }, ["ACTIONS"]),
            ]),
          ]),
          el("tbody", {}, processedConcerts.map((c) => {
            const statusStr = String(c.status).toLowerCase();
            let statusClass = "pill--muted"; 
            if (statusStr === "upcoming") statusClass = "pill--ok";
            else if (statusStr === "on_sale" || statusStr === "on sale") statusClass = "pill--warn"; 

            const isSelected = state.selectedConcertId === c.concert_id;

            return el("tr", { 
              attrs: { style: `border-bottom: 1px solid rgba(0,0,0,0.04); transition: background 0.2s; cursor: default; ${isSelected ? "background: rgba(170, 214, 250, 0.1);" : ""}` },
              on: {
                mouseenter: (e: Event) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.02)"; },
                mouseleave: (e: Event) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent"; }
              }
            }, [
              el("td", { attrs: { style: "padding: 16px 8px;" } }, [
                el("div", { attrs: { style: "font-family: 'The Future', sans-serif; font-weight: 500; font-size: 16px; color: #010120;" }, text: c.title }),
                el("div", { class: "label-mono", attrs: { style: "margin-top: 6px; opacity: 0.6; font-size: 11px;" }, text: c.artist }),
              ]),
              el("td", { attrs: { style: "padding: 16px 8px;" } }, [
                el("div", { attrs: { style: "font-family: 'The Future', sans-serif; font-size: 14px; color: #010120;" }, text: formatDateTime(c.concert_datetime) }),
                el("div", { class: "label-mono", attrs: { style: "margin-top: 6px; opacity: 0.6; font-size: 11px;" }, text: c.venue }),
              ]),
              el("td", { attrs: { style: "padding: 16px 8px;" } }, [
                el("span", { class: `pill ${statusClass}`, attrs: { style: "border-radius: 6px;" }, text: statusLabel(c.status).toUpperCase() }),
              ]),
              el("td", { attrs: { style: "padding: 16px 8px; text-align: right;" } }, [
                el("div", { attrs: { style: "display: flex; gap: 8px; justify-content: flex-end;" } }, [
                  el("button", {
                    attrs: { type: "button", style: "padding: 8px 16px; background: #AAD6FA; color: #010120; border: none; border-radius: 6px; font-family: 'The Future', sans-serif; font-weight: 500; font-size: 12px; cursor: pointer; transition: opacity 0.2s;" },
                    on: {
                      mouseenter: (e: Event) => (e.currentTarget as HTMLElement).style.opacity = "0.8",
                      mouseleave: (e: Event) => (e.currentTarget as HTMLElement).style.opacity = "1",
                      click: () => {
                        state.selectedConcertId = c.concert_id;
                        renderConcerts();
                        void Promise.all([loadQueues(), loadDashboard(), loadZones(), loadPendingRefunds()]);
                      },
                    },
                  }, ["MANAGE"]),
                  el("button", {
                    attrs: { type: "button", style: "padding: 8px 16px; background: transparent; color: #010120; border: 1px solid rgba(0,0,0,0.1); border-radius: 6px; font-family: 'The Future', sans-serif; font-weight: 500; font-size: 12px; cursor: pointer; transition: background 0.2s;" },
                    on: {
                      mouseenter: (e: Event) => (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.05)",
                      mouseleave: (e: Event) => (e.currentTarget as HTMLElement).style.background = "transparent",
                      click: async () => {
                        try {
                          const r = await organizerApi.autoSortQueues(c.concert_id);
                          events.emit("log", { level: "info", message: r.message });
                        } catch (err) {
                          events.emit("log", { level: "error", message: err instanceof Error ? err.message : String(err) });
                        }
                      },
                    },
                  }, ["AUTO-SORT"]),
                ]),
              ]),
            ]);
          })),
        ]),
      ])
    );
  };

  const loadQueues = async (): Promise<void> => {
    if (state.selectedConcertId === null) return;
    try { state.queues = await organizerApi.listQueues(state.selectedConcertId); } 
    catch { state.queues = []; }
    renderQueues();
  };

  const renderQueues = (): void => {
    if (state.queues.length === 0) {
      mount(queueHost, el("div", { class: "empty-cart", attrs: { style: "padding: 32px; text-align: center; color: rgba(1,1,32,0.5);" } }, ["NO CUSTOMERS IN QUEUE."]));
      return;
    }
    mount(
      queueHost,
      el("div", { class: "table-wrap", attrs: { style: "max-height: 400px; overflow-y: auto;" } }, [
        el("table", { class: "table", attrs: { style: "width: 100%; text-align: left; border-collapse: collapse;" } }, [
          el("thead", {}, [
            el("tr", { attrs: { style: "border-bottom: 1px solid rgba(0,0,0,0.08);" } }, [
              el("th", { class: "label-mono", attrs: { style: "padding: 12px 8px; color: #967E67;" } }, ["CUSTOMER"]),
              el("th", { class: "label-mono", attrs: { style: "padding: 12px 8px; color: #967E67;" } }, ["PRIORITY"]),
              el("th", { class: "label-mono", attrs: { style: "padding: 12px 8px; color: #967E67;" } }, ["STATUS"]),
              el("th", { class: "label-mono", attrs: { style: "padding: 12px 8px; color: #967E67; text-align: right;" } }, ["ACTION"]),
            ]),
          ]),
          el("tbody", {}, state.queues.map((q) => {
            const statusStr = String(q.status).toLowerCase();
            const statusClass = statusStr === 'waiting' ? "pill--warn" : "pill--ok";

            return el("tr", { 
              attrs: { style: "border-bottom: 1px solid rgba(0,0,0,0.04); transition: background 0.2s;" },
              on: {
                mouseenter: (e: Event) => (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.02)",
                mouseleave: (e: Event) => (e.currentTarget as HTMLElement).style.background = "transparent"
              }
            }, [
              el("td", { attrs: { style: "padding: 12px 8px; font-weight: 500;" } }, [String(q.customer_name)]),
              el("td", { attrs: { style: "padding: 12px 8px;" } }, [String(q.priority_score)]),
              el("td", { attrs: { style: "padding: 12px 8px;" } }, [
                el("span", { class: `pill ${statusClass}`, attrs: { style: "border-radius: 6px;" } }, [statusLabel(q.status).toUpperCase()]),
              ]),
              el("td", { attrs: { style: "padding: 12px 8px; text-align: right;" } }, [
                statusStr === "waiting"
                  ? el("button", {
                      attrs: { type: "button", style: "padding: 6px 12px; background: #010120; color: #FFFFFF; border: none; border-radius: 6px; font-family: 'The Future', sans-serif; font-size: 11px; cursor: pointer; transition: opacity 0.2s;" },
                      on: {
                        mouseenter: (e: Event) => (e.currentTarget as HTMLElement).style.opacity = "0.8",
                        mouseleave: (e: Event) => (e.currentTarget as HTMLElement).style.opacity = "1",
                        click: async () => {
                          try {
                            await organizerApi.admit(q.queue_id);
                            await loadQueues();
                          } catch (err) {
                            events.emit("log", { level: "error", message: err instanceof Error ? err.message : String(err) });
                          }
                        },
                      },
                    }, ["ADMIT"])
                  : el("span", { class: "label-mono", attrs: { style: "opacity: 0.3;" } }, ["—"]),
              ]),
            ]);
          })),
        ]),
      ])
    );
  };

  const loadZones = async (): Promise<void> => {
    if (state.selectedConcertId === null) return;
    try { state.concertZones = await bookingApi.listZones(state.selectedConcertId); } 
    catch { state.concertZones = []; }
    renderConcertZones();
  };

  const renderConcertZones = (): void => {
    if (state.selectedConcertId === null) {
      mount(concertZonesHost, el("div", { class: "empty-cart", attrs: { style: "padding: 32px; text-align: center; color: rgba(1,1,32,0.5);" } }, ["SELECT A CONCERT TO VIEW ZONES."]));
      return;
    }
    if (state.concertZones.length === 0) {
      mount(concertZonesHost, el("div", { class: "empty-cart", attrs: { style: "padding: 32px; text-align: center; color: rgba(1,1,32,0.5);" } }, ["NO ZONES FOUND."]));
      return;
    }
    mount(
      concertZonesHost,
      el("div", { class: "table-wrap", attrs: { style: "max-height: 400px; overflow-y: auto;" } }, [
        el("table", { class: "table", attrs: { style: "width: 100%; text-align: left; border-collapse: collapse;" } }, [
          el("thead", {}, [
            el("tr", { attrs: { style: "border-bottom: 1px solid rgba(0,0,0,0.08);" } }, [
              el("th", { class: "label-mono", attrs: { style: "padding: 12px 8px; color: #967E67;" } }, ["ZONE NAME"]),
              el("th", { class: "label-mono", attrs: { style: "padding: 12px 8px; color: #967E67;" } }, ["AVAILABLE"]),
              el("th", { class: "label-mono", attrs: { style: "padding: 12px 8px; color: #967E67;" } }, ["STATUS"]),
              el("th", { class: "label-mono", attrs: { style: "padding: 12px 8px; color: #967E67; text-align: right;" } }, ["ACTION"]),
            ]),
          ]),
          el("tbody", {}, state.concertZones.map((z) => {
            return el("tr", { 
              attrs: { style: `border-bottom: 1px solid rgba(0,0,0,0.04); transition: background 0.2s; ${!z.is_active ? "opacity: 0.5;" : ""}` },
              on: {
                mouseenter: (e: Event) => (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.02)",
                mouseleave: (e: Event) => (e.currentTarget as HTMLElement).style.background = "transparent"
              }
            }, [
              el("td", { attrs: { style: "padding: 12px 8px; font-weight: 500;" } }, [z.zone_name]),
              el("td", { class: "label-mono", attrs: { style: "padding: 12px 8px;" } }, [`${z.available_count} / ${z.total_seats}`]),
              el("td", { attrs: { style: "padding: 12px 8px;" } }, [
                el("span", { class: `pill ${z.is_active ? "pill--ok" : "pill--muted"}`, attrs: { style: "border-radius: 6px;" } }, [z.is_active ? "ACTIVE" : "CLOSED"]),
              ]),
              el("td", { attrs: { style: "padding: 12px 8px; text-align: right;" } }, [
                z.is_active
                  ? el("button", {
                      attrs: { type: "button", style: "padding: 6px 12px; background: transparent; color: #010120; border: 1px solid rgba(0,0,0,0.1); border-radius: 6px; font-family: 'The Future', sans-serif; font-size: 11px; cursor: pointer; transition: background 0.2s;" },
                      on: {
                        mouseenter: (e: Event) => (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.05)",
                        mouseleave: (e: Event) => (e.currentTarget as HTMLElement).style.background = "transparent",
                        click: async () => {
                          if (!window.confirm(`Close zone "${z.zone_name}"? This cannot be undone.`)) return;
                          try {
                            const r = await organizerApi.closeZone(z.zone_id);
                            events.emit("log", { level: "warn", message: `${r.message} — ${r.affected_bookings} bookings affected` });
                            await Promise.all([loadZones(), loadDashboard()]);
                          } catch (err) {
                            events.emit("log", { level: "error", message: err instanceof Error ? err.message : String(err) });
                          }
                        },
                      },
                    }, ["CLOSE ZONE"])
                  : el("span", { class: "label-mono", attrs: { style: "opacity: 0.3;" } }, ["—"]),
              ]),
            ]);
          })),
        ]),
      ])
    );
  };

  const loadDashboard = async (): Promise<void> => {
    if (state.selectedConcertId === null) return;
    try { state.dashboard = await organizerApi.dashboard(state.selectedConcertId); } 
    catch { state.dashboard = null; }
    renderDashboard();
  };

  const loadPendingRefunds = async (): Promise<void> => {
    if (state.selectedConcertId === null) return;
    try { state.pendingRefunds = await organizerApi.listPendingRefunds(state.selectedConcertId); } 
    catch { state.pendingRefunds = []; }
    renderPendingRefunds();
  };

  const renderPendingRefunds = (): void => {
    if (state.selectedConcertId === null) {
      mount(refundsHost, el("div", { class: "empty-cart", attrs: { style: "padding: 32px; text-align: center; color: rgba(1,1,32,0.5);" } }, ["SELECT A CONCERT TO VIEW REFUNDS."]));
      return;
    }
    if (state.pendingRefunds.length === 0) {
      mount(refundsHost, el("div", { class: "empty-cart", attrs: { style: "padding: 32px; text-align: center; color: rgba(1,1,32,0.5);" } }, ["NO PENDING REFUNDS."]));
      return;
    }
    mount(
      refundsHost,
      el("div", { class: "table-wrap", attrs: { style: "max-height: 400px; overflow-y: auto;" } }, [
        el("table", { class: "table", attrs: { style: "width: 100%; text-align: left; border-collapse: collapse;" } }, [
          el("thead", {}, [
            el("tr", { attrs: { style: "border-bottom: 1px solid rgba(0,0,0,0.08);" } }, [
              el("th", { class: "label-mono", attrs: { style: "padding: 12px 8px; color: #967E67;" } }, ["BOOKING"]),
              el("th", { class: "label-mono", attrs: { style: "padding: 12px 8px; color: #967E67;" } }, ["CUSTOMER"]),
              el("th", { class: "label-mono", attrs: { style: "padding: 12px 8px; color: #967E67;" } }, ["BANK INFO"]),
              el("th", { class: "label-mono", attrs: { style: "padding: 12px 8px; color: #967E67;" } }, ["AMOUNT"]),
              el("th", { class: "label-mono", attrs: { style: "padding: 12px 8px; color: #967E67; text-align: right;" } }, ["ACTION"]),
            ]),
          ]),
          el("tbody", {}, state.pendingRefunds.map((r) =>
            el("tr", { 
              attrs: { style: "border-bottom: 1px solid rgba(0,0,0,0.04); transition: background 0.2s;" },
              on: {
                mouseenter: (e: Event) => (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.02)",
                mouseleave: (e: Event) => (e.currentTarget as HTMLElement).style.background = "transparent"
              }
            }, [
              el("td", { attrs: { style: "padding: 12px 8px;" } }, [
                el("div", { attrs: { style: "font-weight: 500;" }, text: `BKG-${r.booking_id}` }),
                el("div", { class: "label-mono", attrs: { style: "margin-top: 4px; opacity: 0.6; font-size: 11px;" }, text: `${r.total_tickets} ticket(s)` }),
              ]),
              el("td", { attrs: { style: "padding: 12px 8px;" } }, [
                el("div", { text: r.customer_name }),
                el("div", { class: "label-mono", attrs: { style: "margin-top: 4px; opacity: 0.6; font-size: 11px;" }, text: r.customer_email }),
              ]),
              el("td", { class: "label-mono", attrs: { style: "padding: 12px 8px; font-size: 12px;" } }, [
                el("div", { text: r.bank_name ?? "—" }),
                el("div", { attrs: { style: "margin-top: 2px;" }, text: r.account_number ?? "—" }),
                el("div", { attrs: { style: "margin-top: 2px;" }, text: r.account_name ?? "" }),
              ]),
              el("td", { attrs: { style: "padding: 12px 8px; font-weight: 500;" }, text: formatBaht(r.total_amount) }),
              el("td", { attrs: { style: "padding: 12px 8px; text-align: right;" } }, [
                el("button", {
                  attrs: { type: "button", style: "padding: 8px 16px; background: #010120; color: #FFFFFF; border: none; border-radius: 6px; font-family: 'The Future', sans-serif; font-size: 11px; cursor: pointer; transition: opacity 0.2s;" },
                  on: {
                    mouseenter: (e: Event) => (e.currentTarget as HTMLElement).style.opacity = "0.8",
                    mouseleave: (e: Event) => (e.currentTarget as HTMLElement).style.opacity = "1",
                    click: async () => {
                      if (!window.confirm(`Approve refund of ${formatBaht(r.total_amount)} for BKG-${r.booking_id}? Seats will be released and revenue deducted.`)) return;
                      try {
                        const res = await organizerApi.approveRefund(r.booking_id);
                        events.emit("log", { level: "info", message: `${res.message} — ${res.seats_released} seat(s) released, ฿${res.amount} deducted` });
                        await Promise.all([loadPendingRefunds(), loadDashboard(), loadZones()]);
                      } catch (err) {
                        events.emit("log", { level: "error", message: err instanceof Error ? err.message : String(err) });
                      }
                    },
                  },
                }, ["APPROVE REFUND"]),
              ]),
            ])
          )),
        ]),
      ])
    );
  };

  const renderDashboard = (): void => {
    if (!state.dashboard) {
      mount(dashboardHost, el("div", { class: "empty-cart", attrs: { style: "padding: 32px; text-align: center; color: rgba(255,255,255,0.5);" } }, ["SELECT A CONCERT TO VIEW FINANCIALS."]));
      return;
    }
    const { grand_totals, daily_stats } = state.dashboard;

    const summary = el("div", { 
      attrs: { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;" } 
    }, [
      statCard("TOTAL INCOME", formatBaht(grand_totals.total_income)),
      statCard("TOTAL EXPENSE", formatBaht(grand_totals.total_expense)),
      statCard("NET PROFIT", formatBaht(grand_totals.total_net_profit)),
    ]);

    const breakdown = daily_stats.length === 0
        ? el("div", { class: "empty-cart", attrs: { style: "text-align: center; color: rgba(255,255,255,0.5);" } }, ["NO TRANSACTIONS YET."])
        : el("div", { class: "table-wrap", attrs: { style: "overflow-x: auto;" } }, [
            el("table", { class: "table", attrs: { style: "width: 100%; text-align: left; border-collapse: collapse; color: #FFFFFF;" } }, [
              el("thead", {}, [
                el("tr", { attrs: { style: "border-bottom: 1px solid rgba(255,255,255,0.1);" } }, [
                  el("th", { class: "label-mono", attrs: { style: "padding: 12px 8px; color: #AAD6FA;" } }, ["DATE"]),
                  el("th", { class: "label-mono", attrs: { style: "padding: 12px 8px; color: #AAD6FA;" } }, ["INCOME"]),
                  el("th", { class: "label-mono", attrs: { style: "padding: 12px 8px; color: #AAD6FA;" } }, ["EXPENSE"]),
                  el("th", { class: "label-mono", attrs: { style: "padding: 12px 8px; color: #AAD6FA; text-align: right;" } }, ["NET PROFIT"]),
                ]),
              ]),
              el("tbody", {}, daily_stats.map((d) =>
                  el("tr", { 
                    attrs: { style: "border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s;" },
                    on: {
                      mouseenter: (e: Event) => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)",
                      mouseleave: (e: Event) => (e.currentTarget as HTMLElement).style.background = "transparent"
                    }
                  }, [
                    el("td", { attrs: { style: "padding: 12px 8px; font-family: 'The Future', sans-serif;" } }, [d.date]),
                    el("td", { attrs: { style: "padding: 12px 8px;" } }, [formatBaht(d.income)]),
                    el("td", { attrs: { style: "padding: 12px 8px;" } }, [formatBaht(d.expense)]),
                    el("td", { attrs: { style: "padding: 12px 8px; text-align: right;" } }, [
                      el("span", {
                        class: "label-mono",
                        attrs: { style: `padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; ${d.net_profit >= 0 ? "background: rgba(170, 214, 250, 0.2); color: #AAD6FA;" : "background: rgba(255,255,255,0.1); color: #FFFFFF;"}` },
                      }, [formatBaht(d.net_profit)]),
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
  renderPendingRefunds();

  // ── 🛠️ Search & Sort Controls ──
  const searchInput = el("input", {
    attrs: { type: "text", placeholder: "Search title, artist, or venue...", style: `${inputStyle} flex: 1;` },
    on: {
      input: (e: Event) => { state.searchQuery = (e.target as HTMLInputElement).value; renderConcerts(); },
      focus: (e: Event) => {
        const t = e.target as HTMLElement;
        t.style.borderColor = "#AAD6FA"; t.style.background = "#FFFFFF"; t.style.boxShadow = "0 0 0 4px rgba(170, 214, 250, 0.15)";
      },
      blur: (e: Event) => {
        const t = e.target as HTMLElement;
        t.style.borderColor = "rgba(0,0,0,0.08)"; t.style.background = "rgba(255, 255, 255, 0.6)"; t.style.boxShadow = "none";
      },
    }
  });

  const sortSelect = el("select", {
    attrs: { style: `${inputStyle} background: #FFFFFF; cursor: pointer; min-width: 180px;` },
    on: { change: (e: Event) => { state.sortBy = (e.target as HTMLSelectElement).value as any; renderConcerts(); } }
  }, [
    el("option", { attrs: { value: "event_date" } }, ["Sort by: Event Date"]),
    el("option", { attrs: { value: "creation_date" } }, ["Sort by: Creation Date"]),
    el("option", { attrs: { value: "status" } }, ["Sort by: Status"]),
  ]);

  const sortDirBtn = el("button", {
    attrs: { type: "button", style: "padding: 12px 16px; background: rgba(170, 214, 250, 0.2); color: #010120; border: none; border-radius: 8px; font-family: 'PP Neue Montreal Mono', monospace; font-size: 11px; font-weight: bold; cursor: pointer; transition: background 0.2s;" },
    on: {
      mouseenter: (e: Event) => (e.currentTarget as HTMLElement).style.background = "rgba(170, 214, 250, 0.4)",
      mouseleave: (e: Event) => (e.currentTarget as HTMLElement).style.background = "rgba(170, 214, 250, 0.2)",
      click: (e: Event) => {
        state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
        (e.target as HTMLElement).textContent = state.sortDirection === "asc" ? "ASC ↑" : "DESC ↓";
        renderConcerts();
      }
    }
  }, ["ASC ↑"]);

  const controlBar = el("div", {
    attrs: { style: "display: flex; gap: 16px; align-items: center; flex-wrap: wrap; margin-bottom: 8px;" }
  }, [searchInput, sortSelect, sortDirBtn]);


  return el("div", { class: "coastal-page", attrs: { style: "padding: 64px 24px;" } }, [
    el("div", { attrs: { style: "max-width: 1400px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px;" } }, [
      
      // Page Header
      el("div", {}, [
        el("span", { class: "label-mono", attrs: { style: "color: #967E67;" } }, ["PORTAL / ORGANIZER"]),
        el("h1", { attrs: { style: "margin: 8px 0 0 0; font-family: 'The Future', sans-serif; font-size: clamp(32px, 5vw, 40px); letter-spacing: -0.8px; color: #010120;" } }, ["Control Room"]),
      ]),

      el("section", { 
        attrs: { style: cardStyle },
        // ใส่ Hover ให้การ์ด
        on: {
          mouseenter: (e: Event) => applyCardHover(e.currentTarget as HTMLElement),
          mouseleave: (e: Event) => applyCardHover(e.currentTarget as HTMLElement)
        }
      }, [
        el("div", { attrs: { style: "display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;" } }, [
          el("h3", { attrs: { style: "margin: 0; font-family: 'The Future', sans-serif; font-size: 24px; color: #010120;" } }, ["Active Events"]),
          el("button", { attrs: { type: "button", style: "padding: 8px 16px; background: transparent; color: #010120; border: 1px solid rgba(0,0,0,0.1); border-radius: 6px; font-family: 'The Future', sans-serif; font-size: 12px; cursor: pointer; transition: background 0.2s;" }, on: { mouseenter: (e: Event) => (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.03)", mouseleave: (e: Event) => (e.currentTarget as HTMLElement).style.background = "transparent", click: () => void refreshConcerts() } }, ["REFRESH LIST"]),
        ]),
        controlBar, 
        concertListHost,
      ]),

      el("div", { attrs: { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(480px, 1fr)); gap: 40px;" } }, [
        el("section", { 
          attrs: { style: cardStyle },
          on: {
            mouseenter: (e: Event) => applyCardHover(e.currentTarget as HTMLElement),
            mouseleave: (e: Event) => applyCardHover(e.currentTarget as HTMLElement)
          } 
        }, [
          el("div", { attrs: { style: "display: flex; justify-content: space-between; align-items: center;" } }, [
            el("h3", { attrs: { style: "margin: 0; font-family: 'The Future', sans-serif; font-size: 20px; color: #010120;" } }, ["Real-time Queue"]),
            el("button", { attrs: { type: "button", style: "padding: 6px 12px; background: transparent; color: #010120; border: 1px solid rgba(0,0,0,0.1); border-radius: 6px; font-family: 'The Future', sans-serif; font-size: 11px; cursor: pointer; transition: background 0.2s;" }, on: { mouseenter: (e: Event) => (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.03)", mouseleave: (e: Event) => (e.currentTarget as HTMLElement).style.background = "transparent", click: () => void loadQueues() } }, ["RELOAD"]),
          ]),
          queueHost,
        ]),

        el("section", { 
          attrs: { style: cardStyle },
          on: {
            mouseenter: (e: Event) => applyCardHover(e.currentTarget as HTMLElement),
            mouseleave: (e: Event) => applyCardHover(e.currentTarget as HTMLElement)
          } 
        }, [
          el("div", { attrs: { style: "display: flex; justify-content: space-between; align-items: center;" } }, [
            el("h3", { attrs: { style: "margin: 0; font-family: 'The Future', sans-serif; font-size: 20px; color: #010120;" } }, ["Zone Availability"]),
            el("button", { attrs: { type: "button", style: "padding: 6px 12px; background: transparent; color: #010120; border: 1px solid rgba(0,0,0,0.1); border-radius: 6px; font-family: 'The Future', sans-serif; font-size: 11px; cursor: pointer; transition: background 0.2s;" }, on: { mouseenter: (e: Event) => (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.03)", mouseleave: (e: Event) => (e.currentTarget as HTMLElement).style.background = "transparent", click: () => void loadZones() } }, ["RELOAD"]),
          ]),
          concertZonesHost,
        ]),
      ]),

      el("section", { 
        attrs: { style: cardStyle },
        on: {
          mouseenter: (e: Event) => applyCardHover(e.currentTarget as HTMLElement),
          mouseleave: (e: Event) => applyCardHover(e.currentTarget as HTMLElement)
        } 
      }, [
        el("div", { attrs: { style: "display: flex; justify-content: space-between; align-items: center;" } }, [
          el("h3", { attrs: { style: "margin: 0; font-family: 'The Future', sans-serif; font-size: 24px; color: #010120;" } }, ["Pending Refunds"]),
          el("button", { attrs: { type: "button", style: "padding: 8px 16px; background: transparent; color: #010120; border: 1px solid rgba(0,0,0,0.1); border-radius: 6px; font-family: 'The Future', sans-serif; font-size: 12px; cursor: pointer; transition: background 0.2s;" }, on: { mouseenter: (e: Event) => (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.03)", mouseleave: (e: Event) => (e.currentTarget as HTMLElement).style.background = "transparent", click: () => void loadPendingRefunds() } }, ["RELOAD"]),
        ]),
        refundsHost,
      ]),

      el("section", { 
        attrs: { style: darkCardStyle },
        on: {
          mouseenter: (e: Event) => applyCardHover(e.currentTarget as HTMLElement),
          mouseleave: (e: Event) => applyCardHover(e.currentTarget as HTMLElement)
        }  
      }, [
        el("div", { attrs: { style: "display: flex; justify-content: space-between; align-items: center;" } }, [
          el("h3", { attrs: { style: "margin: 0; font-family: 'The Future', sans-serif; font-size: 24px; color: #FFFFFF;" } }, ["Financial Dashboard"]),
          el("button", { attrs: { type: "button", style: "padding: 8px 16px; background: rgba(255,255,255,0.1); color: #FFFFFF; border: none; border-radius: 6px; font-family: 'The Future', sans-serif; font-size: 12px; cursor: pointer; transition: background 0.2s;" }, on: { mouseenter: (e: Event) => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.2)", mouseleave: (e: Event) => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)", click: () => void loadDashboard() } }, ["RELOAD"]),
        ]),
        dashboardHost,
      ]),

    ]),
  ]);
}

function statCard(label: string, value: string): HTMLElement {
  return el("div", { 
    attrs: { style: "background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 24px; border-radius: 8px; display: flex; flex-direction: column; gap: 8px; transition: transform 0.2s ease;" },
    on: {
      mouseenter: (e: Event) => (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)",
      mouseleave: (e: Event) => (e.currentTarget as HTMLElement).style.transform = "none"
    } 
  }, [
    el("span", { class: "label-mono", attrs: { style: "color: #AAD6FA; font-size: 11px; letter-spacing: 0.055px;" }, text: label }),
    el("span", { attrs: { style: "font-family: 'The Future', sans-serif; color: #FFFFFF; font-size: 28px; font-weight: 500; letter-spacing: -1px;" }, text: value }),
  ]);
}