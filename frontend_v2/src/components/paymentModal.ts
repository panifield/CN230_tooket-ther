import QRCode from "qrcode";

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
  onClose?: () => void;
  onExpired?: () => void;
}

export async function openPaymentModal(
  options: PaymentModalOptions
): Promise<void> {
  const { bookingId, amount, onPaid, onClose, onExpired } = options;

  const status = el("p", {
    class: "label-mono",
    text: "Generating QR…",
  });

  const qrHolder = el("div", {
    attrs: {
      style:
        "min-height:220px;padding:16px;display:flex;align-items:center;justify-content:center;background:var(--color-cream);border-radius:var(--radius-control);margin-bottom:16px;overflow:hidden;word-break:break-all;overflow-wrap:anywhere;text-align:center;font-family:var(--font-mono),monospace;font-size:11px;line-height:1.4;max-width:100%;box-sizing:border-box;",
    },
  });

  const refLine = el("p", { class: "label-mono", text: "" });

  const actions = el("div", { class: "form-actions" }, []);

  const close = openModal({
    title: "Pay with PromptPay",
    body: el("div", {}, [
      el("p", {
        text: `Amount due: ${formatBaht(amount)}`,
      }),
      qrHolder,
      refLine,
      status,
      actions,
    ]),
  });

  let stopped = false;

  try {
    // 🔥 generate QR
    const qr = await paymentApi.generateQr(bookingId, amount);

    refLine.textContent = `Ref: ${qr.transaction_ref}`;

    // 🧾 show QR — prefer server-supplied data URL, otherwise render client-side from payload
    let dataUrl: string | null = qr.qr_image_data_url ?? null;
    if (!dataUrl && qr.qr_payload) {
      try {
        dataUrl = await QRCode.toDataURL(qr.qr_payload, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 220,
        });
      } catch (err) {
        events.emit("log", {
          level: "error",
          message: `[qr] render failed: ${String(err)}`,
        });
      }
    }

    qrHolder.textContent = "";
    if (dataUrl) {
      qrHolder.append(
        el("img", {
          attrs: {
            src: dataUrl,
            alt: "PromptPay QR",
            style: "max-width:220px;width:100%;height:auto;display:block;",
          },
        }),
      );
    } else {
      qrHolder.append(
        el("span", {
          attrs: { style: "word-break:break-all;overflow-wrap:anywhere;max-width:100%;" },
          text: qr.qr_payload,
        }),
      );
    }

    status.textContent = "Waiting for payment...";

    // 🔁 polling
    const poll = async () => {
      if (stopped) return;

      try {
        const res = await paymentApi.status(qr.transaction_ref);

        const paymentStatus = res.payment_status;

        // ✅ SUCCESS
        if (paymentStatus === "paid") {
          stopped = true;
          status.textContent = "Payment success!";
          events.emit("log", { level: "info", message: "Payment confirmed" });
          onPaid();
          close();
          return;
        }

        // ❌ FAIL / EXPIRED
        if (
          paymentStatus === "expired" ||
          paymentStatus === "failed"
        ) {
          stopped = true;
          status.textContent = "Payment expired.";
          onExpired?.();
          close();
          return;
        }

        // ⏳ countdown
        if (res.seconds_remaining != null) {
          const total = Math.max(0, Math.floor(Number(res.seconds_remaining)));
          const mm = String(Math.floor(total / 60)).padStart(2, "0");
          const ss = String(total % 60).padStart(2, "0");
          status.textContent = `Waiting... (${mm}:${ss})`;
        }

      } catch {
        // ignore
      }

      setTimeout(poll, 3000);
    };

    poll();

  } catch (err) {
    status.textContent =
      err instanceof Error ? err.message : "QR failed";
  }

  // ❌ cancel — release seats on the backend, then close
  const cancelBtn = el(
    "button",
    {
      class: "btn btn--ghost",
      on: {
        click: async () => {
          if (cancelBtn.hasAttribute("disabled")) return;
          cancelBtn.setAttribute("disabled", "true");
          cancelBtn.textContent = "Cancelling...";
          stopped = true;
          try {
            await bookingApi.cancelBooking(bookingId);
            events.emit("log", {
              level: "info",
              message: `Booking #${bookingId} cancelled, seats released`,
            });
          } catch (err) {
            events.emit("log", {
              level: "error",
              message: `[cancel] ${String(err)}`,
            });
          } finally {
            close();
            onClose?.();
          }
        },
      },
    },
    ["Cancel"]
  );

  // 🧪 manual confirm (dev only)
  const manualBtn = el(
    "button",
    {
      class: "btn btn--primary",
      on: {
        click: async () => {
          manualBtn.setAttribute("disabled", "true");
          status.textContent = "Confirming...";
          try {
            await bookingApi.confirm(bookingId);
            stopped = true;
            onPaid();
            close();
          } catch {
            status.textContent = "Manual confirm failed";
            manualBtn.removeAttribute("disabled");
          }
        },
      },
    },
    ["Manual confirm (testing)"]
  );

  actions.append(cancelBtn, manualBtn);
}