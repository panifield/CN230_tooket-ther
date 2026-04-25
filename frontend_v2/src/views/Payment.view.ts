import { el, mount, clear } from "../utils/dom";
import { router } from "../router"; 
import { paymentApi } from "../api/payment";
import type { GenerateQrResponse } from "../api/payment";
import { bookingApi } from "../api/booking";
import { ApiError } from "../api/client";
import { formatBaht } from "../utils/format";
import { events } from "../state/events";

export function renderPaymentView(props: { bookingId: number }): HTMLElement {
  const { bookingId } = props;
  const container = el("div", { class: "coastal-page" });

  let timerInterval: ReturnType<typeof setInterval>;

  // CSS Animation สำหรับจุดกระพริบ (Pulse) ของ Timer
  if (!document.getElementById("pulse-keyframes")) {
    const style = document.createElement("style");
    style.id = "pulse-keyframes";
    style.textContent = `@keyframes coastal-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`;
    document.head.appendChild(style);
  }

  const init = async () => {
    try {
      mount(container, el("div", { class: "booking-layout", attrs: { style: "display: flex; justify-content: center; padding-top: 100px;" } }, [
        el("div", { class: "empty-cart" }, [
          el("p", { class: "label-mono", text: "GENERATING SECURE PAYMENT GATEWAY..." })
        ])
      ]));

      // ยิงไปที่ Backend เพื่อขอ QR Payload (ค่า 7000 คือยอดเงินจำลองในกรณีที่ API ต้องการ)
      const data: GenerateQrResponse = await paymentApi.generateQr(bookingId, 7000);
      renderUI(data);
    } catch (err) {
      clear(container);
      mount(container, el("div", { class: "booking-layout", attrs: { style: "display: flex; justify-content: center; padding-top: 100px;" } }, [
        el("div", { class: "empty-cart" }, [
          el("p", { class: "banner banner--err", text: "PAYMENT INITIALIZATION FAILED." }),
          el("button", { 
            class: "btn btn--ghost", 
            attrs: { style: "margin-top: 24px;" },
            on: { click: () => router.navigate("/dashboard") }, 
            text: "← RETURN TO EVENTS" 
          })
        ])
      ]));
    }
  };

  const renderUI = (data: GenerateQrResponse) => {
    clear(container);

    const timerHost = el("span", { attrs: { style: "font-variant-numeric: tabular-nums; font-size: 14px;" } });

    // Backend คืน expired_at จากคอลัมน์ TIMESTAMP (naive). isoformat() จะไม่มี offset/Z
    // ทำให้ JS แปลเป็น local time → ดูเหมือนหมดอายุไปแล้วทันทีในผู้ใช้ที่ไม่ได้อยู่ UTC
    // เติม Z ให้ชัดเจนว่าเป็น UTC ก่อน parse
    const parseAsUtc = (s: string | null | undefined): number => {
      if (!s) return NaN;
      const hasOffset = /[zZ]|[+-]\d{2}:?\d{2}$/.test(s);
      return new Date(hasOffset ? s : `${s}Z`).getTime();
    };

    let expiredAtTime = parseAsUtc(data.expired_at);
    if (isNaN(expiredAtTime)) {
      expiredAtTime = Date.now() + 15 * 60 * 1000;
    }

    const CONFIRM_LABEL = "I HAVE PAID • VERIFY TRANSACTION";
    const confirmBtn = el("button", {
      class: "btn btn--primary btn--block",
      attrs: { style: "padding: 16px; font-size: 16px;" },
      text: CONFIRM_LABEL,
    }) as HTMLButtonElement;

    const renderTime = () => {
      const diff = Math.floor((expiredAtTime - Date.now()) / 1000);
      if (diff <= 0) {
        clearInterval(timerInterval);
        timerHost.textContent = "EXPIRED";
        timerHost.style.color = "var(--color-danger)";
        confirmBtn.disabled = true;
        events.emit("log", { level: "warn", message: "Payment session expired." });
        return false;
      }
      const m = Math.floor(diff / 60).toString().padStart(2, "0");
      const s = (diff % 60).toString().padStart(2, "0");
      timerHost.textContent = `${m}:${s}`;
      return true;
    };

    renderTime();
    timerInterval = setInterval(renderTime, 1000);

    // ล้าง Timer ทิ้งหากผู้ใช้ออกจากหน้านี้ไปที่อื่น
    const originalNavigate = router.navigate;
    router.navigate = (path: string) => {
      clearInterval(timerInterval);
      router.navigate = originalNavigate;
      originalNavigate(path);
    };

    const ui = el("div", { class: "booking-layout" }, [
      
      // ── Left: Payment Interface (QR Code) ──
      el("section", { attrs: { style: "min-width: 0;" } }, [
        
        el("div", { class: "selection-header", attrs: { style: "align-items: flex-end; margin-bottom: 40px;" } }, [
          el("div", {}, [
            el("button", { 
              class: "btn btn--ghost btn--sm", 
              attrs: { style: "margin-bottom: 16px;" },
              on: { click: () => router.navigate("/my-tickets") },
              text: "← CANCEL & GO BACK" 
            }),
            el("span", { class: "label-mono", text: "STEP 04 / ASSET PAYMENT" }),
            el("h1", { class: "concert-title", attrs: { style: "margin-top: 8px;" }, text: "Secure Checkout" }),
          ]),
          
          // กล่อง Timer มุมขวา
          el("div", { attrs: { style: "display: flex; align-items: center; gap: 12px; padding: 10px 16px; background: rgba(170, 214, 250, 0.15); border: 1px solid var(--color-primary-blue); border-radius: var(--radius-control);" } }, [
            el("div", { attrs: { style: "width: 8px; height: 8px; background: var(--color-primary-blue); border-radius: 50%; box-shadow: 0 0 8px var(--color-primary-blue); animation: coastal-pulse 2s infinite;" } }),
            el("span", { class: "label-mono", attrs: { style: "color: var(--color-midnight);" } }, [
              "TIME REMAINING: ",
              timerHost
            ])
          ])
        ]),

        // กล่องแสดง QR Code
        el("div", { class: "card card--cream", attrs: { style: "text-align: center; padding: 48px 24px; border: 2px solid var(--color-primary-blue);" } }, [
          el("span", { class: "label-mono", attrs: { style: "color: var(--color-primary-blue); margin-bottom: 32px; display: block;" }, text: "PAYMENT METHOD: PROMPTPAY QR CODE" }),
          
          el("div", { class: "qr-box", attrs: { style: "margin: 0 auto 32px auto; width: 280px; height: 280px; padding: 16px; background: var(--color-white); border-radius: 8px; box-shadow: var(--shadow-card);" } }, [
            el("img", { 
              attrs: { 
                // ใช้ api.qrserver แทน Google Charts เพื่อความเสถียร
                src: `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(data.qr_payload)}`,
                alt: "PromptPay QR Code",
                style: "width: 100%; height: 100%; object-fit: contain; mix-blend-mode: multiply;"
              } 
            })
          ]),

          el("h3", { attrs: { style: "font-size: 24px; font-weight: 500; margin-bottom: 8px; color: var(--color-midnight);" }, text: "Scan to Pay" }),
          el("p", { attrs: { style: "color: var(--color-text-muted); font-size: 14px; margin-bottom: 24px;" }, text: "Open your banking app or e-wallet to scan this QR code." }),
          
          el("div", { attrs: { style: "display: inline-block; padding: 12px 24px; background: rgba(170, 214, 250, 0.2); border-radius: var(--radius-control);" } }, [
            el("span", { class: "label-mono", attrs: { style: "font-size: 24px; color: var(--color-midnight); font-weight: 500;" }, text: formatBaht(data.amount) })
          ])
        ]),

        // ปุ่ม ยืนยัน
        (() => {
          confirmBtn.addEventListener("click", async () => {
            if (confirmBtn.disabled) return;
            confirmBtn.disabled = true;
            confirmBtn.textContent = "CONFIRMING...";
            try {
              await bookingApi.confirm(bookingId);
              clearInterval(timerInterval);
              router.navigate("/my-tickets");
            } catch (err) {
              const detail =
                err instanceof ApiError ? err.detail :
                err instanceof Error ? err.message : "Confirm failed";
              events.emit("log", { level: "error", message: `Manual confirm failed: ${detail}` });
              confirmBtn.disabled = false;
              confirmBtn.textContent = CONFIRM_LABEL;
            }
          });
          return el("div", { attrs: { style: "margin-top: 32px;" } }, [
            confirmBtn,
            el("p", { class: "label-mono", attrs: { style: "text-align: center; margin-top: 16px; opacity: 0.4;" }, text: "TRANSACTION WILL BE AUTOMATICALLY VERIFIED ON THE SECURE GATEWAY" })
          ]);
        })()
      ]),

      // ── Right: Order Summary Sidebar ──
      el("aside", { class: "summary-column" }, [
        el("div", { class: "order-summary-card" }, [
          el("span", { class: "summary-label", text: "ORDER DETAILS" }),
          
          el("div", { class: "summary-items" }, [
            el("div", { class: "summary-item", attrs: { style: "margin-bottom: 16px; border-bottom: 1px solid var(--color-border); padding-bottom: 16px;" } }, [
              el("div", {}, [
                el("div", { attrs: { style: "font-weight: 500; font-size: 15px; color: var(--color-midnight);" }, text: "Ticket Reservation" }),
                el("div", { class: "label-mono", attrs: { style: "font-size: 10px; margin-top: 4px;" }, text: `REF: BKG-${bookingId}` })
              ]),
              el("div", { attrs: { style: "font-weight: 500; color: var(--color-midnight);" }, text: formatBaht(data.amount) })
            ])
          ]),

          el("div", { class: "summary-row total", attrs: { style: "margin-top: 0;" } }, [
            el("span", { text: "Total Amount" }),
            el("span", { class: "summary-total-price", text: formatBaht(data.amount) })
          ]),

          // Badge ความปลอดภัย
          el("div", { attrs: { style: "margin-top: 40px; padding: 16px; background: rgba(1, 1, 32, 0.04); border-radius: var(--radius-control); display: flex; gap: 12px; align-items: flex-start;" } }, [
            el("div", { attrs: { style: "width: 24px; height: 24px; background: var(--color-primary-blue); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--color-midnight); font-weight: bold; flex-shrink: 0;" } }, [
              document.createTextNode("✓")
            ]),
            el("p", { class: "label-mono", attrs: { style: "font-size: 10px; line-height: 1.5; color: var(--color-midnight); text-transform: none;" }, text: "Your transaction is protected by 256-bit SSL encryption. We do not store your full payment details on our servers." })
          ])
        ])
      ])
    ]);

    mount(container, ui);
  };

  void init();
  return container;
}