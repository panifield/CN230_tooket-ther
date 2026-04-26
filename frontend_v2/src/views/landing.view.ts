import { authStore } from "../state/auth";
import { el } from "../utils/dom";

export function renderLandingView(): HTMLElement {
  const isAuthed = authStore.isAuthenticated();

  return el("div", { 
    class: "coastal-page", 
    attrs: { style: "background: #FFFFFF; min-height: 100vh; overflow: hidden; display: flex; flex-direction: column;" } 
  }, [
    
    // ── Hero Section (Decorative & Asymmetrical like Layout.tsx) ──
    el("section", { 
      attrs: { style: "position: relative; padding: 160px 0 120px 0; flex-grow: 1; display: flex; align-items: center;" } 
    }, [
      // 🌟 Decorative Background Blob (Right Side)
      el("div", { 
        attrs: { style: "position: absolute; top: 0; right: 0; width: 50%; height: 100%; opacity: 0.4; pointer-events: none; z-index: 1;" } 
      }, [
        el("div", { 
          attrs: { style: "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 800px; height: 800px; background: var(--gradient-coastal); filter: blur(120px); border-radius: 50%;" } 
        })
      ]),

      // 📝 Content Container (Left Aligned)
      el("div", { 
        attrs: { style: "max-width: 1200px; margin: 0 auto; padding: 0 24px; width: 100%; position: relative; z-index: 10;" } 
      }, [
        el("div", { attrs: { style: "max-width: 800px;" } }, [
          
          // Eyebrow Label
          el("span", { 
            class: "label-mono", 
            attrs: { style: "display: block; color: #AAD6FA; margin-bottom: 24px; font-size: 12px; letter-spacing: 0.055px;" }, 
            text: "TOOKET-THER / NEXT-GEN TICKETING" 
          }),
          
          // Main Headline
          el("h1", { 
            attrs: { style: "font-family: 'The Future', sans-serif; font-size: clamp(56px, 8vw, 96px); font-weight: 500; letter-spacing: -0.04em; line-height: 0.9; margin-bottom: 32px; color: #010120;" } 
          }, [
            document.createTextNode("The Intelligence "), 
            el("br"),
            el("span", { attrs: { style: "color: #AAD6FA;" } }, [document.createTextNode("Infrastructure.")])
          ]),
          
          // Description
          el("p", { 
            attrs: { style: "font-family: 'The Future', sans-serif; font-size: 20px; color: rgba(1, 1, 32, 0.6); margin-bottom: 48px; max-width: 600px; line-height: 1.6;" }, 
            text: "Priority queues, real-time seat locking, and instant settlement — built on a single, dependable platform for Coastal fans." 
          }),

          // Actions
          el("div", { attrs: { style: "display: flex; flex-wrap: wrap; gap: 16px;" } }, [
            el("a", {
              class: "btn btn--primary",
              attrs: { 
                href: isAuthed ? "#/dashboard" : "#/login",
                style: "padding: 16px 32px; font-size: 14px; font-family: 'The Future', sans-serif; text-decoration: none; display: flex; align-items: center; gap: 8px;"
              },
              text: isAuthed ? "OPEN DASHBOARD →" : "GET STARTED →"
            }),
            el("a", {
              class: "btn btn--ghost",
              attrs: { 
                href: "#/login", 
                style: "padding: 16px 32px; font-size: 14px; font-family: 'The Future', sans-serif; text-decoration: none; display: flex; align-items: center;" 
              },
              text: "SIGN IN"
            })
          ])
        ])
      ])
    ]),

    // ── Stats Section (Minimalist Grid like Layout.tsx) ──
    el("section", { 
      attrs: { style: "padding: 100px 0; border-top: 1px solid rgba(0,0,0,0.08); background: #FFFFFF; position: relative; z-index: 10;" } 
    }, [
      el("div", { 
        attrs: { style: "max-width: 1200px; margin: 0 auto; padding: 0 24px;" } 
      }, [
        el("div", { 
          attrs: { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 64px;" } 
        }, [
          statCard("99.95%", "Booking transaction integrity"),
          statCard("< 250ms", "Median seat-lock latency"),
          statCard("24 / 7", "Operations control coverage")
        ])
      ])
    ])
  ]);
}

// ── Helper Function for Clean Stats ──
function statCard(value: string, label: string): HTMLElement {
  return el("div", { 
    attrs: { style: "display: flex; flex-direction: column;" } 
  }, [
    el("span", { 
      attrs: { style: "font-family: 'The Future', sans-serif; font-size: 56px; font-weight: 500; margin-bottom: 12px; color: #010120; letter-spacing: -2px; line-height: 1;" }, 
      text: value 
    }),
    el("span", { 
      class: "label-mono", 
      attrs: { style: "color: #AAD6FA; font-size: 12px; letter-spacing: 0.055px; font-weight: bold;" }, 
      text: label.toUpperCase() 
    })
  ]);
}