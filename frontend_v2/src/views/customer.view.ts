import { bookingApi } from "../api/booking";
import type { Concert } from "../api/types";
import { authStore } from "../state/auth";
import { events } from "../state/events";
import { router } from "../router";
import { clear, el, mount } from "../utils/dom";
import { formatDateTime, statusLabel } from "../utils/format";

interface CustomerState {
  concerts: Concert[];
}

export function renderCustomerDashboard(): HTMLElement {
  if (!authStore.isAuthenticated()) {
    router.navigate("/login");
    return el("div");
  }

  const state: CustomerState = {
    concerts: [],
  };

  // โฮสต์สำหรับแสดง Grid คอนเสิร์ต
  const concertsHost = el("div", { class: "card-grid-layout" });

  const refreshConcerts = async (): Promise<void> => {
    try {
      state.concerts = await bookingApi.listConcerts();
      renderConcerts();
    } catch (err) {
      events.emit("log", { level: "error", message: String(err) });
    }
  };

  const renderConcerts = (): void => {
    clear(concertsHost);
    if (state.concerts.length === 0) {
      mount(concertsHost, el("div", { class: "empty-cart", text: "NO CONCERTS AVAILABLE." }));
      return;
    }

    mount(
      concertsHost,
      ...state.concerts.map((c) => {
        // จัดการสีของสถานะคอนเสิร์ต
        const statusStr = String(c.status).toLowerCase();
        let statusClass = "pill--muted";
        
        if (statusStr === "upcoming") {
          statusClass = "pill--ok";
        } else if (statusStr === "on_sale" || statusStr === "on sale") {
          statusClass = "pill--warn";
        }

        return el(
          "article",
          { class: "ticket-card" },
          [
            // 1. Image Header
            el("img", { 
              class: "ticket-card__img",
              // ใช้รูปจาก DB ถ้ามี โดยเติม / ข้างหน้าเพื่อให้ชี้ไปที่ Proxy (localhost:5173/database/image/...)
              attrs: { src: c.image_url ? `/${c.image_url}` : `https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=500&q=80` } 
            }),

            // 2. Content Body
            el("div", { class: "ticket-card__content" }, [
              el("span", { 
                class: `pill ${statusClass}`, 
                attrs: { style: "margin-bottom: 12px; width: fit-content;" }, 
                text: statusLabel(c.status).toUpperCase() 
              }),
              el("h3", { class: "ticket-card__title", text: c.title }),
              
              // Date Info
              el("div", { class: "ticket-card__info" }, [
                el("span", { class: "ticket-card__info-icon", text: "🗓️" }),
                el("span", { class: "ticket-card__info-value", text: formatDateTime(c.concert_datetime) })
              ]),

              // Venue Info
              el("div", { class: "ticket-card__info" }, [
                el("span", { class: "ticket-card__info-icon", text: "📍" }),
                el("span", { class: "ticket-card__info-value", text: c.venue })
              ]),

              // Artist Info
              el("div", { class: "ticket-card__info" }, [
                el("span", { class: "ticket-card__info-icon", text: "🎤" }),
                el("span", { class: "ticket-card__info-label", text: "Artist:" }),
                el("span", { class: "ticket-card__info-value", text: c.artist })
              ]),

              // Book Button (คลิกแล้วเด้งไปหน้าถัดไปทันที)
              el(
                "button",
                {
                  class: "btn-book-now",
                  on: {
                    click: async () => {
                      const isOnSale = statusStr === "on_sale" || statusStr === "on sale";
                      
                      if (isOnSale) {
                        try {
                          // ถ้ากำลัง On Sale ให้ดึงเข้าคิว แล้วเด้งไปหน้า Waiting Room
                          const r = await bookingApi.joinQueue(c.concert_id);
                          events.emit("log", { level: "info", message: r.message });
                          router.navigate(`/waiting?concertId=${c.concert_id}`);
                        } catch (err) {
                          events.emit("log", { level: "error", message: String(err) });
                          // ถึงจะมี Error (เช่น อยู่ในคิวแล้ว) ก็ให้เข้าไปหน้า Waiting Room อยู่ดี
                          router.navigate(`/waiting?concertId=${c.concert_id}`);
                        }
                      } else {
                        // ถ้าเป็นสถานะอื่น (เช่น Upcoming) เด้งไปหน้า Zones เพื่อดูผังโซนเฉยๆ ได้
                        router.navigate(`/zones?concertId=${c.concert_id}`);
                      }
                    },
                  },
                },
                ["BOOK SEATS →"]
              ),
            ]),
          ]
        );
      })
    );
  };

  void refreshConcerts();

  return el("div", { class: "coastal-page" }, [
    el("div", { attrs: { style: "max-width: 1200px; margin: 0 auto;" } }, [
      
      // ── Navbar / Tabs (Events & My Tickets) ──
      el("div", { class: "selection-header", attrs: { style: "margin-bottom: 40px; align-items: flex-end;" } }, [
        el("div", {}, [
          el("span", { class: "label-mono", text: "CUSTOMER / PORTAL" }),
          el("h1", { class: "coastal-title", attrs: { style: "margin: 8px 0 0 0;" }, text: "Discover Events" }),
        ]),
        el("div", { attrs: { style: "display: flex; gap: 12px;" } }, [
          el("button", {
            class: "btn btn--primary btn--sm",
            text: "EVENTS" // ปุ่ม Active
          }),
          el("button", {
            class: "btn btn--ghost btn--sm",
            on: { click: () => router.navigate("/my-tickets") }, // กดปุ๊ป สลับไปไฟล์ MyTicketsView.ts
            text: "MY TICKETS"
          })
        ])
      ]),

      // ── Concerts Grid ──
      concertsHost,

    ])
  ]);
}