## 2025-05-10 - Safety Predicate String Normalization Overhead
**Learning:** `detectRisk` in `src/domain/safety.ts` was calling `normalizeText` 6+ times per invocation (once per individual risk predicate call), with each `normalizeText` running 6 global regex string replacements.
**Action:** Pass pre-normalized text down to sub-predicates (`isSpam`, `isInjection`, `isRefund`, etc.) when evaluating compound guards like `detectRisk`, and use an ASCII fast-path in `normalizeText`.
