## 2025-05-18 - Accessibility Parity for Navigation Badges
**Learning:** Badges nested inside interactive navigation elements (e.g., mobile tab buttons) require explicit `aria-label` attributes with context (e.g., "3 unread messages"). Without explicit labels, screen readers announce bare numbers out of context.
**Action:** Always include localized `aria-label` descriptions on badge components inside mobile and desktop navigation bars.
