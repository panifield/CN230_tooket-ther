import { bookingApi } from "../api/booking";
import type { Concert, Zone } from "../api/types";
import { events } from "../state/events";
import { router } from "../router";
import { clear, el, mount } from "../utils/dom";
import { formatBaht, formatDateTime } from "../utils/format";

export function renderZonesView(params: { concertId: number }): HTMLElement {
  const { concertId } = params;

  const headerHost = el("div");
  const zonesHost = el("div", { class: "card-grid-layout" });

  const renderHeader = (concert: Concert | null): void => {
    clear(headerHost);
    mount(
      headerHost,
      el("div", { class: "selection-header", attrs: { style: "margin-bottom: 32px; align-items: flex-end;" } }, [
        el("div", {}, [
          el("span", { class: "label-mono", text: "SELECT ZONE" }),
          el("h1", {
            class: "coastal-title",
            attrs: { style: "margin: 8px 0 12px 0;" },
            text: concert?.title ?? `Concert #${concertId}`,
          }),
          concert
            ? el("div", { attrs: { style: "display: flex; gap: 20px; color: var(--color-text-muted); font-size: 14px;" } }, [
                el("span", { text: `📍 ${concert.venue}` }),
                el("span", { text: `🗓️ ${formatDateTime(concert.concert_datetime)}` }),
                el("span", { text: `🎤 ${concert.artist}` }),
              ])
            : el("span", {}),
        ]),
        el("button", {
          class: "btn btn--ghost btn--sm",
          on: { click: () => router.navigate("/dashboard") },
          text: "← BACK TO EVENTS",
        }),
      ]),
    );
  };

  const renderZones = (zones: Zone[]): void => {
    clear(zonesHost);
    if (zones.length === 0) {
      mount(zonesHost, el("div", { class: "empty-cart", text: "NO ZONES AVAILABLE FOR THIS CONCERT." }));
      return;
    }

    mount(
      zonesHost,
      ...zones.map((z) => {
        const soldOut = z.available_count <= 0;
        const disabled = !z.is_active || soldOut;

        const pillClass = disabled ? "pill pill--err" : z.available_count < 10 ? "pill pill--warn" : "pill pill--ok";
        const pillText = !z.is_active ? "CLOSED" : soldOut ? "SOLD OUT" : "AVAILABLE";

        return el(
          "article",
          {
            class: "ticket-card",
            attrs: disabled ? { style: "opacity: 0.5; pointer-events: none;" } : {},
          },
          [
            el("div", { class: "ticket-card__content" }, [
              el("span", {
                class: pillClass,
                attrs: { style: "margin-bottom: 12px; width: fit-content;" },
                text: pillText,
              }),
              el("h3", { class: "ticket-card__title", text: z.zone_name }),
              el("div", { class: "ticket-card__info" }, [
                el("span", { class: "ticket-card__info-icon", text: "💺" }),
                el("span", { class: "ticket-card__info-label", text: "Available:" }),
                el("span", {
                  class: "ticket-card__info-value",
                  text: `${z.available_count} / ${z.total_seats}`,
                }),
              ]),
              el("div", { class: "ticket-card__info" }, [
                el("span", { class: "ticket-card__info-icon", text: "💰" }),
                el("span", { class: "ticket-card__info-label", text: "Price:" }),
                el("span", { class: "ticket-card__info-value", text: formatBaht(z.price) }),
              ]),
              el(
                "button",
                {
                  class: "btn-book-now",
                  attrs: disabled ? { disabled: true } : {},
                  on: {
                    click: () => {
                      router.navigate(`/seats?concertId=${concertId}&zoneId=${z.zone_id}`);
                    },
                  },
                },
                ["SELECT ZONE →"],
              ),
            ]),
          ],
        );
      }),
    );
  };

  const loadZones = async (): Promise<void> => {
    renderHeader(null);
    mount(zonesHost, el("div", { class: "empty-cart", text: "LOADING ZONES…" }));

    try {
      const [zones, concerts] = await Promise.all([
        bookingApi.listZones(concertId),
        bookingApi.listConcerts().catch(() => [] as Concert[]),
      ]);
      const concert = concerts.find((c) => c.concert_id === concertId) ?? null;
      renderHeader(concert);
      renderZones(zones);
    } catch (err) {
      events.emit("log", { level: "error", message: `[zones] ${String(err)}` });
      clear(zonesHost);
      mount(zonesHost, el("div", { class: "empty-cart", text: "COULD NOT LOAD ZONES. TRY AGAIN." }));
    }
  };

  void loadZones();

  return el("div", { class: "coastal-page" }, [
    el("div", { attrs: { style: "max-width: 1200px; margin: 0 auto; position: relative; z-index: 1;" } }, [headerHost, zonesHost]),
  ]);
}
