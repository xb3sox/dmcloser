import * as Sentry from "@sentry/react";
import {
  scrubString,
  scrubValue,
  scrubEventRecord,
} from "./domain/observability";

export { scrubString, scrubValue };

export function scrubClientEvent(
  event: Sentry.ErrorEvent,
): Sentry.ErrorEvent {
  if (!event || typeof event !== "object") return event;
  return scrubEventRecord(
    event as unknown as Record<string, unknown>,
  ) as unknown as Sentry.ErrorEvent;
}

let initialized = false;

export function initClientObservability(): void {
  if (initialized) return;
  const dsn =
    import.meta.env?.VITE_SENTRY_DSN ||
    (typeof process !== "undefined" ? process.env?.SENTRY_DSN : undefined) ||
    undefined;

  if (!dsn) return;

  try {
    Sentry.init({
      dsn,
      release: import.meta.env?.VITE_SENTRY_RELEASE || undefined,
      environment: import.meta.env?.MODE || "production",
      beforeSend(event) {
        return scrubClientEvent(event);
      },
    });
    initialized = true;
  } catch (err) {
    console.error("Client Sentry initialization failed:", err);
  }
}
