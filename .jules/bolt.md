## 2025-05-18 - Cache Intl formatters to eliminate expensive instantiation
**Learning:** Re-instantiating `Intl.DateTimeFormat` and `Intl.NumberFormat` on every formatting call in React contexts/render cycles adds massive CPU overhead (e.g. 50,000 formatting ops drop from ~6,000ms to ~170ms when cached).
**Action:** Use module-level Map-backed caches for `Intl` formatters whenever formatting numbers, dates, or currencies in hot render paths.

## 2026-03-31 - Message grouping map lookup vs linear filter in multi-tenant conversations
**Learning:** SQL queries retrieving conversation history in bulk return messages across multiple conversations in a flat array. Calling `.filter(m => m.conversation_id === id)` inside a `.map()` loop over conversations scales as O(N * M) (where N is conversations up to 200 and M is messages up to 20,000), causing millions of array element comparisons and unnecessary intermediate array allocations on bootstrap / revenue overview requests.
**Action:** Always pre-group flat SQL result arrays into a `Map<string, T[]>` by foreign key (e.g. `conversation_id`) in O(M) time before mapping over entity arrays.
