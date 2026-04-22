import { events } from "../state/events";
import { el } from "../utils/dom";

export function renderLogPanel(): HTMLElement {
  const panel = el("div", {
    class: "log-panel",
    attrs: {
      role: "log",
      "aria-live": "polite",
      "aria-label": "System logs",
    },
  });

  const header = el("div", { class: "card__header" }, [
    el("span", { class: "label-mono", text: "System logs" }),
    el(
      "button",
      {
        class: "btn btn--ghost btn--sm",
        attrs: { type: "button" },
        on: {
          click: () => {
            panel.innerHTML = "";
          },
        },
      },
      ["Clear"]
    ),
  ]);

  events.on("log", ({ level, message }) => {
    const time = new Date().toLocaleTimeString();
    const line = el("div", {
      class: "log-panel__line",
      attrs: { "data-level": level },
      text: `[${time}] ${message}`,
    });
    panel.append(line);
    panel.scrollTop = panel.scrollHeight;
    while (panel.children.length > 100) {
      panel.removeChild(panel.children[0]!);
    }
  });

  return el("section", { class: "card", attrs: { "aria-label": "Logs" } }, [
    header,
    panel,
  ]);
}
