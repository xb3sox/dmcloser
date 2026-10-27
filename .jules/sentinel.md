# Sentinel Security Journal

## 2025-05-18 - JSON.parse("null") Crash Vector in Payload Decoders
**Vulnerability:** Calling `JSON.parse` on untrusted base64/signed payloads can return `null` without throwing a `SyntaxError`. Downstream property accesses (e.g., `parsed.excludeId` or `parsed.algorithm`) throw `TypeError: Cannot read properties of null`, causing an unhandled 500 server exception instead of a clean 400 Bad Request error.
**Learning:** A `try { parsed = JSON.parse(...) } catch` block only intercepts syntax errors from invalid JSON syntax. `JSON.parse("null")` is valid JSON and evaluates to `null`.
**Prevention:** Always validate parsed objects with `if (!parsed || typeof parsed !== "object")` or validate using `zod` schemas immediately after calling `JSON.parse`.
