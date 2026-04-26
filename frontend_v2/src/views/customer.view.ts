import { bookingApi } from "../api/booking";
import type { Concert, Zone } from "../api/types";
import { authStore } from "../state/auth";
import { events } from "../state/events";
import { router } from "../router";
import { clear, el, mount } from "../utils/dom";
import { formatDateTime, statusLabel, formatBaht } from "../utils/format";
import { openModal } from "../components/modal";

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

  const concertsHost = el("div", { 
    attrs: { style: "display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 32px;" } 
  });

  const refreshConcerts = async (): Promise<void> => {
    try {
      state.concerts = await bookingApi.listConcerts();
      renderConcerts();
    } catch (err) {
      events.emit("log", { level: "error", message: String(err) });
    }
  };

  const showConcertDetails = async (c: Concert) => {
    let zones: Zone[] = [];
    try {
      zones = await bookingApi.listZones(c.concert_id);
    } catch (err) {
      events.emit("log", { level: "error", message: "Failed to load zones info" });
    }

    const zonesHost = el("div", { attrs: { style: "margin-top: 16px;" } });
    
    if (zones.length === 0) {
      mount(zonesHost, el("p", { class: "label-mono", attrs: { style: "opacity: 0.6;" }, text: "No zone information available." }));
    } else {
      mount(zonesHost, el("div", { attrs: { style: "display: flex; flex-direction: column; gap: 8px;" } }, [
        el("div", { attrs: { style: "display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 16px; padding-bottom: 8px; border-bottom: 1px solid rgba(0,0,0,0.1); font-family: 'PP Neue Montreal Mono', monospace; font-size: 10px; color: #967E67;" } }, [
          el("span", { text: "ZONE" }),
          el("span", { text: "PRICE" }),
          el("span", { text: "AVAILABLE" }),
        ]),
        ...zones.map(z => el("div", { attrs: { style: "display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 16px; padding: 12px 0; border-bottom: 1px solid rgba(0,0,0,0.05); font-family: 'The Future', sans-serif; font-size: 14px;" } }, [
          el("span", { attrs: { style: "font-weight: 500;" }, text: z.zone_name }),
          el("span", { text: formatBaht(z.price) }),
          el("span", { 
            attrs: { style: z.available_count === 0 ? "color: #ef4444;" : "color: #010120;" }, 
            text: `${z.available_count} / ${z.total_seats}` 
          }),
        ]))
      ]));
    }

    const body = el("div", { attrs: { style: "display: flex; flex-direction: column; gap: 24px;" } }, [
      el("img", {
        attrs: { 
          src: c.image_url ? `/${c.image_url}` : `https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80`,
          style: "width: 100%; height: 240px; object-fit: cover; border-radius: 8px;"
        }
      }),
      el("div", {}, [
        el("div", { attrs: { style: "display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;" } }, [
          modalInfoRow("🎤", "ARTIST", c.artist),
          modalInfoRow("🗓️", "DATE", formatDateTime(c.concert_datetime)),
          modalInfoRow("📍", "VENUE", c.venue),
        ]),
        el("div", { attrs: { style: "margin-top: 32px;" } }, [
          el("h4", { class: "label-mono", attrs: { style: "margin-bottom: 16px; color: #010120;" }, text: "TICKET ZONES" }),
          zonesHost
        ]),
        el("div", { attrs: { style: "margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(0,0,0,0.08);" } }, [
          el("button", {
            class: "btn btn--primary btn--block",
            attrs: { style: "padding: 16px; font-family: 'The Future', sans-serif; font-size: 14px;" },
            text: "CONTINUE TO BOOKING"
          })
        ])
      ])
    ]);

    const close = openModal({ title: c.title, body: body });
    const continueBtn = body.querySelector(".btn--primary") as HTMLElement;
    if (continueBtn) {
      continueBtn.onclick = () => { close(); handleBooking(c); };
    }
  };

  const handleBooking = async (c: Concert) => {
    const statusStr = String(c.status).toLowerCase();
    const isOnSale = statusStr === "on_sale" || statusStr === "on sale";
    
    if (isOnSale) {
      try {
        const r = await bookingApi.joinQueue(c.concert_id);
        events.emit("log", { level: "info", message: r.message });
        router.navigate(`/waiting?concertId=${c.concert_id}`);
      } catch (err) {
        events.emit("log", { level: "error", message: String(err) });
        router.navigate(`/waiting?concertId=${c.concert_id}`);
      }
    } else {
      router.navigate(`/zones?concertId=${c.concert_id}`);
    }
  };

  const renderConcerts = (): void => {
    clear(concertsHost);
    if (state.concerts.length === 0) {
      mount(concertsHost, el("div", { attrs: { style: "padding: 64px 0; text-align: center; color: rgba(1,1,32,0.4); font-family: 'The Future', sans-serif;" } }, ["NO CONCERTS AVAILABLE."]));
      return;
    }

    mount(
      concertsHost,
      ...state.concerts.map((c) => {
        const statusStr = String(c.status).toLowerCase();
        let statusBg = "background: rgba(255,255,255,0.9); color: #010120;";
        if (statusStr === "upcoming") statusBg = "background: #AAD6FA; color: #010120;";
        else if (statusStr === "on_sale" || statusStr === "on sale") statusBg = "background: #010120; color: #FFFFFF;";

        const card = el("article", { 
          attrs: { style: "background: #FFFFFF; border: 1px solid rgba(0,0,0,0.08); border-radius: 8px; overflow: hidden; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); display: flex; flex-direction: column; cursor: pointer;" },
          on: {
            mouseenter: (e: Event) => {
              const target = e.currentTarget as HTMLElement;
              target.style.transform = "translateY(-4px)";
              target.style.boxShadow = "0 20px 40px rgba(1, 1, 32, 0.08)";
              
              const img = target.querySelector("img");
              if (img) img.style.transform = "scale(1.05)";
              
              // ── 🛠️ เปลี่ยนสีชื่อคอนเสิร์ตเป็น Baby Blue ตอน Hover ──
              const title = target.querySelector("h3");
              if (title) title.style.color = "#AAD6FA";
            },
            mouseleave: (e: Event) => {
              const target = e.currentTarget as HTMLElement;
              target.style.transform = "none";
              target.style.boxShadow = "none";
              
              const img = target.querySelector("img");
              if (img) img.style.transform = "scale(1)";
              
              // ── 🛠️ คืนสีกลับเป็น Midnight (Dark Blue) เมื่อเอาเมาส์ออก ──
              const title = target.querySelector("h3");
              if (title) title.style.color = "#010120";
            }
          }
        }, [
          // Image Area
          el("div", { attrs: { style: "aspect-ratio: 4/3; overflow: hidden; position: relative;" } }, [
            el("img", { 
              attrs: { 
                src: c.image_url ? `/${c.image_url}` : `https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=500&q=80`,
                style: "width: 100%; height: 100%; object-fit: cover; transition: transform 0.7s ease;"
              } 
            }),
            // Status Badge
            el("div", { 
              class: "label-mono", 
              attrs: { style: `position: absolute; top: 16px; right: 16px; padding: 6px 12px; border-radius: 4px; font-size: 10px; font-weight: bold; backdrop-filter: blur(4px); ${statusBg}` } 
            }, [statusLabel(c.status).toUpperCase()])
          ]),

          // Content Area
          el("div", { attrs: { style: "padding: 24px; display: flex; flex-direction: column; flex-grow: 1;" } }, [
            // ── 🛠️ เพิ่ม transition ให้ h3 เฟดสีแบบนุ่มนวล ──
            el("h3", { attrs: { style: "font-family: 'The Future', sans-serif; font-size: 20px; color: #010120; margin: 0 0 16px 0; line-height: 1.3; transition: color 0.3s ease;" } }, [c.title]),
            
            el("div", { attrs: { style: "display: flex; flex-direction: column; gap: 8px; margin-bottom: 32px;" } }, [
              cardInfoRow("🗓️", formatDateTime(c.concert_datetime)),
              cardInfoRow("📍", c.venue),
              cardInfoRow("🎤", c.artist),
            ]),

            el("div", { attrs: { style: "margin-top: auto; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;" } }, [
              el("button", {
                attrs: { style: "padding: 12px; background: transparent; border: 1px solid rgba(0,0,0,0.1); border-radius: 4px; font-family: 'The Future', sans-serif; font-size: 12px; font-weight: 500; color: #010120; cursor: pointer; transition: all 0.2s;" },
                on: {
                  click: (e: Event) => { e.stopPropagation(); showConcertDetails(c); },
                  mouseenter: (e: Event) => (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.02)",
                  mouseleave: (e: Event) => (e.currentTarget as HTMLElement).style.background = "transparent"
                }
              }, ["DETAILS"]),
              el("button", {
                attrs: { style: "padding: 12px; background: #010120; border: none; border-radius: 4px; font-family: 'The Future', sans-serif; font-size: 12px; font-weight: 500; color: #FFFFFF; cursor: pointer; transition: all 0.2s;" },
                on: {
                  click: (e: Event) => { e.stopPropagation(); handleBooking(c); },
                  mouseenter: (e: Event) => (e.currentTarget as HTMLElement).style.opacity = "0.9",
                  mouseleave: (e: Event) => (e.currentTarget as HTMLElement).style.opacity = "1"
                }
              }, ["BOOK SEATS →"]),
            ]),
          ]),
        ]);

        return card;
      })
    );
  };

  void refreshConcerts();

  return el("div", { attrs: { style: "padding: 64px 24px; min-height: 100vh;" } }, [
    el("div", { attrs: { style: "max-width: 1200px; margin: 0 auto;" } }, [
      
      el("div", { attrs: { style: "margin-bottom: 48px;" } }, [
        el("span", { class: "label-mono", attrs: { style: "color: #AAD6FA; display: block; margin-bottom: 16px;" } }, ["CURATED / SELECTION"]),
        el("h1", { attrs: { style: "font-family: 'The Future', sans-serif; font-size: clamp(32px, 5vw, 48px); margin: 0; color: #010120; letter-spacing: -0.8px;" } }, ["Featured Experiences"]),
      ]),

      concertsHost,

    ])
  ]);
}

// ── Helpers ──
function cardInfoRow(icon: string, text: string): HTMLElement {
  return el("div", { attrs: { style: "display: flex; align-items: center; gap: 12px; font-family: 'The Future', sans-serif; font-size: 13px; color: rgba(1,1,32,0.6);" } }, [
    el("span", { attrs: { style: "opacity: 0.8;" } }, [icon]),
    el("span", { attrs: { style: "white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" } }, [text])
  ]);
}

function modalInfoRow(icon: string, label: string, value: string): HTMLElement {
  return el("div", { attrs: { style: "display: flex; align-items: flex-start; gap: 12px;" } }, [
    el("span", { attrs: { style: "margin-top: 2px;" } }, [icon]),
    el("div", { attrs: { style: "display: flex; flex-direction: column; gap: 4px;" } }, [
      el("span", { class: "label-mono", attrs: { style: "font-size: 10px; color: #967E67;" } }, [label]),
      el("span", { attrs: { style: "font-family: 'The Future', sans-serif; font-size: 15px; color: #010120;" } }, [value])
    ])
  ]);
}