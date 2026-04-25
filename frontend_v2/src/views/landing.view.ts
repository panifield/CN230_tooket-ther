import { authStore } from "../state/auth";
import { el } from "../utils/dom";

export function renderLandingView(): HTMLElement {
  const isAuthed = authStore.isAuthenticated();
  return el("section", { class: "section" }, [
    el("div", { class: "container" }, [
      el("div", { class: "hero" }, [
        el("div", {
          class: "hero__gradient",
          attrs: { "aria-hidden": "true" },
        }),
        el("div", { class: "hero__inner" }, [
          el("p", { class: "label-mono", text: "Tooket-ther / 2026" }),
          el("h1", {
            text: "The Intelligence Infrastructure for Live Events.",
          }),
          el("p", {
            attrs: {
              style:
                "font-size:var(--fs-body-lg); letter-spacing:var(--ls-body-lg); max-width:560px;",
            },
            text:
              "Priority queues, real-time seat locking, and instant settlement — built on a single, dependable platform.",
          }),
          el("div", { class: "form-actions" }, [
            el(
              "a",
              {
                class: "btn btn--primary",
                attrs: {
                  href: isAuthed ? "#/dashboard" : "#/login",
                },
              },
              [isAuthed ? "Open dashboard" : "Get started"]
            ),
            el(
              "a",
              {
                class: "btn btn--secondary",
                attrs: { href: "#/login" },
              },
              ["Sign in"]
            ),
          ]),
        ]),
      ]),
      el(
        "div",
        {
          attrs: {
            style:
              "display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:24px; margin-top:48px;",
          },
        },
        [
          stat("99.95%", "Booking transaction integrity"),
          stat("< 250ms", "Median seat-lock latency"),
          stat("24 / 7", "Operations control coverage"),
        ]
      ),
    ]),
  ]);
}

function stat(value: string, label: string): HTMLElement {
  return el("div", { class: "card stat" }, [
    el("span", { class: "stat__value", text: value }),
    el("span", { class: "label-mono label-mono--accent", text: label }),
  ]);
}