import { el, mount, clear } from "../utils/dom";
import { formatDateTime } from "../utils/format";
import { bookingApi } from "../api/booking";

export function renderMyTicketsView(): HTMLElement {
  const alertsHost = el("div", { attrs: { style: "margin-bottom: 32px;" } });
  const ticketListHost = el("div", { attrs: { style: "display: flex; flex-direction: column; gap: 32px;" } });

  const container = el("div", { class: "coastal-page" }, [
    el("div", { attrs: { style: "max-width: 960px; margin: 0 auto;" } }, [
      
      // ── Alerts (Zone Closure, etc.) ──
      alertsHost,

      // ── Header & Tabs ──
      el("div", { class: "selection-header", attrs: { style: "margin-bottom: 40px; align-items: flex-end;" } }, [
        el("div", {}, [
          el("span", { class: "label-mono", text: "USER / ASSETS" }),
          el("h1", { class: "coastal-title", attrs: { style: "margin: 8px 0 0 0;" }, text: "My Tickets" }),
        ]),
        el("div", { attrs: { style: "display: flex; gap: 12px;" } }, [
          el("button", {
            class: "btn btn--primary btn--sm",
            text: "ACTIVE"
          }),
          el("button", {
            class: "btn btn--ghost btn--sm",
            text: "PAST"
          })
        ])
      ]),

      // ── Ticket List ──
      ticketListHost,

      // ── Help Footer ──
      el("div", { class: "card card--dark", attrs: { style: "display: flex; justify-content: space-between; align-items: center; margin-top: 64px;" } }, [
        el("div", {}, [
          el("h3", { class: "card__title", attrs: { style: "margin-bottom: 8px;" }, text: "Need help with your tickets?" }),
          el("p", { attrs: { style: "color: rgba(255,255,255,0.6); font-size: 14px;" }, text: "Our support team is available 24/7 for any inquiries." })
        ]),
        el("button", { class: "btn btn--dark", attrs: { style: "background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2);" }, text: "CONTACT SUPPORT" })
      ])
      
    ])
  ]);

  const loadTickets = async () => {
    try {
      const bookings = await bookingApi.myBookings();
      clear(ticketListHost);
      clear(alertsHost);

      if (bookings.length === 0) {
        mount(ticketListHost,
          el("div", { class: "empty-cart", text: "NO TICKETS YET." })
        );
        return;
      }

      // Check for alerts (e.g. Zone closed)
      const closedBookings = bookings.filter(b => b.status === "zone_closed_action_required");
      if (closedBookings.length > 0) {
        mount(alertsHost, ...closedBookings.map(b => renderZoneClosureAlert(b)));
      }

      // Render all tickets
      mount(ticketListHost, ...bookings.map(b => {
        const isClosed = b.status === "zone_closed_action_required";
        
        return el("article", { class: "ticket-card-v2", attrs: { style: isClosed ? "opacity: 0.6;" : "" } }, [
          // ── Left: Info Section ──
          el("div", { class: "ticket-card-v2__info" }, [
            
            // Status Badge & Ticket ID
            el("div", { attrs: { style: "display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px;" } }, [
              el("div", { attrs: { style: "display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; background: rgba(170, 214, 250, 0.15); border: 1px solid var(--color-primary-blue); border-radius: var(--radius-control);" } }, [
                el("div", { attrs: { style: "width: 6px; height: 6px; background: var(--color-primary-blue); border-radius: 50%;" } }),
                el("span", { class: "label-mono", attrs: { style: "color: var(--color-primary-blue); font-size: 9px;" }, text: isClosed ? "ACTION REQUIRED" : "VALID TICKET" })
              ]),
              el("span", { class: "label-mono", attrs: { style: "color: var(--color-text-muted); font-size: 10px;" }, text: `TKT-${b.booking_id}` })
            ]),

            // Concert Title
            el("h2", { class: "ticket-card-v2__title", attrs: { style: "margin-bottom: 32px;" }, text: b.concert_title }),

            // 2x2 Info Grid
            el("div", { class: "ticket-card-v2__grid" }, [
              ticketField("DATE & TIME", formatDateTime(b.event_date ?? b.created_at)),
              ticketField("LOCATION", b.venue ?? "MAIN AUDITORIUM"),
              ticketField("SEAT", b.seat_label ?? `${b.total_tickets}`),
              ticketField("ZONE", b.zone ?? b.status.toUpperCase())
            ])
          ]),

          // ── Right: QR & Actions Section ──
          el("div", { class: "ticket-card-v2__qr-area" }, [
            el("div", { class: "qr-box" }, [
              el("img", {
                attrs: {
                  src: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=TKT-${b.booking_id}`,
                  alt: `QR code for ticket ${b.booking_id}`,
                  style: "width: 100%; height: 100%; display: block; opacity: 0.9;"
                }
              })
            ]),

            el("div", { attrs: { style: "display: flex; gap: 12px; width: 100%;" } }, [
              el("button", { class: "btn-outline-sm", attrs: { style: "flex: 1;" }, text: "PDF" }),
              el("button", { class: "btn-outline-sm", attrs: { style: "flex: 1;" }, text: "SHARE" })
            ]),

            el("span", {
              class: "label-mono",
              attrs: { style: "color: var(--color-primary-blue); cursor: pointer; margin-top: 16px;", tabindex: "0" },
              text: "PREVIEW SCANNER ›"
            })
          ])
        ]);
      }));

    } catch (err) {
      console.error("Failed to load tickets:", err);
      clear(ticketListHost);
      mount(ticketListHost, el("div", { class: "banner banner--err", text: "Could not load tickets. Please try again." }));
    }
  };

  loadTickets();
  return container;
}

// ── Helper UI Components ──

function ticketField(label: string, value: string): HTMLElement {
  return el("div", {}, [
    el("span", { class: "label-mono", attrs: { style: "font-size: 9px; color: var(--color-text-muted); display: block; margin-bottom: 6px;" }, text: label }),
    el("p", { attrs: { style: "font-size: 18px; font-weight: 500; color: var(--color-midnight);" }, text: value })
  ]);
}

function renderZoneClosureAlert(b: any): HTMLElement {
  return el("div", { attrs: { style: "margin-bottom: 24px; padding: 24px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: var(--radius-container);" } }, [
    el("div", { attrs: { style: "display: flex; gap: 16px; margin-bottom: 24px; align-items: flex-start;" } }, [
      el("div", { attrs: { style: "width: 48px; height: 48px; background: #FEE2E2; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #DC2626; font-size: 24px; flex-shrink: 0;" }, text: "!" }),
      el("div", {}, [
        el("h4", { attrs: { style: "font-weight: 500; color: #7F1D1D; font-size: 16px; margin-bottom: 4px;" }, text: `Zone Closed: ${b.zone || "Unknown"}` }),
        el("p", { attrs: { style: "font-size: 14px; color: #991B1B; line-height: 1.5;" }, text: "The organizer has closed this zone due to low demand. Please choose how you would like to proceed." })
      ])
    ]),
    el("div", { attrs: { style: "display: flex; gap: 16px; flex-wrap: wrap;" } }, [
      el("button", { class: "btn btn--primary", attrs: { style: "background: #DC2626; color: white;" }, text: "FULL REFUND" }),
      el("button", { class: "btn btn--secondary", attrs: { style: "border-color: #FECACA; color: #DC2626; background: transparent;" }, text: "RELOCATE TO DIFFERENT ZONE" })
    ])
  ]);
}