import { el, mount, clear } from "../utils/dom";
import { formatDateTime } from "../utils/format";
import { bookingApi } from "../api/booking";
import { router } from "../router-instance";

const ZONE_CLOSED = "zone_closed_action_required";
const REFUND_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function parseAsUtc(s: string | null | undefined): number {
  if (!s) return NaN;
  const hasOffset = /[zZ]|[+-]\d{2}:?\d{2}$/.test(s);
  return new Date(hasOffset ? s : `${s}Z`).getTime();
}

export function renderMyTicketsView(): HTMLElement {
  // ── 🛠️ ปรับพื้นหลังของหน้าเพจให้เป็นสีขาว ──
  const container = el("div", { 
    class: "bg-tickets-page", 
    attrs: { style: "background: #FFFFFF;\] min-height: 100vh;" } 
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
          el("div", { class: "ticket-card-v2__info", attrs: { style: "position: relative; background: #FFFFFF;" } }, [
            
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
              renderDetailItem("DATE & TIME", formatDateTime(t.booking.concert_datetime ?? t.booking.created_at)),
              renderDetailItem("LOCATION", t.booking.venue ?? "MAIN AUDITORIUM"),
              renderDetailItem("SEAT", t.seat_number),
              renderDetailItem("ZONE", t.zone_name)
            ])
          ]),

          // ── ฝั่ง QR Code หรือ Action ──
          t.booking.status === ZONE_CLOSED
            ? renderZoneClosedActions(t.booking.booking_id, t.booking.concert_id)
            : el("div", {
                class: "ticket-card-v2__qr-area",
                attrs: { style: "background: #AAD6FA; border-left: 1px dashed var(--color-border);" }
              }, [
                el("div", { class: "qr-box", attrs: { style: "background: #FFFFFF; box-shadow: none; border: 1px solid var(--color-border);" } }, [
                  el("img", {
                    attrs: {
                      src: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${t.qr_hash}`,
                      alt: "Verification QR",
                      style: "width: 100%; height: 100%;"
                    }
                  })
                ]),

                el("div", { attrs: { style: "display: flex; gap: 12px; margin-bottom: 16px; width: 100%;" } }, [
                  el("button", {
                    class: "btn-outline-sm",
                    attrs: { style: "flex: 1;" },
                    text: "DOWNLOAD",
                    on: { click: () => downloadTicket(t) }
                  }),
                  el("button", { class: "btn-outline-sm", attrs: { style: "flex: 1;" }, text: "SHARE" })
                ]),

                ...(isRefundEligible(t.booking)
                  ? [renderRequestRefundButton(t.booking.booking_id, t.booking.total_tickets)]
                  : []),

                el("span", {
                  class: "label-mono",
                  attrs: { style: "color: #6f5e4e; font-size: 10px; cursor: pointer;" },
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

  async function downloadTicket(ticket: any) {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${ticket.qr_hash}`;
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TICKET-${ticket.booking.concert_title.replace(/\s+/g, '-')}-${ticket.seat_number}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Download failed", err);
      alert("Failed to download ticket. Please try again.");
    }
  }

  function renderDetailItem(label: string, value: string) {
    return el("div", {}, [
      el("label", { class: "label-mono", attrs: { style: "display: block; margin-bottom: 4px; opacity: 0.5;" }, text: label }),
      el("p", { attrs: { style: "font-size: 16px; font-weight: 500; color: var(--color-midnight);" }, text: value })
    ]);
  }

  function renderZoneClosedActions(
    bookingId: number,
    concertId: number
  ): HTMLElement {
    const refundBtn = el("button", {
      class: "btn btn--primary btn--block",
      attrs: { style: "padding: 12px;" },
      text: "REQUEST REFUND",
    }) as HTMLButtonElement;

    const upgradeBtn = el("button", {
      class: "btn btn--ghost btn--block",
      attrs: { style: "padding: 12px;" },
      text: "UPGRADE SEAT",
    }) as HTMLButtonElement;

    // ── 🛠️ เปลี่ยนให้ Navigate ไปหน้า Refund แทนการใช้ window.prompt ──
    refundBtn.addEventListener("click", () => {
      router.navigate(`/refund?bookingId=${bookingId}&isVoucher=true`);
    });

    upgradeBtn.addEventListener("click", () => {
      if (!window.confirm("Pick new seats for free in another zone?")) return;
      router.navigate(`/zones?concertId=${concertId}&rebookBookingId=${bookingId}`);
    });

    return el("div", {
      class: "ticket-card-v2__qr-area",
      attrs: { style: "background: #FFFFFF; border-left: 1px dashed var(--color-border); display: flex; flex-direction: column; justify-content: center; gap: 16px; padding: 24px;" }
    }, [
      el("div", {
        class: "banner banner--err",
        attrs: { style: "padding: 12px; font-size: 13px; line-height: 1.4;" },
        text: "This zone has been closed by the organizer. Please choose an option below."
      }),
      refundBtn,
      upgradeBtn,
    ]);
  }

  function isRefundEligible(booking: { status: string; created_at: string | null }): boolean {
    if (booking.status !== "paid") return false;
    const paidAt = parseAsUtc(booking.created_at);
    if (isNaN(paidAt)) return false;
    return Date.now() - paidAt <= REFUND_WINDOW_MS;
  }

  function renderRequestRefundButton(
    bookingId: number,
    totalTickets: number
  ): HTMLElement {
    const isMulti = totalTickets > 1;
    const label = isMulti ? "REFUND ENTIRE BOOKING" : "REQUEST REFUND";
    const btn = el("button", {
      class: "btn btn--ghost btn--block",
      attrs: { style: "padding: 10px; margin-bottom: 12px; color: var(--color-danger); border-color: var(--color-danger);" },
      text: label,
    }) as HTMLButtonElement;

    // ── 🛠️ เปลี่ยนให้ Navigate ไปหน้า Refund แทนการใช้ window.prompt ──
    btn.addEventListener("click", () => {
      router.navigate(`/refund?bookingId=${bookingId}&isVoucher=false`);
    });

    return btn;
  }

  loadTickets();
  return container;
}