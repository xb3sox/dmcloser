## 2025-05-20 - Hoisting and Combining Arabic Normalization Regexes

**Learning:** `normalizeText` in `src/domain/safety.ts` is called frequently across message ingestion, risk detection, lead scoring, and auto-reply policy checks. Re-evaluating inline regexes and performing separate `.replace()` calls for diacritics, tatweel, and bidi control characters adds unnecessary overhead during string processing. Combining noise character ranges into a single static regex and hoisting regexes to module scope reduces string replacement passes from 6 to 4 and speeds up normalization by ~19%.

**Action:** When working on safety matching or string normalization in shared domain modules, hoist regex patterns and combine single-character/range replacement passes where semantic behavior is identical.
