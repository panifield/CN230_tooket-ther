import { authApi } from "../api/auth";
import type { Role } from "../api/types";
import { authStore } from "../state/auth";
import { events } from "../state/events";
import { router } from "../router";
import { el } from "../utils/dom";
import { isEmail, isPassword, nonEmpty } from "../utils/validation";

export function renderAuthView(): HTMLElement {
  return el("section", { class: "section" }, [
    el("div", { class: "container" }, [
      el("div", { class: "hero", attrs: { style: "padding-top:0;" } }, [
        el("div", { class: "hero__gradient", attrs: { "aria-hidden": "true" } }),
        el("div", { class: "hero__inner" }, [
          el("p", { class: "label-mono", text: "Tooket-ther / Sign in" }),
          el("h1", {
            text: "The Intelligence Infrastructure for Live Events.",
          }),
          el("p", {
            attrs: { style: "font-size:var(--fs-body-lg); letter-spacing:var(--ls-body-lg); max-width:540px;" },
            text:
              "Sign in to manage queues, secure seats, and orchestrate concert operations end-to-end.",
          }),
        ]),
      ]),
      el("div", { class: "auth-grid", attrs: { style: "margin-top:48px;" } }, [
        renderLoginCard(),
        renderRegisterCard(),
      ]),
    ]),
  ]);
}

function renderLoginCard(): HTMLElement {
  const error = el("p", { class: "field__error" });
  const emailInput = el("input", {
    class: "input",
    attrs: { type: "email", id: "login-email", autocomplete: "email", required: "true" },
  }) as HTMLInputElement;
  const passwordInput = el("input", {
    class: "input",
    attrs: {
      type: "password",
      id: "login-password",
      autocomplete: "current-password",
      required: "true",
    },
  }) as HTMLInputElement;

  const submit = async (): Promise<void> => {
    error.textContent = "";
    if (!isEmail(emailInput.value) || !isPassword(passwordInput.value)) {
      error.textContent = "Enter a valid email and a password (6+ chars).";
      return;
    }
    submitBtn.setAttribute("disabled", "true");
    try {
      const auth = await authApi.login(emailInput.value, passwordInput.value);
      authStore.setSession(auth);
      const me = await authApi.me();
      authStore.setUser(me);
      events.emit("auth:login", { user_id: auth.user_id });
      routeForRole(me.role);
    } catch (err) {
      error.textContent =
        err instanceof Error ? err.message : "Sign in failed.";
      submitBtn.removeAttribute("disabled");
    }
  };

  const submitBtn = el(
    "button",
    {
      class: "btn btn--primary btn--block",
      attrs: { type: "submit" },
    },
    ["Sign in"]
  );

  const oauth = async (provider: "line" | "google"): Promise<void> => {
    try {
      const { authorize_url } = await authApi.oauthAuthorizeUrl(provider);
      window.location.href = authorize_url;
    } catch (err) {
      error.textContent =
        err instanceof Error ? err.message : "Could not start OAuth.";
    }
  };

  const form = el(
    "form",
    {
      attrs: { novalidate: "true" },
      on: {
        submit: (e) => {
          e.preventDefault();
          void submit();
        },
      },
    },
    [
      el("div", { class: "field" }, [
        el("label", {
          class: "field__label",
          attrs: { for: "login-email" },
          text: "Email",
        }),
        emailInput,
      ]),
      el("div", { class: "field" }, [
        el("label", {
          class: "field__label",
          attrs: { for: "login-password" },
          text: "Password",
        }),
        passwordInput,
      ]),
      error,
      submitBtn,
      el("div", { class: "divider", text: "or continue with" }),
      el("div", { class: "form-actions" }, [
        el(
          "button",
          {
            class: "btn btn--secondary",
            attrs: { type: "button" },
            on: { click: () => void oauth("line") },
          },
          ["LINE"]
        ),
        el(
          "button",
          {
            class: "btn btn--secondary",
            attrs: { type: "button" },
            on: { click: () => void oauth("google") },
          },
          ["Google"]
        ),
        el(
          "a",
          {
            class: "btn btn--ghost",
            attrs: { href: "#/forgot" },
          },
          ["Forgot password"]
        ),
      ]),
    ]
  );

  return el("div", { class: "card" }, [
    el("div", { class: "card__header" }, [
      el("h2", { class: "card__title", text: "Sign in" }),
      el("span", { class: "label-mono", text: "Step 01" }),
    ]),
    form,
  ]);
}

function renderRegisterCard(): HTMLElement {
  const banner = el("div", {
    class: "banner banner--err",
    attrs: { role: "alert", style: "display:none;" },
  });
  const success = el("p", { class: "label-mono label-mono--accent" });

  const fields = {
    name: makeInput("reg-name", "text", "name"),
    id_card: makeInput("reg-id_card", "text"),
    email: makeInput("reg-email", "email", "email"),
    phone: makeInput("reg-phone", "tel", "tel"),
    address: makeInput("reg-address", "text", "street-address"),
    password: makeInput("reg-password", "password", "new-password"),
  };

  const roleSelect = el(
    "select",
    {
      class: "select",
      attrs: { id: "reg-role" },
    },
    [
      el("option", { attrs: { value: "customer" }, text: "Customer" }),
      el("option", { attrs: { value: "organizer" }, text: "Organizer" }),
    ]
  ) as HTMLSelectElement;

  const showError = (msg: string): void => {
    banner.textContent = msg;
    banner.style.display = msg ? "block" : "none";
  };

  const submit = async (): Promise<void> => {
    showError("");
    success.textContent = "";
    const payload = {
      id_card: fields.id_card.value.trim(),
      name: fields.name.value.trim(),
      email: fields.email.value.trim(),
      phone: fields.phone.value.trim(),
      address: fields.address.value.trim(),
      password: fields.password.value,
      role: roleSelect.value as Role,
    };

    // Backend requires id_card, name, email, phone, address, password.
    // Keep validation aligned with that — never silently block the button.
    if (!nonEmpty(payload.name)) return showError("Full name is required.");
    if (!nonEmpty(payload.id_card))
      return showError("ID card / passport is required.");
    if (!isEmail(payload.email))
      return showError("Enter a valid email address.");
    if (!nonEmpty(payload.phone)) return showError("Phone number is required.");
    if (!nonEmpty(payload.address)) return showError("Address is required.");
    if (!isPassword(payload.password))
      return showError("Password must be at least 6 characters.");

    submitBtn.disabled = true;
    submitBtn.textContent = "Creating account…";
    try {
      const result = await authApi.register(payload);
      success.textContent = `${result.message} (id #${result.user_id}). You can sign in now.`;
      for (const input of Object.values(fields)) input.value = "";
    } catch (err) {
      showError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Create account";
    }
  };

  const submitBtn = el(
    "button",
    {
      class: "btn btn--primary btn--block",
      attrs: { type: "submit" },
    },
    ["Create account"]
  ) as HTMLButtonElement;

  const labelled = (id: string, label: string, ctrl: HTMLElement): HTMLElement =>
    el("div", { class: "field" }, [
      el("label", {
        class: "field__label",
        attrs: { for: id },
        text: label,
      }),
      ctrl,
    ]);

  const form = el(
    "form",
    {
      attrs: { novalidate: "true" },
      on: {
        submit: (e) => {
          e.preventDefault();
          void submit();
        },
      },
    },
    [
      el("div", { class: "form-grid" }, [
        labelled("reg-name", "Full name", fields.name),
        labelled("reg-id_card", "ID card / passport", fields.id_card),
        labelled("reg-email", "Email", fields.email),
        labelled("reg-phone", "Phone", fields.phone),
        el("div", { class: "form-grid--full" }, [
          labelled("reg-address", "Address", fields.address),
        ]),
        labelled("reg-password", "Password", fields.password),
        labelled("reg-role", "Role", roleSelect),
      ]),
      banner,
      success,
      submitBtn,
    ]
  );

  return el("div", { class: "card" }, [
    el("div", { class: "card__header" }, [
      el("h2", { class: "card__title", text: "Create account" }),
      el("span", { class: "label-mono", text: "Step 02" }),
    ]),
    form,
  ]);
}

function makeInput(id: string, type: string, autocomplete = ""): HTMLInputElement {
  return el("input", {
    class: "input",
    attrs: {
      id,
      type,
      ...(autocomplete ? { autocomplete } : {}),
    },
  }) as HTMLInputElement;
}

function routeForRole(role: Role): void {
  if (role === "organizer") router.navigate("/organizer");
  else router.navigate("/dashboard");
}
