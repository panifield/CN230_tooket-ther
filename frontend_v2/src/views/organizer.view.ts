import { bookingApi } from "../api/booking";
import { organizerApi } from "../api/organizer";
import type {
  Concert,
  CreateConcertPayload,
  CreateZonePayload,
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
  statusPillClass,
} from "../utils/format";

interface ZoneDraft extends CreateZonePayload {}

export function renderOrganizerView(): HTMLElement {
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
    zones: [] as ZoneDraft[],
  };

  const concertListHost = el("div");
  const queueHost = el("div");
  const dashboardHost = el("div");
  const concertZonesHost = el("div");
  const zoneDraftHost = el("div");

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
            state.concerts.map((c) =>
              el("tr", { attrs: { style: state.selectedConcertId === c.concert_id ? "background: var(--color-sky-tint);" : "" } }, [
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
                    class: `pill ${String(c.status) === 'published' || String(c.status) === 'publish' ? 'pill--ok' : 'pill--muted'}`,
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
              ])
            )
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
      el("div", { class: "table-wrap" }, [
        el("table", { class: "table" }, [
          el("thead", {}, [
            el("tr", {}, [
              el("th", { text: "Customer" }),
              el("th", { text: "Priority" }),
              el("th", { text: "Entered" }),
              el("th", { text: "Status" }),
              el("th", { attrs: { style: "text-align: right;" }, text: "Action" }),
            ]),
          ]),
          el(
            "tbody",
            {},
            state.queues.map((q) =>
              el("tr", {}, [
                el("td", { attrs: { style: "font-weight: 500;" }, text: q.customer_name }),
                el("td", { text: String(q.priority_score) }),
                el("td", { class: "label-mono", text: formatDateTime(q.entered_at) }),
                el("td", {}, [
                  el("span", {
                    class: `pill ${String(q.status) === 'waiting' ? 'pill--warn' : 'pill--ok'}`,
                    text: statusLabel(q.status).toUpperCase(),
                  }),
                ]),
                el("td", { attrs: { style: "text-align: right;" } }, [
                  String(q.status) === "waiting"
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
              ])
            )
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
      el("div", { class: "table-wrap" }, [
        el("table", { class: "table" }, [
          el("thead", {}, [
            el("tr", {}, [
              el("th", { text: "Zone Name" }),
              el("th", { text: "Price" }),
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
                el("td", { text: formatBaht(z.price) }),
                el("td", { class: "label-mono", text: `${z.available_count} / ${z.total_seats}` }),
                el("td", {}, [
                  el("span", {
                    class: `pill ${z.is_active ? "pill--ok" : "pill--err"}`,
                    text: z.is_active ? "ACTIVE" : "CLOSED",
                  }),
                ]),
                el("td", { attrs: { style: "text-align: right;" } }, [
                  z.is_active
                    ? el(
                        "button",
                        {
                          class: "btn btn--danger btn--sm",
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
                        class: `pill ${d.net_profit >= 0 ? "pill--ok" : "pill--err"}`,
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

  // ---------- Concert creation form ----------
  const inputs = {
    title: input("c-title", "text"),
    artist: input("c-artist", "text"),
    venue: input("c-venue", "text"),
    address: input("c-address", "text"),
    concert_datetime: input("c-when", "datetime-local"),
    sale_open_at: input("c-sale-open", "datetime-local"),
    sale_close_at: input("c-sale-close", "datetime-local"),
    image: input("c-image", "file"),
  };
  
  const formStatus = el("p", { class: "field__error", attrs: { style: "margin-top: var(--space-3); text-align: center;" } });

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

  const renderZoneDrafts = (): void => {
    if (state.zones.length === 0) {
      mount(zoneDraftHost, el("div", { class: "empty-cart", text: "NO ZONES ADDED YET." }));
      return;
    }
    mount(
      zoneDraftHost,
      ...state.zones.map((z, i) =>
        el("div", { class: "card card--cream", attrs: { style: "margin-bottom: var(--space-3); padding: var(--space-4);" } }, [
          el("div", { class: "form-grid" }, [
            zoneField(`ZONE NAME`, z.zone_name, (v) => {
              state.zones[i]!.zone_name = v;
            }),
            zoneField(
              `PRICE (THB)`,
              String(z.price),
              (v) => { state.zones[i]!.price = Number(v) || 0; },
              "number"
            ),
            zoneField(
              `ROWS`,
              String(z.rows),
              (v) => {
                state.zones[i]!.rows = Number(v) || 0;
                state.zones[i]!.total_seats = state.zones[i]!.rows * state.zones[i]!.cols;
                renderZoneDrafts();
              },
              "number"
            ),
            zoneField(
              `COLUMNS`,
              String(z.cols),
              (v) => {
                state.zones[i]!.cols = Number(v) || 0;
                state.zones[i]!.total_seats = state.zones[i]!.rows * state.zones[i]!.cols;
                renderZoneDrafts();
              },
              "number"
            ),
          ]),
          el("div", { class: "form-actions", attrs: { style: "justify-content: space-between; align-items: center;" } }, [
            el("span", { class: "label-mono", text: `TOTAL SEATS: ${z.rows * z.cols}` }),
            el("button", {
                class: "btn btn--danger btn--sm",
                attrs: { type: "button" },
                on: { click: () => { state.zones.splice(i, 1); renderZoneDrafts(); } },
              },
              ["REMOVE ZONE"]
            ),
          ]),
        ])
      )
    );
  };

  const submitConcert = async (): Promise<void> => {
    formStatus.textContent = "";
    formStatus.style.color = "var(--color-danger)";

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
      formStatus.style.color = "var(--color-midnight)";
      formStatus.textContent = `${r.message.toUpperCase()} (CONCERT #${r.concert_id})`;
      state.zones = [];
      renderZoneDrafts();
      await refreshConcerts();
    } catch (err) {
      formStatus.textContent = err instanceof Error ? err.message.toUpperCase() : "COULD NOT CREATE CONCERT.";
    }
  };

  void refreshConcerts();
  renderZoneDrafts();
  renderQueues();
  renderConcertZones();
  renderDashboard();

  return el("div", { class: "coastal-page" }, [
    el("div", { attrs: { style: "max-width: 1400px; margin: 0 auto;" } }, [
      // Page Header
      el("div", { class: "selection-header" }, [
        el("div", {}, [
          el("span", { class: "label-mono", text: "PORTAL / ORGANIZER" }),
          el("h1", { class: "coastal-title", text: "Performance Dashboard" }),
        ]),
      ]),

      // Main Grid Layout (2 Columns)
      el("div", { attrs: { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: var(--space-6); align-items: start;" } }, [
        
        // LEFT COLUMN: Creation Forms
        el("div", { attrs: { style: "display: flex; flex-direction: column; gap: var(--space-6);" } }, [
          el("section", { class: "card" }, [
            el("div", { class: "card__header" }, [
              el("h3", { class: "card__title", text: "Create Concert" }),
              el("span", { class: "label-mono", text: "CRAFT / SETUP" }),
            ]),
            el("div", { class: "form-grid" }, [
              el("div", { class: "form-grid--full" }, [ field("c-title", "CONCERT NAME", inputs.title) ]),
              field("c-artist", "ARTIST", inputs.artist),
              field("c-venue", "VENUE (LOCATION)", inputs.venue),
              el("div", { class: "form-grid--full" }, [ field("c-address", "FULL ADDRESS", inputs.address) ]),
              el("div", { class: "form-grid--full" }, [ field("c-when", "WHEN (DATE & TIME)", inputs.concert_datetime) ]),
              field("c-sale-open", "SALE OPENS", inputs.sale_open_at),
              field("c-sale-close", "SALE CLOSES", inputs.sale_close_at),
              el("div", { class: "form-grid--full" }, [ field("c-image", "CONCERT IMAGE (POSTER)", inputs.image) ]),
            ]),
            
            el("div", { class: "divider", text: "ZONE CONFIGURATION" }),
            zoneDraftHost,
            
            el("div", { class: "form-actions" }, [
              el("button", { class: "btn btn--secondary btn--block", attrs: { type: "button" }, on: { click: addZone } }, ["+ ADD ZONE"]),
              el("button", { class: "btn btn--primary btn--block", attrs: { type: "button", style: "margin-top: var(--space-2);" }, on: { click: () => void submitConcert() } }, ["PUBLISH CONCERT"]),
            ]),
            formStatus,
          ]),
        ]),

        // RIGHT COLUMN: Dashboard & Management
        el("div", { attrs: { style: "display: flex; flex-direction: column; gap: var(--space-6);" } }, [
          
          el("section", { class: "card" }, [
            el("div", { class: "card__header" }, [
              el("h3", { class: "card__title", text: "Active Events" }),
              el("button", { class: "btn btn--ghost btn--sm", attrs: { type: "button" }, on: { click: () => void refreshConcerts() } }, ["REFRESH"]),
            ]),
            concertListHost,
          ]),

          el("section", { class: "card card--dark" }, [
            el("div", { class: "card__header" }, [
              el("h3", { class: "card__title", text: "Financial Dashboard" }),
              el("button", { class: "btn btn--dark btn--sm", attrs: { type: "button" }, on: { click: () => void loadDashboard() } }, ["RELOAD"]),
            ]),
            dashboardHost,
          ]),

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
      ]),
    ]),
  ]);
}

function input(id: string, type = "text"): HTMLInputElement {
  return el("input", {
    class: "input",
    attrs: { id, type },
  }) as HTMLInputElement;
}

function field(id: string, label: string, control: HTMLElement): HTMLElement {
  return el("div", { class: "field" }, [
    el("label", { class: "field__label", attrs: { for: id }, text: label }),
    control,
  ]);
}

function zoneField(
  label: string,
  value: string,
  onChange: (v: string) => void,
  type = "text"
): HTMLElement {
  const ctrl = el("input", {
    class: "input",
    attrs: { type, value },
    on: { input: (e) => onChange((e.target as HTMLInputElement).value) },
  });
  return el("div", { class: "field" }, [
    el("label", { class: "field__label", text: label }),
    ctrl,
  ]);
}

function statCard(label: string, value: string): HTMLElement {
  return el("div", { class: "stat", attrs: { style: "background: var(--color-glass-light); padding: var(--space-4); border-radius: var(--radius-control);" } }, [
    el("span", { class: "stat__value", attrs: { style: "color: var(--color-white);" }, text: value }),
    el("span", { class: "stat__label", attrs: { style: "color: var(--color-primary-blue);" }, text: label }),
  ]);
}