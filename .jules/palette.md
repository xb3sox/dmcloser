## 2025-05-18 - Input Helper Descriptions with ARIA
**Learning:** Textarea inputs that rely on keyboard shortcuts (like Enter to send, Shift+Enter for newline) need explicit `aria-describedby` links to their footer hint elements so screen readers announce shortcut instructions when focused.
**Action:** Always associate interactive inputs with visible helper text or keyboard hints via `aria-describedby`.
