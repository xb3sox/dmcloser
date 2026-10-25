# Bolt's Journal - Critical Learnings

## 2025-05-18 - Avoid eager array/string allocations in list search filters
**Learning:** In React components rendering lists with messages or metadata (like `InboxView`), eager string mapping (`messages.map(...).join(' ')`) on every filter check creates $O(N \times M)$ heap allocations per keystroke.
**Action:** Always short-circuit on top-level scalar fields (`contactName`, `lastMessage`) first and use lazy iterators like `.some()` on nested collections inside a `useMemo` block.
