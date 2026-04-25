import { authStore } from "../state/auth";
import { events } from "../state/events";
import { router } from "../router";
import { el } from "../utils/dom";

export function renderHeader(): HTMLElement {
  const user = authStore.getUser();
  const isAuthed = authStore.isAuthenticated();

  const navLinks: HTMLElement[] = [];
  if (isAuthed && user) {
    if (user.role === "customer") {
      navLinks.push(navLink("Events", "/dashboard"));
      navLinks.push(navLink("My Tickets", "/my-tickets"));
    } else if (user.role === "organizer") {
      navLinks.push(navLink("Dashboard", "/organizer"));
      navLinks.push(navLink("Create Concert", "/create-concert"));
    }
    navLinks.push(navLink("Profile", "/profile"));
  }

  const right = el("div", { class: "app-nav" }, [
    ...navLinks,
    isAuthed && user
      ? el("span", {
          class: "user-chip",
          attrs: { "aria-label": "Signed in user" },
        }, [`${user.role} · ${user.name ?? "—"}`])
      : null,
    isAuthed
      ? el(
          "button",
          {
            class: "btn btn--ghost btn--sm",
            attrs: { type: "button" },
            on: {
              click: () => {
                authStore.clear();
                events.emit("auth:logout", undefined);
                router.navigate("/login");
              },
            },
          },
          ["Sign out"]
        )
      : el(
          "a",
          {
            class: "btn btn--primary btn--sm",
            attrs: { href: "#/login" },
          },
          ["Sign in"]
        ),
  ]);

  return el("header", { class: "app-header", attrs: { role: "banner" } }, [
    el("div", { class: "container app-header__inner" }, [
      el(
        "a",
        {
          class: "brand",
          attrs: { href: "#/", "aria-label": "Tooket-ther home" },
        },
        [el("span", { class: "brand__mark", attrs: { "aria-hidden": "true" } }), "Tooket-ther"]
      ),
      right,
    ]),
  ]);
}

function navLink(label: string, path: string): HTMLAnchorElement {
  const current = window.location.hash.replace(/^#/, "") || "/";
  // ทำให้เมนูยังคง Active อยู่แม้จะมี Query params (เช่น /zones?concertId=1)
  const isActive = current === path || current.startsWith(path + "?");
  return el(
    "a",
    {
      class: "app-nav__link",
      attrs: {
        href: `#${path}`,
        ...(isActive ? { "aria-current": "page" } : {}),
      },
    },
    [label]
  );
}