## 2025-05-18 - Avoid O(N*M) message-to-conversation grouping in service handlers
**Learning:** In domain services (`ProductService.conversationPage` and `RevenueService.overview`), filtering a full query result array of messages inside a `.map()` callback over conversations or deals creates quadratic O(N*M) time complexity (e.g., 200 conversations x 20,000 messages = 4,000,000 checks).
**Action:** Index array query results into a `Map<string, T[]>` keyed by foreign key (e.g. `conversation_id`) before iterating over parent rows, converting O(N*M) scans to O(N+M) map lookups.
