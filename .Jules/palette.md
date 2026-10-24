# Palette's Journal - Critical UX & Accessibility Learnings

## 2025-02-24 - Screen Reader Accessible Badge Counts in Headings
**Learning:** Visual count badges next to headings are often wrapped in `aria-hidden="true"` to prevent raw text concatenation issues in visual layouts, but this silently hides critical count metadata (like total filtered items) from screen reader navigation.
**Action:** Always complement `aria-hidden` badge numbers with an `sr-only` text node (e.g. `<span className="sr-only"> ({count})</span>`) so screen reader users hear complete heading context.
