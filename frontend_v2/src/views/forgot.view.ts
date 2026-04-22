import { authApi } from "../api/auth";
import { router } from "../router";
import { el } from "../utils/dom";
import { isEmail, isPassword, nonEmpty } from "../utils/validation";

export function renderForgotView(): HTMLElement {
  const email = el("input", {
    class: "input",
    attrs: { id: "fp-email", type: "email", required: "true" },
  }) as HTMLInputElement;
  const idCard = el("input", {
    class: "input",
    attrs: { id: "fp-idcard", type: "text", required: "true" },
  }) as HTMLInputElement;
  const newPass = el("input", {
    class: "input",
    attrs: { id: "fp-pass", type: "password", required: "true" },
  }) as HTMLInputElement;
  const error = el("p", { class: "field__error" });
  const success = el("p", { class: "label-mono label-mono--accent" });

  const submit = async (): Promise<void> => {
    error.textContent = "";
    success.textContent = "";
    if (
      !isEmail(email.value) ||
      !nonEmpty(idCard.value) ||
      !isPassword(newPass.value)
    ) {
      error.textContent =
        "Provide a valid email, your ID card, and a new password (6+ chars).";
      return;
    }
    submitBtn.setAttribute("disabled", "true");
    try {
      const r = await authApi.forgotPassword({
        email: email.value.trim(),
        id_card: idCard.value.trim(),
        new_password: newPass.value,
      });
      success.textContent = r.message;
      window.setTimeout(() => router.navigate("/login"), 1500);
    } catch (err) {
      error.textContent =
        err instanceof Error ? err.message : "Reset failed.";
    } finally {
      submitBtn.removeAttribute("disabled");
    }
  };

  const submitBtn = el(
    "button",
    { class: "btn btn--primary btn--block", attrs: { type: "submit" } },
    ["Update password"]
  );

  return el("section", { class: "section" }, [
    el("div", { class: "container" }, [
      el(
        "div",
        {
          class: "card",
          attrs: { style: "max-width:520px; margin:0 auto;" },
        },
        [
          el("div", { class: "card__header" }, [
            el("h2", { class: "card__title", text: "Reset password" }),
            el("span", { class: "label-mono", text: "Recovery" }),
          ]),
          el(
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
              field("fp-email", "Email", email),
              field("fp-idcard", "ID card / passport", idCard),
              field("fp-pass", "New password", newPass),
              error,
              success,
              submitBtn,
              el("div", { class: "form-actions" }, [
                el(
                  "a",
                  { class: "btn btn--ghost", attrs: { href: "#/login" } },
                  ["Back to sign in"]
                ),
              ]),
            ]
          ),
        ]
      ),
    ]),
  ]);
}

function field(id: string, label: string, input: HTMLElement): HTMLElement {
  return el("div", { class: "field" }, [
    el("label", { class: "field__label", attrs: { for: id }, text: label }),
    input,
  ]);
}
