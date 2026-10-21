# Design System: DMCloser — Quiet Precision
**Source of truth:** the shipped code in `src/styles/system.css` + `src/styles/app.css` + `src/components/*/*.css`.
**Status:** locked. These tokens are the product's identity; upstream's provisional blue palette is rejected (see §7).

This file is the brand and identity contract. Any new screen, component, or agent-generated
UI must match it. When the code and this file disagree, the code is the bug.

---

## 1. Visual Theme & Atmosphere

**Calm, dense, warm, and legible.** DMCloser is a working instrument, not a poster. It looks
like a well-kept desk: ivory paper, a forest-green pen, one small blue card, and a lot of air.
The user is a business owner on a phone between appointments and an agent on a desktop
mid-shift, so the interface is tuned for **many small decisions per hour** rather than for
first impression.

Three words describe it: **quiet** (nothing shouts), **precise** (every number has a
provenance), **grounded** (the palette is botanical, not corporate blue).

The identity is **"Less typing. More closing."** The visual job is to remove effort. That
means: high information density with generous line height, one accent colour used sparingly,
hairline borders instead of shadows, and a dark mode that feels like the same room at night
rather than a different product.

**Anti-goals:** no gradients on surfaces, no glassmorphism, no neon, no drop shadows on
cards, no pure black, no pure white, no saturated blue, no emoji, no illustration-driven
marketing. Marketing may use photography; the workspace never does.

---

## 2. Color Palette & Roles

### 2.1 Core tokens (normative — `src/styles/system.css`)

| Descriptive name | Hex | Token | Role |
|---|---|---|---|
| Porcelain Ivory | `#fafbf7` | `--land-bg` | App and page background. The default canvas. Never pure white. |
| Paper White | `#ffffff` | `--land-surface` | Cards, panels, rows, inputs. The raised surface. |
| Sage Mist | `#f0f3eb` | `--land-soft` | Recessed fills: selected rows, hover states, inset blocks, switch tracks. |
| Deep Forest Ink | `#242d23` | `--land-ink` | Body and heading text. Near-black with a green cast. |
| Moss Grey | `#626b5e` | `--land-muted` | Secondary text, metadata, placeholders, icons. |
| Hairline Fern | `#dfe4d9` | `--land-line` | All 1px borders and dividers. The only separator. |
| Forest Green | `#3b6b42` | `--land-green` | Accent: active nav, links, brand mark, positive status, iconography. |
| Deep Fern | `#294c31` | `--land-button` | Primary button fill, unread badges, dark-on-light action surfaces. |
| Button Paper | `#ffffff` | `--land-button-text` | Text on `--land-button`. |
| Check Mark White | `#ffffff` | `--mark-check` | The check stroke inside the speech-bubble brand mark. |
| Focus Fern | `#557b44` | `--focus-color` | Keyboard focus outline. **Light mode only — see §6.** |

### 2.2 Semantic status tokens

Status is **never** colour alone. Every status carries a text label and, where space allows,
an icon.

| Descriptive name | Hex | Token | Meaning | Pair |
|---|---|---|---|---|
| Amber Ochre | `#775b22` | `--warning-ink` | Review required / needs a human | `--warning-bg: #f7eedb` |
| Clay Rose | `#9b4040` | `--danger-ink` | Rejected / failed / destructive | `--danger-bg: #f8e8e5` |

### 2.3 Dark mode (`.dark` on `<html>`)

Dark mode is a **full re-mapping**, not an inversion. Dark surfaces are *warmer and greener*
than neutral slate, and the accent flips to a pale sage because the same forest green that
reads as "brand" on ivory reads as "too dark" on a night surface.

| Descriptive name | Hex | Token |
|---|---|---|
| Night Forest | `#131b15` | `--land-bg` |
| Bark Surface | `#19231b` | `--land-surface` |
| Fern Hollow | `#1c281e` | `--land-soft` |
| Moonlit Ivory | `#edf2e7` | `--land-ink` |
| Pale Sage | `#a5b19f` | `--land-muted` |
| Deep Fern Line | `#344132` | `--land-line` |
| Light Sage | `#b1d39d` | `--land-green` |
| Pale Moss Button | `#bed7aa` | `--land-button` |
| Dark Button Ink | `#1b321e` | `--land-button-text` |
| Dark Check | `#213c25` | `--mark-check` |
| Bright Fern Focus | `#bfd7a9` | `--focus-color` |
| Warm Gold | `#e2c887` | `--warning-ink` (bg `#3c3422`) |
| Soft Blush | `#ecc1b9` | `--danger-ink` (bg `#432d29`) |

### 2.4 Marketing-page extensions (landing only, `src/components/landing/landing.css`)

The landing page runs a lighter, more editorial variant of the same brand.

| Descriptive name | Hex | Role |
|---|---|---|
| Hero Sand | `#eeeee4` | Landing hero background. |
| Hero Ink | `#222c22` | Hero headline. |
| Hero Green | `#386741` | The brand word inside the hero headline. |
| Hero Body Grey | `#56604f` | Hero subheadline. |
| Hero Wash | `#f4f4e9` → `#f5f4e8` → transparent | Horizontal scrim over the hero photograph, left to right. |
| Deep Forest Hover | `#1e3e26` | Primary button hover on the landing page. |
| Sage Tint | `#dfe8d8` / `#4a623a` | Demo avatar, sage variant. |
| Peach Tint | `#f2e3d8` / `#755038` | Demo avatar, peach variant. |
| Lavender Tint | `#e9e4f0` / `#67547f` | Demo avatar, lavender variant. |
| Live Dot | `#618b50` | The pulsing "live" indicator in the product demo. |
| Dark Hero | `#13271c` | Dark-mode landing hero background. |

### 2.5 Rejected

`primary: #2563EB` and its hover `#1D4ED8` from the upstream provisional token set are
**rejected**. This product is ivory and forest green; a blue primary would read as a
different product. The upstream semantic rules (§2.2) and layout rules are kept; the colour
is not.

---

## 3. Typography Rules

**Two families, one scale.**

- **Manrope** (`--heading-font`) — every heading, the brand wordmark, the hero, and dialog
  titles. It carries the geometric, slightly architectural voice of the brand.
- **Inter** — body, UI, labels, data, forms, everything else. Loaded from Google Fonts with
  a system fallback chain.
- **Arabic uses system faces only.** The stacks fall through to `system-ui`,
  `Noto Sans Arabic`, `Helvetica Neue` and `Arial`. No Arabic webfont is bundled: a new
  binary font asset means a new licence obligation, and the system stack already covers
  Arabic script. This is a licence-safety decision, not a rendering shortcut.

**Type scale (shipped values, not aspirations).** The product UI is compact by design; it is
a dense tool, not a document.

| Role | Size | Weight | Tracking | Notes |
|---|---|---|---|---|
| Hero headline | `clamp(67px, 6.4vw, 94px)` | 500 | `-0.065em` | Landing only, one per page. |
| Section headline (`h2`) | 49px desktop → 26px mobile | 500 | `-2.5px` | Landing only. |
| Dialog title | 28px → 26px mobile | 500 | `-1.3px` | `--heading-font`. |
| Brand wordmark | 24px → 21px mobile | 700 | `-1.2px` | `--heading-font`. |
| Workspace page title | 23px | 500 | `-0.8px` | App shell. |
| Revenue page title | 15px–18px | 500 | `-1.15px` to `-1.3px` | App shell. |
| Body | 14px | 400 | 0 | Workspace base size. |
| Compact body | 13px | 400–500 | 0 | Suggestions, buttons, cards. |
| Label / meta | 12px | 400–600 | 0 | Section labels, field labels. |
| Micro / eyebrow | 10px–11px | 500–600 | `0.05em`–`1.35px` | Uppercase eyebrows and chips. |

**Rules that do not bend:**

1. **Negative tracking is Latin-only.** 40 `letter-spacing` declarations exist and most are
   negative (`-0.065em` to `-3px`). Negative tracking **breaks Arabic script joining** — it
   separates connected letterforms. The reset is scoped by the **subject's own language**,
   not by the page direction: `:lang(ar)` sets `letter-spacing: normal`. An element matches
   only when its *resolved* language is Arabic, so an Arabic run inside an English page is
   still corrected, and an English run inside an Arabic page keeps the design's tracking.
   This is the single highest-risk typography rule in the system and no automated gate will
   catch its violation — it needs a human visual review in Arabic.
2. **`text-transform: uppercase` is Latin-only.** Arabic has no case. The same
   `:lang(ar)` scope disables uppercasing (`.app-nav-label`, `.landing .eyebrow`,
   `.section-intro`) for Arabic text only.
3. **Eyebrow voice.** Section eyebrows are short, uppercase, and declarative:
   `LESS BUSYWORK. MORE BUSINESS.` · `HUMAN BY DESIGN.` · `A LITTLE ASSISTANCE. A BIG
   DIFFERENCE.` They are the product's editorial voice in the smallest possible space.
4. **Never centre a paragraph.** Body copy is left-aligned (logical `start`).
5. Body text stays 14px minimum on desktop; 16px is forced on coarse pointers
   (`@media (pointer: coarse)`) to prevent iOS zoom-on-focus.
6. **Direction is a document property, never a stylesheet fork.** Every layout rule uses CSS
   logical properties (`padding-inline`, `border-inline-start`, `inset-inline-end`,
   `text-align: start`), so `dir="rtl"` mirrors the whole interface — the sidebar and thread
   list land on the right with no override sheet. A `[dir=rtl]` override layer would be a
   permanent second set of rules to keep in sync and would still miss unenumerated cases.
7. **Bidi isolation.** Money values, phone numbers, reference IDs and opaque codes are
   Latin runs inside Arabic text and must not be reordered. They carry the `.ltr-isolate`
   utility (`direction: ltr; unicode-bidi: isolate; display: inline-block` — `isolate` is a
   no-op on a plain inline box). Numbers use Western Arabic digits in both locales
   (`ar-SA-u-nu-latn`), matching Saudi practice.

---

## 4. Component Stylings

- **Buttons — `.closer-button`**
  Min-height 44px (tappable), padding `0 21px`, radius **5px**, 13px/500 text, icon at
  17px with a 22px gap. Variants:
  - *Primary* — Deep Fern fill, Paper White text. Hover darkens to `color-mix(--land-button,
    #000 13%)` plus a whisper shadow `0 3px 10px #152b1510`. In dark mode the fill inverts
    to Pale Moss and the text to Dark Button Ink.
  - *Ghost* — transparent with a 15%-alpha white wash and a 27%-alpha fern border.
  - *Outline* — Paper White fill, Hairline Fern border, ink text. Hover → Sage Mist fill and
    Forest Green border.
  - *Cream* — `#edf1e5` fill, min-width 215px, for the "find your voice" action.
  - Disabled: `opacity: 0.5`, `cursor: not-allowed`. Never disable without a visible reason.
- **Cards / containers** — Paper White on Porcelain Ivory, separated by a **1px Hairline Fern
  border**, radius 4–6px, **no drop shadow**. Depth comes from the border and the surface
  step, not from elevation. The single exception is the dialog, which gets
  `0 24px 100px #0b1d1740` because it genuinely floats.
- **Inputs / forms** — 1px Hairline Fern border, radius 4px, Paper White fill, 13px text,
  `accent-color: var(--land-green)` for checkboxes and radios. Placeholders use Moss Grey at
  full opacity (never 54%-grey, which fails contrast on ivory). Focus is a 2px outline, 3px
  offset.
- **Chips / badges** — `.intent-label` radius 3px, 10px, padding `2px 5px`. Three states:
  Forest Green on Sage Mist (buy), Amber Ochre on Warm Cream (question), Clay Rose on Blush
  (spam).
- **Navigation** — 228px rail. Items are 42px tall, radius 5px, 13px text, Moss Grey by
  default. The active item is **Forest Green on Sage Mist at 500 weight** — never a colour
  bar alone. The unread badge is a Deep Fern pill with white 10px text.
- **Selected conversation row** — distinguished by **both** a background change and a 2px
  Forest Green inline-start border, so selection survives a greyscale print and a
  colour-vision difference.
- **Toggles** — `.closer-switch`, 38×24px, 20px radius, 18px white knob, Forest Green when
  on. It is a real `role="switch"` with `aria-checked`.
- **Icons** — one book (lucide-react), 20px standard, 13–17px inline. Always paired with a
  visible text label for destructive and financially consequential actions. No emoji.
- **Dialogs** — native `<dialog>` with `showModal()` (focus trap and Esc for free), 12px
  radius, dimmed backdrop `#12241782` with a 7px blur, 35px content padding, brand mark above
  the title, close button top-end. Focus returns to the trigger on close.

---

## 5. Layout Principles

**Whitespace is measured in a 4/5/8/10/12/15/20/26/30/60px vocabulary**, with 8px as the
dominant rhythm (`gap: 8px` is the single most common spacing value in the codebase, 24
uses).

- **App shell** — `grid-template-columns: 228px minmax(0, 1fr)`, full `100dvh`, no page
  scroll. The conversation list is `348px minmax(0, 1fr)`. The sidebar carries a 1px
  right border, never a shadow.
- **Marketing** — `width: min(1240px, calc(100% - 128px))`, centred, sections padded
  `108px` block. Hero is `min-height: 688px`, copy capped at `710px`, subheadline at
  `433px`.
- **Revenue** — centred at `min(28px, calc((100% - 1100px) / 2))`, 42px top / 64px bottom.
  The three totals are a `repeat(3, minmax(0, 1fr))` grid with a 26px gap.
- **Breakpoints** — 1600 / 1199 / 959 / 759 / 599px. The workspace collapses from three
  columns to one below 900px with an accessible Back control; the landing page restacks
  its grids at 959 and 759.
- **Smallest target** — 360px viewport, 16px page gutter. **No horizontal scrolling in core
  flows** (upstream NFR-005).
- **Touch targets** — 44px minimum for primary actions. Secondary controls are 30–42px.
- **Density** — a one-or-two-action path for reply, takeover, score and save. Nothing hides
  the primary action behind a nested menu.

**Direction.** Layout must be written with **logical properties**, never physical ones:
`padding-inline`, `margin-inline`, `inset-inline-start`, `border-inline-start`,
`text-align: start`. Grid and flex row order flip automatically under `direction: rtl` — the
sidebar and thread list land on the right with no override sheet. A `[dir=rtl]` override
layer is a maintenance liability and still cannot fix unenumerated cases. Only genuinely
non-logical cases (the 2 disclosure chevrons rotated 180°, directional lucide arrows) get a
small targeted override.

**Bidi isolation.** Phone numbers, currency values, opaque reference IDs and paths must not
be mirrored. They get `direction: ltr; unicode-bidi: isolate; display: inline-block` — the
`.ltr-isolate` utility. `isolate` is a no-op on a plain inline box, so the utility must
also set `display: inline-block`.

---

## 6. Depth, Elevation & Focus

**Flat by default.** The system has exactly five shadows in total, and four of them are
insignificant: a 1px button hover lift, a 2px switch knob, a focus ring, and a landing card
lift. Only the dialog shadow is real. **Shadows are never the only separator** — every
adjacent surface pair also has a 1px border, which is what makes the flat look work in Dark
Mode where shadow is nearly invisible.

**Selected row** = background change + 2px inline-start accent border. Never colour alone.

**Focus is mandatory and must be visible.**

```
:is(a, button, input, textarea, select, summary):focus-visible {
  outline: 2px solid var(--focus-color);
  outline-offset: 3px;
}
```

`--focus-color` is **Focus Fern `#557b44`** in light mode (**4.70:1** on Porcelain Ivory,
**4.88:1** on Paper White) and **Bright Fern `#bfd7a9`** in dark mode (**11.30:1** on Night
Forest). Both clear WCAG 2.2 AA for non-text contrast (3:1) with margin.

> **Landing-page focus ring — corrected.**
> The landing page carried its own hard-coded ring, `#7ea870`, which measures **2.62:1** on
> Porcelain Ivory and **2.33:1** on Hero Sand. That fails WCAG 2.2 AA (1.4.11, 3:1
> required). It has been replaced with `#527347` (**5.18:1** on ivory, **5.38:1** on white,
> **4.80:1** on Sage Mist, **4.61:1** on Hero Sand) — the only green in the family that
> clears 4.5:1 on *every* landing background including the photographic hero wash.
> The landing page must **not** reintroduce a locally-defined focus colour; it inherits
> `--focus-color` from `system.css`.

**Contrast status of the locked palette** (measured, not asserted):

| Pair | Ratio | Level |
|---|---|---|
| Deep Forest Ink on Porcelain Ivory | 13.70:1 | AAA |
| Paper White on Deep Fern | 9.67:1 | AAA |
| Forest Green on Porcelain Ivory | 6.00:1 | AA |
| Moss Grey on Porcelain Ivory | 5.34:1 | AA |
| Amber Ochre on Warm Cream | 5.51:1 | AA |
| Clay Rose on Blush | 5.52:1 | AA |
| Focus Fern on Porcelain Ivory | 4.70:1 | AA (needs 3:1) |
| Moonlit Ivory on Night Forest | 15.44:1 | AAA |
| Pale Sage on Night Forest | 7.86:1 | AAA |
| Dark Button Ink on Pale Moss | 8.87:1 | AAA |

Token values alone are not proof. Re-measure with an automated **and** manual check before
any release.

---

## 7. Rules That Survive From The Upstream Provisional Set

The upstream `docs/DESIGN.md` was written against an uninspected repository. Its
**semantic and structural rules are adopted**; its **colour palette is not**.

1. Green = verified/success, amber = review required, red = rejected or failed. **Never
   colour as the sole status indicator** — always a label, and an icon where space allows.
2. `Potential`, `Attributed` and `Verified` appear in **separately labelled blocks** with
   evidence links and reversal status. Never a single blended "revenue" number.
3. **Never turn an estimate green.** Forecast and pipeline figures carry the label
   "estimated, not guaranteed" and never inherit the verified colour.
4. Arabic RTL keeps natural reading order; phone numbers, paths and financial values stay
   directionally isolated.
5. **System fonts only for Arabic** — no bundled Arabic webfont. Licensing and rendering
   must be verified before any asset is ever added.
6. Support browser zoom, 200% text resize, visible focus, and truncation tooltips.
7. Every interactive element has real states: default, hover, focus-visible, selected,
   disabled-with-reason, loading, success, error — plus empty, stale and disconnected for
   data panels. **Use visible real text for each.**
8. Do not imply delivery until the API confirms acceptance. Do not imply a refund, order or
   payment was executed.
9. One to two interactions to the primary action. Never hide takeover in a nested menu.
10. Preserve typed unsent drafts on network failure.

---

## 8. Voice

**The product's editorial voice, in short.** Third person for the system, second person for
the customer, no exclamation marks in the workspace, no jargon.

- Tagline: **"Less typing. More closing."**
- Supporting: **"Two channels. One closer."** · **"Right where your next customer is."**
- Section eyebrows: `LESS BUSYWORK. MORE BUSINESS.` · `HUMAN BY DESIGN.` · `A LITTLE
  ASSISTANCE. A BIG DIFFERENCE.` · `GOOD QUESTION.`
- Voice promises, always paired with a limit: *"Not another chatbot to manage. A sales
  assistant that knows what you sell, remembers the conversation, and leaves the final say
  to you."*
- Plan names are plain words — **Starter** and **Growth**, each with a lowercase qualifier
  ("For your next big little business.").
- **Never** claim a won deal, a sent message, a refund, or a payment that the system cannot
  evidence. If the interface does not show the receipt, the copy does not claim it.
