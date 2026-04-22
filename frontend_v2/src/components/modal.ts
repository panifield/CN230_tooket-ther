import { clear, el } from "../utils/dom";

export interface ModalOptions {
  title: string;
  body: HTMLElement;
  onClose?: () => void;
}

export function openModal(options: ModalOptions): () => void {
  const root = document.getElementById("modal-root");
  if (!root) throw new Error("modal-root missing");

  const close = (): void => {
    clear(root);
    document.body.style.overflow = "";
    options.onClose?.();
  };

  const backdrop = el(
    "div",
    {
      class: "modal-backdrop",
      attrs: { role: "presentation" },
      on: {
        click: (event) => {
          if (event.target === backdrop) close();
        },
      },
    },
    [
      el(
        "div",
        {
          class: "modal",
          attrs: {
            role: "dialog",
            "aria-modal": "true",
            "aria-labelledby": "modal-title",
          },
        },
        [
          el("h2", {
            id: "modal-title",
            class: "modal__title",
            text: options.title,
          }),
          options.body,
        ]
      ),
    ]
  );

  document.body.style.overflow = "hidden";
  clear(root);
  root.append(backdrop);

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") {
      close();
      window.removeEventListener("keydown", onKey);
    }
  };
  window.addEventListener("keydown", onKey);

  return close;
}
