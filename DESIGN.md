This new design system, **Together AI: Coastal Edition**, adapts the sophisticated, high-density typography of Together AI to a new palette inspired by your provided pastel blue and yellow set. It swaps the "midnight neon" aesthetic for a "bright, airy, and professional" atmosphere.

---

# Design System: Together AI (Coastal Edition)

## 1. Visual Theme & Atmosphere
This system evolves the Together AI "dreamscape" into a **Coastal-Native Cloud** aesthetic. It maintains the high-precision typography and enterprise-grade density but replaces the deep pinks and lavenders with a palette of sun-bleached blues and soft sands.

The atmosphere is optimistic and clear. The "dual-world" approach remains: a primary **Light Canvas** for platform overviews and a **Deep Midnight** universe for technical research. The contrast between the sharp, geometric type and the fluid, pastel blue-to-yellow gradients creates a feeling of "approachable power."

**Key Characteristics:**
* **Aqueous Gradients:** Soft transitions from sky blue to pale cream.
* **The "Midnight" Anchor:** Deep Blue-Black (#010120) provides the weight needed for enterprise trust.
* **Geometric Precision:** Sharp 4px corners and aggressive negative letter-spacing.
* **Sand & Sky Accents:** Replacing magentas with soft yellows and teals.

---

## 2. Color Palette & Roles

### Primary (From Image)
* **Primary Blue (#AAD6FA):** The lead brand color. Used for primary icons, gradient starts, and high-signal brand moments.
* **Accent Yellow (#FCE6A9):** The secondary brand color. Used for warm highlights and gradient endpoints.
* **Sky Tint (#C5F6FA):** Used for soft UI backgrounds, hover states on light surfaces, and secondary illustrations.
* **Cream Base (#FFF4C7):** A warm alternative to white for subtle section backgrounds or "paper" card effects.

### Neutrals & Surfaces
* **Dark Blue (#010120):** The primary dark surface. Used for the Research Section, Footer, and technical overlays.
* **Pure White (#FFFFFF):** The standard background for the "Business" side of the site.
* **Black 8% (rgba(0, 0, 0, 0.08)):** Borders and subtle dividers.
* **Glass Light (rgba(255, 255, 255, 0.12)):** Translucent elements on dark backgrounds.

---

## 3. Typography Rules
* **Primary Font:** "The Future" (Geometric Modernist)
* **Technical/Label Font:** "PP Neue Montreal Mono" (Uppercase)

| Role | Font | Size | Weight | Letter Spacing |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | The Future | 64px | 500 | **-1.92px** |
| **Section Heading** | The Future | 40px | 500 | **-0.8px** |
| **Body Large** | The Future | 18px | 400 | **-0.18px** |
| **Mono Label** | PP Neue Montreal Mono | 11px | 500 | **+0.055px** |

---

## 4. Component Stylings

### Buttons
* **Primary (Solid):** Background: `#010120` | Text: `#FFFFFF` | Radius: 4px.
* **Secondary (Glass):** Background: `#AAD6FA` at 20% opacity | Border: 1px solid `#AAD6FA` | Text: `#010120`.
* **Dark Mode Button:** Background: `rgba(255, 255, 255, 0.12)` | Text: `#FFFFFF` | Radius: 4px.

### Cards & Depth
* **Surface:** White or `#FFF4C7` (Cream).
* **Border:** 1px solid `rgba(0, 0, 0, 0.08)`.
* **Shadow:** `rgba(1, 1, 32, 0.06) 0px 4px 12px` (A very light blue-tinted shadow).
* **Radius:** 8px for containers; 4px for interactive elements inside.

---

## 5. Do’s and Don’ts

### ✅ Do
* Use **negative tracking** on all "The Future" headlines to keep them dense.
* Use the **#AAD6FA → #FCE6A9 gradient** for hero illustrations (clouds, waves, abstract flows).
* Keep **uppercase mono labels** for technical structure (e.g., "RESEARCH / APRIL 2026").
* Use **Dark Blue (#010120)** for the footer to anchor the airy palette.

### ❌ Don't
* **Don't** use pinks, oranges, or purples; stick strictly to the blue/yellow/cream spectrum.
* **Don't** use rounded "pill" buttons; keep the geometry sharp (4px).
* **Don't** use pure black for shadows; always use a subtle blue tint (`rgba(1, 1, 32, ...)`).
* **Don't** increase line-height; keep the "Together AI" density (1.10 – 1.30 max).

---

## 6. Agent Prompt Guide

> **Hero Section:** "Create a hero section on a Pure White background with a soft gradient illustration using #AFE6FA and #FFF4C7. Headline: 'The Intelligence Infrastructure,' Font: 'The Future', 64px, weight 500, spacing -1.92px. Primary CTA: Dark Blue #010120, 4px radius."

> **Stats Component:** "Design a row of 3 stat cards. Large numbers in #010120 at 48px. Labels in PP Neue Montreal Mono, 11px, uppercase, #AAD6FA. Border 1px solid rgba(0,0,0,0.08), 8px radius."

> **Technical Section:** "Design a full-width section with background #010120. All text in White. Include a badge using #C5F6FA at 12% opacity with #C5F6FA text, font Mono, uppercase."