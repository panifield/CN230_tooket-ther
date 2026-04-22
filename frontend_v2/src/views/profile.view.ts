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
    address: input("prof-address", String(user["address"] ?? "")),
    id_card: input("prof-id", String(user["id_card"] ?? "")),
  };

  const status = el("p", { class: "label-mono label-mono--accent" });
  const error = el("p", { class: "field__error" });

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
      error.textContent =
        err instanceof Error ? err.message : "Update failed.";
    } finally {
      saveBtn.removeAttribute("disabled");
    }
  };

  const saveBtn = el(
    "button",
    { class: "btn btn--primary", attrs: { type: "submit" } },
    ["Save changes"]
  );

  return el("section", { class: "section" }, [
    el("div", { class: "container" }, [
      el("p", { class: "label-mono", text: "Account / Profile" }),
      el("h2", { text: "My profile" }),
      el(
        "div",
        { class: "card", attrs: { style: "margin-top:24px; max-width:720px;" } },
        [
          el(
            "form",
            {
              attrs: { novalidate: "true" },
              on: {
                submit: (e) => {
                  e.preventDefault();
                  void save();
                },
              },
            },
            [
              el("div", { class: "form-grid" }, [
                field("prof-name", "Full name", inputs.name),
                field("prof-phone", "Phone", inputs.phone),
                field("prof-id", "ID card / passport", inputs.id_card),
                el("div", { class: "field form-grid--full" }, [
                  el("label", {
                    class: "field__label",
                    attrs: { for: "prof-address" },
                    text: "Address",
                  }),
                  inputs.address,
                ]),
              ]),
              error,
              status,
              el("div", { class: "form-actions" }, [
                saveBtn,
                el(
                  "a",
                  { class: "btn btn--ghost", attrs: { href: "#/dashboard" } },
                  ["Back"]
                ),
              ]),
            ]
          ),
        ]
      ),
    ]),
  ]);
}

function input(id: string, value: string): HTMLInputElement {
  return el("input", {
    class: "input",
    attrs: { id, type: "text", value },
  }) as HTMLInputElement;
}

function field(id: string, label: string, control: HTMLElement): HTMLElement {
  return el("div", { class: "field" }, [
    el("label", {
      class: "field__label",
      attrs: { for: id },
      text: label,
    }),
    control,
  ]);
}
