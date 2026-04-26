import { authApi } from "../api/auth";
import type { CurrentUser, UpdateProfilePayload } from "../api/types";
import { authStore } from "../state/auth";
import { router } from "../router";
import { el } from "../utils/dom";

// ── 🌟 Glassmorphism Card Style ──
const cardStyle = "background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(0, 0, 0, 0.08); box-shadow: 0px 12px 40px rgba(1, 1, 32, 0.05); border-radius: 16px; padding: 48px; transition: transform 0.3s ease, box-shadow 0.3s ease;";

export function renderProfileView(): HTMLElement {
  const user = authStore.getUser();
  if (!user) {
    router.navigate("/login");
    return el("div");
  }

  const inputs = {
    name: makeInput("prof-name", user.name ?? ""),
    phone: makeInput("prof-phone", String(user["phone"] ?? "")),
    id_card: makeInput("prof-id", String(user["id_card"] ?? "")),
    address: makeInput("prof-address", String(user["address"] ?? "")),
  };

  const status = el("p", { class: "label-mono", attrs: { style: "color: #AAD6FA; margin-top: 16px; text-align: center;" } });
  const error = el("p", { attrs: { style: "margin-top: 16px; padding: 12px; background: #FFF4C7; color: #010120; border-radius: 4px; font-size: 14px; display: none;" } });

  const saveBtn = el("button", { 
    class: "btn btn--primary btn--block", 
    attrs: { type: "submit", style: "padding: 16px; display: flex; justify-content: center; align-items: center; font-family: 'The Future', sans-serif; font-size: 14px; font-weight: 500; letter-spacing: 0; border-radius: 8px; transition: all 0.2s ease;" },
    on: {
      mouseenter: (e: Event) => {
        const t = e.currentTarget as HTMLElement;
        t.style.transform = "translateY(-2px)";
        t.style.boxShadow = "0 8px 16px rgba(1, 1, 32, 0.15)";
      },
      mouseleave: (e: Event) => {
        const t = e.currentTarget as HTMLElement;
        t.style.transform = "none";
        t.style.boxShadow = "none";
      }
    }
  }, ["SAVE CHANGES"]) as HTMLButtonElement;

  const save = async (): Promise<void> => {
    status.textContent = "";
    error.textContent = "";
    error.style.display = "none";
    
    const payload: UpdateProfilePayload = {};
    const name = inputs.name.value.trim();
    const phone = inputs.phone.value.trim();
    const address = inputs.address.value.trim();
    const idCard = inputs.id_card.value.trim();
    
    if (name) payload.name = name;
    if (phone) payload.phone = phone;
    if (address) payload.address = address;
    if (idCard) payload.id_card = idCard;
    
    saveBtn.disabled = true;
    saveBtn.textContent = "SAVING...";
    
    try {
      const r = await authApi.updateProfile(payload);
      status.textContent = r.message;
      const refreshed: CurrentUser = await authApi.me();
      authStore.setUser(refreshed);
    } catch (err) {
      error.textContent = err instanceof Error ? err.message : "Update failed.";
      error.style.display = "block";
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "SAVE CHANGES";
    }
  };

  return el("div", { 
    class: "bg-tickets-page", 
    attrs: { 
      // ── 🛠️ เปลี่ยนพื้นหลังเป็นสีขาวทึบ ──
      style: "background: #FFFFFF; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 64px 24px; font-family: 'The Future', sans-serif;" 
    } 
  }, [
    el("div", { attrs: { style: "width: 100%; max-width: 680px; margin: 0 auto;" } }, [
      
      el("div", { attrs: { style: "text-align: center; margin-bottom: 40px;" } }, [
        el("p", { class: "label-mono", attrs: { style: "color: #967E67; margin-bottom: 12px; font-size: 12px;" } }, ["ACCOUNT / SETTINGS"]),
        el("h1", { attrs: { style: "margin: 0; font-size: clamp(32px, 5vw, 48px); letter-spacing: -0.8px; color: #010120; font-weight: 500;" } }, ["My Profile"])
      ]),
      
      el("div", { 
        attrs: { style: cardStyle },
        on: {
          mouseenter: (e: Event) => (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)",
          mouseleave: (e: Event) => (e.currentTarget as HTMLElement).style.transform = "none"
        }
      }, [
        el("form", { attrs: { novalidate: "true", style: "width: 100%;" }, on: { submit: (e) => { e.preventDefault(); void save(); } } }, [
          
          el("div", { attrs: { style: "display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px;" } }, [
            field("prof-name", "FULL NAME", inputs.name),
            field("prof-phone", "PHONE NUMBER", inputs.phone),
            el("div", { attrs: { style: "grid-column: span 2;" } }, [ field("prof-id", "ID CARD / PASSPORT", inputs.id_card) ]),
            el("div", { attrs: { style: "grid-column: span 2;" } }, [ field("prof-address", "DOMICILE / ADDRESS", inputs.address) ]),
          ]),
          
          error,
          status,
          
          el("div", { attrs: { style: "display: flex; flex-direction: column; gap: 12px; margin-top: 32px;" } }, [
            saveBtn,
            el("a", { 
              class: "btn btn--ghost btn--block", 
              attrs: { href: "#/dashboard", style: "padding: 16px; display: flex; justify-content: center; align-items: center; text-decoration: none; font-family: 'The Future', sans-serif; font-size: 14px; font-weight: 500; letter-spacing: 0; border-radius: 8px; transition: background 0.2s;" },
              on: {
                mouseenter: (e: Event) => (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.03)",
                mouseleave: (e: Event) => (e.currentTarget as HTMLElement).style.background = "transparent"
              }
            }, ["CANCEL & GO BACK"]),
          ]),
        ]),
      ]),
    ]),
  ]);
}

// ── 🌟 Premium Input Style ──
function makeInput(id: string, value: string): HTMLInputElement {
  return el("input", {
    attrs: {
      id,
      type: "text",
      value,
      style: "width: 100%; padding: 16px 20px; background: rgba(255, 255, 255, 0.6); border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 8px; font-size: 15px; color: #010120; box-sizing: border-box; outline: none; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);",
    },
    on: {
      focus: (e: Event) => {
        const t = e.target as HTMLElement;
        t.style.borderColor = "#AAD6FA";
        t.style.background = "#FFFFFF";
        t.style.boxShadow = "0 0 0 4px rgba(170, 214, 250, 0.15)";
      },
      blur: (e: Event) => {
        const t = e.target as HTMLElement;
        t.style.borderColor = "rgba(0, 0, 0, 0.08)";
        t.style.background = "rgba(255, 255, 255, 0.6)";
        t.style.boxShadow = "none";
      },
    }
  }) as HTMLInputElement;
}

function field(id: string, label: string, control: HTMLElement): HTMLElement {
  return el("div", { attrs: { style: "margin-bottom: 8px;" } }, [
    el("label", {
      class: "label-mono",
      attrs: { for: id, style: "display: block; opacity: 0.6; margin-bottom: 12px; color: #010120; font-size: 11px;" },
      text: label,
    }),
    control,
  ]);
}