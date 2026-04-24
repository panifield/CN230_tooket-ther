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

    // 🧾 show QR
    if (qr.qr_image_data_url) {
      qrHolder.append(
        el("img", {
          attrs: {
            src: qr.qr_image_data_url,
            style: "max-width:200px;",
          },
        })
      );
    } else {
      qrHolder.textContent = qr.qr_payload;
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
          return;
        }

        // ⏳ countdown
        if (res.seconds_remaining) {
          status.textContent = `Waiting... (${res.seconds_remaining}s)`;
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

  // ❌ cancel
  const cancelBtn = el(
    "button",
    {
      class: "btn btn--ghost",
      on: {
        click: () => {
          stopped = true;
          close();
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
          } catch (err) {
            status.textContent = "Manual confirm failed";
            manualBtn.removeAttribute("disabled");
          }
        },
      },
    },
    ["Manual confirm"]
  );

  actions.append(cancelBtn, manualBtn);
}