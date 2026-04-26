import { organizerApi } from "../api/organizer";
import type { CreateConcertPayload, CreateZonePayload } from "../api/types";
import { authStore } from "../state/auth";
import { router } from "../router";
import { el, mount, clear } from "../utils/dom";

interface ZoneDraft extends CreateZonePayload {}

// ── Shared Input Style ──
const inputStyle = "width: 100%; padding: 16px; background: rgba(255,255,255,0.6); border: 1px solid rgba(0,0,0,0.08); border-radius: 4px; font-family: 'The Future', sans-serif; font-size: 15px; color: #010120; box-sizing: border-box; outline: none; transition: all 0.2s ease;";

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
    title: input("c-title", "text", "e.g. Coastal Tech Summit 2026"),
    artist: input("c-artist", "text", "e.g. Various Artists"),
    venue: input("c-venue", "text", "e.g. San Francisco, CA"),
    address: input("c-address", "text", "Full Location Address"),
    concert_datetime: input("c-when", "datetime-local"),
    sale_open_at: input("c-sale-open", "datetime-local"),
    sale_close_at: input("c-sale-close", "datetime-local"),
    image: input("c-image", "file"),
  };
  
  const formStatus = el("p", { attrs: { style: "margin-top: 24px; text-align: center; font-family: 'The Future', sans-serif; font-size: 14px;" } });

  const addZone = (): void => {
    state.zones.push({
      zone_name: `ZONE ${String.fromCharCode(65 + state.zones.length)}`, // ZONE A, B, C...
      price: 1000,
      total_seats: 50,
      rows: 5,
      cols: 10,
    });
    renderZoneDrafts();
  };

  const renderZoneDrafts = (): void => {
    clear(zoneDraftHost);
    if (state.zones.length === 0) {
      mount(zoneDraftHost, el("div", { attrs: { style: "padding: 32px; text-align: center; border: 1px dashed rgba(0,0,0,0.1); border-radius: 8px; color: rgba(1,1,32,0.4); font-family: 'The Future', sans-serif; margin-bottom: 24px;" } }, ["NO ZONES ADDED YET."]));
      return;
    }
    mount(
      zoneDraftHost,
      ...state.zones.map((z, i) =>
        el("div", { attrs: { style: "background: #FFFFFF; border: 1px solid rgba(0,0,0,0.08); border-radius: 8px; padding: 24px; margin-bottom: 16px; box-shadow: 0 4px 12px rgba(1,1,32,0.03);" } }, [
          el("div", { attrs: { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 24px; margin-bottom: 24px;" } }, [
            zoneField(`ZONE NAME`, z.zone_name, (v) => { state.zones[i]!.zone_name = v; }, "text"),
            zoneField(`PRICE (THB)`, String(z.price), (v) => { state.zones[i]!.price = Number(v) || 0; }, "number"),
            zoneField(`ROWS`, String(z.rows), (v) => {
              state.zones[i]!.rows = Number(v) || 0;
              state.zones[i]!.total_seats = state.zones[i]!.rows * state.zones[i]!.cols;
              renderZoneDrafts();
            }, "number"),
            zoneField(`COLUMNS`, String(z.cols), (v) => {
              state.zones[i]!.cols = Number(v) || 0;
              state.zones[i]!.total_seats = state.zones[i]!.rows * state.zones[i]!.cols;
              renderZoneDrafts();
            }, "number"),
          ]),
          el("div", { attrs: { style: "display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 16px;" } }, [
            el("span", { class: "label-mono", attrs: { style: "color: #AAD6FA; font-weight: bold;" } }, [`TOTAL SEATS: ${z.rows * z.cols}`]),
            el("button", {
                attrs: { type: "button", style: "background: transparent; border: none; color: #ef4444; font-family: 'The Future', sans-serif; font-size: 12px; cursor: pointer; text-decoration: underline;" },
                on: { click: () => { state.zones.splice(i, 1); renderZoneDrafts(); } },
              }, ["REMOVE ZONE"]
            ),
          ]),
        ])
      )
    );
  };

  const submitConcert = async (): Promise<void> => {
    formStatus.textContent = "";
    formStatus.style.color = "#ef4444";
    
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
      formStatus.style.color = "#010120";
      formStatus.textContent = `${r.message.toUpperCase()} (CONCERT #${r.concert_id}) - REDIRECTING...`;
      setTimeout(() => router.navigate("/organizer"), 1500); 
    } catch (err) {
      formStatus.textContent = err instanceof Error ? err.message.toUpperCase() : "COULD NOT CREATE CONCERT.";
    }
  };

  renderZoneDrafts();

  return el("div", { attrs: { style: "padding: 64px 24px; min-height: 100vh;" } }, [
    el("div", { attrs: { style: "max-width: 800px; margin: 0 auto;" } }, [
      
      // Header
      el("div", { attrs: { style: "margin-bottom: 40px; text-align: center;" } }, [
        el("span", { class: "label-mono", attrs: { style: "color: #967E67; display: block; margin-bottom: 12px;" } }, ["CRAFT / SETUP"]),
        el("h1", { attrs: { style: "font-family: 'The Future', sans-serif; font-size: 40px; color: #010120; margin: 0; letter-spacing: -0.8px;" } }, ["Create New Event"]),
      ]),

      // Main Form Card
      el("section", { attrs: { style: "background: #FFFFFF; border: 1px solid rgba(0,0,0,0.08); box-shadow: 0 4px 24px rgba(1,1,32,0.04); border-radius: 8px; padding: 48px; margin-bottom: 40px;" } }, [
        
        el("div", { attrs: { style: "display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 48px;" } }, [
          el("div", { attrs: { style: "grid-column: span 2;" } }, [ field("c-title", "CONCERT NAME", inputs.title) ]),
          field("c-artist", "ARTIST", inputs.artist),
          field("c-venue", "VENUE (LOCATION)", inputs.venue),
          el("div", { attrs: { style: "grid-column: span 2;" } }, [ field("c-address", "FULL ADDRESS", inputs.address) ]),
          el("div", { attrs: { style: "grid-column: span 2;" } }, [ field("c-when", "WHEN (DATE & TIME)", inputs.concert_datetime) ]),
          field("c-sale-open", "SALE OPENS", inputs.sale_open_at),
          field("c-sale-close", "SALE CLOSES", inputs.sale_close_at),
          el("div", { attrs: { style: "grid-column: span 2;" } }, [ field("c-image", "CONCERT IMAGE (POSTER)", inputs.image) ]),
        ]),
        
        el("div", { attrs: { style: "border-top: 1px solid rgba(0,0,0,0.08); margin: 0 -48px 48px -48px;" } }),

        el("h3", { attrs: { style: "font-family: 'The Future', sans-serif; font-size: 20px; color: #010120; margin: 0 0 24px 0;" } }, ["Zone Configuration"]),
        zoneDraftHost,
        
        el("div", { attrs: { style: "display: flex; flex-direction: column; gap: 16px; margin-top: 32px;" } }, [
          el("button", { 
            attrs: { type: "button", style: "padding: 16px; background: rgba(170, 214, 250, 0.2); color: #010120; border: 1px dashed rgba(170, 214, 250, 0.8); border-radius: 4px; font-family: 'The Future', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s;" }, 
            on: { 
              click: addZone,
              mouseenter: (e: Event) => (e.currentTarget as HTMLElement).style.background = "rgba(170, 214, 250, 0.4)",
              mouseleave: (e: Event) => (e.currentTarget as HTMLElement).style.background = "rgba(170, 214, 250, 0.2)",
            } 
          }, ["+ ADD NEW ZONE"]),
          
          el("button", { 
            class: "btn btn--primary",
            attrs: { type: "button", style: "padding: 16px; font-family: 'The Future', sans-serif; font-size: 14px; border-radius: 4px;" }, 
            on: { click: () => void submitConcert() } 
          }, ["PUBLISH CONCERT"]),
        ]),
        formStatus,
      ]),
    ]),
  ]);
}

// ── Helpers ──
function input(id: string, type = "text", placeholder = ""): HTMLInputElement {
  return el("input", {
    attrs: { id, type, placeholder, style: inputStyle },
    on: {
      focus: (e: Event) => (e.target as HTMLElement).style.borderColor = "#AAD6FA",
      blur: (e: Event) => (e.target as HTMLElement).style.borderColor = "rgba(0,0,0,0.08)",
    }
  }) as HTMLInputElement;
}

function field(id: string, label: string, control: HTMLElement): HTMLElement {
  return el("div", { attrs: { style: "display: flex; flex-direction: column; gap: 8px;" } }, [
    el("label", { class: "label-mono", attrs: { for: id, style: "font-size: 11px; color: rgba(1,1,32,0.6);" }, text: label }),
    control,
  ]);
}

function zoneField(label: string, value: string, onChange: (v: string) => void, type = "text"): HTMLElement {
  const ctrl = el("input", {
    attrs: { type, value, style: inputStyle },
    on: { 
      input: (e) => onChange((e.target as HTMLInputElement).value),
      focus: (e: Event) => (e.target as HTMLElement).style.borderColor = "#AAD6FA",
      blur: (e: Event) => (e.target as HTMLElement).style.borderColor = "rgba(0,0,0,0.08)",
    },
  });
  return el("div", { attrs: { style: "display: flex; flex-direction: column; gap: 8px;" } }, [
    el("label", { class: "label-mono", attrs: { style: "font-size: 11px; color: rgba(1,1,32,0.6);" }, text: label }),
    ctrl,
  ]);
}