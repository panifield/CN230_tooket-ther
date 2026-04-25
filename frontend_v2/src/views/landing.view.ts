import { authStore } from "../state/auth";
import { el } from "../utils/dom";

export function renderLandingView(): HTMLElement {
  const isAuthed = authStore.isAuthenticated();

  return el("div", { class: "coastal-page", attrs: { style: "display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 85vh; text-align: center; padding: 0 24px;" } }, [
    
    // ── Hero Section ──
    el("div", { attrs: { style: "max-width: 800px; margin: 0 auto;" } }, [
      el("div", { 
        attrs: { 
          style: "width: 80px; height: 80px; background: var(--gradient-coastal); border-radius: 20px; margin: 0 auto 32px auto; box-shadow: 0 20px 40px rgba(170, 214, 250, 0.3);" 
        } 
      }),
      
      el("p", { class: "label-mono", attrs: { style: "color: var(--color-primary-blue); margin-bottom: 16px;" }, text: "TOOKET-THER / NEXT-GEN TICKETING" }),
      
      el("h1", { 
        class: "coastal-title", 
        attrs: { style: "font-size: clamp(40px, 8vw, 72px); line-height: 0.95; margin-bottom: 32px;" }, 
        text: "The Intelligence Infrastructure for Live Events." 
      }),
      
      el("p", { 
        attrs: { style: "font-size: 18px; color: var(--color-text-muted); max-width: 580px; margin: 0 auto 48px auto; line-height: 1.6;" }, 
        text: "Priority queues, real-time seat locking, and instant settlement — built on a single, dependable platform for Coastal fans." 
      }),

      // ── Actions ──
      el("div", { class: "form-actions", attrs: { style: "justify-content: center; gap: 16px;" } }, [
        el("a", {
          class: "btn btn--primary",
          attrs: { 
            href: isAuthed ? "#/dashboard" : "#/login",
            style: "padding: 16px 32px; font-size: 14px;"
          },
          text: isAuthed ? "OPEN DASHBOARD" : "GET STARTED"
        }),
        el("a", {
          class: "btn btn--ghost",
          attrs: { href: "#/login", style: "padding: 16px 32px; font-size: 14px;" },
          text: "SIGN IN"
        })
      ])
    ]),

    // ── Stats Grid ──
    el("div", { 
      attrs: { 
        style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; width: 100%; max-width: 1000px; margin-top: 80px;" 
      } 
    }, [
      statCard("99.95%", "Booking transaction integrity"),
      statCard("< 250ms", "Median seat-lock latency"),
      statCard("24 / 7", "Operations control coverage")
    ])
  ]);
}

function statCard(value: string, label: string): HTMLElement {
  return el("div", { 
    class: "card", 
    attrs: { style: "padding: 32px; border: 1px solid rgba(1, 1, 32, 0.05); background: var(--color-white);" } 
  }, [
    el("div", { 
      class: "stat__value", 
      attrs: { style: "font-size: 32px; font-weight: 500; color: var(--color-midnight); margin-bottom: 8px; letter-spacing: -1px;" }, 
      text: value 
    }),
    el("div", { 
      class: "label-mono", 
      attrs: { style: "font-size: 10px; color: var(--color-primary-blue); opacity: 0.8;" }, 
      text: label.toUpperCase() 
    })
  ]);
}