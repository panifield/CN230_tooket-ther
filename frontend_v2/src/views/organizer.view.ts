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

  const concertListHost = el("div", { class: "list" });
  const queueHost = el("div");
  const dashboardHost = el("div");
  const concertZonesHost = el("div");
  const zoneDraftHost = el("div", { class: "list" });

  const refreshConcerts = async (): Promise<void> => {
    state.concerts = await bookingApi.listConcerts();
    renderConcerts();
  };

  const renderConcerts = (): void => {
    if (state.concerts.length === 0) {
      mount(concertListHost, el("div", { class: "empty-state", text: "No concerts yet." }));
      return;
    }
    mount(
      concertListHost,
      ...state.concerts.map((c) =>
        el("article", { class: "list-item" }, [
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
                    void Promise.all([loadQueues(), loadDashboard(), loadZones()]);
                  },
                },
              },
              ["Manage"]
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
                        message:
                          err instanceof Error ? err.message : String(err),
                      });
                    }
                  },
                },
              },
              ["Auto-sort queues"]
            ),
          ]),
        ])
      )
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
      mount(queueHost, el("div", { class: "empty-state", text: "No customers in queue." }));
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
              el("th", { text: "Actions" }),
            ]),
          ]),
          el(
            "tbody",
            {},
            state.queues.map((q) =>
              el("tr", {}, [
                el("td", { text: q.customer_name }),
                el("td", { text: String(q.priority_score) }),
                el("td", { text: formatDateTime(q.entered_at) }),
                el("td", {}, [
                  el("span", {
                    class: statusPillClass(q.status),
                    text: statusLabel(q.status),
                  }),
                ]),
                el("td", {}, [
                  q.status === "waiting"
                    ? el(
                        "button",
                        {
                          class: "btn btn--primary btn--sm",
                          attrs: { type: "button" },
                          on: {
                            click: async () => {
                              try {
                                await organizerApi.admit(q.queue_id);
                                await loadQueues();
                              } catch (err) {
                                events.emit("log", {
                                  level: "error",
                                  message:
                                    err instanceof Error
                                      ? err.message
                                      : String(err),
                                });
                              }
                            },
                          },
                        },
                        ["Admit"]
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
        el("div", {
          class: "empty-state",
          text: "Select a concert to view its zones.",
        })
      );
      return;
    }
    if (state.concertZones.length === 0) {
      mount(
        concertZonesHost,
        el("div", { class: "empty-state", text: "No zones for this concert." })
      );
      return;
    }
    mount(
      concertZonesHost,
      el("div", { class: "table-wrap" }, [
        el("table", { class: "table" }, [
          el("thead", {}, [
            el("tr", {}, [
              el("th", { text: "Zone" }),
              el("th", { text: "Price" }),
              el("th", { text: "Available" }),
              el("th", { text: "Status" }),
              el("th", { text: "Actions" }),
            ]),
          ]),
          el(
            "tbody",
            {},
            state.concertZones.map((z) =>
              el("tr", {}, [
                el("td", { text: z.zone_name }),
                el("td", { text: formatBaht(z.price) }),
                el("td", { text: `${z.available_count}/${z.total_seats}` }),
                el("td", {}, [
                  el("span", {
                    class: z.is_active ? "pill pill--ok" : "pill pill--err",
                    text: z.is_active ? "Active" : "Closed",
                  }),
                ]),
                el("td", {}, [
                  z.is_active
                    ? el(
                        "button",
                        {
                          class: "btn btn--danger btn--sm",
                          attrs: { type: "button" },
                          on: {
                            click: async () => {
                              if (
                                !window.confirm(
                                  `Close zone "${z.zone_name}"? This will allow customers to request refunds and cannot be undone.`
                                )
                              ) {
                                return;
                              }
                              try {
                                const r = await organizerApi.closeZone(
                                  z.zone_id
                                );
                                events.emit("log", {
                                  level: "warn",
                                  message: `${r.message} — ${r.affected_bookings} bookings affected`,
                                });
                                await Promise.all([loadZones(), loadDashboard()]);
                              } catch (err) {
                                events.emit("log", {
                                  level: "error",
                                  message:
                                    err instanceof Error
                                      ? err.message
                                      : String(err),
                                });
                              }
                            },
                          },
                        },
                        ["Close zone"]
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
        el("div", {
          class: "empty-state",
          text: "Select a concert to view financials.",
        })
      );
      return;
    }
    const { grand_totals, daily_stats } = state.dashboard;

    const summary = el(
      "div",
      {
        attrs: {
          style:
            "display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:16px;",
        },
      },
      [
        statCard("Total income", formatBaht(grand_totals.total_income)),
        statCard("Total expense", formatBaht(grand_totals.total_expense)),
        statCard(
          "Net profit",
          formatBaht(grand_totals.total_net_profit)
        ),
      ]
    );

    const breakdown =
      daily_stats.length === 0
        ? el("div", {
            class: "empty-state",
            attrs: { style: "margin-top:16px;" },
            text: "No paid transactions or refunds recorded yet.",
          })
        : el(
            "div",
            {
              class: "table-wrap",
              attrs: { style: "margin-top:16px;" },
            },
            [
              el("table", { class: "table" }, [
                el("thead", {}, [
                  el("tr", {}, [
                    el("th", { text: "Date" }),
                    el("th", { text: "Income" }),
                    el("th", { text: "Expense" }),
                    el("th", { text: "Net profit" }),
                  ]),
                ]),
                el(
                  "tbody",
                  {},
                  daily_stats.map((d) =>
                    el("tr", {}, [
                      el("td", { text: d.date }),
                      el("td", { text: formatBaht(d.income) }),
                      el("td", { text: formatBaht(d.expense) }),
                      el("td", {}, [
                        el("span", {
                          class:
                            d.net_profit >= 0
                              ? "pill pill--ok"
                              : "pill pill--err",
                          text: formatBaht(d.net_profit),
                        }),
                      ]),
                    ])
                  )
                ),
              ]),
            ]
          );

    mount(dashboardHost, summary, breakdown);
  };

  // ---------- Concert creation form ----------
  const inputs = {
    title: input("c-title"),
    artist: input("c-artist"),
    venue: input("c-venue"),
    address: input("c-address"),
    concert_datetime: input("c-when", "datetime-local"),
    sale_open_at: input("c-sale-open", "datetime-local"),
    sale_close_at: input("c-sale-close", "datetime-local"),
  };
  const formStatus = el("p", { class: "label-mono label-mono--accent" });

  const addZone = (): void => {
    state.zones.push({
      zone_name: `Zone ${state.zones.length + 1}`,
      price: 1000,
      total_seats: 50,
      rows: 5,
      cols: 10,
    });
    renderZoneDrafts();
  };

  const renderZoneDrafts = (): void => {
    if (state.zones.length === 0) {
      mount(zoneDraftHost, el("div", { class: "empty-state", text: "No zones added yet." }));
      return;
    }
    mount(
      zoneDraftHost,
      ...state.zones.map((z, i) =>
        el("article", { class: "list-item" }, [
          el("div", { class: "form-grid" }, [
            zoneField(`Name`, z.zone_name, (v) => {
              state.zones[i]!.zone_name = v;
            }),
            zoneField(
              `Price (THB)`,
              String(z.price),
              (v) => {
                state.zones[i]!.price = Number(v) || 0;
              },
              "number"
            ),
            zoneField(
              `Rows`,
              String(z.rows),
              (v) => {
                state.zones[i]!.rows = Number(v) || 0;
                state.zones[i]!.total_seats =
                  state.zones[i]!.rows * state.zones[i]!.cols;
              },
              "number"
            ),
            zoneField(
              `Columns`,
              String(z.cols),
              (v) => {
                state.zones[i]!.cols = Number(v) || 0;
                state.zones[i]!.total_seats =
                  state.zones[i]!.rows * state.zones[i]!.cols;
              },
              "number"
            ),
          ]),
          el("div", { class: "form-actions" }, [
            el("span", {
              class: "label-mono",
              text: `Total seats: ${z.rows * z.cols}`,
            }),
            el(
              "button",
              {
                class: "btn btn--ghost btn--sm",
                attrs: { type: "button" },
                on: {
                  click: () => {
                    state.zones.splice(i, 1);
                    renderZoneDrafts();
                  },
                },
              },
              ["Remove"]
            ),
          ]),
        ])
      )
    );
  };

  const submitConcert = async (): Promise<void> => {
    formStatus.textContent = "";
    const payload: CreateConcertPayload = {
      title: inputs.title.value.trim(),
      artist: inputs.artist.value.trim(),
      venue: inputs.venue.value.trim(),
      address: inputs.address.value.trim(),
      concert_datetime: inputs.concert_datetime.value,
      sale_open_at: inputs.sale_open_at.value,
      sale_close_at: inputs.sale_close_at.value,
      zones: state.zones,
    };
    if (
      !payload.title ||
      !payload.artist ||
      !payload.venue ||
      !payload.concert_datetime ||
      payload.zones.length === 0
    ) {
      formStatus.textContent = "Provide title, artist, venue, datetime, and at least one zone.";
      return;
    }
    try {
      const r = await organizerApi.createConcert(payload);
      formStatus.textContent = `${r.message} (concert #${r.concert_id})`;
      state.zones = [];
      renderZoneDrafts();
      await refreshConcerts();
    } catch (err) {
      formStatus.textContent =
        err instanceof Error ? err.message : "Could not create concert.";
    }
  };

  void refreshConcerts();
  renderZoneDrafts();
  renderQueues();
  renderConcertZones();
  renderDashboard();

  return el("section", { class: "section" }, [
    el("div", { class: "container" }, [
      el("p", { class: "label-mono", text: "Organizer / Control room" }),
      el("h2", { text: "Operations." }),
      el("div", { attrs: { style: "display:grid; gap:32px; margin-top:24px;" } }, [
        el("section", { class: "card" }, [
          el("div", { class: "card__header" }, [
            el("h3", { text: "Create concert" }),
            el("span", { class: "label-mono", text: "01 / Setup" }),
          ]),
          el("div", { class: "form-grid" }, [
            field("c-title", "Title", inputs.title),
            field("c-artist", "Artist", inputs.artist),
            field("c-venue", "Venue", inputs.venue),
            field("c-address", "Address", inputs.address),
            field("c-when", "Concert datetime", inputs.concert_datetime),
            field("c-sale-open", "Sale opens", inputs.sale_open_at),
            field("c-sale-close", "Sale closes", inputs.sale_close_at),
          ]),
          el("h3", { attrs: { style: "margin-top:24px;" }, text: "Zones" }),
          zoneDraftHost,
          el("div", { class: "form-actions" }, [
            el(
              "button",
              {
                class: "btn btn--secondary",
                attrs: { type: "button" },
                on: { click: addZone },
              },
              ["+ Add zone"]
            ),
            el(
              "button",
              {
                class: "btn btn--primary",
                attrs: { type: "button" },
                on: { click: () => void submitConcert() },
              },
              ["Create concert"]
            ),
          ]),
          formStatus,
        ]),
        el("section", { class: "card" }, [
          el("div", { class: "card__header" }, [
            el("h3", { text: "Concerts" }),
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
          concertListHost,
        ]),
        el("section", { class: "card" }, [
          el("div", { class: "card__header" }, [
            el("h3", { text: "Queue" }),
            el(
              "button",
              {
                class: "btn btn--ghost btn--sm",
                attrs: { type: "button" },
                on: { click: () => void loadQueues() },
              },
              ["Reload"]
            ),
          ]),
          queueHost,
        ]),
        el("section", { class: "card" }, [
          el("div", { class: "card__header" }, [
            el("h3", { text: "Zones" }),
            el(
              "button",
              {
                class: "btn btn--ghost btn--sm",
                attrs: { type: "button" },
                on: { click: () => void loadZones() },
              },
              ["Reload"]
            ),
          ]),
          concertZonesHost,
        ]),
        el("section", { class: "card" }, [
          el("div", { class: "card__header" }, [
            el("h3", { text: "Financial dashboard" }),
            el(
              "button",
              {
                class: "btn btn--ghost btn--sm",
                attrs: { type: "button" },
                on: { click: () => void loadDashboard() },
              },
              ["Reload"]
            ),
          ]),
          dashboardHost,
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
    on: {
      input: (e) => onChange((e.target as HTMLInputElement).value),
    },
  });
  return el("div", { class: "field" }, [
    el("label", { class: "field__label", text: label }),
    ctrl,
  ]);
}

function statCard(label: string, value: string): HTMLElement {
  return el("div", { class: "card stat" }, [
    el("span", { class: "stat__value", text: value }),
    el("span", { class: "label-mono label-mono--accent", text: label }),
  ]);
}
