## 2025-05-18 - Input Helper Descriptions with ARIA
**Learning:** Textarea inputs that rely on keyboard shortcuts (like Enter to send, Shift+Enter for newline) need explicit `aria-describedby` links to their footer hint elements so screen readers announce shortcut instructions when focused.
**Action:** Always associate interactive inputs with visible helper text or keyboard hints via `aria-describedby`.

## 2025-05-18 - Visible Text and Accessible Names (WCAG 2.5.3)
**Learning:** Adding an `aria-label` to an element with visible text overrides its accessible name. If the `aria-label` does not include the visible text verbatim, it violates WCAG 2.5.3 (Label in Name) and breaks voice control and screen reader consistency.
**Action:** Do not add `aria-label` to elements that already have sufficient visible text, or ensure `aria-label` contains the exact visible text.
