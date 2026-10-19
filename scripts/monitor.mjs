import { mkdir, writeFile } from "node:fs/promises";
import { controlBreaches } from "./control-bands.mjs";

const origin = process.env.MONITOR_API_URL;
const token = process.env.METRICS_TOKEN;
if (!origin || !token)
  throw new Error("MONITOR_API_URL and METRICS_TOKEN are required.");
const response = await fetch(`${origin.replace(/\/$/, "")}/internal/metrics`, {
  headers: { Authorization: `Bearer ${token}` },
  signal: AbortSignal.timeout(10000),
});
if (!response.ok)
  throw new Error(
    `Metrics unavailable (${response.status}). Escalate to the service owner.`,
  );
const data = await response.json();
const breaches = controlBreaches(data);
if (!breaches.length) {
  console.log("Control bands healthy.");
  process.exit(0);
}
const id = new Date().toISOString().replace(/[:.]/g, "-");
await mkdir("incidents", { recursive: true });
await writeFile(
  `incidents/${id}-intent.md`,
  `# Intent: reliability control-band breach\n\nStatus: requires service-owner triage.\n\nEvidence: ${breaches.join("; ")}.\n\nOutcome: restore the configured SLO without duplicate deliveries or lost messages.\n\nScope: inspect job states, provider health, and recent releases. Never log customer message bodies or secrets.\n\nAction boundary: read-only diagnosis or a reviewed PR. Production deployment/rollback requires the owner's authorization. Add a regression/eval before release.\n`,
);
console.error(
  `Control-band breach recorded in incidents/${id}-intent.md. Human triage required.`,
);
process.exitCode = 2;
