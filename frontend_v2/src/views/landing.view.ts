import { authStore } from "../state/auth";
import { bookingApi } from "../api/booking";
import type { Concert } from "../api/types";
import { el, mount, type Child } from "../utils/dom";

const FONT = "'The Future', sans-serif";

const HERO_BACKDROP =
  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1800&q=70";

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=900&q=70",
  "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=900&q=70",
  "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=900&q=70",
  "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?auto=format&fit=crop&w=900&q=70",
];

export function renderLandingView(): HTMLElement {
  const isAuthed = authStore.isAuthenticated();

  // Host for the trending grid — populated async after listConcerts() resolves.
  const trendingHost = el("div", {
    attrs: {
      style:
        "display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px;",
    },
  });

  // Initial skeletons.
  mount(trendingHost, ...[0, 1, 2].map(skeletonCard));

  void loadTrending(trendingHost);

  return el(
    "div",
    {
      class: "coastal-page",
      attrs: { style: "background: var(--color-white); min-height: 100vh; overflow: hidden;" },
    },
    [renderHero(isAuthed), renderTrendingSection(trendingHost), renderHowItWorks()]
  );
}

// ──────────────────────────────────────────────────────────────
// Hero
// ──────────────────────────────────────────────────────────────
function renderHero(isAuthed: boolean): HTMLElement {
  const actions: Child[] = [
    el("a", {
      class: "btn btn--primary",
      attrs: {
        href: "#/dashboard",
        style:
          "padding: 16px 32px; font-size: 14px; font-family: " +
          FONT +
          "; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 8px 32px rgba(170, 214, 250, 0.35);",
      },
      text: isAuthed ? "BROWSE EVENTS →" : "GET TICKETS →",
    }),
  ];

  if (!isAuthed) {
    actions.push(
      el("a", {
        attrs: {
          href: "#/login",
          style:
            "padding: 16px 32px; font-size: 14px; font-family: " +
            FONT +
            "; text-decoration: none; display: inline-flex; align-items: center; color: var(--color-white); background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: var(--radius-control); letter-spacing: 0.05em; text-transform: uppercase;",
        },
        text: "Sign In",
      })
    );
  }

  return el(
    "section",
    {
      attrs: {
        style:
          "position: relative; min-height: 640px; padding: 140px 0 120px 0; display: flex; align-items: center; background: var(--color-midnight); color: var(--color-white); overflow: hidden;",
      },
    },
    [
      // Backdrop image
      el("div", {
        attrs: {
          style:
            "position: absolute; inset: 0; background-image: url('" +
            HERO_BACKDROP +
            "'); background-size: cover; background-position: center; opacity: 0.45; z-index: 0;",
        },
      }),
      // Dark gradient overlay
      el("div", {
        attrs: {
          style:
            "position: absolute; inset: 0; background: linear-gradient(180deg, rgba(1,1,32,0.55) 0%, rgba(1,1,32,0.85) 100%); z-index: 1;",
        },
      }),
      // Glow blob
      el("div", {
        attrs: {
          style:
            "position: absolute; top: 30%; left: 50%; transform: translate(-50%, -50%); width: 720px; height: 720px; background: var(--gradient-coastal); filter: blur(140px); border-radius: 50%; opacity: 0.25; z-index: 1; pointer-events: none;",
        },
      }),

      // Content
      el(
        "div",
        {
          attrs: {
            style:
              "max-width: 1100px; margin: 0 auto; padding: 0 24px; width: 100%; position: relative; z-index: 10; text-align: center;",
          },
        },
        [
          // Status pill (glass)
          el(
            "div",
            {
              attrs: {
                style:
                  "display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; margin-bottom: 32px; background: rgba(255,255,255,0.08); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.15); border-radius: 9999px;",
              },
            },
            [
              el("span", {
                attrs: {
                  style:
                    "width: 6px; height: 6px; border-radius: 50%; background: var(--color-primary-blue); box-shadow: 0 0 8px var(--color-primary-blue);",
                },
              }),
              el("span", {
                class: "label-mono",
                attrs: {
                  style:
                    "color: var(--color-primary-blue); font-size: 11px; letter-spacing: 0.12em;",
                },
                text: "LIVE EVENTS / NOW BOOKING",
              }),
            ]
          ),

          // Headline
          el(
            "h1",
            {
              attrs: {
                style:
                  "font-family: " +
                  FONT +
                  "; font-size: clamp(48px, 8vw, 88px); font-weight: 500; letter-spacing: -0.04em; line-height: 1; margin: 0 0 24px 0; color: var(--color-white);",
              },
            },
            [
              document.createTextNode("Your Ticket to "),
              el("br"),
              el(
                "span",
                {
                  attrs: { style: "color: var(--color-primary-blue);" },
                },
                [document.createTextNode("Unforgettable Live Music.")]
              ),
            ]
          ),

          // Sub
          el("p", {
            attrs: {
              style:
                "font-family: " +
                FONT +
                "; font-size: 18px; line-height: 1.6; color: rgba(255,255,255,0.7); margin: 0 auto 48px auto; max-width: 640px;",
            },
            text:
              "Discover upcoming events, secure your favorite seats instantly, and get ready for the show.",
          }),

          // Actions
          el(
            "div",
            {
              attrs: {
                style: "display: flex; flex-wrap: wrap; gap: 16px; justify-content: center;",
              },
            },
            actions
          ),
        ]
      ),
    ]
  );
}

// ──────────────────────────────────────────────────────────────
// Trending Experiences
// ──────────────────────────────────────────────────────────────
function renderTrendingSection(host: HTMLElement): HTMLElement {
  return el(
    "section",
    {
      attrs: { style: "padding: 96px 0; background: var(--color-white);" },
    },
    [
      el(
        "div",
        {
          attrs: { style: "max-width: 1200px; margin: 0 auto; padding: 0 24px;" },
        },
        [
          // Section header
          el(
            "div",
            {
              attrs: {
                style:
                  "display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 16px; margin-bottom: 40px;",
              },
            },
            [
              el("div", {}, [
                el("h2", {
                  attrs: {
                    style:
                      "font-family: " +
                      FONT +
                      "; font-size: clamp(28px, 4vw, 40px); font-weight: 500; letter-spacing: -0.02em; margin: 0 0 8px 0; color: var(--color-midnight);",
                  },
                  text: "Trending Experiences",
                }),
                el("p", {
                  attrs: {
                    style:
                      "font-family: " +
                      FONT +
                      "; color: var(--color-text-muted); font-size: 14px; max-width: 480px; margin: 0;",
                  },
                  text:
                    "Curated access to the most anticipated tours and exclusive venue residencies.",
                }),
              ]),
              el("a", {
                class: "label-mono",
                attrs: {
                  href: "#/dashboard",
                  style:
                    "color: var(--color-midnight); text-decoration: none; font-size: 11px; letter-spacing: 0.12em;",
                },
                text: "VIEW ALL ROSTER →",
              }),
            ]
          ),

          host,
        ]
      ),
    ]
  );
}

async function loadTrending(host: HTMLElement): Promise<void> {
  try {
    const all = await bookingApi.listConcerts();
    const featured = all
      .filter((c) => c.status === "on_sale" || c.status === "upcoming")
      .slice(0, 3);

    if (featured.length === 0) {
      mount(
        host,
        el("p", {
          attrs: {
            style:
              "grid-column: 1 / -1; text-align: center; color: var(--color-text-muted); font-family: " +
              FONT +
              "; padding: 48px 0;",
          },
          text: "No upcoming events yet — check back soon.",
        })
      );
      return;
    }

    mount(host, ...featured.map((c, idx) => eventCard(c, idx)));
  } catch {
    mount(
      host,
      el("p", {
        attrs: {
          style:
            "grid-column: 1 / -1; text-align: center; color: var(--color-text-muted); font-family: " +
            FONT +
            "; padding: 48px 0;",
        },
        text: "Couldn't load events right now. Please try again later.",
      })
    );
  }
}

function eventCard(concert: Concert, idx: number): HTMLElement {
  const imgSrc = concert.image_url || FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length];
  const datePill = formatDatePill(concert.concert_datetime);
  const statusText = concert.status === "on_sale" ? "ON SALE" : "UPCOMING";

  const card = el(
    "a",
    {
      attrs: {
        href: "#/dashboard",
        style:
          "display: block; text-decoration: none; color: inherit; background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-container); box-shadow: var(--shadow-card); overflow: hidden; transition: transform 0.2s ease, box-shadow 0.2s ease;",
      },
      on: {
        mouseenter: (e) => {
          const t = e.currentTarget as HTMLElement;
          t.style.transform = "translateY(-4px)";
          t.style.boxShadow = "0 16px 40px rgba(1,1,32,0.12)";
        },
        mouseleave: (e) => {
          const t = e.currentTarget as HTMLElement;
          t.style.transform = "none";
          t.style.boxShadow = "var(--shadow-card)";
        },
      },
    },
    [
      // Image
      el(
        "div",
        {
          attrs: {
            style:
              "position: relative; width: 100%; aspect-ratio: 16 / 10; background: var(--color-midnight); overflow: hidden;",
          },
        },
        [
          el("img", {
            attrs: {
              src: imgSrc,
              alt: concert.title,
              loading: "lazy",
              style:
                "width: 100%; height: 100%; object-fit: cover; display: block;",
              onerror: "this.style.display='none'",
            },
          }),
          datePill
            ? el(
              "div",
              {
                attrs: {
                  style:
                    "position: absolute; top: 12px; right: 12px; padding: 6px 12px; background: rgba(255,255,255,0.92); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-radius: 9999px; font-family: " +
                    FONT +
                    "; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; color: var(--color-midnight);",
                },
                text: datePill,
              },
              []
            )
            : null,
        ]
      ),

      // Body
      el(
        "div",
        { attrs: { style: "padding: 20px 20px 24px 20px;" } },
        [
          // Tag pills
          el(
            "div",
            { attrs: { style: "display: flex; gap: 6px; margin-bottom: 12px;" } },
            [
              el("span", {
                class: "pill pill--ok",
                attrs: { style: "font-size: 9px;" },
                text: statusText,
              }),
            ]
          ),
          // Title
          el("h3", {
            attrs: {
              style:
                "font-family: " +
                FONT +
                "; font-size: 18px; font-weight: 500; letter-spacing: -0.01em; color: var(--color-midnight); margin: 0 0 6px 0;",
            },
            text: concert.title,
          }),
          // Artist as description
          el("p", {
            attrs: {
              style:
                "font-family: " +
                FONT +
                "; color: var(--color-text-muted); font-size: 13px; line-height: 1.5; margin: 0 0 16px 0;",
            },
            text: concert.artist,
          }),
          // Venue
          el(
            "div",
            {
              class: "label-mono",
              attrs: {
                style:
                  "display: flex; align-items: center; gap: 6px; font-size: 10px; letter-spacing: 0.1em; color: var(--color-text-muted); border-top: 1px solid var(--color-border); padding-top: 12px;",
              },
            },
            [
              el("span", { attrs: { style: "opacity: 0.6;" }, text: "▸" }),
              document.createTextNode(concert.venue.toUpperCase()),
            ]
          ),
        ]
      ),
    ]
  );

  return card;
}

function skeletonCard(_idx: number): HTMLElement {
  return el(
    "div",
    {
      attrs: {
        style:
          "background: var(--color-white); border: 1px solid var(--color-border); border-radius: var(--radius-container); overflow: hidden;",
      },
    },
    [
      el("div", {
        attrs: {
          style: "width: 100%; aspect-ratio: 16 / 10; background: rgba(1,1,32,0.06);",
        },
      }),
      el(
        "div",
        { attrs: { style: "padding: 20px;" } },
        [
          el("div", {
            attrs: {
              style:
                "height: 14px; width: 40%; background: rgba(1,1,32,0.08); border-radius: 4px; margin-bottom: 12px;",
            },
          }),
          el("div", {
            attrs: {
              style:
                "height: 18px; width: 70%; background: rgba(1,1,32,0.1); border-radius: 4px; margin-bottom: 8px;",
            },
          }),
          el("div", {
            attrs: {
              style:
                "height: 12px; width: 55%; background: rgba(1,1,32,0.06); border-radius: 4px;",
            },
          }),
        ]
      ),
    ]
  );
}

function formatDatePill(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const month = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const day = String(d.getDate()).padStart(2, "0");
  return `${month} ${day}`;
}

// ──────────────────────────────────────────────────────────────
// How It Works
// ──────────────────────────────────────────────────────────────
function renderHowItWorks(): HTMLElement {
  return el(
    "section",
    {
      attrs: {
        style:
          "padding: 96px 0; background: rgba(197, 246, 250, 0.25); border-top: 1px solid var(--color-border);",
      },
    },
    [
      el(
        "div",
        {
          attrs: { style: "max-width: 1200px; margin: 0 auto; padding: 0 24px;" },
        },
        [
          el("span", {
            class: "label-mono",
            attrs: {
              style:
                "display: block; color: var(--color-primary-blue); font-size: 11px; letter-spacing: 0.12em; margin-bottom: 12px;",
            },
            text: "BOOK IN 3 STEPS",
          }),
          el("h2", {
            attrs: {
              style:
                "font-family: " +
                FONT +
                "; font-size: clamp(28px, 4vw, 40px); font-weight: 500; letter-spacing: -0.02em; color: var(--color-midnight); margin: 0 0 48px 0;",
            },
            text: "How it works",
          }),
          el(
            "div",
            {
              attrs: {
                style:
                  "display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px;",
              },
            },
            [
              stepCard("01", "Browse", "Pick a show that moves you."),
              stepCard("02", "Secure Seats", "Lock in your favorite spot in real time."),
              stepCard("03", "Pay & Go", "Scan-and-go QR ticket the moment payment clears."),
            ]
          ),
        ]
      ),
    ]
  );
}

function stepCard(num: string, title: string, desc: string): HTMLElement {
  return el(
    "div",
    {
      attrs: {
        style:
          "background: rgba(255,255,255,0.6); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid var(--color-border); border-radius: var(--radius-container); padding: 32px; box-shadow: var(--shadow-card);",
      },
    },
    [
      el("div", {
        attrs: {
          style:
            "font-family: " +
            FONT +
            "; font-size: 48px; font-weight: 500; letter-spacing: -0.04em; line-height: 1; color: var(--color-primary-blue); margin-bottom: 16px;",
        },
        text: num,
      }),
      el("h3", {
        attrs: {
          style:
            "font-family: " +
            FONT +
            "; font-size: 20px; font-weight: 500; color: var(--color-midnight); margin: 0 0 8px 0;",
        },
        text: title,
      }),
      el("p", {
        attrs: {
          style:
            "font-family: " +
            FONT +
            "; color: var(--color-text-muted); font-size: 14px; line-height: 1.6; margin: 0;",
        },
        text: desc,
      }),
    ]
  );
}