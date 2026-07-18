# Waraqa Design System

**Phase:** 2 — Design System and RTL Foundation  
**Status:** COMPLETE — OWNER APPROVED (Round 05 final brand colors)  
**CLI recorded:** `shadcn@4.13.1` (RTL enabled in `components.json`)

## Principles

- Syrian in spirit, modern, independent — never governmental.
- Calm, premium, spacious — content and typography lead; decoration is secondary.
- Deep green is primary action; gold is accent only (never CTA fill).
- Body text uses dark ink neutrals; helpers stay readable (ink-700).
- Default canvas is solid (canvas / ivory / white) — not a patterned wallpaper.
- Status colors keep semantic meaning; never color alone.
- Logical CSS / RTL-first. No ministry emblems or seals.
- Independence disclaimer appears **once**, in the public footer only.

## Brand palette

| Token | Value | Permitted use | Forbidden use |
| --- | --- | --- | --- |
| `brand-950` | `#062f2b` | Active/pressed primary; one dark feature band | Large patterned page backgrounds |
| `brand-900` | `#0a3d37` | Hover primary, wordmark | Body copy |
| `brand-800` | `#115149` | Primary actions | Gold replacement |
| `brand-700` | `#1f6b61` | Focus ring, borders | Status success substitute |
| `brand-100` | `#dff1ed` | Soft brand surfaces | Primary button fill |
| `brand-50` | `#f1faf8` | Soft canvas accents | Dark UI |
| `gold-700` | `#9b7632` | Tiny accent text; light pattern stroke | Body text on white |
| `gold-600` | `#b58c42` | Thin accent borders | Primary CTA fill |
| `gold-500` | `#c9a55d` | Decorative highlights | Large fills |
| `gold-100` | `#f4ead4` | Rare decorative wash | Yellow-looking pages |
| `ink-950` | `#14201e` | Body / headings | — |
| `ink-700` | `#3f4d4a` | Secondary prose, helpers | Disabled-only |
| `ink-500` | `#5c6b68` | Placeholders | Critical instructions |
| `border` | `#d5dedb` | Dividers, inputs | Text color |
| `surface` | `#ffffff` | Cards, dialogs, forms | — |
| `canvas` | `#f7faf8` | Default page background | — |
| `ivory` | `#fbf8f0` | Editorial / hero surfaces | Dominant page yellow |
| `success` | `#19734d` | Success only | Brand green substitute |
| `warning` | `#9a6700` | Warning only | Gold substitute |
| `danger` | `#b42318` | Errors / destructive | — |
| `info` | `#175cd3` | Informational only | — |

## Typography

| Role | Family | Weights | Notes |
| --- | --- | --- | --- |
| Brand name «ورقة» only | **Aref Ruqaa Ink** (`--font-waraqa-wordmark`) | 700 | Owner-selected; `BrandMark` only |
| Headings | **Alexandria** (`--font-waraqa-display`) | 600, 700 | Never for the brand word |
| Body + UI | **IBM Plex Sans Arabic** (`--font-waraqa-body`) | 400–700 | Default interface text |

Public bundle: Alexandria + IBM Plex + Aref Ruqaa Ink. **Lateef rejected** — not loaded.

### Brand mark

- Real selectable Arabic text «ورقة» via `BrandMark` (Aref Ruqaa Ink Bold).
- Variants (explicit semantic colors; never red / danger / gradient):
  - `primary` → `brand-900` on white / canvas / ivory
  - `reversed` → ivory / white on `brand-900` / `brand-950`
  - `ink` → `ink-950` for print / monochrome
- Aref Ruqaa Ink is a COLR font; `@font-palette-values` (`--waraqa-wm-*`) override built-in ink red.
- Sizes: compact ~32–40px · hero ~72–96px · footer ~26–30px
- Red remains reserved for destructive actions and validation errors only.

## Geometric motif

Interlaced diamond construction (not a single perimeter star):

- Light: `public/brand/waraqa-interlaced-star.svg`
- Dark: `public/brand/waraqa-interlaced-star-dark.svg`

Layers: vertical diamond · horizontal diamond · ±45° diagonals · center circle · four outer diamonds.

**Usage**

- Home hero: `HeroCornerMotifs` — max two partial corners (~3% opacity)
- Dark band: `DarkBandMotifs` — sparse large/small composition (~8–12%), no giant tile wallpaper
- Divider: compact horizontal line + central star (~64–88px)

Rejected/removed: compass silhouette, dense rosette tiles, Lateef wordmark.

## Independence statement (footer only)

```text
© 2026 ورقة — منصة إرشادية مستقلة — ليست موقعاً حكومياً
```

Solid ivory/white footer — no patterned wallpaper behind footer text.

## Spacing / radius / shadow

Major sections: ~48–64px mobile / ~72–96px desktop.  
Within sections: ~20–32px heading→content; ~16–24px related; ~12–16px compact groups.  
Radii: controls ~13px, cards 14–18px.  
Shadows: sm / md / lg — dialogs, drawers, menus, primary hover only.

## Component inventory

Button, Input, Textarea, Field/Label, Select, Checkbox, RadioCard, Badge, Callout, Card, Dialog, Drawer, Toast (Sonner), Skeleton, Breadcrumb, Progress — under `src/components/ui/`.  
Brand + decorative: `BrandMark` (Aref Ruqaa Ink), `WaraqaStarMotif`, `HeroCornerMotifs`, `DarkBandMotifs`, `GeometricDivider`, `PatternedSurface` (solid by default).  
Wordmark lab: `/dev/wordmark-lab` (selected Aref showcase; Lateef removed).

## Contrast notes

- Primary green on white and white on primary meet AA when used as designed.
- Do not use gold as body text on white.
- Footer disclaimer uses ink-700 on ivory for secondary but readable contrast.
- Motifs are decorative (`aria-hidden`, `pointer-events: none`) and must not reduce text contrast.
