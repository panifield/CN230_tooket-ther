import { el, mount, clear } from "../utils/dom";
import { formatDateTime } from "../utils/format";
import { bookingApi } from "../api/booking";

export function renderMyTicketsView(): HTMLElement {
  // ── 🛠️ ปรับพื้นหลังของหน้าเพจให้เป็นสีขาว ──
  const container = el("div", { 
    class: "bg-tickets-page", 
    attrs: { style: "background: #FFFFFF; min-height: 100vh;" } 
  }, [
    el("div", {
      attrs: { style: "max-width: 1000px; margin: 0 auto; padding: 64px 24px;" }
    }, [

      // ── Header Section ──
      el("header", { class: "selection-header", attrs: { style: "margin-bottom: 48px;" } }, [
        el("div", {}, [
          el("p", { class: "label-mono", attrs: { style: "color: var(--color-primary-blue); margin-bottom: 8px;" }, text: "USER / ASSETS" }),
          el("h1", { class: "concert-title", text: "My Tickets" })
        ]),
        el("div", { attrs: { style: "display: flex; gap: 8px;" } }, [
          el("button", { class: "btn btn--primary btn--sm", text: "ACTIVE" }),
          el("button", { class: "btn btn--ghost btn--sm", text: "PAST" })
        ])
      ]),

      // ── Ticket List Host ──
      el("div", { id: "ticket-list-host", attrs: { style: "display: flex; flex-direction: column; gap: 32px;" } })
    ])
  ]);

  const loadTickets = async () => {
    const host = container.querySelector("#ticket-list-host") as HTMLElement;
    if (!host) return;

    try {
      const bookings = await bookingApi.myBookings();
      clear(host);

      if (bookings.length === 0) {
        mount(host, el("div", { class: "empty-cart", text: "NO ACTIVE ASSETS FOUND." }));
        return;
      }

      // Fetch tickets for all bookings in parallel
      const ticketGroups = await Promise.all(
        bookings.map(async (b) => {
          try {
            const tickets = await bookingApi.getBookingTickets(b.booking_id);
            return tickets.map(t => ({ ...t, booking: b }));
          } catch (e) {
            console.error(`Failed to fetch tickets for booking ${b.booking_id}`, e);
            return [];
          }
        })
      );

      const allTickets = ticketGroups.flat();

      if (allTickets.length === 0) {
        mount(host, el("div", { class: "empty-cart", text: "NO TICKETS FOUND." }));
        return;
      }

      mount(host, ...allTickets.map(t =>
        el("article", { class: "ticket-card-v2", attrs: { style: "background: #FFFFFF; border: 1px solid var(--color-border);" } }, [
          
          // ── ฝั่งข้อมูล (ซ้าย) ──
          el("div", { class: "ticket-card-v2__info", attrs: { style: "position: relative; background: #def6ff;" } }, [
            
            // ── วงกลมรอยฉีกสีขาว ──
            el("div", { 
              attrs: { 
                style: "position: absolute; top: -14px; right: -14px; width: 28px; height: 28px; background: #FFFFFF; border-radius: 50%; z-index: 10;" 
              } 
            }),
            el("div", { 
              attrs: { 
                style: "position: absolute; bottom: -14px; right: -14px; width: 28px; height: 28px; background: #FFFFFF; border-radius: 50%; z-index: 10;" 
              } 
            }),

            // Status Badge
            el("div", { attrs: { style: "display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;" } }, [
              el("span", { class: `pill ${t.booking.status === 'paid' ? 'pill--ok' : 'pill--warn'}` }, [
                el("span", { attrs: { style: "display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--color-midnight); margin-right: 8px; vertical-align: middle;" } }),
                document.createTextNode(t.booking.status.toUpperCase())
              ]),
              el("span", { class: "label-mono", attrs: { style: "opacity: 0.3;" }, text: `TKT-${t.ticket_id}` })
            ]),

            el("h2", { class: "ticket-card-v2__title", text: t.booking.concert_title }),

            el("div", { class: "ticket-card-v2__grid" }, [
              renderDetailItem("DATE & TIME", formatDateTime(t.booking.event_date ?? t.booking.created_at)),
              renderDetailItem("LOCATION", t.booking.venue ?? "MAIN AUDITORIUM"),
              renderDetailItem("SEAT", t.seat_number),
              renderDetailItem("ZONE", t.zone_name)
            ])
          ]),

          // ── ฝั่ง QR Code (ขวา) ──
          el("div", { 
            class: "ticket-card-v2__qr-area", 
            attrs: { style: "background: #FFFFFF; border-left: 1px dashed var(--color-border);" } 
          }, [
            el("div", { class: "qr-box", attrs: { style: "background: #FFFFFF; box-shadow: none; border: 1px solid var(--color-border);" } }, [
              el("img", {
                attrs: {
                  // ใช้ hash จริงจาก backend
                  src: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${t.qr_hash}`,
                  alt: "Verification QR",
                  style: "width: 100%; height: 100%;"
                }
              })
            ]),

            el("div", { attrs: { style: "display: flex; gap: 12px; margin-bottom: 16px; width: 100%;" } }, [
              el("button", { class: "btn-outline-sm", attrs: { style: "flex: 1;" }, text: "PDF" }),
              el("button", { class: "btn-outline-sm", attrs: { style: "flex: 1;" }, text: "SHARE" })
            ]),

            el("span", {
              class: "label-mono",
              attrs: { style: "color: var(--color-primary-blue); font-size: 10px; cursor: pointer;" },
              text: "PREVIEW SCANNER ›"
            })
          ])
        ])
      ));

    } catch (err) {
      clear(host);
      mount(host, el("p", { class: "banner banner--err", text: "SYSTEM ERROR: Failed to retrieve assets." }));
    }
  };

  function renderDetailItem(label: string, value: string) {
    return el("div", {}, [
      el("label", { class: "label-mono", attrs: { style: "display: block; margin-bottom: 4px; opacity: 0.5;" }, text: label }),
      el("p", { attrs: { style: "font-size: 16px; font-weight: 500; color: var(--color-midnight);" }, text: value })
    ]);
  }

  loadTickets();
  return container;
}