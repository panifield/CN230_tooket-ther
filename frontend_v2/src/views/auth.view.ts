import { authApi } from "../api/auth";
import type { Role } from "../api/types";
import { authStore } from "../state/auth";
import { events } from "../state/events";
import { router } from "../router";
import { el, mount, clear } from "../utils/dom";
import { isEmail, isPassword, nonEmpty } from "../utils/validation";

// ── Shared UI Configs ──
const cardStyle = "background: #FFFFFF; border: 1px solid rgba(0, 0, 0, 0.08); box-shadow: 0px 4px 12px rgba(1, 1, 32, 0.06); border-radius: 8px; padding: 48px 40px;";

export function renderAuthView(): HTMLElement {
  const container = el("div", { 
    class: "bg-tickets-page", 
    attrs: { style: "display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 64px 24px; background: #FFFFFF; font-family: 'The Future', sans-serif;" } 
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
  const error = el("p", { attrs: { style: "text-align: center; margin-bottom: 24px; padding: 12px; background: #FFF4C7; color: #010120; border-radius: 4px; font-size: 14px; display: none;" } });
  
  const emailInput = makeInput("login-email", "email", "name@example.com", "email");
  const passwordInput = makeInput("login-password", "password", "••••••••", "current-password");

  // 🛠️ ใช้คลาส btn--primary ของระบบ เพื่อดึงฟอนต์และสไตล์ที่ถูกต้องมาใช้
  const submitBtn = el("button", { 
    class: "btn btn--primary btn--block", 
    attrs: { type: "submit", style: "padding: 16px; font-size: 16px; margin-top: 8px;" } 
  }, ["SIGN IN"]) as HTMLButtonElement;

  const submit = async (): Promise<void> => {
    error.style.display = "none";
    if (!isEmail(emailInput.value) || !isPassword(passwordInput.value)) {
      error.textContent = "Enter a valid email and a password (4+ chars).";
      error.style.display = "block";
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
      error.style.display = "block";
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
      error.style.display = "block";
    }
  };

  const form = el("form", { attrs: { novalidate: "true", style: "width: 100%;" }, on: { submit: (e) => { e.preventDefault(); void submit(); } } }, [
      labelled("login-email", "EMAIL ADDRESS", emailInput),
      labelled("login-password", "PASSWORD", passwordInput),
      error,
      submitBtn,

      // ── Social Login & Links ──
      el("div", { attrs: { style: "margin: 32px 0 24px 0; text-align: center; font-family: 'PP Neue Montreal Mono', monospace; font-size: 10px; color: #010120; opacity: 0.4; letter-spacing: 0.055px;" } }, ["OR CONTINUE WITH"]),
      
      el("div", { attrs: { style: "display: flex; gap: 16px; justify-content: center; width: 100%; margin-bottom: 32px;" } }, [
        el("button", { class: "btn btn--ghost", attrs: { type: "button", style: "flex: 1; padding: 14px; background: #aad6fa6d;" }, on: { click: () => void oauth("line") } }, ["LINE"]),
        el("button", { class: "btn btn--ghost", attrs: { type: "button", style: "flex: 1; padding: 14px; background: #aad6fa6d;#AAD6FA;" }, on: { click: () => void oauth("google") } }, ["Google"]),
      ]),

      // Forgot Password & Register
      el("div", { attrs: { style: "display: flex; gap: 12px; justify-content: center; align-items: center; width: 100%; flex-wrap: wrap;" } }, [
        el("a", { class: "label-mono", attrs: { href: "#/forgot", style: "color: #010120; opacity: 0.6; text-decoration: none;" } }, ["Forgot password?"]),
        el("span", { class: "label-mono", attrs: { style: "opacity: 0.3;" }, text: "•" }),
        el("button", { attrs: { type: "button", style: "background: none; border: none; font-family: 'PP Neue Montreal Mono', monospace; font-size: 11px; color: #AAD6FA; cursor: pointer; text-transform: uppercase;" }, on: { click: onGoToRegister } }, ["Create Account"])
      ])
    ]
  );

  return el("div", { attrs: { style: "width: 100%; max-width: 440px; margin: 0 auto;" } }, [
    el("div", { attrs: { style: "text-align: center; margin-bottom: 40px;" } }, [
      el("p", { class: "label-mono", attrs: { style: "color: #967E67; margin-bottom: 12px;" } }, ["AUTHENTICATION / LOGIN"]),
      el("h1", { class: "concert-title", attrs: { style: "margin: 0; font-size: 40px; letter-spacing: -0.8px; color: #010120;" } }, ["Access Portal"])
    ]),
    el("div", { attrs: { style: cardStyle } }, [form])
  ]);
}

function renderRegisterCard(onGoToLogin: () => void): HTMLElement {
  const errorBanner = el("div", { attrs: { style: "margin-bottom: 24px; padding: 12px; background: #FFF4C7; color: #010120; border-radius: 4px; font-size: 14px; display: none;" } });
  const successMsg = el("p", { class: "label-mono", attrs: { style: "color: #AAD6FA; text-align: center; margin-bottom: 16px;" } });

  const fields = {
    name: makeInput("reg-name", "text", "John Doe", "name"),
    id_card: makeInput("reg-id_card", "text", "AA1234567"),
    email: makeInput("reg-email", "email", "name@example.com", "email"),
    phone: makeInput("reg-phone", "tel", "+1 234 567 890", "tel"),
    address: makeInput("reg-address", "text", "City, Country", "street-address"),
    password: makeInput("reg-password", "password", "••••••••", "new-password"),
  };

  const roleSelect = el("select", { attrs: { id: "reg-role", style: "width: 100%; padding: 16px 20px; background: #FFFFFF; border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 4px; font-size: 16px; color: #010120; outline: none;" } }, [
      el("option", { attrs: { value: "customer" }, text: "Customer" }),
      el("option", { attrs: { value: "organizer" }, text: "Organizer" }),
      el("option", { attrs: { value: "staff" }, text: "Gate Staff" }),
    ]
  ) as HTMLSelectElement;

  const showError = (msg: string): void => {
    errorBanner.textContent = msg;
    errorBanner.style.display = msg ? "block" : "none";
  };

  // 🛠️ ใช้คลาสมาตรฐานของระบบ
  const submitBtn = el("button", { 
    class: "btn btn--primary btn--block", 
    attrs: { type: "submit", style: "padding: 16px; font-size: 16px;" } 
  }, ["REGISTER"]) as HTMLButtonElement;

  const submit = async (): Promise<void> => {
    showError("");
    successMsg.textContent = "";
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
    if (!isPassword(payload.password)) return showError("Password must be at least 4 characters.");

    submitBtn.disabled = true;
    submitBtn.textContent = "CREATING ACCOUNT...";
    try {
      const result = await authApi.register(payload);
      successMsg.textContent = `${result.message} (id #${result.user_id}). You can sign in now.`;
      for (const input of Object.values(fields)) input.value = "";
    } catch (err) {
      showError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "REGISTER";
    }
  };

  const form = el("form", { attrs: { novalidate: "true", style: "width: 100%;" }, on: { submit: (e) => { e.preventDefault(); void submit(); } } }, [
      errorBanner,
      // 🛠️ ขยายระยะห่างของ Grid ให้โปร่งขึ้น (gap: 32px)
      el("div", { attrs: { style: "display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px;" } }, [
        labelled("reg-name", "FULL NAME", fields.name),
        labelled("reg-id_card", "ID / PASSPORT NUMBER", fields.id_card),
        labelled("reg-email", "EMAIL ADDRESS", fields.email),
        labelled("reg-phone", "PHONE NUMBER", fields.phone),
        el("div", { attrs: { style: "grid-column: span 2;" } }, [ labelled("reg-address", "DOMICILE", fields.address) ]),
        labelled("reg-password", "PASSWORD", fields.password),
        labelled("reg-role", "ACCOUNT ROLE", roleSelect),
      ]),
      successMsg,
      submitBtn,

      el("div", { attrs: { style: "text-align: center; margin-top: 32px;" } }, [
        el("span", { class: "label-mono", attrs: { style: "opacity: 0.5;" }, text: "Already have an account? " }),
        el("button", { attrs: { type: "button", style: "background: none; border: none; font-family: 'PP Neue Montreal Mono', monospace; font-size: 11px; color: #AAD6FA; cursor: pointer; text-transform: uppercase;" }, on: { click: onGoToLogin } }, ["Sign in here"])
      ])
    ]
  );

  return el("div", { attrs: { style: "width: 100%; max-width: 680px; margin: 0 auto;" } }, [
    el("div", { attrs: { style: "text-align: center; margin-bottom: 40px;" } }, [
      el("p", { class: "label-mono", attrs: { style: "color: #967E67; margin-bottom: 12px;" } }, ["AUTHENTICATION / REGISTER"]),
      el("h1", { class: "concert-title", attrs: { style: "margin: 0; font-size: 40px; letter-spacing: -0.8px; color: #010120;" } }, ["Create Account"])
    ]),
    el("div", { attrs: { style: cardStyle } }, [form])
  ]);
}

// ── Helper Functions ──

function makeInput(id: string, type: string, placeholder: string = "", autocomplete = ""): HTMLInputElement {
  return el("input", {
    attrs: {
      id,
      type,
      placeholder,
      // 🛠️ เพิ่ม Padding ให้ช่องกรอกข้อมูลดูใหญ่และอ่านง่ายขึ้น
      style: "width: 100%; padding: 16px 20px; background: #FFFFFF; border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 4px; font-size: 16px; color: #010120; box-sizing: border-box; outline: none; transition: border-color 0.2s;",
      ...(autocomplete ? { autocomplete } : {}),
    },
    on: {
      focus: (e: Event) => (e.target as HTMLElement).style.borderColor = "#AAD6FA",
      blur: (e: Event) => (e.target as HTMLElement).style.borderColor = "rgba(0, 0, 0, 0.08)",
    }
  }) as HTMLInputElement;
}

function labelled(id: string, label: string, ctrl: HTMLElement): HTMLElement {
  // 🛠️ ขยายระยะห่าง (margin-bottom) ระหว่างแต่ละฟิลด์ให้โปร่งขึ้นเป็น 32px
  return el("div", { attrs: { style: "margin-bottom: 32px;" } }, [
    el("label", {
      class: "label-mono",
      // 🛠️ เพิ่มระยะห่างระหว่าง Label และ Input เล็กน้อย
      attrs: { for: id, style: "display: block; opacity: 0.6; margin-bottom: 12px; color: #010120;" },
      text: label,
    }),
    ctrl,
  ]);
}

function routeForRole(role: Role): void {
  if (role === "organizer") router.navigate("/organizer");
  else if (role === "staff") router.navigate("/staff");
  else router.navigate("/dashboard");
}