import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";

import { renderHeader } from "./components/header";
import { renderLogPanel } from "./components/logPanel";
import { router } from "./router";
import { authStore } from "./state/auth";
import { events } from "./state/events";
import { clear, el, qs } from "./utils/dom";
import { renderAuthView } from "./views/auth.view";
import { renderCustomerDashboard } from "./views/customer.view";
import { renderForgotView } from "./views/forgot.view";
import { renderLanding } from "./views/landing.view";
import { renderOrganizerView } from "./views/organizer.view";
import { renderProfileView } from "./views/profile.view";

const root = qs<HTMLDivElement>("#app");

function render(view: HTMLElement): void {
  clear(root);
  root.append(
    el("div", { class: "app-shell" }, [
      renderHeader(),
      el("main", { class: "app-main", attrs: { role: "main" } }, [view]),
      el(
        "section",
        {
          attrs: { style: "padding: 0 0 32px;" },
        },
        [el("div", { class: "container" }, [renderLogPanel()])]
      ),
      el("footer", { class: "app-footer" }, [
        el("div", { class: "container" }, [
          el("p", { class: "label-mono", text: "Tooket-ther / Coastal Edition" }),
          el("p", {
            attrs: { style: "margin-top:8px;" },
            text: "Built for CN230. © 2026 Tooket-ther.",
          }),
        ]),
      ]),
    ])
  );
}

router.register({ path: "/", handler: () => render(renderLanding()) });
router.register({ path: "/login", handler: () => render(renderAuthView()) });
router.register({ path: "/forgot", handler: () => render(renderForgotView()) });
router.register({
  path: "/dashboard",
  handler: () => {
    if (!authStore.isAuthenticated()) {
      router.navigate("/login");
      return;
    }
    render(renderCustomerDashboard());
  },
});
router.register({
  path: "/organizer",
  handler: () => {
    if (
      !authStore.isAuthenticated() ||
      authStore.getRole() !== "organizer"
    ) {
      router.navigate("/login");
      return;
    }
    render(renderOrganizerView());
  },
});
router.register({
  path: "/profile",
  handler: () => {
    if (!authStore.isAuthenticated()) {
      router.navigate("/login");
      return;
    }
    render(renderProfileView());
  },
});
router.setFallback(() => render(renderLanding()));

events.on("auth:logout", () => router.navigate("/login"));

router.start();
