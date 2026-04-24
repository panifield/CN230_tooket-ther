import { authApi } from "../api/auth";
import type { CurrentUser, UpdateProfilePayload } from "../api/types";
import { authStore } from "../state/auth";
import { router } from "../router";
import { el } from "../utils/dom";

export function renderProfileView(): HTMLElement {
  const user = authStore.getUser();
  if (!user) {
    router.navigate("/login");
    return el("div");
  }

  const inputs = {
    name: input("prof-name", user.name ?? ""),
    phone: input("prof-phone", String(user["phone"] ?? "")),
    id_card: input("prof-id", String(user["id_card"] ?? "")),
    address: input("prof-address", String(user["address"] ?? "")),
  };

  const status = el("p", { class: "coastal-mono", attrs: { style: "color: #0A1128; margin-top: 16px;" } });
  const error = el("p", { class: "coastal-mono", attrs: { style: "color: #e74c3c; margin-top: 16px;" } });

  const saveBtn = el("button", { class: "coastal-btn-primary", attrs: { type: "submit" } }, ["Save changes"]);

  const save = async (): Promise<void> => {
    status.textContent = "";
    error.textContent = "";
    
    const payload: UpdateProfilePayload = {};
    const name = inputs.name.value.trim();
    const phone = inputs.phone.value.trim();
    const address = inputs.address.value.trim();
    const idCard = inputs.id_card.value.trim();
    
    if (name) payload.name = name;
    if (phone) payload.phone = phone;
    if (address) payload.address = address;
    if (idCard) payload.id_card = idCard;
    
    saveBtn.setAttribute("disabled", "true");
    
    try {
      const r = await authApi.updateProfile(payload);
      status.textContent = r.message;
      const refreshed: CurrentUser = await authApi.me();
      authStore.setUser(refreshed);
    } catch (err) {
      error.textContent = err instanceof Error ? err.message : "Update failed.";
    } finally {
      saveBtn.removeAttribute("disabled");
    }
  };

  return el("section", { class: "coastal-page" }, [
    el("div", { class: "container", attrs: { style: "max-width: 1000px; margin: 0 auto; position: relative; z-index: 1;" } }, [
      
      // Header
      el("div", { attrs: { style: "text-align: center;" } }, [
        el("p", { class: "coastal-mono", text: "ACCOUNT / PROFILE" }),
        el("h2", { class: "coastal-title", text: "My Profile" })
      ]),
      
      // Cream Card Container
      el("div", { class: "coastal-card" }, [
        el("form", {
          attrs: { novalidate: "true" },
          on: { submit: (e) => { e.preventDefault(); void save(); } },
        }, [
          el("div", { class: "coastal-grid" }, [
            field("prof-name", "Full name", inputs.name),
            field("prof-phone", "Phone", inputs.phone),
            
            // ให้ ID Card กินพื้นที่เต็ม 1 บรรทัด
            el("div", { class: "coastal-grid-full" }, [
              field("prof-id", "ID card / passport", inputs.id_card)
            ]),
            
            // ให้ Address กินพื้นที่เต็ม 1 บรรทัด
            el("div", { class: "coastal-grid-full" }, [
              field("prof-address", "Address", inputs.address)
            ]),
          ]),
          
          error,
          status,
          
          // Action Buttons
          el("div", { 
            attrs: { 
              style: "display: flex; gap: 16px; margin-top: 32px; align-items: center; justify-content: center;" 
            } 
          }, [
            saveBtn,
            el("a", { class: "coastal-btn-glass", attrs: { href: "#/dashboard" } }, ["Back"]),
          ]),
        ]),
      ]),
    ]),
  ]);
}

// Helpers ที่ผูกกับคลาส CSS ใหม่
function input(id: string, value: string): HTMLInputElement {
  return el("input", {
    class: "coastal-input",
    attrs: { id, type: "text", value },
  }) as HTMLInputElement;
}

function field(id: string, label: string, control: HTMLElement): HTMLElement {
  return el("div", { class: "coastal-input-group" }, [
    el("label", { class: "coastal-mono coastal-mono--dark", attrs: { for: id }, text: label }),
    control,
  ]);
}