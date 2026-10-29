## 2025-05-18 - Cache Intl formatters to eliminate expensive instantiation
**Learning:** Re-instantiating `Intl.DateTimeFormat` and `Intl.NumberFormat` on every formatting call in React contexts/render cycles adds massive CPU overhead (e.g. 50,000 formatting ops drop from ~6,000ms to ~170ms when cached).
**Action:** Use module-level Map-backed caches for `Intl` formatters whenever formatting numbers, dates, or currencies in hot render paths.
