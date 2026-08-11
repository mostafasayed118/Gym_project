---
name: Neon Precision
colors:
  surface: '#111508'
  surface-dim: '#111508'
  surface-bright: '#373b2c'
  surface-container-lowest: '#0c0f04'
  surface-container-low: '#1a1d10'
  surface-container: '#1e2113'
  surface-container-high: '#282b1d'
  surface-container-highest: '#333627'
  on-surface: '#e2e4cf'
  on-surface-variant: '#c4c9ac'
  inverse-surface: '#e2e4cf'
  inverse-on-surface: '#2f3223'
  outline: '#8e9379'
  outline-variant: '#444933'
  surface-tint: '#abd600'
  primary: '#ffffff'
  on-primary: '#283500'
  primary-container: '#c3f400'
  on-primary-container: '#556d00'
  inverse-primary: '#506600'
  secondary: '#e6feff'
  on-secondary: '#003739'
  secondary-container: '#00f4fe'
  on-secondary-container: '#006c71'
  tertiary: '#ffffff'
  on-tertiary: '#21323e'
  tertiary-container: '#d2e5f5'
  on-tertiary-container: '#556774'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#c3f400'
  primary-fixed-dim: '#abd600'
  on-primary-fixed: '#161e00'
  on-primary-fixed-variant: '#3c4d00'
  secondary-fixed: '#63f7ff'
  secondary-fixed-dim: '#00dce5'
  on-secondary-fixed: '#002021'
  on-secondary-fixed-variant: '#004f53'
  tertiary-fixed: '#d2e5f5'
  tertiary-fixed-dim: '#b6c9d8'
  on-tertiary-fixed: '#0b1d29'
  on-tertiary-fixed-variant: '#374956'
  background: '#111508'
  on-background: '#e2e4cf'
  surface-variant: '#333627'
typography:
  display-h1:
    fontFamily: Geist Sans
    fontSize: 72px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  display-h1-mobile:
    fontFamily: Geist Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Geist Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  body-md:
    fontFamily: Geist Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0em
  metric-lg:
    fontFamily: Geist Mono
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: -0.02em
  metric-sm:
    fontFamily: Geist Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.02em
  label-caps:
    fontFamily: Geist Mono
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.1em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1280px
  gutter: 24px
  margin-desktop: 48px
  margin-mobile: 20px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style
The design system is a high-performance, dark-mode framework tailored for elite fitness tracking and biometric data visualization. It targets a disciplined audience that demands clarity, technical accuracy, and a motivating, futuristic aesthetic. 

The style is a synthesis of **Glassmorphism** and **Minimalism**, utilizing deep obsidian surfaces, sharp technical typography, and vibrant "Neon Lime" energy. The emotional response is one of controlled intensity—merging the grit of a dark gym with the surgical precision of laboratory equipment. Layouts must feel expansive yet data-dense, emphasizing performance metrics through high-contrast accents against a neutral, monochromatic base.

## Colors
This design system operates on a rigorous dark-mode hierarchy to ensure maximum "neon" pop and reduced eye strain during low-light workouts.

- **Primary (Neon Lime):** `oklch(0.85 0.2 145)`. Use for primary actions, progress completion, and critical success metrics.
- **Secondary (Teal/Cyan):** `oklch(0.75 0.18 200)`. Use for secondary data streams, recovery metrics, and gradient transitions.
- **Background:** `#09090b` (Zinc-950). The bedrock of the UI.
- **Surface:** `#18181b` (Zinc-900) at 50% opacity. Always paired with a 24px backdrop blur to create depth.
- **Border:** `#27272a` (Zinc-800) at 80% opacity.
- **Admin/Warning:** Amber/Yellow is strictly reserved for administrative overlays or physical limit warnings. Do not use for general branding.

## Typography
The typography strategy leverages **Geist Sans** for structural UI and readability, while **Geist Mono** is utilized for all quantitative data, ensuring that changing numbers (heart rate, timers, weights) do not cause layout shift and maintain a technical, calibrated feel.

- **Headlines:** Should be tight, bold, and authoritative. Use the negative tracking on H1s to create a compact, high-impact look.
- **Metrics:** All numerical values must use Geist Mono. 
- **Labels:** Small utility text and category labels should use Geist Mono in all-caps to reinforce the "instrument panel" aesthetic.

## Layout & Spacing
The layout follows a **Fluid Grid** model with a 12-column structure on desktop and a 4-column structure on mobile. 

- **Data Density:** Use tight vertical spacing (`stack-sm`) for related data points within cards, but generous padding (`stack-lg`) between major content sections to prevent visual fatigue.
- **Safe Areas:** On mobile tracking screens, ensure a 20px side margin. Metrics should be centered or pinned to a strict grid to allow for quick "at-a-glance" reading during high-intensity movement.
- **Alignment:** All elements must align to a 4px baseline grid to maintain the "Precision" aspect of the brand.

## Elevation & Depth
Depth in this design system is achieved through **optical transparency** rather than traditional drop shadows.

- **The Glass Layer:** Surfaces use a 50% opaque Zinc-900 with a heavy 24px backdrop blur. This allows background movement or colors to bleed through subtly, maintaining a sense of place.
- **Borders as Structure:** Use a 1px solid Zinc-800 border (80% opacity) for all containers. This defines edges without needing heavy shadows.
- **Active Glow:** Reserved strictly for primary CTAs and active state indicators (e.g., a "Recording" workout pulse). Use a `20px` to `40px` spread shadow using the Neon Lime color at 30% opacity to simulate a light-emitting diode effect.

## Shapes
The shape language balances modern approachability with technical rigidity. 

- **Primary Containers:** Cards and major sections use a 16px (`rounded-2xl`) corner radius.
- **Interactive Elements:** Buttons and input fields follow the same 16px radius to ensure a cohesive tactile language.
- **Small Components:** Tags, chips, and checkboxes use a smaller 4px or 8px radius to feel sharper and more "engineered."

## Components
- **Buttons:** 
    - *Primary:* Linear gradient from Neon Lime to Teal (45 degrees). Text color must be the dark Background hex (`#09090b`) for maximum legibility.
    - *Secondary:* Ghost style with a 1px Neon Lime border and no fill.
- **Cards:** Use the surface treatment (blur + 50% opacity) with a 1px border. No internal shadows. Headlines within cards should be Geist Sans, while metrics are Geist Mono.
- **Inputs:** Dark background (#09090b), 1px Zinc-800 border. Upon focus, the border transitions to Neon Lime with a subtle 4px outer glow.
- **Progress Bars:** Background track is a semi-transparent Zinc-800. The progress fill is a solid Neon Lime, or a Lime-to-Teal gradient for multi-stage goals.
- **Chips/Status:** Small, high-contrast badges. Success states use Neon Lime; Admin/System states use the reserved Amber.
- **Charts:** Use thin 1.5pt lines for graphs. The area under the line should have a faint gradient fade using the Primary accent color.