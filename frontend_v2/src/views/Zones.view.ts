import { bookingApi } from "../api/booking";
import { router } from "../router";
import { el, mount, clear } from "../utils/dom";
import { formatBaht } from "../utils/format";

export function renderZonesView(params: { concertId: number }): HTMLElement {
  const zonesHost = el("div", { 
    class: "card-grid-layout", 
    attrs: { style: "grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));" } 
  });

  const container = el("div", { class: "coastal-page" }, [
    el("div", { attrs: { style: "max-width: 1200px; margin: 0 auto;" } }, [
      
      // ── Header ──
      el("div", { class: "selection-header", attrs: { style: "margin-bottom: 48px;" } }, [
        el("div", {}, [
          el("span", { class: "label-mono", attrs: { style: "color: var(--color-primary-blue);" }, text: "STEP 02 / SEATING" }),
          el("h1", { class: "coastal-title", attrs: { style: "margin-top: 8px;" }, text: "Select your zone" }),
        ]),
        el("button", { 
          class: "btn btn--ghost btn--sm", 
          on: { click: () => router.navigate("/dashboard") },
          text: "← BACK TO EVENTS" 
        })
      ]),

      // ── Zones Display ──
      zonesHost
    ])
  ]);

  const loadZones = async () => {
    try {
      const zones = await bookingApi.listZones(params.concertId);
      clear(zonesHost);

      if (zones.length === 0) {
        mount(zonesHost, el("div", { class: "empty-cart", text: "NO ZONES AVAILABLE FOR THIS EVENT." }));
        return;
      }

      mount(zonesHost, ...zones.map(z => 
        el("article", { class: "card", attrs: { style: "display: flex; flex-direction: column; gap: 20px;" } }, [
          el("div", { attrs: { style: "display: flex; justify-content: space-between; align-items: flex-start;" } }, [
            el("h3", { class: "card__title", text: z.zone_name }),
            el("span", { 
              class: `pill ${z.is_active ? 'pill--ok' : 'pill--muted'}`, 
              text: z.is_active ? "AVAILABLE" : "FULL" 
            })
          ]),

          el("div", { attrs: { style: "background: var(--color-cream); padding: 16px; border-radius: 4px;" } }, [
            el("div", { attrs: { style: "display: flex; justify-content: space-between; margin-bottom: 8px;" } }, [
              el("span", { class: "label-mono", text: "PRICE PER SEAT" }),
              el("span", { attrs: { style: "font-weight: 500;" }, text: formatBaht(z.price) })
            ]),
            el("div", { attrs: { style: "display: flex; justify-content: space-between;" } }, [
              el("span", { class: "label-mono", text: "AVAILABILITY" }),
              el("span", { attrs: { style: "font-weight: 500;" }, text: `${z.available_count} / ${z.total_seats}` })
            ])
          ]),

          el("button", {
            class: "btn btn--primary btn--block",
            attrs: z.is_active ? {} : { disabled: "true" },
            on: { click: () => router.navigate(`/seats?concertId=${params.concertId}&zoneId=${z.zone_id}`) },
            text: z.is_active ? "CHOOSE SEATS →" : "SOLD OUT"
          })
        ])
      ));
    } catch (err) {
      clear(zonesHost);
      mount(zonesHost, el("div", { class: "banner banner--err", text: "Failed to load seating zones." }));
    }
  };

  loadZones();
  return container;
}