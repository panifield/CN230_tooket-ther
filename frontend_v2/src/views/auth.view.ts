import { authApi } from "../api/auth";
import type { Role } from "../api/types";
import { authStore } from "../state/auth";
import { events } from "../state/events";
import { router } from "../router";
import { el, mount, clear } from "../utils/dom";
import { isEmail, isPassword, nonEmpty } from "../utils/validation";

export function renderAuthView(): HTMLElement {
  const container = el("div", { 
    class: "coastal-page", 
    attrs: { style: "display: flex; align-items: center; justify-content: center; min-height: 80vh; padding: 40px 20px;" } 
  });
  
  let isLoginMode = true;

  const updateView = () => {
    clear(container);
    if (isLoginMode) {
      mount(container, renderLoginCard(() => { isLoginMode = false; updateView(); }));
    } else {
      mount(container, renderRegisterCard(() => { isLoginMode = true; updateView(); }));
    }
  };

  updateView();
  return container;
}

function renderLoginCard(onGoToRegister: () => void): HTMLElement {
  const error = el("p", { class: "field__error", attrs: { style: "text-align: center; margin-bottom: 16px;" } });
  
  const emailInput = makeInput("login-email", "email", "name@example.com", "email");
  const passwordInput = makeInput("login-password", "password", "••••••••", "current-password");

  const submitBtn = el(
    "button",
    {
      class: "coastal-btn-primary",
      attrs: { type: "submit", style: "width: 100%; margin-top: 8px;" },
    },
    ["SIGN IN"]
  ) as HTMLButtonElement;

  const submit = async (): Promise<void> => {
    error.textContent = "";
    if (!isEmail(emailInput.value) || !isPassword(passwordInput.value)) {
      error.textContent = "Enter a valid email and a password (6+ chars).";
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = "SIGNING IN...";
    try {
      const auth = await authApi.login(emailInput.value, passwordInput.value);
      authStore.setSession(auth);
      const me = await authApi.me();
      authStore.setUser(me);
      events.emit("auth:login", { user_id: auth.user_id });
      routeForRole(me.role);
    } catch (err) {
      error.textContent = err instanceof Error ? err.message : "Sign in failed.";
      submitBtn.disabled = false;
      submitBtn.textContent = "SIGN IN";
    }
  };

  const oauth = async (provider: "line" | "google"): Promise<void> => {
    try {
      const { authorize_url } = await authApi.oauthAuthorizeUrl(provider);
      window.location.href = authorize_url;
    } catch (err) {
      error.textContent = err instanceof Error ? err.message : "Could not start OAuth.";
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
      labelled("login-email", "EMAIL ADDRESS", emailInput),
      labelled("login-password", "PASSWORD", passwordInput),
      error,
      submitBtn,

      // ── Social Login & Links ──
      el("div", { class: "divider", attrs: { style: "margin: 32px 0 24px 0;" }, text: "OR CONTINUE WITH" }),
      
      // ปุ่ม LINE และ Google อยู่ตรงกลาง
      el("div", { attrs: { style: "display: flex; gap: 16px; justify-content: center; width: 100%; margin-bottom: 32px;" } }, [
        el("button", { 
          class: "btn btn--secondary", 
          attrs: { type: "button", style: "flex: 1; justify-content: center;" }, 
          on: { click: () => void oauth("line") } 
        }, ["LINE"]),
        el("button", { 
          class: "btn btn--secondary", 
          attrs: { type: "button", style: "flex: 1; justify-content: center;" }, 
          on: { click: () => void oauth("google") } 
        }, ["Google"]),
      ]),

      // Forgot Password & Register (อยู่คู่กันตรงกลาง)
      el("div", { attrs: { style: "display: flex; gap: 12px; justify-content: center; align-items: center; width: 100%; flex-wrap: wrap;" } }, [
        el("a", { class: "btn btn--ghost btn--sm", attrs: { href: "#/forgot" } }, ["Forgot password?"]),
        el("span", { class: "label-mono", attrs: { style: "opacity: 0.3;" }, text: "•" }),
        el("button", { 
          class: "btn btn--ghost btn--sm", 
          attrs: { type: "button", style: "color: var(--color-primary-blue);" }, 
          on: { click: onGoToRegister } 
        }, ["Don't have an account?"])
      ])
    ]
  );

  return el("div", { attrs: { style: "width: 100%; max-width: 440px; margin: 0 auto;" } }, [
    el("div", { attrs: { style: "text-align: center; margin-bottom: 32px;" } }, [
      el("div", { attrs: { style: "width: 64px; height: 64px; background: var(--gradient-coastal); border-radius: var(--radius-control); display: flex; align-items: center; justify-content: center; margin: 0 auto 24px auto; box-shadow: var(--shadow-card);" } }),
      el("h1", { class: "concert-title", text: "Access Portal" }),
      el("p", { class: "label-mono", text: "Sign in to your TOOKET-THER account" })
    ]),
    el("div", { class: "card", attrs: { style: "padding: 40px 32px;" } }, [form])
  ]);
}

function renderRegisterCard(onGoToLogin: () => void): HTMLElement {
  const banner = el("div", {
    class: "banner banner--err",
    attrs: { role: "alert", style: "display:none; margin-bottom: 24px;" },
  });
  const success = el("p", { class: "label-mono", attrs: { style: "color: var(--color-primary-blue); text-align: center; margin-bottom: 16px;" } });

  const fields = {
    name: makeInput("reg-name", "text", "John Doe", "name"),
    id_card: makeInput("reg-id_card", "text", "AA1234567"),
    email: makeInput("reg-email", "email", "name@example.com", "email"),
    phone: makeInput("reg-phone", "tel", "+1 234 567 890", "tel"),
    address: makeInput("reg-address", "text", "City, Country", "street-address"),
    password: makeInput("reg-password", "password", "••••••••", "new-password"),
  };

  const roleSelect = el(
    "select",
    {
      class: "coastal-input",
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

  const submitBtn = el(
    "button",
    {
      class: "coastal-btn-primary",
      attrs: { type: "submit", style: "width: 100%; margin-top: 16px;" },
    },
    ["REGISTER"]
  ) as HTMLButtonElement;

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

    if (!nonEmpty(payload.name)) return showError("Full name is required.");
    if (!nonEmpty(payload.id_card)) return showError("ID card / passport is required.");
    if (!isEmail(payload.email)) return showError("Enter a valid email address.");
    if (!nonEmpty(payload.phone)) return showError("Phone number is required.");
    if (!nonEmpty(payload.address)) return showError("Address is required.");
    if (!isPassword(payload.password)) return showError("Password must be at least 6 characters.");

    submitBtn.disabled = true;
    submitBtn.textContent = "CREATING ACCOUNT...";
    try {
      const result = await authApi.register(payload);
      success.textContent = `${result.message} (id #${result.user_id}). You can sign in now.`;
      for (const input of Object.values(fields)) input.value = "";
    } catch (err) {
      showError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "REGISTER";
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
      banner,
      el("div", { class: "coastal-grid", attrs: { style: "margin-bottom: 24px;" } }, [
        labelled("reg-name", "FULL NAME", fields.name),
        labelled("reg-id_card", "ID / PASSPORT NUMBER", fields.id_card),
        labelled("reg-email", "EMAIL ADDRESS", fields.email),
        labelled("reg-phone", "PHONE NUMBER", fields.phone),
        el("div", { class: "coastal-grid-full" }, [
          labelled("reg-address", "DOMICILE", fields.address),
        ]),
        labelled("reg-password", "PASSWORD", fields.password),
        labelled("reg-role", "ACCOUNT ROLE", roleSelect),
      ]),
      success,
      submitBtn,

      // Back to Login Link
      el("div", { attrs: { style: "text-align: center; margin-top: 32px;" } }, [
        el("span", { class: "label-mono", attrs: { style: "opacity: 0.5;" }, text: "Already have an account? " }),
        el("button", { 
          class: "btn btn--ghost btn--sm", 
          attrs: { type: "button", style: "color: var(--color-primary-blue);" }, 
          on: { click: onGoToLogin } 
        }, ["Sign in here"])
      ])
    ]
  );

  return el("div", { attrs: { style: "width: 100%; max-width: 640px; margin: 0 auto;" } }, [
    el("div", { attrs: { style: "text-align: center; margin-bottom: 32px;" } }, [
      el("div", { attrs: { style: "width: 64px; height: 64px; background: var(--gradient-coastal); border-radius: var(--radius-control); display: flex; align-items: center; justify-content: center; margin: 0 auto 24px auto; box-shadow: var(--shadow-card);" } }),
      el("h1", { class: "concert-title", text: "Create Account" }),
      el("p", { class: "label-mono", text: "Join the TOOKET-THER priority network" })
    ]),
    el("div", { class: "card", attrs: { style: "padding: 48px 40px;" } }, [form])
  ]);
}

// ── Helper Functions ──

function makeInput(id: string, type: string, placeholder: string = "", autocomplete = ""): HTMLInputElement {
  return el("input", {
    class: "coastal-input",
    attrs: {
      id,
      type,
      placeholder,
      ...(autocomplete ? { autocomplete } : {}),
    },
  }) as HTMLInputElement;
}

function labelled(id: string, label: string, ctrl: HTMLElement): HTMLElement {
  return el("div", { class: "coastal-input-group" }, [
    el("label", {
      class: "label-mono",
      attrs: { for: id },
      text: label,
    }),
    ctrl,
  ]);
}

function routeForRole(role: Role): void {
  if (role === "organizer") router.navigate("/organizer");
  else router.navigate("/dashboard");
}
