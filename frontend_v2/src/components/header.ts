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
    } else if (user.role === "staff") {
      navLinks.push(navLink("Staff Gate", "/staff"));
    }
    navLinks.push(navLink("Profile", "/profile"));
  } else {
    // แสดงเมนู Home หากยังไม่ได้ล็อกอิน (เหมือนใน Layout.tsx)
    navLinks.push(navLink("Home", "/"));
  }

  // ── 🛠️ Center: Navigation Links ──
  const centerNav = el("div", { 
    attrs: { style: "display: flex; align-items: center; justify-content: center; gap: 32px;" } 
  }, navLinks);

  // ── 🛠️ Right: Actions & User Info ──
  const rightActions = el("div", {
    attrs: { style: "justify-self: end; display: flex; align-items: center; gap: 16px;" }
  }, [
    isAuthed && user
      ? el("div", { attrs: { style: "display: flex; align-items: center; gap: 12px;" } }, [
          // User Chip (bg-sky-tint/20)
          el("div", {
            attrs: { 
              style: "display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: rgba(197, 246, 250, 0.2); border-radius: 4px;" 
            }
          }, [
            el("span", { 
              class: "label-mono", 
              attrs: { style: "font-size: 10px; color: #010120; font-weight: bold;" }, 
              text: user.role.toUpperCase() 
            }),
            el("span", { 
              attrs: { style: "font-weight: bold; font-size: 12px; color: #010120; font-family: 'The Future', sans-serif;" },
              text: (user.name ?? "USER").toUpperCase() 
            })
          ]),
          // Logout Button (hover:text-red-500)
          el("button", {
            attrs: { 
              type: "button",
              style: "background: none; border: none; padding: 8px; color: rgba(1, 1, 32, 0.4); cursor: pointer; transition: color 0.2s; font-family: 'The Future', sans-serif; font-size: 13px;" 
            },
            on: {
              mouseenter: (e: Event) => (e.currentTarget as HTMLElement).style.color = "#ef4444",
              mouseleave: (e: Event) => (e.currentTarget as HTMLElement).style.color = "rgba(1, 1, 32, 0.4)",
              click: () => {
                authStore.clear();
                events.emit("auth:logout", undefined);
                router.navigate("/login");
              },
            },
          }, ["LOGOUT"])
        ])
      : el("a", {
          class: "label-mono",
          attrs: { 
            href: "#/login",
            style: "display: flex; align-items: center; gap: 8px; padding: 8px 16px; font-size: 10px; color: #010120; text-decoration: none; border-radius: 4px; transition: background 0.2s;" 
          },
          on: {
            mouseenter: (e: Event) => (e.currentTarget as HTMLElement).style.background = "rgba(197, 246, 250, 0.5)",
            mouseleave: (e: Event) => (e.currentTarget as HTMLElement).style.background = "transparent",
          }
        }, ["LOGIN"]),
    
    // BOOK NOW Button (Primary Action)
    el("a", {
      class: "btn btn--primary",
      attrs: { 
        href: "#/dashboard",
        style: "padding: 8px 16px; font-size: 14px; font-family: 'The Future', sans-serif; text-decoration: none;"
      }
    }, ["BOOK NOW"])
  ]);

  return el("header", { 
    class: "app-header", 
    attrs: { 
      role: "banner",
      style: "background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid rgba(0, 0, 0, 0.08); position: sticky; top: 0; z-index: 100;" 
    } 
  }, [
    // ── 🛠️ Grid 3 คอลัมน์ (Left, Center, Right) ให้เหมือน Layout.tsx ──
    el("div", { 
      attrs: { style: "max-width: 1200px; margin: 0 auto; padding: 0 24px; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; height: 80px;" } 
    }, [
      // ── 🛠️ Left: Logo ──
      el("div", { attrs: { style: "justify-self: start;" } }, [
        el("a", {
          class: "brand",
          attrs: { 
            href: "#/", 
            style: "display: flex; align-items: center; gap: 12px; text-decoration: none; color: #010120; font-family: 'The Future', sans-serif; font-weight: 500; font-size: 24px; letter-spacing: -1px; transition: opacity 0.2s ease;" 
          },
          on: {
            mouseenter: (e: Event) => (e.currentTarget as HTMLElement).style.opacity = "0.7",
            mouseleave: (e: Event) => (e.currentTarget as HTMLElement).style.opacity = "1",
          }
        }, [
          el("div", { attrs: { style: "width: 40px; height: 40px; background: var(--gradient-coastal); border-radius: 4px;" } }),
          document.createTextNode("TOOKET-THER")
        ])
      ]),
      
      centerNav,
      rightActions,
    ]),
  ]);
}

// ── 🛠️ เมนูแบบไร้กรอบ (Clean Text) เปลี่ยนเป็นสีฟ้าเมื่อ Hover ──
function navLink(label: string, path: string): HTMLAnchorElement {
  const current = window.location.hash.replace(/^#/, "") || "/";
  const isActive = current === path || current.startsWith(path + "?");
  
  return el(
    "a",
    {
      attrs: {
        href: `#${path}`,
        style: `
          text-decoration: none; 
          font-family: 'The Future', sans-serif;
          font-size: 14px; 
          transition: color 0.2s ease;
          color: ${isActive ? "#AAD6FA" : "rgba(1, 1, 32, 0.6)"}; 
        `,
        ...(isActive ? { "aria-current": "page" } : {}),
      },
      on: {
        mouseenter: (e: Event) => {
          if (!isActive) (e.currentTarget as HTMLElement).style.color = "#AAD6FA";
        },
        mouseleave: (e: Event) => {
          if (!isActive) (e.currentTarget as HTMLElement).style.color = "rgba(1, 1, 32, 0.6)";
        }
      }
    },
    [label]
  );
}