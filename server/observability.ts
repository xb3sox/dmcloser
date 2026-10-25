import * as Sentry from "@sentry/node";
import type { Config } from "./config.ts";
import {
  scrubString,
  scrubValue,
  scrubEventRecord,
} from "../src/domain/observability.ts";

export { scrubString, scrubValue };

export function scrubSentryEvent(
  event: Sentry.ErrorEvent,
  _hint?: Sentry.EventHint,
): Sentry.ErrorEvent {
  if (!event || typeof event !== "object") return event;
  return scrubEventRecord(
    event as unknown as Record<string, unknown>,
  ) as unknown as Sentry.ErrorEvent;
}

let initialized = false;

export function initServerObservability(config: Partial<Config>): void {
  if (initialized || !config?.sentryDsn) return;
  try {
    Sentry.init({
      dsn: config.sentryDsn,
      release: config.sentryRelease,
      environment: config.production ? "production" : "development",
      beforeSend(event, hint) {
        return scrubSentryEvent(event, hint);
      },
    });
    initialized = true;
  } catch (err) {
    console.error("Sentry initialization failed:", err);
  }
}
