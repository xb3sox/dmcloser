---
version: "alpha"
name: "DMCloser Quiet Precision"
description: "Provisional calm, high-contrast bilingual sales workspace: Notion clarity with Linear density"
omitted: []
colors:
  primary: "#2563EB"
  primaryHover: "#1D4ED8"
  secondary: "#64748B"
  background: "#F8FAFC"
  surface: "#FFFFFF"
  surfaceMuted: "#F1F5F9"
  text: "#0F172A"
  textMuted: "#475569"
  border: "#CBD5E1"
  success: "#166534"
  warning: "#92400E"
  error: "#B91C1C"
  darkBackground: "#0B1220"
  darkSurface: "#111C2D"
  darkText: "#F8FAFC"
  darkBorder: "#334155"
typography:
  h1: {fontFamily: "system-ui", fontSize: "28px", fontWeight: 700, lineHeight: 1.25}
  h2: {fontFamily: "system-ui", fontSize: "20px", fontWeight: 600, lineHeight: 1.35}
  body: {fontFamily: "system-ui", fontSize: "14px", fontWeight: 400, lineHeight: 1.6}
  label: {fontFamily: "system-ui", fontSize: "12px", fontWeight: 600, lineHeight: 1.4}
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  buttonPrimary: {backgroundColor: "{colors.primary}", textColor: "{colors.surface}", rounded: "{rounded.md}", padding: "12px"}
  card: {backgroundColor: "{colors.surface}", borderColor: "{colors.border}", rounded: "{rounded.lg}", padding: "16px"}
  focusRing: {outlineColor: "{colors.primary}", outlineWidth: "2px"}
---
# DMCloser Quiet Precision
> Design status: provisional; UI repository not inspected. Google DESIGN.md draft format inspected, but import/linter validation not performed.

## Overview
A clean Notion-meets-Linear workspace for high-frequency sales action, never a visually noisy marketing dashboard. Existing UI components and typography must be audited first; migrate tokens rather than discarding good screens. Designed for business owners on mobile and agents on desktop, with minimal latency and a credible, calm tone. Do not imply official affiliation with named products.

## Colors
Normative colors are in YAML. Blue is primary action and active navigation; neutral backgrounds avoid fatigue. Green means verified/success, amber review required, red rejected or failed. Do **not** use color as sole status indicator; add label/icon. Dark surfaces use `darkBackground/darkSurface/darkText/darkBorder`; adapt focus and semantic colors for text contrast in real tested UI. Confirm contrast against WCAG 2.2 AA with an automated and manual check before release; token values alone are not proof.

## Typography
Use system-ui as a license-safe initial Latin fallback. For Arabic, prefer locally verified installed system face supporting Arabic script; font licensing and rendering must be checked before bundling external assets. Arabic RTL must retain natural reading order while phone numbers, paths and financial values remain directionally isolated. Use 28/20/14/12px h1/h2/body/labels; adjust from 16px body on mobile if usability observation indicates 14px too dense. Support browser zoom, 200% text resize, visible focus and truncation tooltips.

## Layout
Desktop: 240px navigation rail, 340px thread list, flexible conversation pane with optional right context drawer; these are proposed dimensions contingent on UI code. Below 900px view one primary pane with accessible Back, no impossible three-column squeeze. 360px smallest targeted screen; 16px page gutter. 8px-grid and compact but tappable controls; recommended touch target 44px square for primary actions. Preserve one-to-two-action path for reply, owner takeover, score and save.

## Elevation & Depth
Flat surfaces with 1px borders and minimal shadows. Distinguish selected row by both background and a leading indicator. Overlays/dialogs use a dimmed backdrop and visible title, trap focus, Esc close except irreversible processing state. Avoid shadows as the only separator in Dark Mode.

## Shapes
6/10/16px radii represent chips, buttons/inputs and major panels. Simple line icons, 20px standard. Use one consistent icon book across the interface, with labels for destructive and financially consequential actions.

## Components
- **Navbar:** current workspace, connection status, role menu, Arabic/English switch, light/dark toggle; visible keyboard focus.
- **Conversation row:** contact alias, platform logo with text label, unread badge, timestamp, priority with explanation, human/AI ownership. Loading skeleton then real status; empty CTA connects a channel.
- **Composer:** clear manual vs suggested AI draft badge, source citation, review warning, send button disabled unless server eligibility; submit progress must never report sent until API confirms accepted.
- **Lead card:** stage, score reason, missing criteria, one recommended next step; avoid unsupported percentages.
- **Deal card:** `Potential`, `Attributed`, `Verified` in separate visually labeled blocks, evidence link and reversal status.
- **Form/input:** label, help, required marker, inline validation and recovery; errors announced to screen readers.
- **Modal/Toast:** confirm high-risk sends and deletions; persistent error with Retry; toast never sole record of important failure.
- **AI evaluation:** version, pass/fail count, error class, reviewer and button to prevent publish if a blocking case fails.

**States for every interactive element:** default, hover (mouse), focus-visible (keyboard), selected/active, disabled with reason, loading, success and error. For data panels also empty, stale and disconnected. Use visible real text for each.

## Do's and Don'ts
1. Do make actions obvious in one or two interactions; don't hide takeover behind nested menus.
2. Do label estimated vs verified amounts; don't turn estimates green automatically.
3. Do preserve typed unsent drafts on network failure; don't imply successful delivery.
4. Do thoroughly test Arabic/English keyboard navigation; don't mirror telephone numbers or monetary strings.
5. Do preserve useful existing UI patterns after code inspection; don't rebuild visual components solely for token purity.

Source: [Google DESIGN.md open draft spec](https://github.com/google-labs-code/design.md) and [Stitch docs](https://stitch.withgoogle.com/docs/design-md/overview). Token import compatibility is **unverified** until tested in actual Stitch tooling.
