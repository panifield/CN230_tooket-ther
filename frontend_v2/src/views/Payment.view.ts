// src/views/Payment.view.ts
import { el, mount, clear } from "../utils/dom";
import { router } from "../router-instance"; // ใช้คนกลางเพื่อกัน Circular Redline
import { paymentApi } from "../api/payment";
import type { GenerateQrResponse } from "../api/payment";

export function renderPaymentView(props: { bookingId: number }): HTMLElement {
  const { bookingId } = props;
  const container = el("div", { class: "bg-white min-h-screen pt-32 pb-20" });

  const init = async () => {
    try {
      const data: GenerateQrResponse = await paymentApi.generateQr(bookingId, 7000);
      renderUI(data);
    } catch (err) {
      container.textContent = "PAYMENT INITIALIZATION FAILED.";
    }
  };

  const renderUI = (data: GenerateQrResponse) => {
    clear(container);
    mount(container, el("div", { class: "max-w-md mx-auto px-6 text-center" }, [
      el("span", { class: "mono-label text-brand-blue mb-4 block", text: "ASSET / PAYMENT" }),
      el("h1", { 
        class: "text-[40px] font-medium tracking-[-0.8px] mb-8", 
        text: "Finalize Transaction" 
      }),
      
      // QR Section
      el("div", { class: "card-coastal p-10 bg-white mb-8 border border-black/5" }, [
        el("div", { class: "w-56 h-56 mx-auto mb-6 bg-white p-4 border border-black/5 rounded-sharp" }, [
          el("img", { 
            attrs: { 
              // ใช้ Google Charts เพื่อสร้าง QR จาก qr_payload ที่เธอส่งมา
              src: `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(data.qr_payload)}`,
              style: "width:100%; height:100%; object-fit:contain;"
            } 
          })
        ]),
        el("div", { class: "space-y-1 mb-6" }, [
          el("span", { class: "mono-label text-[9px] text-midnight/40", text: "TOTAL AMOUNT" }),
          el("div", { class: "text-3xl font-medium tracking-tighter", text: `฿${data.amount}` })
        ]),
        el("p", { 
          class: "mono-label text-[9px] text-red-400 animate-pulse", 
          text: `EXPIRES AT: ${new Date(data.expired_at).toLocaleTimeString()}` 
        })
      ]),

      el("button", {
        class: "w-full py-4 bg-midnight text-white rounded-sharp mono-label text-xs tracking-wider",
        on: { click: () => router.navigate("/my-tickets") },
        text: "WAITING FOR PAYMENT..."
      })
    ]));
  };

  void init();
  return container;
}