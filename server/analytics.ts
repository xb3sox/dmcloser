import { PostHog } from "posthog-node";
import type { Database } from "./db.ts";
import type { Config } from "./config.ts";
import { digest } from "./security.ts";

/** Fixed taxonomy. A property not listed here is dropped before capture. */
export const eventProperties = {
  signup: [],
  workspace_created: ["plan", "industry"],
  channel_connected: ["platform"],
  draft_generated: ["intent", "confidence", "safe"],
  reply_sent: ["platform", "automatic"],
  outcome_recorded: ["stage", "currency"],
} as const;

export type AnalyticsEvent = keyof typeof eventProperties;
export type AnalyticsProperties = Record<string, string | number | boolean | null>;

export interface AnalyticsClient {
  capture(message: {
    distinctId: string;
    event: string;
    properties: AnalyticsProperties;
  }): void;
}

/**
 * Server-side PostHog capture. The workspace id is hashed before it leaves the
 * process, consent is read from the workspace row on every call, and only
 * allowlisted keys survive. No client SDK is loaded.
 */
export class Analytics {
  private readonly client: AnalyticsClient | null;

  constructor(config: Config, client?: AnalyticsClient) {
    this.client =
      config.analyticsEnabled === false
        ? null
        : client ??
          (config.posthogKey
            ? new PostHog(config.posthogKey, {
                host: config.posthogHost,
                flushAt: 1,
                flushInterval: 0,
              })
            : null);
  }

  async capture(
    db: Database,
    workspaceId: string,
    event: AnalyticsEvent,
    properties: AnalyticsProperties = {},
  ): Promise<void> {
    if (!this.client) return;
    const [row] = await db.query("SELECT settings FROM workspaces WHERE id=$1", [
      workspaceId,
    ]);
    if (!row?.settings?.analyticsConsent) return;
    const allowed: readonly string[] = eventProperties[event];
    const filtered = Object.fromEntries(
      Object.entries(properties).filter(([key]) => allowed.includes(key)),
    );
    this.client.capture({
      distinctId: digest(workspaceId).slice(0, 16),
      event,
      properties: filtered,
    });
  }
}
