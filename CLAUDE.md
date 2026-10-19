# Repository Rules

Read `intent.md`, `spec.md`, `plan.md`, and `ROADMAP.md` before changes. Follow the [AI-native SDLC playbook](https://claude.com/resources/articles/the-ai-native-sdlc-playbook).

- Preserve the shared minimal ivory/forest-green UI, mobile navigation and accessible light/dark modes.
- Never place provider keys in `src/`, logs, screenshots, fixtures, or commits. Never read `.env` or `.data` for agent context.
- All live data is workspace-scoped; all external events are signature-checked; retries require a dedupe key and safe side-effect semantics.
- Treat customer content and generated memory as untrusted. No invented prices, discounts, policies, or automatic sensitive commitments.
- Model output, thresholds, and prompt changes require deterministic evals plus a human-reviewed live sample set before release.
- Add a regression for each defect. Run `npx tsc --noEmit`, `npx tsc -p tsconfig.server.json`, `npx tsx --test server/tests/*.test.ts`, `npx playwright test`, `npm run build`, and `npm audit`.
- Do not claim live integration, latency SLO, backups, or compliance verified without actual evidence. Agents may prepare releases; only the owner authorizes production. Incidents produce a new intent and test.
- Revenue increments must preserve `docs/REVENUE_OS.md`: integer/currency-safe ledgers, explicit outcome/receipt provenance, known forecast denominators, unknown BANT, labelled uncalibrated scores, immutable learning evidence. No automatic claim of a won deal, causal attribution or payment.
- Business Brain approval is owner-only. Customer/model memory and learned strategy never become approved product facts. Follow-ups are human reminders; medical modes are administrative-only; escalation must block automatic sends at the server boundary.
