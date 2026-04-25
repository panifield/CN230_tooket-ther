import { organizerApi } from "../api/organizer";
import type { CreateConcertPayload, CreateZonePayload } from "../api/types";
import { authStore } from "../state/auth";
import { router } from "../router";
import { el, mount } from "../utils/dom";

interface ZoneDraft extends CreateZonePayload {}

export function renderCreateConcertView(): HTMLElement {
  if (!authStore.isAuthenticated() || authStore.getRole() !== "organizer") {
    router.navigate("/login");
    return el("div");
  }

  const state = {
    zones: [] as ZoneDraft[],
  };

  const zoneDraftHost = el("div");

  const inputs = {
    title: input("c-title", "text"),
    artist: input("c-artist", "text"),
    venue: input("c-venue", "text"),
    address: input("c-address", "text"),
    concert_datetime: input("c-when", "datetime-local"),
    sale_open_at: input("c-sale-open", "datetime-local"),
    sale_close_at: input("c-sale-close", "datetime-local"),
  };
  
  const formStatus = el("p", { class: "field__error", attrs: { style: "margin-top: var(--space-3); text-align: center;" } });

  const addZone = (): void => {
    state.zones.push({
      zone_name: `ZONE ${state.zones.length + 1}`,
      price: 1000,
      seat_plan: "10, 12, 12, 10",
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
      ...state.zones.map((z, i) => {
        const totalLabel = el("span", {
          class: "label-mono",
          text: `TOTAL SEATS: ${countSeats(z.seat_plan)}`,
        });
        return el("div", { class: "card card--cream", attrs: { style: "margin-bottom: var(--space-3); padding: var(--space-4);" } }, [
          el("div", { class: "form-grid" }, [
            zoneField(`ZONE NAME`, z.zone_name, (v) => {
              state.zones[i]!.zone_name = v;
            }),
            zoneField(
              `PRICE (THB)`,
              String(z.price),
              (v) => { state.zones[i]!.price = Number(v) || 0; },
              "number",
            ),
            el("div", { class: "form-grid--full" }, [
              zoneField(
                `SEAT PLAN`,
                z.seat_plan,
                (v) => {
                  state.zones[i]!.seat_plan = v;
                  totalLabel.textContent = `TOTAL SEATS: ${countSeats(v)}`;
                },
                "text",
                "e.g. 10, 12, 12, 10  (use dashes for aisles: 5-2-5)",
              ),
            ]),
          ]),
          el("div", { class: "form-actions", attrs: { style: "justify-content: space-between; align-items: center;" } }, [
            totalLabel,
            el(
              "button",
              {
                class: "btn btn--ghost btn--sm",
                attrs: { type: "button" },
                on: { click: () => { state.zones.splice(i, 1); renderZoneDrafts(); } },
              },
              ["REMOVE ZONE"],
            ),
          ]),
        ]);
      }),
    );
  };

  const countSeats = (plan: string): number => {
    let total = 0;
    for (const row of plan.split(",")) {
      const tokens = row.split("-").map((t) => t.trim()).filter(Boolean);
      for (let idx = 0; idx < tokens.length; idx++) {
        if (idx % 2 !== 0) continue;
        const n = Number(tokens[idx]);
        if (Number.isFinite(n) && n > 0) total += n;
      }
    }
    return total;
  };

  const submitConcert = async (): Promise<void> => {
    formStatus.textContent = "";
    formStatus.style.color = "var(--color-danger)";
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

    if (!payload.title || !payload.artist || !payload.venue || !payload.concert_datetime || payload.zones.length === 0) {
      formStatus.textContent = "PLEASE PROVIDE TITLE, ARTIST, VENUE, DATETIME, AND AT LEAST ONE ZONE.";
      return;
    }

    try {
      const r = await organizerApi.createConcert(payload);
      formStatus.style.color = "var(--color-midnight)";
      formStatus.textContent = `${r.message.toUpperCase()} (CONCERT #${r.concert_id}) - REDIRECTING...`;
      
      // เมื่อสร้างเสร็จให้เตะกลับไปหน้า Control Room อัตโนมัติ (เปลี่ยนเส้นทางให้ตรงกับ Router ของเธอได้เลย)
      setTimeout(() => router.navigate("/control-room"), 1500); 
    } catch (err) {
      formStatus.textContent = err instanceof Error ? err.message.toUpperCase() : "COULD NOT CREATE CONCERT.";
    }
  };

  renderZoneDrafts();

  return el("div", { class: "coastal-page" }, [
    el("div", { attrs: { style: "max-width: 800px; margin: 0 auto;" } }, [
      
      el("div", { class: "selection-header" }, [
        el("div", {}, [
          el("span", { class: "label-mono", text: "CRAFT / SETUP" }),
          el("h1", { class: "coastal-title", text: "Create New Event" }),
        ]),
      ]),

      el("section", { class: "card" }, [
        el("div", { class: "form-grid" }, [
          el("div", { class: "form-grid--full" }, [ field("c-title", "CONCERT NAME", inputs.title) ]),
          field("c-artist", "ARTIST", inputs.artist),
          field("c-venue", "VENUE (LOCATION)", inputs.venue),
          el("div", { class: "form-grid--full" }, [ field("c-address", "FULL ADDRESS", inputs.address) ]),
          el("div", { class: "form-grid--full" }, [ field("c-when", "WHEN (DATE & TIME)", inputs.concert_datetime) ]),
          field("c-sale-open", "SALE OPENS", inputs.sale_open_at),
          field("c-sale-close", "SALE CLOSES", inputs.sale_close_at),
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
  type = "text",
  placeholder?: string,
): HTMLElement {
  const attrs: Record<string, string> = { type, value };
  if (placeholder) attrs.placeholder = placeholder;
  const ctrl = el("input", {
    class: "input",
    attrs,
    on: { input: (e) => onChange((e.target as HTMLInputElement).value) },
  });
  return el("div", { class: "field" }, [
    el("label", { class: "field__label", text: label }),
    ctrl,
  ]);
}