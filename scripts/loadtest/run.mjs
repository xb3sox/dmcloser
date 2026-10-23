#!/usr/bin/env node
/**
 * DMCloser load laboratory — inbound feedback path.
 *
 * No dependencies. Plain Node ESM. Measures the real API over HTTP:
 *
 *   1. registers N throwaway workspaces (one owner each, one source IP each so
 *      the per-IP rate limiter measures one customer, not the harness),
 *   2. warms one messaging connection per workspace through the local
 *      simulator route so inbound traffic has something to resolve against,
 *   3. fires a fixed-duration, fixed-concurrency mix of
 *        - Meta-shaped inbound webhook POSTs (signed with the app secret when
 *          the server has one; otherwise the same ingest path via
 *          /api/development/inbound, clearly reported as such),
 *        - authenticated inbox reads (GET /api/conversations, /api/bootstrap),
 *   4. reports p50/p95/p99, throughput, error rate by status code and the MAX
 *      observed single-request latency, compared against AI_TIMEOUT_MS + margin.
 *
 * Exit codes: 0 clean, 1 ceiling violation or error-rate breach, 2 harness error.
 *
 * It never fabricates latency: every number printed or serialised came from a
 * performance.now() pair around a real request in this process.
 */
import http from "node:http";
import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- arguments
function parseArgs(argv) {
  const out = {
    baseUrl: "http://127.0.0.1:3001",
    workspaces: 30,
    concurrency: 50,
    duration: 60,
    maxRps: 40,
    aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS || 8000),
    marginMs: 2000,
    ceilingMs: null,
    maxErrorRate: 0.01,
    origin: process.env.LOADTEST_ORIGIN || "http://127.0.0.1:5173",
    secret: process.env.INSTAGRAM_APP_SECRET || process.env.META_APP_SECRET || "",
    platform: "instagram",
    ipSpread: true,
    ipBase: "127.0.0.0",
    out: null,
    label: "",
    quiet: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const value = argv[++i];
      if (value === undefined) throw new Error(`Missing value for ${arg}`);
      return value;
    };
    switch (arg) {
      case "--base-url": out.baseUrl = next(); break;
      case "--workspaces": out.workspaces = Number(next()); break;
      case "--concurrency": out.concurrency = Number(next()); break;
      case "--duration": out.duration = Number(next()); break;
      case "--max-rps": out.maxRps = Number(next()); break;
      case "--ai-timeout-ms": out.aiTimeoutMs = Number(next()); break;
      case "--margin-ms": out.marginMs = Number(next()); break;
      case "--ceiling-ms": out.ceilingMs = Number(next()); break;
      case "--max-error-rate": out.maxErrorRate = Number(next()); break;
      case "--origin": out.origin = next(); break;
      case "--secret": out.secret = next(); break;
      case "--platform": out.platform = next(); break;
      case "--ip-base": out.ipBase = next(); break;
      case "--shared-ip": out.ipSpread = false; break;
      case "--out": out.out = next(); break;
      case "--label": out.label = next(); break;
      case "--quiet": out.quiet = true; break;
      case "-h":
      case "--help":
        console.log(HELP);
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (out.workspaces < 1) throw new Error("--workspaces must be >= 1");
  if (out.concurrency < 1) throw new Error("--concurrency must be >= 1");
  if (out.duration < 1) throw new Error("--duration must be >= 1 second");
  if (out.maxRps < 1) throw new Error("--max-rps must be >= 1");
  if (out.ceilingMs === null) out.ceilingMs = out.aiTimeoutMs + out.marginMs;
  return out;
}

const HELP = `DMCloser load lab — inbound feedback path

  node scripts/loadtest/run.mjs [options]

  --base-url <url>          target API (default http://127.0.0.1:3001)
  --workspaces <n>          test workspaces / owners to register (default 30)
  --concurrency <n>         in-flight HTTP requests (default 50)
  --duration <s>            load duration in seconds (default 60)
  --max-rps <n>             aggregate request cap (default 40; 0 is not allowed)
  --ai-timeout-ms <n>       the server's AI_TIMEOUT_MS (default 8000 / env)
  --margin-ms <n>           allowed overhead above the AI timeout (default 2000)
  --ceiling-ms <n>          override the computed ceiling (self-test only)
  --max-error-rate <r>      non-2xx share that fails the run (default 0.01)
  --origin <url>            Origin header the API accepts (default APP_URL)
  --secret <value>          Meta app secret for signed webhooks (default env)
  --platform instagram|whatsapp   webhook platform (default instagram)
  --shared-ip               put every owner on one source IP (reproduces the
                            per-IP rate limiter; the default gives each owner
                            its own 127.0.0.x address)
  --out <path>              where to write the JSON report
  --label <text>            free-text label stored in the report
  --quiet                   do not print the human summary
`;

// ---------------------------------------------------------------- transport
function makeAgent(localAddress, maxSockets) {
  return new http.Agent({
    keepAlive: true,
    maxSockets: Math.max(2, maxSockets),
    maxFreeSockets: Math.max(2, maxSockets),
    localAddress,
  });
}

/** One HTTP call with client-side timing. Never throws for HTTP status. */
function send({ base, method, path, body, headers, agent }) {
  const url = new URL(path, base);
  const payload =
    body === undefined || body === null
      ? null
      : Buffer.isBuffer(body)
        ? body
        : Buffer.from(JSON.stringify(body));
  const started = performance.now();
  return new Promise((done) => {
    const request = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        agent,
        headers: {
          ...(payload
            ? {
                "content-type": "application/json",
                "content-length": payload.length,
              }
            : {}),
          ...headers,
        },
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          done({
            status: response.statusCode || 0,
            headers: response.headers,
            text: Buffer.concat(chunks).toString("utf8"),
            ms: performance.now() - started,
            networkError: null,
          });
        });
      },
    );
    request.setTimeout(30000, () => request.destroy(new Error("request timeout 30000ms")));
    request.on("error", (error) =>
      done({
        status: 0,
        headers: {},
        text: "",
        ms: performance.now() - started,
        networkError: error.message,
      }),
    );
    if (payload) request.write(payload);
    request.end();
  });
}

const readCookie = (response) =>
  (response.headers["set-cookie"] || [])
    .map((line) => line.split(";")[0])
    .filter(Boolean)
    .join("; ");

// ---------------------------------------------------------------- payloads
/**
 * Meta-shaped Instagram webhook. entry[].id is the IG account id, which the
 * local simulator route sets to `local-<workspaceId>-instagram`, so the
 * normaliser resolves it to a real connection.
 */
function instagramMessagePayload({ accountId, contactId, text, mid, at }) {
  return {
    object: "instagram",
    entry: [
      {
        id: accountId,
        time: Math.floor(at / 1000),
        messaging: [
          {
            sender: { id: contactId },
            recipient: { id: accountId },
            timestamp: at,
            message: { mid, text },
          },
        ],
      },
    ],
  };
}

function whatsappMessagePayload({ accountId, contactId, text, mid, at }) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: accountId,
        time: Math.floor(at / 1000),
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: { display_phone_number: accountId, phone_number_id: accountId },
              contacts: [{ wa_id: contactId, profile: { name: `Load ${contactId.slice(-4)}` } }],
              messages: [
                {
                  from: contactId,
                  id: mid,
                  timestamp: String(Math.floor(at / 1000)),
                  type: "text",
                  text: { body: text },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

const MESSAGE_TEXTS = [
  "Hi, how much is the starter package?",
  "Do you deliver to Riyadh?",
  "Is this still available?",
  "Can I pay in instalments?",
  "What is the difference between the two plans?",
  "I saw your ad, can you tell me more?",
  "Do you have this in black?",
  "How long does shipping take?",
];

// ---------------------------------------------------------------- statistics
function percentile(sorted, p) {
  if (!sorted.length) return null;
  if (sorted.length === 1) return sorted[0];
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function distribution(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    count: sorted.length,
    mean: sorted.length ? Math.round(sorted.reduce((sum, v) => sum + v, 0) / sorted.length) : null,
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
    max: sorted.length ? sorted[sorted.length - 1] : null,
  };
}

const round = (value) => (value === null || value === undefined ? null : Math.round(value * 10) / 10);

// ---------------------------------------------------------------- setup
async function registerWorkspace(config, index) {
  const localAddress = config.ipSpread ? `127.0.0.${10 + (index % 240)}` : undefined;
  const agent = makeAgent(localAddress, 4);
  const email = `loadtest+${config.runId}-${index}@loadtest.invalid`;
  const password = "load-lab-correct-horse";
  const register = await send({
    base: config.baseUrl,
    method: "POST",
    path: "/api/auth/register",
    agent,
    headers: { origin: config.origin },
    body: { name: `Load Owner ${index}`, businessName: `Load Lab ${index}`, email, password },
  });
  if (register.status !== 201) {
    agent.destroy();
    return {
      index,
      localAddress,
      ok: false,
      status: register.status,
      detail: register.text.slice(0, 240) || register.networkError || "",
    };
  }
  const cookie = readCookie(register);
  const session = await send({
    base: config.baseUrl,
    method: "GET",
    path: "/api/session",
    agent,
    headers: { cookie },
  });
  let csrf = "";
  try {
    csrf = JSON.parse(session.text).csrf || "";
  } catch {
    /* handled below */
  }
  const workspaces = await send({
    base: config.baseUrl,
    method: "GET",
    path: "/api/workspaces",
    agent,
    headers: { cookie },
  });
  let workspaceId = "";
  try {
    workspaceId = JSON.parse(workspaces.text)[0]?.id || "";
  } catch {
    /* handled below */
  }
  if (!csrf || !workspaceId) {
    agent.destroy();
    return {
      index,
      localAddress,
      ok: false,
      status: session.status,
      detail: `session/csrf bootstrap failed (${session.status} ${workspaces.status})`,
    };
  }
  // The local simulator route is the only way to create a connection without a
  // real Meta account. It auto-connects `local-<workspaceId>-<platform>` and
  // writes one real inbound message, so the account id exists for the webhook
  // normaliser. This warmup is setup traffic and is not measured.
  const warm = await send({
    base: config.baseUrl,
    method: "POST",
    path: "/api/development/inbound",
    agent,
    headers: { cookie, origin: config.origin, "x-csrf-token": csrf },
    body: {
      platform: config.platform,
      name: "Warmup Contact",
      text: "Warmup: is anyone there?",
    },
  });
  return {
    index,
    localAddress,
    ok: true,
    cookie,
    csrf,
    workspaceId,
    accountId: `local-${workspaceId}-${config.platform}`,
    agent,
    warmupStatus: warm.status,
  };
}

async function probeWebhookSignature(config, owner) {
  const at = Date.now();
  const payload = instagramMessagePayload({
    accountId: owner.accountId,
    contactId: `probe-${config.runId}`,
    text: "Signature probe",
    mid: `mid.probe.${config.runId}`,
    at,
  });
  const raw = Buffer.from(JSON.stringify(payload));
  const signature = `sha256=${crypto
    .createHmac("sha256", config.secret)
    .update(raw)
    .digest("hex")}`;
  const response = await send({
    base: config.baseUrl,
    method: "POST",
    path: `/api/webhooks/${config.platform}`,
    agent: owner.agent,
    headers: { "x-hub-signature-256": signature, "content-type": "application/json" },
    body: raw,
  });
  return { status: response.status, body: response.text.slice(0, 200), accepted: response.status === 200 };
}

// ---------------------------------------------------------------- load loop
async function runLoad(config, owners, verbose) {
  const samples = [];
  const mix = config.mode === "webhook"
    ? { inbound: 0.5, status: 0.2, read: 0.3 }
    : { inbound: 0.6, read: 0.4 };
  const startedAt = performance.now();
  const deadline = startedAt + config.duration * 1000;
  let issued = 0;
  let inFlight = 0;
  let nextMessageSerial = 0;
  const rpsWindow = [];
  let stop = false;

  const pick = () => {
    const roll = Math.random();
    if (roll < mix.inbound) return "inbound";
    if (config.mode === "webhook" && roll < mix.inbound + mix.status) return "status";
    return "read";
  };

  const throttledWait = async () => {
    // Aggregate pacing: keep the newest 200ms of issue timestamps and hold when
    // the configured rate is exceeded. Without it a 50-socket harness measures
    // only the kernel, not the app.
    while (!stop) {
      const now = performance.now();
      while (rpsWindow.length && now - rpsWindow[0] > 1000) rpsWindow.shift();
      if (rpsWindow.length < config.maxRps) return;
      await new Promise((r) => setTimeout(r, 5));
    }
  };

  const worker = async () => {
    while (!stop && performance.now() < deadline) {
      await throttledWait();
      if (stop || performance.now() >= deadline) break;
      const owner = owners[issued % owners.length];
      const kind = pick();
      const serial = nextMessageSerial++;
      issued++;
      rpsWindow.push(performance.now());
      inFlight++;
      let result;
      try {
        result = await issueOne(config, owner, kind, serial);
      } catch (error) {
        result = { kind, status: 0, ms: 0, networkError: String(error?.message || error) };
      } finally {
        inFlight--;
      }
      samples.push({ ...result, at: Date.now() });
      if (verbose && samples.length % 200 === 0)
        console.error(`  … ${samples.length} requests, ${inFlight} in flight`);
    }
  };

  const timers = [setTimeout(() => (stop = true), config.duration * 1000)];
  const runners = Array.from({ length: config.concurrency }, worker);
  const progress = setInterval(() => {
    if (!verbose) return;
    console.error(`  … ${Math.round((performance.now() - startedAt) / 1000)}s ${samples.length} req ${inFlight} in flight`);
  }, 5000);
  await Promise.all(runners);
  clearInterval(progress);
  for (const timer of timers) clearTimeout(timer);
  return { samples, elapsedMs: performance.now() - startedAt };
}

async function issueOne(config, owner, kind, serial) {
  const at = Date.now();
  if (kind === "read") {
    const readBootstrap = serial % 4 === 0;
    const response = await send({
      base: config.baseUrl,
      method: "GET",
      path: readBootstrap ? "/api/bootstrap" : "/api/conversations",
      agent: owner.agent,
      headers: { cookie: owner.cookie },
    });
    return {
      kind: readBootstrap ? "read:bootstrap" : "read:conversations",
      status: response.status,
      ms: response.ms,
      networkError: response.networkError,
      ratelimitRemaining: Number(response.headers.ratelimit?.match(/r=(\d+)/)?.[1] ?? -1),
    };
  }

  if (kind === "status") {
    // Delivery receipt for a message that does not exist: the normaliser drops
    // it, which is exactly what the real path does for an unknown id.
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: owner.accountId,
          time: Math.floor(at / 1000),
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                metadata: { display_phone_number: owner.accountId, phone_number_id: owner.accountId },
                statuses: [
                  { id: `wamid.load.${config.runId}.${serial}`, status: "delivered", timestamp: String(Math.floor(at / 1000)) },
                ],
              },
            },
          ],
        },
      ],
    };
    return postWebhook(config, owner, payload);
  }

  const text = MESSAGE_TEXTS[serial % MESSAGE_TEXTS.length];
  const contactId = `${config.runId}-c${serial % 40}`;
  if (config.mode === "webhook") {
    const payload = config.platform === "whatsapp"
      ? whatsappMessagePayload({ accountId: owner.accountId, contactId, text, mid: `wamid.load.${config.runId}.${serial}`, at })
      : instagramMessagePayload({ accountId: owner.accountId, contactId, text, mid: `mid.load.${config.runId}.${serial}`, at });
    return postWebhook(config, owner, payload);
  }
  // Same ingest path, no HMAC and no receipt row: used only when the server has
  // no webhook secret, and reported as such in the result.
  const response = await send({
    base: config.baseUrl,
    method: "POST",
    path: "/api/development/inbound",
    agent: owner.agent,
    headers: { cookie: owner.cookie, origin: config.origin, "x-csrf-token": owner.csrf },
    body: { platform: config.platform, name: `Load Contact ${serial % 40}`, text },
  });
  return {
    kind: "inbound:dev",
    status: response.status,
    ms: response.ms,
    networkError: response.networkError,
    ratelimitRemaining: Number(response.headers.ratelimit?.match(/r=(\d+)/)?.[1] ?? -1),
  };
}

async function postWebhook(config, owner, payload) {
  const raw = Buffer.from(JSON.stringify(payload));
  const signature = `sha256=${crypto.createHmac("sha256", config.secret).update(raw).digest("hex")}`;
  const response = await send({
    base: config.baseUrl,
    method: "POST",
    path: `/api/webhooks/${config.platform}`,
    agent: owner.agent,
    headers: { "x-hub-signature-256": signature, "content-type": "application/json" },
    body: raw,
  });
  return {
    kind: "inbound:webhook",
    status: response.status,
    ms: response.ms,
    networkError: response.networkError,
    ratelimitRemaining: Number(response.headers.ratelimit?.match(/r=(\d+)/)?.[1] ?? -1),
  };
}

// ---------------------------------------------------------------- AI layer
/**
 * The AI work happens on the queue, not in the request. Read it back from the
 * per-workspace operations endpoint so the report separates "the request was
 * fast" from "the reply actually arrived".
 */
async function collectAiLayer(config, owners) {
  const summary = {
    workspacesProbed: 0,
    jobsDead: 0,
    jobsPending: 0,
    sampledJobRows: 0,
    suggestionSamples: 0,
    suggestionMeanMs: null,
    suggestionP95WorstWorkspaceMs: null,
    topErrors: [],
  };
  const errors = new Map();
  let weightedMean = 0;
  let meanSamples = 0;
  let worstP95 = 0;
  await Promise.all(
    owners.map(async (owner) => {
      const response = await send({
        base: config.baseUrl,
        method: "GET",
        path: "/api/operations",
        agent: owner.agent,
        headers: { cookie: owner.cookie },
      });
      if (response.status !== 200) return;
      summary.workspacesProbed++;
      let body;
      try {
        body = JSON.parse(response.text);
      } catch {
        return;
      }
      summary.sampledJobRows += body.jobs?.length || 0;
      for (const job of body.jobs || []) {
        if (job.state === "dead") {
          summary.jobsDead++;
          if (job.error) errors.set(job.error, (errors.get(job.error) || 0) + 1);
        } else if (job.state === "pending") summary.jobsPending++;
      }
      const count = Number(body.latency?.count || 0);
      if (count > 0) {
        summary.suggestionSamples += count;
        if (body.latency.mean_ms !== null) {
          weightedMean += Number(body.latency.mean_ms) * count;
          meanSamples += count;
        }
        if (body.latency.p95_ms !== null)
          worstP95 = Math.max(worstP95, Number(body.latency.p95_ms));
      }
    }),
  );
  summary.suggestionMeanMs = meanSamples ? Math.round(weightedMean / meanSamples) : null;
  summary.suggestionP95WorstWorkspaceMs = worstP95 || null;
  summary.topErrors = [...errors.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([error, count]) => ({ error, count }));
  return summary;
}

// ---------------------------------------------------------------- reporting
function report(config, owners, load, aiLayer, setup) {
  const samples = load.samples;
  const latencies = samples.map((s) => s.ms);
  const overall = distribution(latencies);
  const byStatus = {};
  for (const sample of samples) {
    const key = sample.networkError ? "network-error" : String(sample.status);
    byStatus[key] = (byStatus[key] || 0) + 1;
  }
  const byKind = {};
  for (const sample of samples) {
    byKind[sample.kind] ||= [];
    byKind[sample.kind].push(sample);
  }
  const kindReport = {};
  for (const [kind, rows] of Object.entries(byKind)) {
    const dist = distribution(rows.map((row) => row.ms));
    kindReport[kind] = {
      count: rows.length,
      errors: rows.filter((row) => row.status === 0 || row.status >= 400).length,
      rateLimited: rows.filter((row) => row.status === 429).length,
      mean: round(dist.mean),
      p50: round(dist.p50),
      p95: round(dist.p95),
      p99: round(dist.p99),
      max: round(dist.max),
    };
  }
  const ok = samples.filter((s) => s.status >= 200 && s.status < 300).length;
  const errors = samples.length - ok;
  const rateLimited = samples.filter((s) => s.status === 429).length;
  const worst = samples.reduce(
    (acc, sample) => (sample.ms > acc.ms ? sample : acc),
    { ms: -1, kind: "none", status: 0 },
  );
  const elapsedSeconds = load.elapsedMs / 1000;
  const errorRate = samples.length ? errors / samples.length : 0;
  const ceilingOk = worst.ms <= config.ceilingMs;
  const errorRateOk = errorRate <= config.maxErrorRate;
  const violations = [];
  if (!ceilingOk)
    violations.push(
      `MAX single-request latency ${Math.round(worst.ms)}ms exceeds the ceiling ${config.ceilingMs}ms (${worst.kind} → HTTP ${worst.status})`,
    );
  if (!errorRateOk)
    violations.push(
      `error rate ${(errorRate * 100).toFixed(2)}% exceeds the allowed ${(config.maxErrorRate * 100).toFixed(2)}%`,
    );

  const buckets = new Map();
  const t0 = load.startedAt;
  for (const sample of samples) {
    const second = Math.floor((sample.at - t0) / 1000);
    const bucket = buckets.get(second) || { second, count: 0, errors: 0, maxMs: 0 };
    bucket.count++;
    if (sample.status === 0 || sample.status >= 400) bucket.errors++;
    bucket.maxMs = Math.max(bucket.maxMs, sample.ms);
    buckets.set(second, bucket);
  }

  return {
    generatedAt: new Date().toISOString(),
    label: config.label,
    baseUrl: config.baseUrl,
    mode: {
      inbound: config.mode === "webhook" ? "signed-meta-webhook" : "development-inbound-route",
      webhookSignature: setup.probe.accepted ? "accepted" : `rejected (HTTP ${setup.probe.status})`,
      note:
        config.mode === "webhook"
          ? "Traffic went through POST /api/webhooks/<platform> with a valid x-hub-signature-256."
          : "The server has no webhook secret configured, so signed webhooks are rejected with 401. Traffic used POST /api/development/inbound, which reaches the same service.ingest path but skips HMAC verification and the webhook receipt row.",
    },
    config: {
      workspaces: config.workspaces,
      concurrency: config.concurrency,
      durationSeconds: config.duration,
      maxRps: config.maxRps,
      aiTimeoutMs: config.aiTimeoutMs,
      marginMs: config.marginMs,
      ceilingMs: config.ceilingMs,
      maxErrorRate: config.maxErrorRate,
      ipSpread: config.ipSpread,
    },
    setup: {
      registered: owners.length,
      failed: setup.failed.length,
      failures: setup.failed.slice(0, 10),
      warmupConversations: owners.length,
    },
    totals: {
      requests: samples.length,
      ok2xx: ok,
      errors,
      rateLimited429: rateLimited,
      networkErrors: samples.filter((s) => s.networkError).length,
      elapsedMs: Math.round(load.elapsedMs),
      throughputRps: Math.round((samples.length / elapsedSeconds) * 10) / 10,
      errorRate: Math.round(errorRate * 10000) / 10000,
    },
    latency: {
      p50: round(overall.p50),
      p95: round(overall.p95),
      p99: round(overall.p99),
      mean: round(overall.mean),
      max: round(overall.max),
      maxRequest: { kind: worst.kind, status: worst.status, ms: round(worst.ms) },
    },
    byStatus,
    byKind: kindReport,
    timeline: [...buckets.values()]
      .sort((a, b) => a.second - b.second)
      .map((bucket) => ({ ...bucket, maxMs: Math.round(bucket.maxMs) })),
    aiLayer,
    verdict: {
      ceilingMs: config.ceilingMs,
      maxObservedMs: round(worst.ms),
      ceilingOk,
      errorRateOk,
      pass: ceilingOk && errorRateOk,
      violations,
    },
  };
}

function printSummary(result) {
  const bold = (text) => `\u001b[1m${text}\u001b[0m`;
  const red = (text) => `\u001b[31m${text}\u001b[0m`;
  const green = (text) => `\u001b[32m${text}\u001b[0m`;
  const line = (label, value) => console.log(`  ${label.padEnd(24)} ${value}`);
  console.log("");
  console.log(bold("DMCloser load lab — inbound feedback path"));
  line("target", result.baseUrl);
  line("inbound mode", result.mode.inbound);
  line("webhook signature", result.mode.webhookSignature);
  line(
    "shape",
    `${result.config.workspaces} workspaces · ${result.config.concurrency} in flight · ${result.config.durationSeconds}s · cap ${result.config.maxRps} rps`,
  );
  line("requests", `${result.totals.requests} (${result.totals.ok2xx} ok, ${result.totals.errors} errors)`);
  line("throughput", `${result.totals.throughputRps} req/s`);
  line("error rate", `${(result.totals.errorRate * 100).toFixed(2)}%  (429: ${result.totals.rateLimited429})`);
  line("latency p50/p95/p99", `${result.latency.p50}ms / ${result.latency.p95}ms / ${result.latency.p99}ms`);
  console.log("");
  console.log(bold(`  MAX OBSERVED SINGLE REQUEST: ${result.latency.max}ms`) + bold(` vs CEILING ${result.verdict.ceilingMs}ms`));
  for (const kind of Object.keys(result.byKind))
    line(
      `  ${kind}`,
      `${result.byKind[kind].count} req · p95 ${result.byKind[kind].p95}ms · max ${result.byKind[kind].max}ms · err ${result.byKind[kind].errors}`,
    );
  console.log("");
  const ai = result.aiLayer;
  line(
    "AI layer (server side)",
    ai.suggestionSamples
      ? `${ai.suggestionSamples} suggestions, mean ${ai.suggestionMeanMs}ms, worst p95 ${ai.suggestionP95WorstWorkspaceMs}ms`
      : "no suggestions recorded (AI path never completed)",
  );
  line("dead jobs (sampled)", `${ai.jobsDead} dead · ${ai.jobsPending} pending across ${ai.workspacesProbed} workspaces`);
  if (ai.topErrors?.length) line("dominant job error", ai.topErrors[0].error.slice(0, 90));
  console.log("");
  if (result.verdict.pass) console.log(green(bold("  PASS — every request answered inside the ceiling.")));
  else for (const violation of result.verdict.violations) console.log(red(bold(`  FAIL — ${violation}`)));
  console.log("");
}

// ---------------------------------------------------------------- main
async function main() {
  const config = parseArgs(process.argv.slice(2));
  config.runId = crypto.randomBytes(4).toString("hex");
  config.startedAt = Date.now();
  const verbose = !config.quiet;

  const health = await send({
    base: config.baseUrl,
    method: "GET",
    path: "/api/health",
    agent: makeAgent(undefined, 2),
  });
  if (health.status !== 200) {
    console.error(
      `  cannot reach ${config.baseUrl}/api/health (${health.status} ${health.networkError || health.text.slice(0, 120)})`,
    );
    process.exit(2);
  }
  const readyBefore = await send({
    base: config.baseUrl,
    method: "GET",
    path: "/api/ready",
    agent: makeAgent(undefined, 2),
  });
  if (verbose) {
    console.error(`  target ${config.baseUrl} — health ok, ready ${readyBefore.status}`);
    console.error(`  registering ${config.workspaces} workspaces…`);
  }

  const owners = [];
  const failed = [];
  for (let index = 0; index < config.workspaces; index++) {
    const owner = await registerWorkspace(config, index);
    if (owner.ok) owners.push(owner);
    else failed.push(owner);
  }
  if (!owners.length) {
    console.error("  no workspace could be registered:", JSON.stringify(failed.slice(0, 3)));
    process.exit(2);
  }
  if (verbose && failed.length)
    console.error(`  ${failed.length} workspace(s) failed to register: ${JSON.stringify(failed[0])}`);

  // Decide the inbound transport once, honestly, from a real signed request.
  const probe = config.secret
    ? await probeWebhookSignature(config, owners[0])
    : { status: 401, accepted: false, body: "no secret supplied" };
  config.mode = probe.accepted ? "webhook" : "dev";
  if (verbose)
    console.error(
      `  signed webhook probe: HTTP ${probe.status} → inbound mode ${config.mode === "webhook" ? "webhook" : "development route"}`,
    );

  const load = await runLoad(config, owners, verbose);
  load.startedAt = load.samples.length ? Math.min(...load.samples.map((s) => s.at)) : Date.now();
  const aiLayer = await collectAiLayer(config, owners);
  const result = report(config, owners, load, aiLayer, { probe, failed });
  printSummary(result);

  const outPath = resolve(
    config.out || resolve(HERE, "results", `run-${new Date(config.startedAt).toISOString().replace(/[:.]/g, "-")}.json`),
  );
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(result, null, 2));
  if (verbose) console.error(`  report written to ${outPath}`);

  const readyAfter = await send({
    base: config.baseUrl,
    method: "GET",
    path: "/api/ready",
    agent: makeAgent(undefined, 2),
  });
  if (verbose) console.error(`  readiness after load: ${readyAfter.status} ${readyAfter.text.slice(0, 120)}`);

  for (const owner of owners) owner.agent.destroy();
  process.exit(result.verdict.pass ? 0 : 1);
}

main().catch((error) => {
  console.error("  harness error:", error?.stack || error);
  process.exit(2);
});
