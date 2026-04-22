import { bookingApi } from "../api/booking";
import { paymentApi } from "../api/payment";
import { events } from "../state/events";
import { el } from "../utils/dom";
import { formatBaht } from "../utils/format";
import { openModal } from "./modal";

export interface PaymentModalOptions {
  bookingId: number;
  amount: number;
  onPaid: () => void;
}

export async function openPaymentModal(
  options: PaymentModalOptions
): Promise<void> {
  const { bookingId, amount, onPaid } = options;

  const status = el("p", {
    class: "label-mono",
    text: "Generating QR…",
  });
  const qrHolder = el("div", {
    attrs: {
      style:
        "min-height:220px;display:flex;align-items:center;justify-content:center;background:var(--color-cream);border-radius:var(--radius-control);margin-bottom:16px;",
      "aria-label": "PromptPay QR code",
    },
  });
  const refLine = el("p", { class: "label-mono", text: "" });

  const actions = el("div", { class: "form-actions" }, []);
  const close = openModal({
    title: "Pay with PromptPay",
    body: el("div", {}, [
      el("p", {
        text: `Amount due: ${formatBaht(amount)}. Scan the QR code below with any Thai banking app.`,
        attrs: { style: "margin-bottom:16px;" },
      }),
      qrHolder,
      refLine,
      status,
      actions,
    ]),
  });

  let stopped = false;

  try {
    const qr = await paymentApi.generateQr(bookingId, amount);
    refLine.textContent = `Reference · ${qr.transaction_ref}`;
    if (qr.qr_image_data_url) {
      qrHolder.innerHTML = "";
      qrHolder.append(
        el("img", {
          attrs: {
            src: qr.qr_image_data_url,
            alt: "PromptPay QR code",
            style: "max-width:200px;",
          },
        })
      );
    } else {
      qrHolder.textContent = qr.qr_payload;
      const existing = qrHolder.getAttribute("style") ?? "";
      qrHolder.setAttribute(
        "style",
        `${existing};font-family:var(--font-mono);font-size:11px;padding:12px;text-align:center;word-break:break-all;`
      );
    }
    status.textContent = "Awaiting payment…";

    const poll = async (): Promise<void> => {
      if (stopped) return;
      try {
        const result = await paymentApi.status(qr.transaction_ref);
        if (result.status === "paid") {
          stopped = true;
          status.textContent = "Payment received.";
          events.emit("log", { level: "info", message: "Payment confirmed" });
          onPaid();
          close();
          return;
        }
        if (result.status === "expired" || result.status === "failed") {
          stopped = true;
          status.textContent = `Payment ${result.status}.`;
          return;
        }
      } catch {
        /* swallow polling errors */
      }
      window.setTimeout(() => void poll(), 4000);
    };
    void poll();
  } catch (err) {
    status.textContent =
      err instanceof Error ? err.message : "Could not generate QR.";
  }

  const cancelBtn = el(
    "button",
    {
      class: "btn btn--ghost",
      attrs: { type: "button" },
      on: {
        click: () => {
          stopped = true;
          close();
        },
      },
    },
    ["Cancel"]
  );

  const manualBtn = el(
    "button",
    {
      class: "btn btn--primary",
      attrs: { type: "button" },
      on: {
        click: async () => {
          manualBtn.setAttribute("disabled", "true");
          status.textContent = "Manually confirming…";
          try {
            await bookingApi.confirm(bookingId);
            stopped = true;
            onPaid();
            close();
          } catch (err) {
            status.textContent =
              err instanceof Error ? err.message : "Manual confirm failed.";
            manualBtn.removeAttribute("disabled");
          }
        },
      },
    },
    ["Manual confirm (testing)"]
  );

  actions.append(cancelBtn, manualBtn);
}
