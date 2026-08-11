# 🎨 GymPro UI/UX Blueprint for AI Design Generation

## 1. Global Design System & Tokens

### Color Palette (Dark Mode — Primary Theme)

**Backgrounds**
| Token | oklch Value | Usage |
|-------|-------------|-------|
| `--background` | `oklch(0.1 0.005 270)` | Page background — near-black with subtle blue undertone |
| `--card` | `oklch(0.145 0.005 270)` | Card surfaces — slightly lighter than background |
| `--popover` | `oklch(0.145 0.005 270)` | Dropdown/popover panels |
| `--muted` | `oklch(0.18 0.005 270)` | Muted surfaces, disabled states |
| `--accent` | `oklch(0.22 0.005 270)` | Accent backgrounds |
| `--secondary` | `oklch(0.2 0.005 270)` | Secondary button backgrounds |
| `--input` | `oklch(0.22 0.005 270)` | Input field backgrounds |
| `--sidebar` | `oklch(0.12 0.005 270)` | Sidebar background |

**Foregrounds / Text**
| Token | oklch Value | Usage |
|-------|-------------|-------|
| `--foreground` | `oklch(0.97 0 0)` | Primary text — near-white |
| `--card-foreground` | `oklch(0.97 0 0)` | Text on cards |
| `--muted-foreground` | `oklch(0.6 0 0)` | Secondary/muted text |
| `--accent-foreground` | `oklch(0.97 0 0)` | Text on accent backgrounds |
| `--secondary-foreground` | `oklch(0.97 0 0)` | Text on secondary buttons |

**Primary / Neon Lime (Brand Accent)**
| Token | oklch Value | Visual |
|-------|-------------|--------|
| `--primary` | `oklch(0.85 0.2 145)` | Vibrant neon lime green — the hero brand color |
| `--primary-foreground` | `oklch(0.13 0 0)` | Dark text on primary |
| `--neon` | `oklch(0.85 0.22 145)` | Slightly more saturated neon variant |
| `--ring` | `oklch(0.85 0.2 145)` | Focus rings match primary |

**Semantic Colors**
| Token | oklch Value | Visual |
|-------|-------------|--------|
| `--success` | `oklch(0.65 0.2 155)` | Green for completed states |
| `--warning` | `oklch(0.78 0.18 75)` | Amber/orange for warnings |
| `--danger` | `oklch(0.6 0.22 25)` | Red for destructive actions |

**Borders**
| Token | oklch Value | Usage |
|-------|-------------|-------|
| `--border` | `oklch(0.25 0.005 270)` | Standard border color — dark zinc |

**Chart Colors (Data Visualization)**
| Token | oklch Value | Visual |
|-------|-------------|--------|
| `--chart-1` | `oklch(0.85 0.2 145)` | Neon lime (primary data) |
| `--chart-2` | `oklch(0.7 0.18 200)` | Teal/cyan |
| `--chart-3` | `oklch(0.75 0.18 75)` | Amber |
| `--chart-4` | `oklch(0.6 0.22 25)` | Red/coral |
| `--chart-5` | `oklch(0.65 0.2 280)` | Purple/violet |

### Typography

| Element | Font Family | Weight | Tailwind Classes |
|---------|------------|--------|-----------------|
| H1 (Hero) | Geist Sans | Bold (700) | `text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl` |
| H2 (Section) | Geist Sans | Bold (700) | `text-3xl font-bold sm:text-4xl` |
| H3 (Card Title) | Geist Sans | Semibold (600) | `text-lg font-semibold` |
| H4 (Subsection) | Geist Sans | Bold (700) | `text-sm font-bold uppercase tracking-wider` |
| Body | Geist Sans | Regular (400) | `text-sm` or `text-base` |
| Caption | Geist Sans | Regular (400) | `text-xs text-muted-foreground` |
| Micro Label | Geist Sans | Medium (500) | `text-[10px] font-medium uppercase tracking-wider` |
| Tabular Numbers | Geist Mono | — | `tabular-nums font-bold` (for metrics/stats) |

**Font Variables:**
- `--font-geist-sans` → Geist Sans (body, headings)
- `--font-geist-mono` → Geist Mono (code, numbers)

### Spacing & Radius

**Spacing Scale (Tailwind defaults)**
| Pattern | Value | Usage |
|---------|-------|-------|
| `gap-1` / `gap-2` | 4-8px | Tight inline spacing |
| `gap-3` | 12px | Component internal spacing |
| `gap-4` / `gap-6` | 16-24px | Section spacing |
| `p-4` / `px-4` | 16px | Card/section padding |
| `p-6` / `px-6` | 24px | Page-level padding |
| `py-24` | 96px | Landing page section vertical padding |
| `mt-16` | 64px | Major section top margin |

**Border Radius Tokens**
| Token | Computed Value | Visual |
|-------|---------------|--------|
| `--radius` | `0.625rem` (10px) | Base radius |
| `rounded-lg` | ~10px | Buttons, inputs |
| `rounded-xl` | ~14px | Cards, avatar fallback |
| `rounded-2xl` | ~18px | Feature cards, modals, exercise cards |
| `rounded-full` | 9999px | Pills, avatars, badges |

### Effects & Glassmorphism

**Glassmorphism Card (`.card-elevated`)**
```css
border: 1px solid oklch(0.25 0.005 270 / 0.8)  /* zinc-800/80 */
background: oklch(0.18 0.005 270 / 0.5)          /* zinc-900/50 */
backdrop-filter: blur(24px)                        /* backdrop-blur-xl */
```

**Glassmorphism Hover (`.card-elevated-hover`)**
- On hover: border brightens to `zinc-700/80`, bg to `zinc-900/70`
- Shadow: `0 8px 32px oklch(0 0 0 / 0.3)`

**Neon Glow Effects**
| Class | Box Shadow |
|-------|-----------|
| `.glow-neon` | `0 0 20px oklch(0.85 0.2 145 / 0.25), 0 0 40px oklch(0.85 0.2 145 / 0.1)` |
| `.glow-neon-sm` | `0 0 10px oklch(0.85 0.2 145 / 0.2)` |

**Neon Gradient Text (`.text-gradient-neon`)**
```css
background: linear-gradient(90deg, oklch(0.85 0.22 145), oklch(0.8 0.2 160), oklch(0.75 0.18 200))
background-clip: text
-webkit-background-clip: text
color: transparent
```
Visual: Lime → Teal → Blue gradient on text.

**Press Scale (`.press-scale`)**
```css
transition: transform 0.15s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.15s ease;
&:active { transform: scale(0.95); opacity: 0.85; }
```

**Skeleton Shimmer (`.skeleton-shimmer`)**
- Background gradient: `oklch(0.18) → oklch(0.25) → oklch(0.18)` at 90°
- Animation: `shimmer 2s ease-in-out infinite` with 200% background-size

---

## 2. Layout Shells & Navigation

### Desktop Shell (≥768px)
```
┌─────────────────────────────────────────────────────────┐
│  [Admin: Amber top border gradient 4px]                 │
│  [Admin Header: Back arrow | Shield icon "Admin Mode"]  │
│  ─────────────────────────────────────────────────────── │
│                                                         │
│  Main Content Area (scrollable, flex-1)                 │
│  padding: p-4 md:p-6                                    │
│  gap: gap-6                                             │
│                                                         │
│  No sidebar — full-width single column                  │
└─────────────────────────────────────────────────────────┘
```

**Key Layout Details:**
- Body: `min-h-full flex flex-col pb-16 md:pb-0` (bottom padding for mobile nav)
- Admin layout: `flex min-h-screen flex-col bg-zinc-950`
- Admin amber top bar: `h-1 w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500`
- Admin header: `border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl` with `px-4 py-3`

### Mobile Shell (<768px)
```
┌────────────────────────────┐
│  Header (sticky top-0)     │
│  bg-zinc-950/80            │
│  backdrop-blur-xl          │
│  border-b zinc-800/60      │
├────────────────────────────┤
│                            │
│  Scrollable Content        │
│  flex-1 flex-col gap-6 p-4 │
│                            │
├────────────────────────────┤
│  ─── gradient border top ──│
│  Bottom Nav (fixed)        │
│  bg-zinc-900/95            │
│  backdrop-blur-xl          │
│  pb-[env(safe-area-inset)] │
│  z-40                      │
│  ┌──────┬──────┬──────┬───┐│
│  │Home  │Work  │Msg   │Me ││
│  │ 🏠   │ 💪   │ 💬   │ 👤││
│  └──────┴──────┴──────┴───┘│
└────────────────────────────┘
```

### Mobile Bottom Navigation

| Tab | Icon | Route | Active State |
|-----|------|-------|-------------|
| Home | `Home` | `/dashboard` | Neon lime icon + text, bg-primary/15, glow-neon-sm, dot indicator above |
| Workouts | `Dumbbell` | `/user/session` | Same neon treatment |
| Messages | `MessageSquare` | `/user/messages` | Same neon treatment |
| Profile | `User` | `/user/dashboard` | Same neon treatment |

**Active state visual:**
- Icon container: `size-10 rounded-xl bg-primary/15 glow-neon-sm`
- Icon scales up: `scale-110`
- Dot indicator: `absolute -top-1 h-1 w-1 rounded-full bg-primary`
- Text: `text-[10px] font-medium text-primary`

**Inactive state:**
- Icon container: `bg-transparent group-hover:bg-zinc-800/50`
- Text: `text-muted-foreground`

**Top border:** `h-px bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent`

---

## 3. Core Component Inventory (Atoms & Molecules)

### Buttons

**Variants:**
| Variant | Background | Text | Border | Hover Effect |
|---------|-----------|------|--------|-------------|
| `default` (Neon) | `bg-primary` (neon lime) | `text-primary-foreground` (dark) | none | `hover:bg-primary/90`, neon glow shadow `0 0 20px oklch(0.85_0.2_145/0.3)` |
| `gradient` | `bg-gradient-to-r from-[oklch(0.85_0.22_145)] via-[oklch(0.8_0.2_160)] to-[oklch(0.75_0.18_200)]` | `text-[oklch(0.13_0_0)]` | none | `hover:shadow-[0_0_24px...]`, `hover:brightness-110` |
| `outline` | `bg-background` | `text-foreground` | `border-border` | `hover:bg-muted` |
| `secondary` | `bg-secondary` | `text-secondary-foreground` | none | Subtle darken |
| `ghost` | transparent | `text-foreground` | none | `hover:bg-muted` |
| `destructive` | `bg-destructive/10` | `text-destructive` (red) | none | `hover:bg-destructive/20` |
| `success` | `bg-success/15` | `text-success` (green) | none | `hover:bg-success/25` |
| `warning` | `bg-warning/15` | `text-warning` (amber) | none | `hover:bg-warning/25` |
| `link` | none | `text-primary` | none | `hover:underline` |

**Sizes:**
| Size | Height | Padding | Radius | Text |
|------|--------|---------|--------|------|
| `xs` | `h-7` | `px-2` | `rounded-[10px]` | `text-xs` |
| `sm` | `h-9` | `px-3` | `rounded-[12px]` | `text-[0.8rem]` |
| `default` | `h-11` | `px-4` | `rounded-lg` | `text-sm` |
| `lg` | `h-12` | `px-5` | `rounded-lg` | `text-base` |
| `xl` | `h-14` | `px-6` | `rounded-lg` | `text-lg font-bold` |
| `icon` | `size-11` | — | `rounded-lg` | — |
| `icon-sm` | `size-9` | — | `rounded-[12px]` | — |

**Interactive States:**
- Focus: `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50`
- Active (press): `active:scale-95 active:opacity-85` (built into base)
- Disabled: `disabled:pointer-events-none disabled:opacity-50`
- All buttons use `.press-scale` class for tactile feedback

### Cards

**Standard Card Anatomy:**
```
┌─────────────────────────────────────┐
│ CardHeader (optional)               │
│  padding: px-(--card-spacing)       │
│  CardTitle: text-base font-semibold │
│  CardDescription: text-sm muted     │
├─────────────────────────────────────┤
│ CardContent                         │
│  padding: px-(--card-spacing)       │
│  Variable spacing via --card-spacing│
├─────────────────────────────────────┤
│ CardFooter (optional)               │
│  border-t zinc-800/60               │
│  bg-zinc-900/30                     │
│  rounded-b-xl                       │
└─────────────────────────────────────┘
```

**Card Styling:**
- Border: `1px solid oklch(0.25 0.005 270 / 0.8)` (zinc-800/80)
- Background: `oklch(0.18 0.005 270 / 0.5)` (zinc-900/50)
- Backdrop: `blur(24px)` (backdrop-blur-xl)
- Border radius: `rounded-xl` (14px)
- Hoverable variant adds: `hover:border-zinc-700/80 hover:bg-zinc-900/70 hover:shadow-[0_8px_32px_oklch(0_0_0/0.3)]`

### Inputs & Forms

**Input Anatomy:**
```
┌──────────────────────────────────────┐
│  📝  Placeholder text...             │
│  height: h-12 (48px touch target)    │
│  border: 1px zinc-800/80             │
│  bg: zinc-900/50                     │
│  backdrop-blur-xl                    │
│  padding: px-3.5 py-3               │
│  radius: rounded-lg                  │
│  text: text-base → md:text-sm        │
└──────────────────────────────────────┘
```

**Focus State:** `border-[oklch(0.85_0.2_145)]` (neon lime) + `ring-3 ring-[oklch(0.85_0.2_145/0.2)]`
**Error State:** `border-destructive` + `ring-destructive/20`
**Disabled:** `bg-input/50 opacity-50 cursor-not-allowed`

### Data Display

**Table:**
- Container: `w-full overflow-x-auto`
- Header row: `h-10 border-b`
- Body rows: `border-b transition-colors hover:bg-muted/50`
- Cell padding: `p-2`
- Text: `text-sm`

**Badge Variants:**
| Variant | Style |
|---------|-------|
| `default` | `bg-primary text-primary-foreground` (neon lime bg, dark text) |
| `secondary` | `bg-secondary text-secondary-foreground` |
| `destructive` | `bg-destructive/10 text-destructive` (red tint) |
| `outline` | `border-border text-foreground` |
| Height | `h-5`, rounded-full (`rounded-4xl`) |

**Role-Specific Badges (Admin Dashboard):**
| Role | Border | Background | Text Color |
|------|--------|------------|-----------|
| Admin | `border-amber-500/20` | `bg-amber-500/10` | `text-amber-400` |
| Coach | `border-[oklch(0.85_0.2_145)/0.2]` | `bg-[oklch(0.85_0.2_145)/0.1]` | `text-[oklch(0.85_0.2_145)]` |
| User | `border-zinc-700` | `bg-zinc-800/60` | `text-muted-foreground` |

**Progress Ring:**
- SVG circle, size configurable (default 72px), strokeWidth 5
- Neon lime stroke with animated fill
- Centered count label
- Animation: `progress-ring-fill 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards`

### Feedback

**Skeleton:**
- Default: `animate-pulse bg-muted rounded-md`
- Shimmer variant: `.skeleton-shimmer` with gradient sweep animation
- Used extensively: skeleton cards, rows, avatars, pills

**Toast (Sonner):**
- Positioned bottom-right
- Used for success/error/info notifications

**Dialog/Modal:**
- Backdrop: `fixed inset-0 bg-black/60 backdrop-blur-sm`
- Content: `w-full max-w-lg rounded-2xl border border-zinc-800/80 bg-zinc-950 shadow-2xl backdrop-blur-xl`
- Header padding: `p-6 pb-4`
- Footer: `flex justify-end gap-2 p-6 pt-0`

**Sheet (Slide-over Panel):**
- Backdrop: `bg-black/60 backdrop-blur-sm`
- Content: `bg-popover p-6 shadow-lg` with `w-3/4 sm:max-w-sm`
- Right panel (default): `inset-y-0 right-0 border-l`
- Slide animation: 300ms ease-in-out

---

## 4. Screen-by-Screen Blueprint

### `/` — Landing Page

**Purpose:** Marketing homepage for unauthenticated visitors

**Layout Structure:**
```
┌─────────────────────────────────────────────────┐
│ HERO SECTION                                     │
│ border-b zinc-800/50                             │
│ bg-gradient-to-br from-primary/5 via-transparent│
│ max-w-7xl mx-auto px-4 py-24                    │
│                                                  │
│  ┌───────────────────────────────────────────┐   │
│  │        "GymPro" (text-gradient-neon)      │   │
│  │        text-4xl → sm:text-6xl → lg:text-7xl│  │
│  │                                           │   │
│  │  Subtitle text-lg text-muted-foreground   │   │
│  │                                           │   │
│  │  [Sign In] (neon button) [Create Account] │   │
│  │  (secondary button)                       │   │
│  │                                           │   │
│  │  "Free forever. No credit card required." │   │
│  └───────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│ FEATURES BENTO GRID                              │
│ border-b zinc-800/50, py-24                      │
│ H2: "Everything you need to crush your goals"   │
│ grid sm:grid-cols-2 lg:grid-cols-3, gap-6       │
│                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ 💪 Icon  │ │ 💬 Icon  │ │ 📈 Icon  │        │
│  │ Title    │ │ Title    │ │ Title    │        │
│  │ Desc     │ │ Desc     │ │ Desc     │        │
│  └──────────┘ └──────────┘ └──────────┘        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ 🏆 Icon  │ │ ⚡ Icon  │ │ 🛡️ Icon  │        │
│  └──────────┘ └──────────┘ └──────────┘        │
├─────────────────────────────────────────────────┤
│ TESTIMONIALS                                     │
│ border-b zinc-800/50, py-24                      │
│ H2: "Loved by fitness pros"                      │
│ grid md:grid-cols-3, gap-8                       │
│                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ ⭐⭐⭐⭐⭐ │ │ ⭐⭐⭐⭐⭐ │ │ ⭐⭐⭐⭐⭐ │        │
│  │ Quote    │ │ Quote    │ │ Quote    │        │
│  │ Name     │ │ Name     │ │ Name     │        │
│  └──────────┘ └──────────┘ └──────────┘        │
├─────────────────────────────────────────────────┤
│ PRICING                                          │
│ py-24                                            │
│ H2: "Simple, transparent pricing"               │
│ grid lg:grid-cols-3, gap-8                       │
│                                                  │
│  ┌──────────┐ ┌════════════┐ ┌──────────┐      │
│  │ Free     │ ║ Pro $19/mo ║ │ Team     │      │
│  │ $0       │ ║ "Most Pop" ║ │ $49/mo   │      │
│  │          │ ║ glow-neon  ║ │          │      │
│  │ [CTA]    │ ║ [CTA]      ║ │ [CTA]    │      │
│  └──────────┘ └════════════┘ └──────────┘      │
├─────────────────────────────────────────────────┤
│ CTA SECTION                                      │
│ border-t zinc-800/50, py-24                      │
│ H2: "Ready to level up?"                         │
│ [Start Free Today] (neon button glow-neon-sm)    │
│ Trust: 👥 1,247+ Users | ⏰ Free Forever | 🛡 Secure│
├─────────────────────────────────────────────────┤
│ FOOTER                                           │
│ border-t zinc-800/50, py-12                      │
│ "GymPro" text-gradient-neon | © 2024             │
└─────────────────────────────────────────────────┘
```

**Feature Card Anatomy:**
- Container: `rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-6`
- Hover: `hover:border-primary/30 hover:bg-zinc-900/80`
- Icon: `size-12 rounded-xl bg-primary/10 text-primary`, hover `group-hover:bg-primary/20`
- Title: `text-lg font-semibold`
- Description: `text-sm text-muted-foreground`

**Pricing Card (Popular):**
- Border: `border-primary/50`
- Background: `bg-zinc-900/80`
- Shadow: `.glow-neon`
- Badge: `absolute -top-4 rounded-full bg-primary px-4 py-1 text-xs font-semibold`

### `/user/dashboard` — User Dashboard ("My Week")

**Purpose:** User's weekly workout overview

**Layout:**
```
┌──────────────────────────────────────┐
│ HEADER (sticky top-0, z-40)          │
│ border-b zinc-800/60                 │
│ bg-zinc-950/80 backdrop-blur-xl      │
│ px-4 py-3                            │
│ "My Week" text-lg font-bold          │
├──────────────────────────────────────┤
│ GREETING + PROGRESS                  │
│ flex justify-between                 │
│                                      │
│ Left:                                │
│   "Good Morning" text-sm muted       │
│   "FirstName" text-2xl font-bold     │
│   Plan description text-xs muted     │
│                                      │
│ Right:                               │
│   ProgressRing (size 72, neon)       │
│   "this week" label                  │
├──────────────────────────────────────┤
│ WEEKLY PILLS                         │
│ flex gap-2                           │
│ [🏋 3 workout days] [✨ 2 completed] │
│ Pill styling: rounded-full border    │
│ zinc-800/50 bg-zinc-900/30 px-3 py-1.5│
├──────────────────────────────────────┤
│ DAY SELECTOR                         │
│ Horizontal scroll of day cards       │
│ Each: h-16 w-16 rounded-2xl         │
│ Active: bg-primary/15 border-primary │
│ Completed: checkmark overlay         │
├──────────────────────────────────────┤
│ EXERCISE LIST                        │
│ H3: "Monday · Today" (uppercase)     │
│ Stagger animation                    │
│                                      │
│ ┌──────────────────────────────┐    │
│ │ ExercisePreviewCard          │    │
│ │ Icon | Name | Sets×Reps @Wt  │    │
│ │ Rounded-xl, bg-zinc-900/50   │    │
│ └──────────────────────────────┘    │
│ ┌──────────────────────────────┐    │
│ │ ExercisePreviewCard          │    │
│ └──────────────────────────────┘    │
├──────────────────────────────────────┤
│ STICKY BOTTOM CTA (fixed, z-40)     │
│ border-t zinc-800/60                │
│ bg-zinc-950/90 backdrop-blur-xl     │
│                                      │
│ [💪 Start Workout →]                │
│ variant="gradient" size="xl"        │
│ glow-neon press-scale               │
│ Full width                           │
└──────────────────────────────────────┘
```

### `/user/session/[id]` — Workout Session Tracker

**Purpose:** Active workout tracking with set-by-set logging

**Layout (Active Session):**
```
┌──────────────────────────────────────┐
│ HEADER (sticky top-0, z-40)          │
│ border-b zinc-800/60                 │
│ bg-zinc-950/80 backdrop-blur-xl      │
│                                      │
│ [← Back] "Active Session"  05:32     │
│ "3 of 12 sets completed"             │
├──────────────────────────────────────┤
│ PROGRESS BAR (h-1)                   │
│ bg-zinc-800/60 background            │
│ Gradient fill: lime → teal           │
│ width: animated percentage           │
├──────────────────────────────────────┤
│ EXERCISE TRACKERS                    │
│ flex flex-col gap-3 p-4              │
│                                      │
│ ┌──────────────────────────────┐    │
│ │ ExerciseCard (rounded-2xl)   │    │
│ │ border-zinc-800/60           │    │
│ │                              │    │
│ │ [💪] Bench Press    [3/4]    │    │
│ │ 4 × 10 @ 80kg              │    │
│ │ ─────────────────────────── │    │
│ │ [SetRow]  1  [- 82.5kg +] [- 10 reps +] [✓] │
│ │ [SetRow]  2  [- 82.5kg +] [- 10 reps +] [✓] │
│ │ [SetRow]  3  [- 82.5kg +] [- 10 reps +] [✓] │
│ │ [SetRow]  4  [- 80kg +]   [- 10 reps +] [○] │
│ └──────────────────────────────┘    │
├──────────────────────────────────────┤
│ STICKY BOTTOM BAR (fixed, z-40)     │
│ border-t zinc-800/60                │
│ bg-zinc-950/90 backdrop-blur-xl     │
│                                      │
│ [Gradient "Finish Workout" button]  │
│ Full width, size-xl                  │
└──────────────────────────────────────┘
```

**SetRow Anatomy:**
```
┌──────────────────────────────────────────────────────┐
│  border-2 (zinc-800/60 inactive, neon/0.25 complete)│
│  rounded-xl px-3 py-3                                │
│                                                      │
│  [Set#]  [-] [Weight] [+]  [-] [Reps] [+]  [Check] │
│  size-8   size-11   center  size-11  center  size-14 │
│  rounded  rounded  text-xl  rounded  text-xl rounded │
│  -lg      -xl     font-bold  -xl     font-bold -2xl  │
│                                                      │
│  Complete state:                                     │
│    Set#: bg-neon/15, neon text, Check icon           │
│    Weight/Reps: neon text color                      │
│    Check button: bg-neon, dark text, scale-110       │
└──────────────────────────────────────────────────────┘
```

**Rest Timer (Floating):**
```
Position: fixed bottom-24 left-4 right-4 z-50
Width: sm:w-80 (right-aligned on desktop)

┌────────────────────────────────┐
│ ▬▬▬▬▬▬ progress bar (h-0.5) ▬▬ │
│ REST        1:30               │
│ text-xs     text-3xl font-bold │
│ uppercase    tabular-nums      │
│              [↻] [⏸] [✕]      │
└────────────────────────────────┘

States:
- Normal: border-zinc-800/80 bg-zinc-900/95
- Warning (≤15s): border-amber-500/30 bg-amber-950/95
- Urgent (≤5s): border-red-500/30 bg-red-950/95
```

**PR Celebration Overlay:**
```
Position: fixed inset-0 z-50 pointer-events-none
Backdrop: bg-black/40 backdrop-blur-sm

┌────────────────────────────────────┐
│  Confetti particles (50 total)     │
│  Sparkle effects (12 points)       │
│                                    │
│      ┌────────────────────┐       │
│      │  Outer glow         │       │
│      │  (pulsing neon)     │       │
│      │                     │       │
│      │  ┌─────────────┐   │       │
│      │  │  🏆 Trophy   │   │       │
│      │  │  (gradient)  │   │       │
│      │  └─────────────┘   │       │
│      │                     │       │
│      │  "NEW PR!"          │       │
│      │  text-gradient-neon │       │
│      │                     │       │
│      │  Bench Press        │       │
│      │  80kg → 82.5kg      │       │
│      │  +3%                │       │
│      └────────────────────┘       │
└────────────────────────────────────┘

Animation: pr-bounce-in 0.6s
Card: rounded-3xl border neon/0.3 bg-zinc-900/80 backdrop-blur-2xl
```

### `/admin/dashboard` — Mission Control

**Purpose:** Admin observability dashboard

**Layout:**
```
┌──────────────────────────────────────┐
│ AMBER TOP BAR (admin indicator)      │
│ h-1 gradient amber                   │
├──────────────────────────────────────┤
│ ADMIN HEADER                         │
│ [← Back] [🛡 Admin Mode]  [⌘K] [A] │
│ border-b zinc-800/60                 │
│ bg-zinc-950/80 backdrop-blur-xl      │
├──────────────────────────────────────┤
│ PAGE HEADER                          │
│ "Mission Control" text-2xl font-bold │
│ "Real-time platform observability"   │
├──────────────────────────────────────┤
│ HEALTH GRID                          │
│ grid grid-cols-2 lg:grid-cols-4      │
│ gap-4                                │
│                                      │
│ [👥 Users] [🏃 Sessions] [📋 Plans] [⚡ Volume]│
│ Each card: flex items-center gap-3   │
│ Icon bg + value + label + subtitle   │
├──────────────────────────────────────┤
│ ERROR RATE + ACTIVITY FEED           │
│ grid lg:grid-cols-2 gap-6            │
│                                      │
│ ┌─────────────┐ ┌─────────────┐    │
│ │ ⚠ Error Rate│ │ 🕐 Live     │    │
│ │ (24h)       │ │ Activity    │    │
│ │ [Recharts]  │ │ Feed list   │    │
│ │ line chart  │ │ live dots   │    │
│ └─────────────┘ └─────────────┘    │
├──────────────────────────────────────┤
│ QUICK ACTIONS                        │
│ [View Sentry] [PostHog] [Convex] [Vercel]│
│ Buttons: variant="outline" size="sm"│
│ border-zinc-700 bg-zinc-800/50      │
├──────────────────────────────────────┤
│ USER MANAGEMENT TABLE                │
│ Card with search + role filters      │
│ Columns: User, Role, Sessions, Plans,│
│          Joined, Actions             │
│ Row hover: bg-zinc-900/30           │
└──────────────────────────────────────┘
```

### `/coach/dashboard` — Coach Dashboard

**Purpose:** Coach's client management view

**Layout:**
```
┌──────────────────────────────────────┐
│ HEADER (sticky top-0)                │
│ border-b zinc-800/60                 │
│ bg-zinc-950/80 backdrop-blur-xl      │
│ "Coach Dashboard" text-lg font-bold  │
│ [ChatPanel trigger button]           │
├──────────────────────────────────────┤
│ CLIENT ROSTER                        │
│ Card: border-zinc-800/80 bg-zinc-900/50│
│                                      │
│ Search input + filter tabs           │
│                                      │
│ ┌──────────────────────────────┐    │
│ │ Client Row                   │    │
│ │ [Avatar] Name | Email        │    │
│ │ Status pill | Last Active    │    │
│ │ [Message] [View Plan]        │    │
│ └──────────────────────────────┘    │
│ ┌──────────────────────────────┐    │
│ │ Client Row                   │    │
│ └──────────────────────────────┘    │
└──────────────────────────────────────┘
```

### `/coach/plans/new` — Plan Builder

**Purpose:** Create new training plans for clients

**Layout:**
```
┌──────────────────────────────────────┐
│ HEADER                               │
│ [← Back] "Create New Plan"           │
├──────────────────────────────────────┤
│ PLAN FORM                            │
│ flex flex-col gap-6 p-4              │
│                                      │
│ Title input (h-12)                   │
│ Description textarea                 │
│ Client selector (dropdown)           │
│ Date range picker                    │
│                                      │
│ DAY TABS                             │
│ [Mon] [Tue] [Wed] [Thu] [Fri] [Sat] [Sun]│
│                                      │
│ EXERCISE GRID (per day)              │
│ ┌──────────────────────────────┐    │
│ │ Exercise: [name]             │    │
│ │ Sets: [- 3 +] Reps: [- 10 +]│    │
│ │ Weight: [- 80 +] kg          │    │
│ │ [Remove]                      │    │
│ └──────────────────────────────┘    │
│ [+ Add Exercise]                     │
│                                      │
│ STICKY BOTTOM CTA                   │
│ [Create Plan] gradient button        │
└──────────────────────────────────────┘
```

---

## 5. Micro-Interactions & State Design

### Loading States

**Dashboard Skeleton:**
```
┌──────────────────────────────────────┐
│ HEADER skeleton                      │
│ h-5 w-32 animate-pulse               │
├──────────────────────────────────────┤
│ GREETING skeleton                    │
│ h-4 w-32 + h-7 w-48 + h-3 w-40     │
│ [72px circle skeleton]              │
├──────────────────────────────────────┤
│ PILLS skeleton                       │
│ h-8 w-32 rounded-full               │
│ h-8 w-28 rounded-full               │
├──────────────────────────────────────┤
│ DAY SELECTOR skeleton                │
│ 5× h-16 w-16 rounded-2xl            │
├──────────────────────────────────────┤
│ EXERCISE CARDS skeleton              │
│ 3× ExercisePreviewCardSkeleton       │
│ Each: icon + text lines + badge     │
└──────────────────────────────────────┘
```

**Session Tracker Skeleton:**
```
Header: skeleton back button + title + subtitle
Progress bar: skeleton 1/3 width
Main: 2× ExerciseTrackerSkeleton
  Each: icon + title + 3× SetRowSkeleton
    SetRow: set# + weight stepper + reps stepper + check button
```

### Empty States

**No Active Plan:**
```
┌──────────────────────────────────────┐
│                                      │
│      ┌──────────────────┐           │
│      │  Glowing icon    │           │
│      │  (blur-2xl bg)   │           │
│      │  📅 CalendarOff  │           │
│      └──────────────────┘           │
│                                      │
│      "No active plan" text-2xl       │
│      "You don't have a workout      │
│       plan assigned yet..."          │
│                                      │
│      [Contact Coach] gradient btn    │
│      [Back to Dashboard] ghost btn   │
└──────────────────────────────────────┘
```

**No Exercises Today (Rest Day):**
```
┌──────────────────────────────────────┐
│ [Timer icon in rounded-2xl box]      │
│ "No exercises today" text-xl         │
│ "Today is a rest day..."            │
│ [Back to Dashboard] outline btn     │
└──────────────────────────────────────┘
```

**Empty Day in Dashboard:**
```
┌──────────────────────────────────────┐
│ border-dashed zinc-800/60            │
│ rounded-2xl py-12                    │
│ 💪 icon text-zinc-700               │
│ "No exercises for this day"          │
└──────────────────────────────────────┘
```

### CSS Keyframe Animations

| Animation | Duration | Easing | Effect |
|-----------|----------|--------|--------|
| `page-enter` | 0.4s | `cubic-bezier(0.22, 1, 0.36, 1)` | Fade up from 12px |
| `page-fade-in` | 0.3s | `ease-out` | Simple opacity fade |
| `stagger-in` | 0.4s | `cubic-bezier(0.22, 1, 0.36, 1)` | Children animate in sequence (60ms delay each) |
| `shimmer` | 2s | `ease-in-out` | Background position sweep for skeletons |
| `pr-bounce-in` | 0.6s | `cubic-bezier(0.22, 1, 0.36, 1)` | Scale 0.3 → 1.05 → 0.9 → 1 |
| `confetti-fall` | 1-2.5s | `ease-in` | Fall from top, rotate 720°, fade out |
| `pulse-glow` | 2s | `ease-in-out` | Pulsing neon box-shadow |
| `progress-ring-fill` | 0.8s | `cubic-bezier(0.22, 1, 0.36, 1)` | SVG stroke-dashoffset animation |
| `progress-ring-count` | 0.5s | `cubic-bezier(0.22, 1, 0.36, 1)` | Scale 0.8 → 1 with 0.3s delay |

**Rest Timer Slide-in:**
- `animate-in slide-in-from-bottom-4 fade-in-0 duration-300`

**PR Celebration:**
- Card: `.animate-pr-bounce-in`
- Confetti: 50 particles with randomized positions, delays (0-0.5s), durations (1-2.5s), sizes (4-12px), colors (neon/teal/blue/amber)
- Sparkles: 12 radial points with staggered fade-in

---

*End of UI/UX Blueprint. This document contains 100% visual/structural descriptions with zero React/TypeScript code. Ready for AI design generation tools.*
