## 2025-05-18 - Single-Pass Text Normalization & Pre-Normalized Predicate Reuse

**Learning:** Arabic text normalization (`normalizeText`) originally performed 6 sequential `.replace()` regex passes on non-ASCII strings. Furthermore, safety predicate functions (`isOptOut`, `isRefund`, `isClinical`) were re-normalizing the same message string on every call inside array loops like `scoreLead`. Consolidating non-ASCII normalization into a single regex pass with a replacement lookup map, and allowing optional pre-normalized arguments on safety predicates, yielded a ~20-30% speedup in normalization and lead scoring.

**Action:** When performing multi-character text normalization or string cleaning, combine disjoint regex replacements into a single pass using a lookup map. For predicates that normalize input strings, support an optional pre-normalized parameter so caller loops can normalize once upfront.
