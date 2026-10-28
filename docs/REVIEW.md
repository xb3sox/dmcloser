# Release Review

Implementation is available for local/staging review. No production authorization, hosted deployment, or provider certification is implied.

## Deterministic Gates

- Strict client/server TypeScript; production frontend build; compiled API smoke test against real Postgres.
- API/security tests on both PGlite and PostgreSQL: tenant isolation, CSRF, sessions, recovery, signatures, OAuth state, dedupe, safe automation, uncertain delivery, durable restart, Stripe reconciliation, complete export and erasure.
- Browser suite: landing/demo regressions plus real registration, server persistence, SSE across tabs, send failure handling, export/deletion and automated light/dark accessibility across Chromium, Firefox and WebKit projects.
- Control-band tests and dependency audit. See the commands in `README.md`; CI repeats these gates but hosted execution is not verified here.

## Browser Differences Boundary

- **Multi-browser automation covers Desktop Chromium, Desktop Firefox, and Desktop Safari (WebKit).**
- **Framer Motion viewport triggers and scroll behavior:** Below-the-fold animated elements (such as landing page demo components wrapped in Framer Motion `<Reveal>`) require explicit `scrollIntoViewIfNeeded()` in test scripts under Firefox and WebKit to reliably trigger IntersectionObserver animations before interacting with interactive elements.
- **Dynamic theme computed styles in WebKit:** WebKit does not always invalidate inherited CSS custom properties after the `.dark` class flips. `ThemeProvider` forces one synchronous body reflow after the class change and restores the active element; tests wait for `toHaveClass("dark")` before the axe scan.
- **No real-device claim:** Desktop WebKit and Firefox project emulation provides automated browser engine coverage but does not substitute for physical iOS Safari or Android Chrome device testing.

## Human Gates

- Credentialed OpenAI/Meta/Stripe/SMTP contract and delivery checks. Automated provider tests use fakes; they do not send messages, charge cards, or prove deliverability.
- Model confidence is self-reported, not a calibrated probability. Deterministic safety checks are conservative heuristics, not proof against hallucination. Review real conversation evals before enabling automation.
- UI snapshots limit conversation/history volume to one page. Cursor pagination is available on `GET /api/conversations` and the client loads more on demand; full export is independent of any window.
- Single API/worker topology only until shared rate limiting/pub-sub and multi-instance load tests are approved. Local PGlite requires one process per data directory.
- Register the signed Instagram deletion/deauthorization callbacks; review the privacy policy, lawful data processing, retention and automated-experience disclosures.
- Rehearse the supplied Docker deployment and backup/restore/rollback procedures on the actual host. Configure branch protection, production environment approval, metrics scheduling and on-call ownership.

Any failed production control band produces an incident intent and a regression test. Agents may diagnose or propose a PR; only a named owner may authorize deployment or rollback.

## Revenue OS Review Boundary

The extension is additive: migration 002 and a numbered migration runner; Revenue/Brain views plus a collapsed live-chat panel. No existing demo, inbox, integration, billing or authentication flow was replaced. Revenue is owner-confirmed receipts net of refunds, not a payment-provider claim; historical legacy conversation statuses are not retroactive closed-deal revenue. Forecast priors, text-pattern lead scores and observed cohort rates are explicitly uncalibrated.

New regressions cover exact money/unknown values, dated multi-currency formulas, receipt idempotency/refund caps, immutable outcomes/version conflicts, catalog approval/expiry snapshots, tenant/role boundaries, BANT provenance, learning thresholds, appointment conflicts, review-only follow-ups, escalation, Brain prompt grounding, erasure/export and upgrading a version-one database without replacing records. Pilot review must still cover real outcomes, multilingual signal coverage, clinician/privacy boundaries, calibrated prediction quality and legal financial-record retention.

Review also checks frozen editor versions, old-opportunity navigation beyond the recent-thread window, industry-isolated outcome cohorts, atomic empty-draft use, escaped/folded ICS export, refund locking, and model-call avoidance for recognized clinical content. No feature is evidence that a model caused a sale or that a manually recorded receipt has been processor-verified.

### Increment Verification

For exact test execution counts, commands, dates and verifiers, see the single authoritative source: [Evidence Ledger (`docs/EVIDENCE.md`)](EVIDENCE.md).

## Bilingual, Quality and Scale Review Boundary

- **The Arabic phrase set is an engineering artefact.** It is validated against a no-false-positive table and covers formal Arabic, not dialect or transliterated Arabic. It has not been reviewed by a native speaker, and the customer-facing Arabic copy has not either.
- **English remains the default locale.** Arabic is a switch in the workspace chrome, not an auto-detected default. A visitor is never routed into Arabic without choosing it.
- **A blocked prompt version stops automatic sends** at the same server boundary that enforces escalation and opt-out. The lab itself never sends, drafts or escalates.
- **The recovery list is a human worklist.** It ranks and explains; it never acts. Dismissal is recorded with the operator's reason and is reversible.
- **The three revenue blocks are not interchangeable.** Verified is owner-confirmed receipts net of refunds; Potential is an estimate and is never presented as cash; Attributed is descriptive and never claims that AI or an ad caused a sale. Win chance is a labelled, uncalibrated heuristic.
- **Cursor pagination and the lead-status and time-range filters are client-side over a paged snapshot.** The owner export is still complete, independently of any UI window.
- **The assignee filter is implemented, and its limit is stated.** Conversation assignment
  shipped in #100 with `007_assignee.sql` (`conversations.assignee_user_id`), a server-side
  filter in `server/service.ts:210-252` and `?assignee=` on `GET /api/conversations`. The
  inbox currently filters the loaded pages in the client rather than sending the filter to
  the API, so a filtered view can miss older conversations; #126 closes that gap.
