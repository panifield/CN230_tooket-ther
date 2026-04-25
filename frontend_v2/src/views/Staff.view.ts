import { el, mount, clear } from "../utils/dom";
import { staffApi } from "../api/staff";
import jsQR from "jsqr";

export function renderStaffView(): HTMLElement {
  const container = el("div", {
    class: "staff-page",
    attrs: { style: "background: #FFFFFF; min-height: 100vh;" }
  }, [
    el("div", {
      attrs: { style: "max-width: 800px; margin: 0 auto; padding: 64px 24px;" }
    }, [
      // Header Section
      el("header", { attrs: { style: "margin-bottom: 48px;" } }, [
        el("p", { class: "label-mono", attrs: { style: "color: var(--color-primary-blue); margin-bottom: 8px;" }, text: "GATE STAFF / CHECK-IN" }),
        el("h1", { class: "concert-title", text: "Ticket Validation" }),
        el("p", { attrs: { style: "color: var(--color-midnight); opacity: 0.6; margin-top: 8px;" }, text: "Scan or enter the ticket QR hash to verify entry." })
      ]),

      // Scanner Section
      el("section", { class: "card-v2", attrs: { style: "padding: 32px; border: 1px solid var(--color-border); border-radius: 12px; background: #f9fbfc;" } }, [
        el("div", { attrs: { style: "margin-bottom: 24px;" } }, [
          el("label", { class: "label-mono", attrs: { style: "display: block; margin-bottom: 12px; opacity: 0.5;" }, text: "CAMERA / UPLOAD" }),
          el("input", {
            id: "qr-upload",
            attrs: { type: "file", accept: "image/*", style: "display: none;" },
            on: { change: handleFileUpload }
          }),
          el("button", {
            class: "btn btn--primary",
            attrs: { style: "width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;" },
            on: { click: () => (container.querySelector("#qr-upload") as HTMLInputElement).click() }
          }, [
            el("span", { text: "UPLOAD QR CODE IMAGE" })
          ])
        ]),

        el("div", { attrs: { style: "display: flex; align-items: center; gap: 16px; margin-bottom: 24px;" } }, [
          el("div", { attrs: { style: "flex: 1; height: 1px; background: var(--color-border);" } }),
          el("span", { class: "label-mono", attrs: { style: "opacity: 0.3;" }, text: "OR ENTER MANUALLY" }),
          el("div", { attrs: { style: "flex: 1; height: 1px; background: var(--color-border);" } })
        ]),

        el("div", { class: "flex-row", attrs: { style: "display: flex; gap: 12px;" } }, [
          el("input", {
            id: "scanner-input",
            class: "input",
            attrs: { 
              type: "text", 
              placeholder: "Enter QR Hash or Ticket ID...",
              style: "flex: 1; padding: 12px 16px; border-radius: 8px; border: 1px solid var(--color-border);"
            }
          }),
          el("button", {
            class: "btn btn--midnight",
            text: "VERIFY",
            on: { click: () => verifyManual() }
          })
        ])
      ]),

      // Result Section
      el("div", { id: "scan-result-host", attrs: { style: "margin-top: 32px;" } })
    ])
  ]);

  async function handleFileUpload(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (code) {
          verifyHash(code.data);
        } else {
          showError("Could not decode QR code. Please try a clearer image.");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  function verifyManual() {
    const input = container.querySelector("#scanner-input") as HTMLInputElement;
    if (input.value) {
      verifyHash(input.value);
    }
  }

  async function verifyHash(hash: string) {
    const host = container.querySelector("#scan-result-host") as HTMLElement;
    clear(host);
    
    // Show loading
    mount(host, el("div", { class: "banner banner--info", text: "Verifying ticket..." }));

    try {
      const res = await staffApi.verifyTicket(hash);
      clear(host);

      mount(host, el("div", {
        class: "result-card",
        attrs: { 
          style: "padding: 32px; background: #ecfdf5; border: 2px solid #10b981; border-radius: 12px; color: #064e3b;" 
        }
      }, [
        el("div", { attrs: { style: "display: flex; align-items: center; gap: 12px; margin-bottom: 24px;" } }, [
          el("div", { attrs: { style: "width: 48px; height: 48px; background: #10b981; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px;" }, text: "✓" }),
          el("div", {}, [
            el("h3", { attrs: { style: "margin: 0; font-size: 20px; font-weight: 700;" }, text: "Ticket Verified" }),
            el("p", { attrs: { style: "margin: 4px 0 0; opacity: 0.8;" }, text: res.message })
          ])
        ]),

        el("div", { 
          attrs: { 
            style: "display: grid; grid-template-columns: 1fr 1fr; gap: 24px; padding-top: 24px; border-top: 1px solid rgba(16, 185, 129, 0.2);" 
          } 
        }, [
          renderInfoItem("CONCERT", res.concert_title),
          renderInfoItem("TICKET ID", `TKT-${res.ticket_id}`),
          renderInfoItem("ZONE", res.zone_name),
          renderInfoItem("SEAT", res.seat_number)
        ])
      ]));
      
      // Clear input on success
      const input = container.querySelector("#scanner-input") as HTMLInputElement;
      if (input) input.value = "";

    } catch (err: any) {
      clear(host);
      showError(err.message || "Failed to verify ticket.");
    }
  }

  function showError(msg: string) {
    const host = container.querySelector("#scan-result-host") as HTMLElement;
    mount(host, el("div", {
      class: "result-card",
      attrs: { 
        style: "padding: 32px; background: #fef2f2; border: 2px solid #ef4444; border-radius: 12px; color: #7f1d1d;" 
      }
    }, [
      el("div", { attrs: { style: "display: flex; align-items: center; gap: 12px;" } }, [
        el("div", { attrs: { style: "width: 48px; height: 48px; background: #ef4444; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px;" }, text: "✕" }),
        el("div", {}, [
          el("h3", { attrs: { style: "margin: 0; font-size: 20px; font-weight: 700;" }, text: "Verification Failed" }),
          el("p", { attrs: { style: "margin: 4px 0 0; opacity: 0.8;" }, text: msg })
        ])
      ])
    ]));
  }

  function renderInfoItem(label: string, value: string) {
    return el("div", {}, [
      el("label", { class: "label-mono", attrs: { style: "display: block; margin-bottom: 4px; opacity: 0.6; font-size: 10px;" }, text: label }),
      el("p", { attrs: { style: "font-size: 16px; font-weight: 600; margin: 0;" }, text: value })
    ]);
  }

  return container;
}
