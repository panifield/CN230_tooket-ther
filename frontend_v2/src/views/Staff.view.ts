import { el, mount, clear } from "../utils/dom";
import { staffApi } from "../api/staff";
import { bookingApi } from "../api/booking";
import type { Concert } from "../api/types";
import jsQR from "jsqr";

export function renderStaffView(): HTMLElement {
  const container = el("div", {
    class: "font-body-md text-on-background min-h-screen pb-24",
    attrs: { style: "background-color: var(--color-background, #f8f9ff);" }
  });

  let selectedConcert: Concert | null = null;
  let concerts: Concert[] = [];

  // Mount loading initially
  mount(container, renderLoading());

  // Fetch concerts on mount
  loadConcerts();

  async function loadConcerts() {
    try {
      concerts = await bookingApi.listConcerts();
      renderCurrentView();
    } catch (err) {
      console.error(err);
      clear(container);
      mount(container, el("div", { text: "Failed to load assignments." }));
    }
  }

  function renderCurrentView() {
    clear(container);
    if (!selectedConcert) {
      mount(container, renderConcertSelection());
    } else {
      mount(container, renderTicketChecker());
    }
  }

  function renderLoading() {
    return el("div", { class: "flex justify-center items-center h-64" }, [
      el("div", { class: "animate-spin rounded-full h-8 w-8 border-b-2 border-primary" })
    ]);
  }

  // --- 1. CONCERT SELECTION VIEW ---
  function renderConcertSelection(): HTMLElement {
    const grid = el("div", { class: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter" });

    concerts.forEach(c => {
      // Is Active logic? We can just say active if status is on_sale or upcoming
      const isActive = c.status === "on_sale" || c.status === "upcoming";
      const statusColor = isActive ? "bg-secondary-container text-on-secondary-container" : "bg-slate-200 text-slate-700";
      const statusText = c.status.replace("_", " ").toUpperCase();
      const pulseDot = isActive ? el("span", { class: "w-2 h-2 bg-secondary rounded-full animate-pulse" }) : el("span", {class: "hidden"});
      
      const card = el("div", {
        class: "group bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col"
      }, [
        // Image Header
        el("div", { class: "h-48 w-full relative" }, [
          el("img", {
            class: "w-full h-full object-cover",
            attrs: { src: c.image_url || "https://placehold.co/600x400?text=No+Image" }
          }),
          el("div", {
            class: `absolute top-4 left-4 ${statusColor} px-3 py-1 rounded-full font-label-sm text-[10px] flex items-center gap-1.5 shadow-lg`
          }, [pulseDot, el("span", { text: statusText })])
        ]),
        // Body
        el("div", { class: "p-card-padding flex-1 flex flex-col" }, [
          el("div", { class: "flex justify-between items-start mb-3" }, [
            el("h4", { class: "font-headline-md text-lg text-on-surface line-clamp-1", text: c.title }),
          ]),
          el("div", { class: "space-y-2 mb-6 flex-1" }, [
            el("div", { class: "flex items-center gap-2 text-on-surface-variant font-body-md" }, [
              el("span", { class: "material-symbols-outlined text-sm", text: "calendar_today" }),
              el("span", { text: c.concert_datetime ? new Date(c.concert_datetime).toLocaleString() : "TBA" })
            ]),
            el("div", { class: "flex items-center gap-2 text-on-surface-variant font-body-md" }, [
              el("span", { class: "material-symbols-outlined text-sm", text: "location_on" }),
              el("span", { text: c.venue })
            ])
          ]),
          // Footer
          el("div", { class: "flex items-center justify-between pt-4 border-t border-slate-50 mt-auto" }, [
            el("div", { class: "text-xs text-on-surface-variant" }, [
              // el("strong", { text: "Open" })
            ]),
            el("button", {
              class: isActive 
                ? "bg-primary-container text-white px-6 py-2 rounded-lg font-label-sm text-sm hover:bg-slate-800 transition-colors flex items-center gap-2"
                : "border border-slate-200 text-on-surface px-6 py-2 rounded-lg font-label-sm text-sm hover:bg-slate-50 transition-colors",
              on: {
                click: () => {
                  selectedConcert = c;
                  renderCurrentView();
                }
              }
            }, [
               el("span", { text: "Select Event" }),
               isActive ? el("span", { class: "material-symbols-outlined text-sm", text: "arrow_forward" }) : null
            ].filter(Boolean) as HTMLElement[])
          ])
        ])
      ]);
      grid.appendChild(card);
    });

    return el("div", { class: "pt-12 px-container-padding max-w-[1200px] mx-auto" }, [
      el("div", { class: "mb-section-gap flex justify-between items-end" }, [
        el("div", {}, [
          el("span", { class: "font-label-sm text-secondary uppercase tracking-widest text-[10px] mb-1 block", text: "Staff Assignment" }),
          el("h3", { class: "font-display-xl text-headline-md text-on-surface", text: "Current Assignments" }),
          el("p", { class: "text-on-surface-variant font-body-md mt-1", text: "Select an active event to begin entry management and operations." })
        ]),
        el("div", { class: "flex gap-3" }, [
          el("button", {
            class: "flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-label-sm text-sm hover:opacity-90 transition-opacity",
            on: { click: () => loadConcerts() }
          }, [
            el("span", { class: "material-symbols-outlined text-lg", text: "sync" }),
            el("span", { text: "Refresh Data" })
          ])
        ])
      ]),
      grid
    ]);
  }

  // --- 2. TICKET CHECKER VIEW ---
  function renderTicketChecker(): HTMLElement {
    if (!selectedConcert) return el("div");

    // The host for scan results
    const resultHost = el("div", { id: "scan-result-host", class: "mt-6" });

    const view = el("div", { class: "pt-12 px-container-padding max-w-[800px] mx-auto" }, [
      // Back button & Header
      el("div", { class: "mb-8" }, [
        el("button", {
          class: "text-secondary hover:underline flex items-center gap-1 font-label-sm text-sm mb-6",
          on: { click: () => { selectedConcert = null; renderCurrentView(); } }
        }, [
          el("span", { class: "material-symbols-outlined text-sm", text: "arrow_back" }),
          el("span", { text: "Back to Assignments" })
        ]),
        el("span", { class: "font-label-sm text-secondary uppercase tracking-widest text-[10px] mb-1 block", text: "Gate Staff / Check-in" }),
        el("h1", { class: "font-display-xl text-headline-md text-on-surface", text: "Ticket Validation" }),
        el("p", { class: "text-on-surface-variant font-body-md mt-1", text: `Scan or enter the ticket QR hash to verify entry for ` }, [
          el("strong", { class: "font-semibold text-on-surface", text: selectedConcert.title }),
          el("span", { text: "." })
        ])
      ]),

      // Scanner Card
      el("section", { class: "bg-white border border-outline-variant rounded-xl p-card-padding shadow-sm" }, [
        // Upload Section
        el("div", { class: "mb-6" }, [
          el("label", { class: "font-label-sm text-outline uppercase text-xs block mb-3", text: "CAMERA / UPLOAD" }),
          el("input", {
            id: "qr-upload",
            attrs: { type: "file", accept: "image/*", style: "display: none;" },
            on: { change: (e) => handleFileUpload(e, resultHost) }
          }),
          el("button", {
            class: "w-full flex items-center justify-center gap-2 px-6 py-4 border-2 border-dashed border-outline-variant rounded-xl hover:border-secondary hover:bg-surface-container-low transition-colors text-on-surface",
            on: { click: () => (container.querySelector("#qr-upload") as HTMLInputElement).click() }
          }, [
            el("span", { class: "material-symbols-outlined text-2xl text-secondary", text: "qr_code_scanner" }),
            el("span", { class: "font-label-sm text-sm", text: "UPLOAD QR CODE IMAGE" })
          ])
        ]),

        // Divider
        el("div", { class: "flex items-center gap-4 mb-6" }, [
          el("div", { class: "flex-1 h-px bg-outline-variant opacity-50" }),
          el("span", { class: "font-label-sm text-outline text-[10px] uppercase", text: "OR ENTER MANUALLY" }),
          el("div", { class: "flex-1 h-px bg-outline-variant opacity-50" })
        ]),

        // Manual Input Section
        el("div", { class: "flex gap-3" }, [
          el("div", { class: "relative flex-1" }, [
            el("span", { class: "material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg", text: "keyboard" }),
            el("input", {
              id: "scanner-input",
              class: "w-full pl-10 pr-4 py-3 bg-surface border border-outline-variant rounded-lg text-sm focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all",
              attrs: { type: "text", placeholder: "Enter QR Hash or Ticket ID..." }
            })
          ]),
          el("button", {
            class: "bg-primary-container text-white px-6 py-3 rounded-lg font-label-sm text-sm hover:bg-slate-800 transition-colors flex items-center gap-2 whitespace-nowrap",
            on: { click: () => verifyManual(resultHost) }
          }, [
            el("span", { text: "VERIFY" }),
            el("span", { class: "material-symbols-outlined text-sm", text: "check_circle" })
          ])
        ])
      ]),

      resultHost
    ]);

    return view;
  }

  async function handleFileUpload(e: Event, resultHost: HTMLElement) {
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
          verifyHash(code.data, resultHost);
        } else {
          showError("Could not decode QR code. Please try a clearer image.", resultHost);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  function verifyManual(resultHost: HTMLElement) {
    const input = container.querySelector("#scanner-input") as HTMLInputElement;
    if (input && input.value) {
      verifyHash(input.value, resultHost);
    }
  }

  async function verifyHash(hash: string, resultHost: HTMLElement) {
    clear(resultHost);
    
    // Show loading
    mount(resultHost, el("div", {
      class: "bg-surface-container-high text-on-surface p-4 rounded-lg flex items-center justify-center gap-2"
    }, [
      el("div", { class: "animate-spin rounded-full h-4 w-4 border-b-2 border-primary" }),
      el("span", { class: "font-body-md", text: "Verifying ticket..." })
    ]));

    try {
      const res = await staffApi.verifyTicket(hash);
      clear(resultHost);

      mount(resultHost, el("div", {
        class: "bg-[#ecfdf5] border-2 border-[#10b981] rounded-xl p-6 text-[#064e3b] shadow-sm animate-fade-in"
      }, [
        el("div", { class: "flex items-center gap-4 mb-6" }, [
          el("div", { class: "w-12 h-12 bg-[#10b981] text-white rounded-full flex items-center justify-center shadow-sm" }, [
            el("span", { class: "material-symbols-outlined text-2xl", text: "check" })
          ]),
          el("div", {}, [
            el("h3", { class: "font-headline-md text-xl m-0", text: "Ticket Verified" }),
            el("p", { class: "font-body-md m-0 mt-1 opacity-90", text: res.message })
          ])
        ]),

        el("div", { class: "grid grid-cols-2 gap-6 pt-6 border-t border-[#10b981]/20" }, [
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
      clear(resultHost);
      showError(err.message || "Failed to verify ticket.", resultHost);
    }
  }

  function showError(msg: string, resultHost: HTMLElement) {
    mount(resultHost, el("div", {
      class: "bg-[#fef2f2] border-2 border-[#ef4444] rounded-xl p-6 text-[#7f1d1d] shadow-sm animate-fade-in"
    }, [
      el("div", { class: "flex items-center gap-4" }, [
        el("div", { class: "w-12 h-12 bg-[#ef4444] text-white rounded-full flex items-center justify-center shadow-sm" }, [
          el("span", { class: "material-symbols-outlined text-2xl", text: "close" })
        ]),
        el("div", {}, [
          el("h3", { class: "font-headline-md text-xl m-0", text: "Verification Failed" }),
          el("p", { class: "font-body-md m-0 mt-1 opacity-90", text: msg })
        ])
      ])
    ]));
  }

  function renderInfoItem(label: string, value: string) {
    return el("div", {}, [
      el("label", { class: "font-label-sm text-[10px] uppercase opacity-70 block mb-1 tracking-wider", text: label }),
      el("p", { class: "font-data-mono text-lg m-0", text: value })
    ]);
  }

  return container;
}

