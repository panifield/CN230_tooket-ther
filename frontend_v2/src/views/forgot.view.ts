import { authApi } from "../api/auth";
import { router } from "../router";
import { el } from "../utils/dom";
import { isEmail, isPassword, nonEmpty } from "../utils/validation";

const cardStyle = "background: #FFFFFF; border: 1px solid rgba(0, 0, 0, 0.08); box-shadow: 0px 4px 12px rgba(1, 1, 32, 0.06); border-radius: 8px; padding: 48px 40px;";

export function renderForgotView(): HTMLElement {
  const email = makeInput("fp-email", "email", "name@example.com");
  const idCard = makeInput("fp-idcard", "text", "AA1234567");
  const newPass = makeInput("fp-pass", "password", "••••••••");
  
  const error = el("p", { attrs: { style: "margin-bottom: 24px; padding: 12px; background: #FFF4C7; color: #010120; border-radius: 4px; font-size: 14px; display: none;" } });
  const success = el("p", { class: "label-mono", attrs: { style: "color: #AAD6FA; text-align: center; margin-bottom: 16px;" } });

  // ── 🛠️ แก้ไข: เปลี่ยนมาใช้คลาสระบบ เพื่อดึงฟอนต์ The Future เหมือนหน้า Auth ──
  const submitBtn = el("button", { 
    class: "btn btn--primary btn--block", 
    attrs: { type: "submit", style: "padding: 16px; font-size: 16px;" } 
  }, ["UPDATE PASSWORD"]) as HTMLButtonElement;

  const submit = async (): Promise<void> => {
    error.textContent = "";
    error.style.display = "none";
    success.textContent = "";
    
    if (!isEmail(email.value) || !nonEmpty(idCard.value) || !isPassword(newPass.value)) {
      error.textContent = "Provide a valid email, your ID card, and a new password (4+ chars).";
      error.style.display = "block";
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = "PROCESSING...";
    try {
      const r = await authApi.forgotPassword({
        email: email.value.trim(),
        id_card: idCard.value.trim(),
        new_password: newPass.value,
      });
      success.textContent = r.message;
      window.setTimeout(() => router.navigate("/login"), 1500);
    } catch (err) {
      error.textContent = err instanceof Error ? err.message : "Reset failed.";
      error.style.display = "block";
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "UPDATE PASSWORD";
    }
  };

  return el("div", { 
    class: "bg-tickets-page", 
    attrs: { style: "display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 64px 24px; background: #FFFFFF; font-family: 'The Future', sans-serif;" } 
  }, [
    el("div", { attrs: { style: "width: 100%; max-width: 520px; margin: 0 auto;" } }, [
      el("div", { attrs: { style: "text-align: center; margin-bottom: 40px;" } }, [
        el("p", { class: "label-mono", attrs: { style: "color: #967E67; margin-bottom: 12px;" } }, ["AUTHENTICATION / RECOVERY"]),
        el("h1", { class: "concert-title", attrs: { style: "margin: 0; font-size: 40px; letter-spacing: -0.8px; color: #010120;" } }, ["Reset Password"])
      ]),
      el("div", { attrs: { style: cardStyle } }, [
        el("form", { attrs: { novalidate: "true", style: "width: 100%;" }, on: { submit: (e) => { e.preventDefault(); void submit(); } } }, [
          field("fp-email", "EMAIL ADDRESS", email),
          field("fp-idcard", "ID CARD / PASSPORT", idCard),
          field("fp-pass", "NEW PASSWORD", newPass),
          error,
          success,
          el("div", { attrs: { style: "display: flex; flex-direction: column; gap: 12px; margin-top: 32px;" } }, [
            submitBtn,
            // ── 🛠️ แก้ไข: เปลี่ยนมาใช้คลาส Ghost เพื่อให้ฟอนต์ตรงกับหน้า Auth ──
            el("a", { 
              class: "btn btn--ghost btn--block", 
              attrs: { href: "#/login", style: " padding: 16px; font-size: 16px; text-align: center;" } 
            }, ["BACK TO SIGN IN"]),
          ])
        ])
      ])
    ])
  ]);
}

function makeInput(id: string, type: string, placeholder: string = ""): HTMLInputElement {
  return el("input", {
    attrs: {
      id,
      type,
      placeholder,
      style: "width: 100%; padding: 14px 16px; background: #FFFFFF; border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 4px; font-size: 16px; color: #010120; box-sizing: border-box; outline: none; transition: border-color 0.2s;",
    },
    on: {
      focus: (e: Event) => (e.target as HTMLElement).style.borderColor = "#AAD6FA",
      blur: (e: Event) => (e.target as HTMLElement).style.borderColor = "rgba(0, 0, 0, 0.08)",
    }
  }) as HTMLInputElement;
}

function field(id: string, label: string, control: HTMLElement): HTMLElement {
  return el("div", { attrs: { style: "margin-bottom: 24px;" } }, [
    el("label", {
      class: "label-mono",
      attrs: { for: id, style: "display: block; opacity: 0.6; margin-bottom: 8px; color: #010120;" },
      text: label,
    }),
    control,
  ]);
}