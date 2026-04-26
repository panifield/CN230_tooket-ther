import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";

import { renderHeader } from "./components/header";
import { renderLogPanel } from "./components/logPanel";
import { authStore } from "./state/auth";
import { events } from "./state/events";
import { clear, el, qs } from "./utils/dom";
import { router } from "./router-instance";

// Views - เช็คชื่อไฟล์ให้ตรงกับในเครื่องนะจ๊ะ (Landing vs landing)
import { renderAuthView } from "./views/auth.view";
import { renderCustomerDashboard } from "./views/customer.view";
import { renderForgotView } from "./views/forgot.view";
import { renderLandingView } from "./views/landing.view";
import { renderProfileView } from "./views/profile.view";
import { renderWaitingView } from "./views/Waiting.view";
import { renderMyTicketsView } from "./views/MyTicketsView";
import { renderZonesView } from "./views/Zones.view";
import { renderSeatsView } from "./views/Seats.view";
import { renderPaymentView } from "./views/Payment.view";
import { renderControlRoomView } from "./views/ControlRoom.view";
import { renderCreateConcertView } from "./views/CreateConcert.view";
import { renderRefundView } from "./views/Refund.view";

const root = qs<HTMLDivElement>("#app");

function render(view: HTMLElement): void {
  if (!root) return;
  clear(root);
  root.append(
    el("div", { class: "app-shell min-h-screen flex flex-col bg-white" }, [
      renderHeader(),
      el("main", { class: "flex-grow", attrs: { role: "main" } }, [view]),

      el("section", { class: "bg-cream-base/10 py-8 border-t border-black/5" }, [
        el("div", { class: "max-w-7xl mx-auto px-6" }, [renderLogPanel()]),
      ]),

      el("footer", {
        class: "bg-[#010120] text-white py-12",
        attrs: { style: "border-top: 1px solid rgba(255,255,255,0.1);" }
      }, [
        el("div", { class: "max-w-7xl mx-auto px-6 flex justify-between items-center" }, [
          el("div", {}, [
            el("p", { class: "mono-label text-[#AAD6FA] text-[10px] mb-2", text: "TOOKET-THER / COASTAL EDITION" }),
            el("p", { class: "text-[12px] opacity-40", text: "Built for CN230. © 2026. Infrastructure for Live Intelligence." }),
          ]),
          el("div", { class: "mono-label text-[10px] opacity-20" }, [
            el("span", { text: "LAT: 13.7563 / LON: 100.5018" })
          ])
        ]),
      ]),
    ])
  );
}

// Auth guard และ Events (เหมือนเดิม)
function requireAuth(role?: "customer" | "organizer" | "staff"): boolean {
  if (!authStore.isAuthenticated()) { router.navigate("/login"); return false; }
  if (role && authStore.getRole() !== role) { router.navigate("/login"); return false; }
  return true;
}

events.on("auth:logout", () => router.navigate("/login"));
events.on("auth:login", () => {
  router.navigate(authStore.getRole() === "organizer" ? "/organizer" : "/dashboard");
});

// Routes Registration
router.register({ path: "/", handler: () => render(renderLandingView()) });
router.register({ path: "/login", handler: () => render(renderAuthView()) });
router.register({ path: "/forgot", handler: () => render(renderForgotView()) });
router.register({ path: "/dashboard", handler: () => { if (requireAuth()) render(renderCustomerDashboard()); } });
router.register({
  path: "/waiting", handler: () => {
    if (!requireAuth("customer")) return;
    const id = router.paramInt("concertId");
    if (!id) { router.navigate("/dashboard"); return; }
    render(renderWaitingView({ concertId: id }));
  }
});
router.register({
  path: "/zones", handler: () => {
    if (!requireAuth("customer")) return;
    const id = router.paramInt("concertId");
    if (!id) { router.navigate("/dashboard"); return; }
    render(renderZonesView({ concertId: id }));
  }
});
router.register({
  path: "/seats", handler: () => {
    if (!requireAuth("customer")) return;
    const cId = router.paramInt("concertId");
    const zId = router.paramInt("zoneId");
    if (!cId || !zId) { router.navigate("/dashboard"); return; }
    render(renderSeatsView({ concertId: cId, zoneId: zId }));
  }
});
router.register({
  path: "/payment", handler: () => {
    if (!requireAuth("customer")) return;
    const bId = router.paramInt("bookingId");
    if (!bId) { router.navigate("/my-tickets"); return; }
    render(renderPaymentView({ bookingId: bId }));
  }
});
router.register({ path: "/my-tickets", handler: () => { if (requireAuth("customer")) render(renderMyTicketsView()); } });
router.register({ path: "/profile", handler: () => { if (requireAuth()) render(renderProfileView()); } });
// ─────────────────────────────────────────────────────────────
// Route: /organizer (Control Room)
// ─────────────────────────────────────────────────────────────
router.register({
  path: "/organizer",
  handler: () => {
    if (!requireAuth("organizer")) return;
    render(renderControlRoomView());
  },
});

// ─────────────────────────────────────────────────────────────
// Route: /create-concert
// ─────────────────────────────────────────────────────────────
router.register({
  path: "/create-concert",
  handler: () => {
    if (!requireAuth("organizer")) return;
    render(renderCreateConcertView());
  },
});

router.register({
  path: "/payment",
  handler: () => {
    const bookingId = router.paramInt("bookingId");
    if (!bookingId) { router.navigate("/my-tickets"); return; }
    // ตรงนี้จะหายแดง เพราะเรา Import มาแล้วข้างบน
    render(renderPaymentView({ bookingId }));
  }
});

// ─────────────────────────────────────────────────────────────
// Route: /refund
// ─────────────────────────────────────────────────────────────
router.register({
  path: "/refund",
  handler: () => {
    // บังคับให้ต้องเป็นลูกค้าก่อนถึงจะขอคืนเงินได้
    if (!requireAuth("customer")) return;

    // ดึง bookingId ผ่านฟังก์ชันของ router ที่เธอมีอยู่แล้ว
    const bookingId = router.paramInt("bookingId");
    if (!bookingId) { 
      router.navigate("/my-tickets"); 
      return; 
    }

    // ดึงค่า isVoucher จาก URL Parameters (?isVoucher=true)
    // hash router: query params อยู่ใน window.location.hash ไม่ใช่ .search
    const isVoucher = router.paramString("isVoucher") === "true";

    // อย่าลืมครอบด้วย render() เพื่อให้มันวาดลงบนจอ
    render(renderRefundView({ bookingId, isVoucher }));
  }
});

router.setFallback(() => render(renderLandingView()));

router.start(); // ต้องอยู่นอกสุดและเป็นบรรทัดสุดท้ายจ้ะ

export { router };