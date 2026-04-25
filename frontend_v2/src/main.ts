import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";

import { authApi } from "./api/auth";
import { renderHeader } from "./components/header";

import { renderLogPanel } from "./components/logPanel";
import { router } from "./router-instance";
import { authStore } from "./state/auth";
import { events } from "./state/events";
import { clear, el, qs } from "./utils/dom";

// Views Import
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
import { renderStaffView } from "./views/Staff.view";

const root = qs<HTMLDivElement>("#app");

function render(view: HTMLElement): void {
  if (!root) return;
  clear(root);
  
  root.append(
    el("div", { 
      class: "app-shell", 
      attrs: { style: "display: flex; flex-direction: column; min-height: 100vh; background: #FFFFFF;" } 
    }, [
      renderHeader(),
      
      // Main Content Area
      el("main", { 
        class: "app-main", 
        attrs: { role: "main", style: "flex-grow: 1;" } 
      }, [view]),
      
      // Log Panel Section (เอาพื้นหลังสี Cream ออกแล้ว)
      el("section", { 
        attrs: { style: "padding: var(--space-6) 0; border-top: 1px solid var(--color-border);" } 
      }, [
        el("div", { attrs: { style: "max-width: 1200px; margin: 0 auto; padding: 0 var(--space-5);" } }, [renderLogPanel()]),
      ]),

      // Footer (Coastal Edition - คืนค่า Font แบบเดิม)
      // ในไฟล์ main.ts ตรงส่วน Footer
el("footer", { 
  attrs: { style: "background: var(--color-midnight); color: var(--color-white); padding: 64px 0; border-top: 1px solid rgba(255,255,255,0.1);" } 
}, [
  el("div", { 
    attrs: { style: "max-width: 1200px; margin: 0 auto; padding: 0 24px; display: flex; justify-content: space-between; align-items: center;" } 
  }, [
    el("div", {}, [
      el("p", { 
        class: "label-mono", 
        attrs: { style: "color: var(--color-primary-blue); margin-bottom: 8px;" }, 
        text: "TOOKET-THER / COASTAL EDITION" 
      }),
      el("p", { 
        attrs: { style: "font-size: 12px; opacity: 0.4; font-family: var(--font-display);" }, 
        text: "Built for CN230. © 2026. Infrastructure for Live Intelligence." 
      }),
    ]),
    el("div", { class: "label-mono", attrs: { style: "opacity: 0.2;" } }, [
      el("span", { text: "LAT: 13.7563 / LON: 100.5018" })
    ])
  ]),
])
    ])
  );
}

// Auth Guard & Global Events
function requireAuth(role?: "customer" | "organizer" | "staff"): boolean {
  if (!authStore.isAuthenticated()) {
    router.navigate("/login");
    return false;
  }
  if (role && authStore.getRole() !== role) {
    router.navigate("/login");
    return false;
  }
  return true;
}

events.on("auth:logout", () => router.navigate("/login"));
events.on("auth:login", () => {
  const role = authStore.getRole();
  if (role === "organizer") {
    router.navigate("/organizer");
  } else if (role === "staff") {
    router.navigate("/staff");
  } else {
    router.navigate("/dashboard");
  }
});

// Routes Registration
router.register({ path: "/", handler: () => render(renderLandingView()) });
router.register({ path: "/login", handler: () => render(renderAuthView()) });
router.register({ path: "/forgot", handler: () => render(renderForgotView()) });

router.register({ 
  path: "/dashboard", 
  handler: () => { 
    if (requireAuth("customer")) render(renderCustomerDashboard()); 
  } 
});

router.register({ 
  path: "/my-tickets", 
  handler: () => { 
    if (requireAuth("customer")) render(renderMyTicketsView()); 
  } 
});

router.register({ 
  path: "/waiting", 
  handler: () => { 
    if (!requireAuth("customer")) return;
    const concertId = router.paramInt("concertId");
    if (!concertId) { router.navigate("/dashboard"); return; }
    render(renderWaitingView({ concertId }));
  }
});

router.register({ 
  path: "/zones", 
  handler: () => { 
    if (!requireAuth("customer")) return;
    const concertId = router.paramInt("concertId");
    if (!concertId) { router.navigate("/dashboard"); return; }
    render(renderZonesView({ concertId }));
  }
});

router.register({ 
  path: "/seats", 
  handler: () => { 
    if (!requireAuth("customer")) return;
    const concertId = router.paramInt("concertId");
    const zoneId = router.paramInt("zoneId");
    if (!concertId || !zoneId) { router.navigate("/dashboard"); return; }
    render(renderSeatsView({ concertId, zoneId }));
  }
});

router.register({ 
  path: "/payment", 
  handler: () => { 
    if (!requireAuth("customer")) return;
    const bookingId = router.paramInt("bookingId");
    if (!bookingId) { router.navigate("/my-tickets"); return; }
    render(renderPaymentView({ bookingId }));
  }
});

// Alias for old booking route
router.register({
  path: "/booking",
  handler: () => {
    if (!requireAuth("customer")) return;
    const bookingId = router.paramInt("bookingId");
    if (!bookingId) { router.navigate("/my-tickets"); return; }
    router.navigate(`/payment?bookingId=${bookingId}`);
  },
});

router.register({ 
  path: "/profile", 
  handler: () => { 
    if (requireAuth()) render(renderProfileView()); 
  } 
});

router.register({ 
  path: "/organizer", 
  handler: () => { 
    if (requireAuth("organizer")) render(renderControlRoomView()); 
  } 
});

router.register({ 
  path: "/create-concert", 
  handler: () => { 
    if (requireAuth("organizer")) render(renderCreateConcertView()); 
  } 
});

router.register({ 
  path: "/staff", 
  handler: () => { 
    if (requireAuth("staff")) render(renderStaffView()); 
  } 
});

router.setFallback(() => render(renderLandingView()));

// ─────────────────────────────────────────────────────────────
// OAuth Callback Handler
// ─────────────────────────────────────────────────────────────
async function handleOAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state"); // ในที่นี้คือ 'google' หรือ 'line'

  if (code && state) {
    // ล้าง URL params เพื่อความสะอาด
    window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
    
    try {
      // เรียก Backend เพื่อแลก code เป็น JWT
      const auth = await authApi.oauthCallback(state, code, state);
      authStore.setSession(auth);
      
      // ดึงข้อมูลตัวตน
      const me = await authApi.me();
      authStore.setUser(me);
      
      // แจ้ง Event เพื่อเปลี่ยนหน้าไปยัง Dashboard
      events.emit("auth:login", { user_id: auth.user_id });
      console.log("OAuth Login Success:", me.name);
    } catch (err) {
      console.error("OAuth Callback Error:", err);
    }
  }
}

// เริ่มต้นระบบ
handleOAuthCallback().then(() => {
  router.start();
});


export { router };