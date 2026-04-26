import { bookingApi } from "../api/booking";
import { organizerApi } from "../api/organizer";
import type {
  Concert,
  CreateConcertPayload,
  CreateZonePayload,
  OrganizerDashboard,
  OrganizerQueueRow,
  Zone,
  PendingRefund,
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

interface ZoneDraft extends CreateZonePayload {}

export function renderOrganizerView(
  initialState: "events" | "create" | "dashboard" = "events",
  initialConcertId: number | null = null,
): HTMLElement {
  if (!authStore.isAuthenticated() || authStore.getRole() !== "organizer") {
    router.navigate("/login");
    return el("div");
  }

  const state = {
    concerts: [] as Concert[],
    selectedConcertId: initialConcertId,
    queues: [] as OrganizerQueueRow[],
    dashboard: null as OrganizerDashboard | null,
    concertZones: [] as Zone[],
    pendingRefunds: [] as PendingRefund[],
    zones: [] as ZoneDraft[],
    navState: initialState
  };

  const mainContentHost = el("div", { class: "p-container-padding space-y-section-gap max-w-[1600px] mx-auto" });
  const sidebarHost = el("div");

  const refreshConcerts = async (): Promise<void> => {
    state.concerts = await bookingApi.listConcerts();
    renderMainContent();
  };

  const loadQueues = async (): Promise<void> => {
    if (state.selectedConcertId === null) return;
    try {
      state.queues = await organizerApi.listQueues(state.selectedConcertId);
    } catch {
      state.queues = [];
    }
  };

  const loadZones = async (): Promise<void> => {
    if (state.selectedConcertId === null) return;
    try {
      state.concertZones = await bookingApi.listZones(state.selectedConcertId);
    } catch {
      state.concertZones = [];
    }
  };

  const loadDashboard = async (): Promise<void> => {
    if (state.selectedConcertId === null) return;
    try {
      state.dashboard = await organizerApi.dashboard(state.selectedConcertId);
    } catch {
      state.dashboard = null;
    }
  };

  const loadPendingRefunds = async (): Promise<void> => {
    if (state.selectedConcertId === null) return;
    try {
      state.pendingRefunds = await organizerApi.listPendingRefunds(state.selectedConcertId);
    } catch {
      state.pendingRefunds = [];
    }
  };

  // ---------------- UI Components ----------------

  const renderIcon = (name: string, extraClass: string = ""): HTMLElement => {
    return el("span", { class: `material-symbols-outlined ${extraClass}`, text: name });
  };

  // Local sidebar and header removed to use the global navbar

  const renderConcertsTable = (): HTMLElement => {
    if (state.concerts.length === 0) {
      return el("div", { class: "bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm text-center font-body-md text-slate-500", text: "NO CONCERTS YET." });
    }

    return el("section", { class: "bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden" }, [
      el("div", { class: "px-8 py-6 border-b border-slate-100 flex items-center justify-between" }, [
        el("h3", { class: "font-headline-md text-slate-900", text: "Live Schedule" }),
        el("button", { class: "p-2 text-slate-400 hover:text-slate-900 transition-colors", on: { click: refreshConcerts } }, [ renderIcon("refresh") ])
      ]),
      el("div", { class: "overflow-x-auto" }, [
        el("table", { class: "w-full text-left border-collapse" }, [
          el("thead", {}, [
            el("tr", { class: "bg-slate-50/50" }, [
              el("th", { class: "px-8 py-4 font-label-sm text-slate-400 border-b border-slate-100", text: "EVENT & ARTIST" }),
              el("th", { class: "px-8 py-4 font-label-sm text-slate-400 border-b border-slate-100", text: "DATE & VENUE" }),
              el("th", { class: "px-8 py-4 font-label-sm text-slate-400 border-b border-slate-100", text: "STATUS" }),
              el("th", { class: "px-8 py-4 font-label-sm text-slate-400 border-b border-slate-100 text-right", text: "ACTIONS" }),
            ])
          ]),
          el("tbody", { class: "divide-y divide-slate-100" }, 
            state.concerts.map(c => {
              const isSelected = state.selectedConcertId === c.concert_id;
              const isOk = String(c.status) === 'published' || String(c.status) === 'publish' || String(c.status) === 'on_sale';
              return el("tr", { class: `hover:bg-slate-50 transition-colors group ${isSelected ? 'bg-surface-variant/20' : ''}` }, [
                el("td", { class: "px-8 py-5" }, [
                  el("div", { class: "flex items-center gap-4" }, [
                    el("div", { class: "w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-slate-100 flex items-center justify-center" }, [
                      c.image_url ? el("img", { class: "w-full h-full object-cover", attrs: { src: `/${c.image_url}` } }) : renderIcon("image", "text-slate-400 text-2xl")
                    ]),
                    el("div", {}, [
                      el("p", { class: "font-body-md font-semibold text-slate-900", text: c.title }),
                      el("p", { class: "text-[11px] font-label-sm text-slate-500 uppercase", text: c.artist })
                    ])
                  ])
                ]),
                el("td", { class: "px-8 py-5" }, [
                  el("p", { class: "font-body-md text-slate-900", text: formatDateTime(c.concert_datetime) }),
                  el("p", { class: "text-xs text-slate-500 flex items-center gap-1 mt-1" }, [
                    renderIcon("location_on", "text-xs"),
                    c.venue
                  ])
                ]),
                el("td", { class: "px-8 py-5" }, [
                  el("span", { class: `inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-label-sm text-[10px] ${isOk ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}` }, [
                    isOk ? el("span", { class: "w-1.5 h-1.5 rounded-full bg-green-600 status-pulse" }) : null,
                    statusLabel(c.status).toUpperCase()
                  ])
                ]),
                el("td", { class: "px-8 py-5 text-right" }, [
                  el("div", { class: "flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity" }, [
                    el("button", {
                      class: "px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-label-sm text-slate-700 hover:border-secondary transition-colors",
                      on: { click: async () => {
                        state.selectedConcertId = c.concert_id;
                        state.navState = "dashboard";
                        await Promise.all([loadQueues(), loadDashboard(), loadZones(), loadPendingRefunds()]);
                        renderMainContent();
                      }}
                    }, ["Manage"]),
                    el("button", {
                      class: "p-1.5 text-slate-400 hover:text-secondary",
                      attrs: { title: "Auto-sort Queue" },
                      on: { click: async () => {
                        try {
                          const r = await organizerApi.autoSortQueues(c.concert_id);
                          events.emit("log", { level: "info", message: r.message });
                        } catch (err) {
                          events.emit("log", { level: "error", message: err instanceof Error ? err.message : String(err) });
                        }
                      }}
                    }, [ renderIcon("sort") ])
                  ])
                ])
              ]);
            })
          )
        ])
      ])
    ]);
  };

  const renderDashboardData = (): HTMLElement => {
    if (state.selectedConcertId === null) {
      return el("div", { class: "bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm text-center font-body-md text-slate-500", text: "SELECT A CONCERT TO VIEW FINANCIALS." });
    }

    if (!state.dashboard) {
      return el("div", { class: "bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm text-center font-body-md text-slate-500", text: "LOADING FINANCIALS..." });
    }

    const { grand_totals, daily_stats } = state.dashboard;

    const summary = el("div", { class: "grid grid-cols-1 md:grid-cols-3 gap-gutter mb-8" }, [
      el("div", { class: "bg-white p-6 rounded-3xl border border-slate-200 flex flex-col justify-between" }, [
        el("div", { class: "flex justify-between items-start" }, [
          el("div", { class: "w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary" }, [ renderIcon("payments") ])
        ]),
        el("div", { class: "mt-4" }, [
          el("p", { class: "text-slate-500 font-label-sm mb-1", text: "TOTAL INCOME" }),
          el("h4", { class: "font-display-xl text-slate-900", text: formatBaht(grand_totals.total_income) })
        ])
      ]),
      el("div", { class: "bg-white p-6 rounded-3xl border border-slate-200 flex flex-col justify-between" }, [
        el("div", { class: "flex justify-between items-start" }, [
          el("div", { class: "w-12 h-12 rounded-2xl bg-error/10 flex items-center justify-center text-error" }, [ renderIcon("receipt_long") ])
        ]),
        el("div", { class: "mt-4" }, [
          el("p", { class: "text-slate-500 font-label-sm mb-1", text: "TOTAL EXPENSE" }),
          el("h4", { class: "font-display-xl text-slate-900", text: formatBaht(grand_totals.total_expense) })
        ])
      ]),
      el("div", { class: "bg-primary-container p-6 rounded-3xl flex flex-col justify-between" }, [
        el("div", { class: "flex justify-between items-start" }, [
          el("div", { class: "w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white" }, [ renderIcon("account_balance") ])
        ]),
        el("div", { class: "mt-4" }, [
          el("p", { class: "text-slate-400 font-label-sm mb-1", text: "NET PROFIT" }),
          el("h4", { class: "font-display-xl text-white", text: formatBaht(grand_totals.total_net_profit) })
        ])
      ])
    ]);

    const breakdown = daily_stats.length === 0 ? 
      el("div", { class: "text-center text-slate-500 font-body-md py-8", text: "NO TRANSACTIONS YET." }) :
      el("div", { class: "overflow-x-auto" }, [
        el("table", { class: "w-full text-left border-collapse" }, [
          el("thead", {}, [
            el("tr", { class: "bg-slate-50/50" }, [
              el("th", { class: "px-8 py-4 font-label-sm text-slate-400 border-b border-slate-100", text: "DATE" }),
              el("th", { class: "px-8 py-4 font-label-sm text-slate-400 border-b border-slate-100", text: "INCOME" }),
              el("th", { class: "px-8 py-4 font-label-sm text-slate-400 border-b border-slate-100", text: "EXPENSE" }),
              el("th", { class: "px-8 py-4 font-label-sm text-slate-400 border-b border-slate-100 text-right", text: "NET PROFIT" }),
            ])
          ]),
          el("tbody", { class: "divide-y divide-slate-100" }, 
            daily_stats.map(d => el("tr", { class: "hover:bg-slate-50 transition-colors" }, [
              el("td", { class: "px-8 py-4 font-body-md text-slate-900", text: d.date }),
              el("td", { class: "px-8 py-4 font-data-mono text-slate-900", text: formatBaht(d.income) }),
              el("td", { class: "px-8 py-4 font-data-mono text-slate-900", text: formatBaht(d.expense) }),
              el("td", { class: "px-8 py-4 font-data-mono text-right" }, [
                el("span", { class: `inline-flex px-2 py-0.5 rounded-full font-label-sm text-[10px] ${d.net_profit >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`, text: formatBaht(d.net_profit) })
              ])
            ]))
          )
        ])
      ]);

    return el("div", {}, [
      summary,
      el("div", { class: "bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden" }, [
        el("div", { class: "px-8 py-6 border-b border-slate-100" }, [
          el("h3", { class: "font-headline-md text-slate-900", text: "Daily Breakdown" })
        ]),
        breakdown
      ])
    ]);
  };

  const renderQueueList = (): HTMLElement => {
    if (state.selectedConcertId === null) return el("div");

    if (state.queues.length === 0) {
      return el("div", { class: "bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm text-center font-body-md text-slate-500 mt-8", text: "NO CUSTOMERS IN QUEUE." });
    }

    return el("section", { class: "bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden mt-8" }, [
      el("div", { class: "px-8 py-6 border-b border-slate-100 flex items-center justify-between" }, [
        el("h3", { class: "font-headline-md text-slate-900", text: "Real-time Queue" }),
        el("button", { class: "p-2 text-slate-400 hover:text-slate-900 transition-colors", on: { click: loadQueues } }, [ renderIcon("refresh") ])
      ]),
      el("div", { class: "overflow-x-auto max-h-96" }, [
        el("table", { class: "w-full text-left border-collapse relative" }, [
          el("thead", { class: "sticky top-0 bg-slate-50/50 z-10 backdrop-blur-md" }, [
            el("tr", {}, [
              el("th", { class: "px-8 py-4 font-label-sm text-slate-400 border-b border-slate-100", text: "CUSTOMER" }),
              el("th", { class: "px-8 py-4 font-label-sm text-slate-400 border-b border-slate-100", text: "PRIORITY" }),
              el("th", { class: "px-8 py-4 font-label-sm text-slate-400 border-b border-slate-100", text: "ENTERED" }),
              el("th", { class: "px-8 py-4 font-label-sm text-slate-400 border-b border-slate-100", text: "STATUS" }),
              el("th", { class: "px-8 py-4 font-label-sm text-slate-400 border-b border-slate-100 text-right", text: "ACTION" }),
            ])
          ]),
          el("tbody", { class: "divide-y divide-slate-100" }, 
            state.queues.map(q => el("tr", { class: "hover:bg-slate-50 transition-colors" }, [
              el("td", { class: "px-8 py-4 font-body-md font-semibold text-slate-900", text: q.customer_name }),
              el("td", { class: "px-8 py-4 font-data-mono text-slate-900", text: String(q.priority_score) }),
              el("td", { class: "px-8 py-4 font-body-md text-slate-500", text: formatDateTime(q.entered_at) }),
              el("td", { class: "px-8 py-4" }, [
                el("span", { class: `inline-flex px-2 py-0.5 rounded-full font-label-sm text-[10px] ${String(q.status) === 'waiting' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`, text: statusLabel(q.status).toUpperCase() })
              ]),
              el("td", { class: "px-8 py-4 text-right" }, [
                String(q.status) === "waiting" ?
                  el("button", {
                    class: "px-3 py-1.5 bg-secondary text-white rounded-lg font-label-sm hover:bg-secondary/90 transition-colors",
                    on: { click: async () => {
                      try {
                        await organizerApi.admit(q.queue_id);
                        await loadQueues();
                        renderMainContent();
                      } catch (err) {
                        events.emit("log", { level: "error", message: err instanceof Error ? err.message : String(err) });
                      }
                    }}
                  }, ["ADMIT"]) :
                  el("span", { class: "text-slate-400", text: "—" })
              ])
            ]))
          )
        ])
      ])
    ]);
  };

  const renderConcertZones = (): HTMLElement => {
    if (state.selectedConcertId === null) return el("div");

    if (state.concertZones.length === 0) {
      return el("div", { class: "bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm text-center font-body-md text-slate-500 mt-8", text: "NO ZONES FOR THIS CONCERT." });
    }

    return el("section", { class: "bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden mt-8" }, [
      el("div", { class: "px-8 py-6 border-b border-slate-100 flex items-center justify-between" }, [
        el("h3", { class: "font-headline-md text-slate-900", text: "Zone Availability" }),
        el("button", { class: "p-2 text-slate-400 hover:text-slate-900 transition-colors", on: { click: loadZones } }, [ renderIcon("refresh") ])
      ]),
      el("div", { class: "overflow-x-auto" }, [
        el("table", { class: "w-full text-left border-collapse" }, [
          el("thead", {}, [
            el("tr", { class: "bg-slate-50/50" }, [
              el("th", { class: "px-8 py-4 font-label-sm text-slate-400 border-b border-slate-100", text: "ZONE NAME" }),
              el("th", { class: "px-8 py-4 font-label-sm text-slate-400 border-b border-slate-100", text: "PRICE" }),
              el("th", { class: "px-8 py-4 font-label-sm text-slate-400 border-b border-slate-100", text: "AVAILABLE" }),
              el("th", { class: "px-8 py-4 font-label-sm text-slate-400 border-b border-slate-100", text: "STATUS" }),
              el("th", { class: "px-8 py-4 font-label-sm text-slate-400 border-b border-slate-100 text-right", text: "ACTION" }),
            ])
          ]),
          el("tbody", { class: "divide-y divide-slate-100" }, 
            state.concertZones.map(z => {
              const capacity = z.total_seats > 0 ? Math.round(((z.total_seats - z.available_count) / z.total_seats) * 100) : 0;
              return el("tr", { class: `hover:bg-slate-50 transition-colors ${!z.is_active ? 'opacity-50' : ''}` }, [
                el("td", { class: "px-8 py-4 font-body-md font-semibold text-slate-900", text: z.zone_name }),
                el("td", { class: "px-8 py-4 font-data-mono text-slate-900", text: formatBaht(z.price) }),
                el("td", { class: "px-8 py-4" }, [
                  el("div", { class: "flex items-center gap-3" }, [
                    el("span", { class: "font-data-mono text-slate-900 w-16", text: `${z.available_count} / ${z.total_seats}` }),
                    el("div", { class: "flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden min-w-[60px]" }, [
                      el("div", { class: `h-full ${capacity > 90 ? 'bg-error' : 'bg-secondary'}`, attrs: { style: `width: ${capacity}%` } })
                    ])
                  ])
                ]),
                el("td", { class: "px-8 py-4" }, [
                  el("span", { class: `inline-flex px-2 py-0.5 rounded-full font-label-sm text-[10px] ${z.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`, text: z.is_active ? "ACTIVE" : "CLOSED" })
                ]),
                el("td", { class: "px-8 py-4 text-right" }, [
                  z.is_active ?
                    el("button", {
                      class: "px-3 py-1.5 bg-white border border-error text-error rounded-lg font-label-sm hover:bg-error hover:text-white transition-colors",
                      on: { click: async () => {
                        if (!window.confirm(`Close zone "${z.zone_name}"? This cannot be undone.`)) return;
                        try {
                          const r = await organizerApi.closeZone(z.zone_id);
                          events.emit("log", { level: "warn", message: `${r.message} — ${r.affected_bookings} bookings affected` });
                          await Promise.all([loadZones(), loadDashboard()]);
                          renderMainContent();
                        } catch (err) {
                          events.emit("log", { level: "error", message: err instanceof Error ? err.message : String(err) });
                        }
                      }}
                    }, ["CLOSE ZONE"]) :
                    el("span", { class: "text-slate-400", text: "—" })
                ])
              ]);
            })
          )
        ])
      ])
    ]);
  };

  const renderRefundList = (): HTMLElement => {
    if (state.selectedConcertId === null) return el("div");
    if (state.pendingRefunds.length === 0) {
      return el("div", { class: "bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm text-center font-body-md text-slate-500 mt-8", text: "NO PENDING REFUNDS." });
    }

    return el("section", { class: "bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden mt-8" }, [
      el("div", { class: "px-8 py-6 border-b border-slate-100 flex items-center justify-between" }, [
        el("h3", { class: "font-headline-md text-slate-900", text: "Pending Refunds" }),
        el("button", { class: "p-2 text-slate-400 hover:text-slate-900 transition-colors", on: { click: loadPendingRefunds } }, [ renderIcon("refresh") ])
      ]),
      el("div", { class: "overflow-x-auto" }, [
        el("table", { class: "w-full text-left border-collapse" }, [
          el("thead", {}, [
            el("tr", { class: "bg-slate-50/50" }, [
              el("th", { class: "px-8 py-4 font-label-sm text-slate-400 border-b border-slate-100", text: "BOOKING" }),
              el("th", { class: "px-8 py-4 font-label-sm text-slate-400 border-b border-slate-100", text: "CUSTOMER" }),
              el("th", { class: "px-8 py-4 font-label-sm text-slate-400 border-b border-slate-100", text: "BANK INFO" }),
              el("th", { class: "px-8 py-4 font-label-sm text-slate-400 border-b border-slate-100", text: "AMOUNT" }),
              el("th", { class: "px-8 py-4 font-label-sm text-slate-400 border-b border-slate-100 text-right", text: "ACTION" }),
            ])
          ]),
          el("tbody", { class: "divide-y divide-slate-100" }, 
            state.pendingRefunds.map(r => el("tr", { class: "hover:bg-slate-50 transition-colors" }, [
              el("td", { class: "px-8 py-4" }, [
                el("p", { class: "font-body-md font-semibold text-slate-900", text: `BKG-${r.booking_id}` }),
                el("p", { class: "text-[10px] font-label-sm text-slate-500", text: `${r.total_tickets} ticket(s)` })
              ]),
              el("td", { class: "px-8 py-4" }, [
                el("p", { class: "font-body-md text-slate-900", text: r.customer_name }),
                el("p", { class: "text-[10px] font-label-sm text-slate-500", text: r.customer_email })
              ]),
              el("td", { class: "px-8 py-4 font-data-mono text-xs" }, [
                el("p", { text: r.bank_name || "—" }),
                el("p", { text: r.account_number || "—" }),
                el("p", { text: r.account_name || "" })
              ]),
              el("td", { class: "px-8 py-4 font-data-mono font-semibold text-slate-900", text: formatBaht(r.total_amount) }),
              el("td", { class: "px-8 py-4 text-right" }, [
                el("button", {
                  class: "px-3 py-1.5 bg-primary-container text-white rounded-lg font-label-sm hover:bg-primary-container/90 transition-colors",
                  on: { click: async () => {
                    if (!window.confirm(`Approve refund of ${formatBaht(r.total_amount)}?`)) return;
                    try {
                      const res = await organizerApi.approveRefund(r.booking_id);
                      events.emit("log", { level: "info", message: `${res.message} — ${res.seats_released} seats released` });
                      await Promise.all([loadPendingRefunds(), loadDashboard(), loadZones()]);
                      renderMainContent();
                    } catch (err) {
                      events.emit("log", { level: "error", message: err instanceof Error ? err.message : String(err) });
                    }
                  }}
                }, ["APPROVE"])
              ])
            ]))
          )
        ])
      ])
    ]);
  };

  const renderCreateConcert = (): HTMLElement => {
    const inputs = {
      title: el("input", { class: "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-body-md focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none", attrs: { type: "text", placeholder: "e.g. Summer Solstice Tour" } }) as HTMLInputElement,
      artist: el("input", { class: "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-body-md focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none", attrs: { type: "text", placeholder: "e.g. Midnight Sky" } }) as HTMLInputElement,
      venue: el("input", { class: "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-body-md focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none", attrs: { type: "text", placeholder: "e.g. The Royal Albert Hall" } }) as HTMLInputElement,
      address: el("input", { class: "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-body-md focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none", attrs: { type: "text", placeholder: "Full Address" } }) as HTMLInputElement,
      concert_datetime: el("input", { class: "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-body-md focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none", attrs: { type: "datetime-local" } }) as HTMLInputElement,
      sale_open_at: el("input", { class: "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-body-md focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none", attrs: { type: "datetime-local" } }) as HTMLInputElement,
      sale_close_at: el("input", { class: "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-body-md focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none", attrs: { type: "datetime-local" } }) as HTMLInputElement,
      image: el("input", { class: "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-body-md focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none", attrs: { type: "file", accept: "image/*" } }) as HTMLInputElement,
    };

    const formStatus = el("p", { class: "text-center font-label-sm mt-4 text-error" });
    const zoneDraftHost = el("div", { class: "space-y-4 mt-6" });

    const renderZoneDrafts = (): void => {
      if (state.zones.length === 0) {
        mount(zoneDraftHost, el("div", { class: "text-center py-6 text-slate-500 font-body-md border-2 border-dashed border-slate-200 rounded-xl", text: "NO ZONES ADDED YET." }));
        return;
      }

      mount(
        zoneDraftHost,
        ...state.zones.map((z, i) =>
          el("div", { class: "bg-slate-50 p-6 rounded-2xl border border-slate-200 relative" }, [
            el("div", { class: "grid grid-cols-2 gap-4" }, [
              el("div", {}, [
                el("label", { class: "block font-label-sm text-slate-500 mb-1", text: "ZONE NAME" }),
                el("input", {
                  class: "w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-body-md focus:ring-2 focus:ring-secondary/20 outline-none",
                  attrs: { type: "text", value: z.zone_name },
                  on: { input: (e) => { state.zones[i]!.zone_name = (e.target as HTMLInputElement).value; } }
                })
              ]),
              el("div", {}, [
                el("label", { class: "block font-label-sm text-slate-500 mb-1", text: "PRICE (THB)" }),
                el("input", {
                  class: "w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-body-md focus:ring-2 focus:ring-secondary/20 outline-none",
                  attrs: { type: "number", value: String(z.price) },
                  on: { input: (e) => { state.zones[i]!.price = Number((e.target as HTMLInputElement).value) || 0; } }
                })
              ]),
              el("div", {}, [
                el("label", { class: "block font-label-sm text-slate-500 mb-1", text: "ROWS" }),
                el("input", {
                  class: "w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-body-md focus:ring-2 focus:ring-secondary/20 outline-none",
                  attrs: { type: "number", value: String(z.rows) },
                  on: { input: (e) => {
                    state.zones[i]!.rows = Number((e.target as HTMLInputElement).value) || 0;
                    state.zones[i]!.total_seats = state.zones[i]!.rows * state.zones[i]!.cols;
                    renderZoneDrafts();
                  }}
                })
              ]),
              el("div", {}, [
                el("label", { class: "block font-label-sm text-slate-500 mb-1", text: "COLUMNS" }),
                el("input", {
                  class: "w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-body-md focus:ring-2 focus:ring-secondary/20 outline-none",
                  attrs: { type: "number", value: String(z.cols) },
                  on: { input: (e) => {
                    state.zones[i]!.cols = Number((e.target as HTMLInputElement).value) || 0;
                    state.zones[i]!.total_seats = state.zones[i]!.rows * state.zones[i]!.cols;
                    renderZoneDrafts();
                  }}
                })
              ])
            ]),
            el("div", { class: "flex items-center justify-between mt-4 pt-4 border-t border-slate-200" }, [
              el("span", { class: "font-label-sm text-slate-500", text: `TOTAL SEATS: ${z.rows * z.cols}` }),
              el("button", {
                class: "text-error hover:text-red-700 font-label-sm flex items-center gap-1 transition-colors",
                on: { click: () => { state.zones.splice(i, 1); renderZoneDrafts(); } }
              }, [ renderIcon("delete", "text-sm"), "REMOVE" ])
            ])
          ])
        )
      );
    };

    renderZoneDrafts();

    const addZone = (): void => {
      state.zones.push({
        zone_name: `ZONE ${state.zones.length + 1}`,
        price: 1000,
        total_seats: 50,
        rows: 5,
        cols: 10,
      });
      renderZoneDrafts();
    };

    const submitConcert = async (): Promise<void> => {
      formStatus.textContent = "";
      formStatus.className = "text-center font-label-sm mt-4 text-error";

      const title = inputs.title.value.trim();
      const artist = inputs.artist.value.trim();
      const venue = inputs.venue.value.trim();
      const address = inputs.address.value.trim();
      const concert_datetime = inputs.concert_datetime.value;
      const sale_open_at = inputs.sale_open_at.value;
      const sale_close_at = inputs.sale_close_at.value;

      if (!title || !artist || !venue || !concert_datetime || state.zones.length === 0) {
        formStatus.textContent = "PLEASE PROVIDE TITLE, ARTIST, VENUE, DATETIME, AND AT LEAST ONE ZONE.";
        return;
      }

      const formData = new FormData();
      formData.append("title", title);
      formData.append("artist", artist);
      formData.append("venue", venue);
      formData.append("address", address);
      formData.append("concert_datetime", concert_datetime);
      formData.append("sale_open_at", sale_open_at);
      if (sale_close_at) formData.append("sale_close_at", sale_close_at);
      formData.append("status", "on_sale");
      formData.append("zones_json", JSON.stringify(state.zones));
      
      if (inputs.image.files?.[0]) {
        formData.append("image", inputs.image.files[0]);
      }

      try {
        const r = await organizerApi.createConcert(formData as unknown as CreateConcertPayload);
        formStatus.className = "text-center font-label-sm mt-4 text-green-600";
        formStatus.textContent = `${r.message.toUpperCase()} (CONCERT #${r.concert_id})`;
        state.zones = [];
        renderZoneDrafts();
        
        // Reset form
        Object.values(inputs).forEach(input => {
          if (input.type !== 'file') input.value = '';
        });
        
        await refreshConcerts();
      } catch (err) {
        formStatus.textContent = err instanceof Error ? err.message.toUpperCase() : "COULD NOT CREATE CONCERT.";
      }
    };

    return el("section", { class: "bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm max-w-4xl mx-auto" }, [
      el("div", { class: "border-b border-slate-100 pb-6 mb-6" }, [
        el("h2", { class: "font-display-xl text-slate-900", text: "Create Event" }),
        el("p", { class: "font-body-md text-slate-500", text: "Setup a new concert, venue details, and ticketing zones." })
      ]),
      el("div", { class: "grid grid-cols-1 md:grid-cols-2 gap-6" }, [
        el("div", { class: "md:col-span-2" }, [
          el("label", { class: "block font-label-sm text-slate-500 mb-2", text: "CONCERT NAME" }),
          inputs.title
        ]),
        el("div", {}, [
          el("label", { class: "block font-label-sm text-slate-500 mb-2", text: "ARTIST" }),
          inputs.artist
        ]),
        el("div", {}, [
          el("label", { class: "block font-label-sm text-slate-500 mb-2", text: "VENUE" }),
          inputs.venue
        ]),
        el("div", { class: "md:col-span-2" }, [
          el("label", { class: "block font-label-sm text-slate-500 mb-2", text: "FULL ADDRESS" }),
          inputs.address
        ]),
        el("div", { class: "md:col-span-2" }, [
          el("label", { class: "block font-label-sm text-slate-500 mb-2", text: "WHEN (DATE & TIME)" }),
          inputs.concert_datetime
        ]),
        el("div", {}, [
          el("label", { class: "block font-label-sm text-slate-500 mb-2", text: "SALE OPENS" }),
          inputs.sale_open_at
        ]),
        el("div", {}, [
          el("label", { class: "block font-label-sm text-slate-500 mb-2", text: "SALE CLOSES" }),
          inputs.sale_close_at
        ]),
        el("div", { class: "md:col-span-2" }, [
          el("label", { class: "block font-label-sm text-slate-500 mb-2", text: "CONCERT IMAGE (POSTER)" }),
          inputs.image
        ]),
      ]),
      
      el("div", { class: "mt-10 border-t border-slate-100 pt-8" }, [
        el("div", { class: "flex items-center justify-between mb-4" }, [
          el("h3", { class: "font-headline-md text-slate-900", text: "Zone Configuration" }),
          el("button", {
            class: "flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-label-sm hover:bg-slate-200 transition-colors",
            on: { click: addZone }
          }, [ renderIcon("add", "text-lg"), "Add Zone" ])
        ]),
        zoneDraftHost
      ]),

      el("div", { class: "mt-10" }, [
        el("button", {
          class: "w-full bg-primary-container text-white py-4 rounded-xl font-label-sm tracking-widest hover:bg-primary-container/90 transition-colors shadow-lg",
          on: { click: submitConcert }
        }, ["PUBLISH CONCERT"]),
        formStatus
      ])
    ]);
  };

  const renderMainContent = (): void => {
    let content: HTMLElement;

    if (state.navState === "create") {
      content = renderCreateConcert();
    } else if (state.navState === "dashboard") {
      const dashboardConcertId = state.selectedConcertId;
      const onEditSeats = (): void => {
        if (dashboardConcertId === null) return;
        router.navigate(`/edit-concert?id=${dashboardConcertId}`);
      };
      const onDeleteConcert = async (): Promise<void> => {
        if (dashboardConcertId === null) return;
        if (!window.confirm(
          "Are you sure you want to completely delete this concert? This action cannot be undone."
        )) return;
        try {
          await organizerApi.deleteConcert(dashboardConcertId);
          state.selectedConcertId = null;
          state.navState = "events";
          await refreshConcerts();
        } catch (err) {
          alert(err instanceof Error ? err.message : "Failed to delete concert.");
        }
      };

      content = el("div", { class: "space-y-section-gap" }, [
        el("div", { class: "flex items-center justify-between mb-6" }, [
          el("div", {}, [
            el("h2", { class: "font-display-xl text-slate-900", text: "Dashboard" }),
            el("p", { class: "font-body-md text-slate-500", text: "Financials and Analytics for selected event." })
          ]),
          el("div", { class: "flex items-center gap-2" }, [
            el("button", {
              class: "flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-label-sm hover:bg-slate-200 transition-colors",
              on: { click: () => { state.navState = "events"; renderMainContent(); } }
            }, [ renderIcon("arrow_back", "text-lg"), "BACK TO ALL EVENTS" ]),
            el("button", {
              class: "flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-label-sm hover:bg-slate-50 transition-colors",
              on: { click: onEditSeats }
            }, [ renderIcon("edit", "text-lg"), "EDIT SEATS" ]),
            el("button", {
              class: "flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-xl font-label-sm hover:bg-red-50 transition-colors",
              on: { click: () => { void onDeleteConcert(); } }
            }, [ renderIcon("delete", "text-lg"), "DELETE CONCERT" ])
          ])
        ]),
        renderDashboardData(),
        renderQueueList(),
        renderConcertZones(),
        renderRefundList()
      ]);
    } else { // "events"
      content = el("div", { class: "space-y-section-gap" }, [
        el("div", { class: "flex items-center justify-between mb-6" }, [
          el("div", {}, [
            el("h2", { class: "font-display-xl text-slate-900", text: "Active Events" }),
            el("p", { class: "font-body-md text-slate-500", text: `Managing ${state.concerts.length} live performances.` })
          ])
        ]),
        renderConcertsTable()
      ]);
    }

    mount(mainContentHost, content);
  };

  // Initial Data Load
  renderMainContent();
  void refreshConcerts();
  if (state.navState === "dashboard" && state.selectedConcertId !== null) {
    void (async () => {
      await Promise.all([loadQueues(), loadDashboard(), loadZones(), loadPendingRefunds()]);
      renderMainContent();
    })();
  }

  return el("div", { class: "bg-background text-on-background min-h-screen py-10 px-6" }, [
    mainContentHost
  ]);
}