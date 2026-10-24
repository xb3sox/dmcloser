## 2025-05-18 - Switch Tooltips and Disabled Control Context
**Learning:** Disabled interactive components (such as custom switch controls) require descriptive `title` attributes or accessible context descriptions so users and assistive tools know *why* a control is disabled (e.g. marked as spam) rather than appearing mysteriously inactive.
**Action:** Always provide explicit `title` attributes on custom input components like `Switch` to convey state and reasons for disabled states.
