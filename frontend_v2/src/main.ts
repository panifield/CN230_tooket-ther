import "./styles/tailwind.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";

import { authApi } from "./api/auth";
import { renderHeader } from "./components/header";

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
import { renderOrganizerView } from "./views/organizer.view";
import { renderStaffView } from "./views/Staff.view";
import { renderRefundView } from "./views/Refund.view";

const root = qs<HTMLDivElement>("#app");

function render(view: HTMLElement): void {
  if (!root) return;
  clear(root);
  root.append(
    el("div", {
      class: "app-shell",
      attrs: {
        style: "background: radial-gradient(circle at 100% 0%, rgba(197, 246, 250, 0.4) 0%, rgba(255, 255, 255, 1) 40%); background-attachment: fixed; min-height: 100vh; display: flex; flex-direction: column;"
      }
    }, [
      // Navbar (Glassmorphism)
      renderHeader(),

      // Main Content Area
      el("main", {
        class: "app-main",
        attrs: { role: "main", style: "flex-grow: 1;" }
      }, [view]),

      // ── 🛠️ Footer (Decorative & Structured matching Layout.tsx) ──
      el("footer", {
        attrs: { style: "background: #010120; color: #FFFFFF; padding: 80px 0 32px 0; margin-top: auto; font-family: 'The Future', sans-serif;" }
      }, [
        el("div", {
          attrs: { style: "max-width: 1200px; margin: 0 auto; padding: 0 24px;" }
        }, [
          // Upper Section: Grid Layout
          el("div", { attrs: { style: "display: flex; flex-wrap: wrap; gap: 48px; justify-content: space-between;" } }, [

            // Col 1: Brand & Description
            el("div", { attrs: { style: "flex: 1 1 400px; display: flex; flex-direction: column; gap: 24px;" } }, [
              el("div", { attrs: { style: "display: flex; align-items: center; gap: 12px;" } }, [
                el("div", { attrs: { style: "width: 32px; height: 32px; background: var(--gradient-coastal); border-radius: 4px;" } }),
                el("span", { attrs: { style: "font-size: 20px; font-weight: 500; letter-spacing: -0.8px;" } }, ["TOOKET-THER"])
              ]),
              el("p", {
                attrs: { style: "color: rgba(255,255,255,0.6); max-width: 380px; line-height: 1.6; font-size: 14px;" },
                text: "Built for CN230. Infrastructure for Live Intelligence."
              })
            ]),

            // Col 2: Platform Links
            el("div", { attrs: { style: "flex: 1 1 200px;" } }, [
              el("h4", { class: "label-mono", attrs: { style: "color: rgba(255,255,255,0.4); margin-bottom: 24px; font-size: 11px; letter-spacing: 0.055px;" } }, ["PLATFORM"]),
              el("ul", { attrs: { style: "list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 16px;" } }, [
                el("li", {}, [el("a", { attrs: { href: "#/", style: "color: rgba(255,255,255,0.8); text-decoration: none; font-size: 14px; transition: color 0.2s;" }, on: { mouseenter: (e) => (e.target as HTMLElement).style.color = "#AAD6FA", mouseleave: (e) => (e.target as HTMLElement).style.color = "rgba(255,255,255,0.8)" } }, ["Events"])]),
                el("li", {}, [el("a", { attrs: { href: "#/my-tickets", style: "color: rgba(255,255,255,0.8); text-decoration: none; font-size: 14px; transition: color 0.2s;" }, on: { mouseenter: (e) => (e.target as HTMLElement).style.color = "#AAD6FA", mouseleave: (e) => (e.target as HTMLElement).style.color = "rgba(255,255,255,0.8)" } }, ["My Tickets"])])
              ])
            ])

          ]),

          // Lower Section: Meta Info & Copyright
          el("div", {
            attrs: { style: "margin-top: 80px; padding-top: 32px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;" }
          }, [
            el("span", { class: "label-mono", attrs: { style: "color: rgba(255,255,255,0.2); font-size: 10px; letter-spacing: 0.055px;" } }, ["© 2026 TOOKET-THER / COASTAL EDITION"]),
            el("div", { class: "label-mono", attrs: { style: "color: rgba(255,255,255,0.2); font-size: 10px; letter-spacing: 0.055px; display: flex; gap: 24px;" } }, [
              el("span", { text: "LAT: 13.7563 / LON: 100.5018" })
            ])
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
    const rebookBookingId = router.paramInt("rebookBookingId");
    render(renderZonesView(
      rebookBookingId ? { concertId, rebookBookingId } : { concertId }
    ));
  }
});

router.register({
  path: "/seats",
  handler: () => {
    if (!requireAuth("customer")) return;
    const concertId = router.paramInt("concertId");
    const zoneId = router.paramInt("zoneId");
    if (!concertId || !zoneId) { router.navigate("/dashboard"); return; }
    const rebookBookingId = router.paramInt("rebookBookingId");
    render(renderSeatsView(
      rebookBookingId ? { concertId, zoneId, rebookBookingId } : { concertId, zoneId }
    ));
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
    if (requireAuth("organizer")) render(renderOrganizerView("events"));
  }
});

router.register({
  path: "/create-concert",
  handler: () => {
    if (requireAuth("organizer")) render(renderOrganizerView("create"));
  }
});

router.register({
  path: "/staff",
  handler: () => {
    if (requireAuth("staff")) render(renderStaffView());
  }
});

// หน้า Refund ลงทะเบียนไว้
router.register({
  path: "/refund",
  handler: () => {
    if (!requireAuth("customer")) return;
    const bookingId = router.paramInt("bookingId");
    if (!bookingId) {
      router.navigate("/my-tickets");
      return;
    }
    // hash router: query params อยู่ใน window.location.hash ไม่ใช่ .search
    const isVoucher = router.paramString("isVoucher") === "true";
    render(renderRefundView({ bookingId, isVoucher }));
  }
});

router.setFallback(() => render(renderLandingView()));

// ─────────────────────────────────────────────────────────────
// OAuth Callback Handler
// ─────────────────────────────────────────────────────────────
async function handleOAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");

  if (code && state) {
    window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);

    try {
      const auth = await authApi.oauthCallback(state, code, state);
      authStore.setSession(auth);

      const me = await authApi.me();
      authStore.setUser(me);

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