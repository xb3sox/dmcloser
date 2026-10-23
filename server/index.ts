import { loadConfig } from "./config.ts";
import { createDatabase } from "./db.ts";
import { createApp } from "./app.ts";

const config = await loadConfig();
const db = await createDatabase(config);
const { app, worker, service } = await createApp(config, db);
const server = app.listen(config.port, "0.0.0.0", () =>
  console.log(
    JSON.stringify({
      event: "server.ready",
      port: config.port,
      storage: db.kind,
      production: config.production,
    }),
  ),
);
server.requestTimeout = 30000;
server.headersTimeout = 15000;
// A dedicated worker process sets WORKER_ENABLED=false. It then serves health
// but claims no jobs, so exactly one process owns the queue per deployment.
if (config.workerEnabled) worker.start();
const maintenance = setInterval(
  () =>
    worker
      .maintenance()
      .catch(() =>
        console.error(JSON.stringify({ event: "maintenance.failure" })),
      ),
  3600000,
);
maintenance.unref();
await worker.maintenance();
let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  clearInterval(maintenance);
  service.events.emit("shutdown");
  await worker.stop();
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await db.close();
}
process.on("SIGTERM", () => {
  shutdown().then(() => process.exit(0));
});
process.on("SIGINT", () => {
  shutdown().then(() => process.exit(0));
});
