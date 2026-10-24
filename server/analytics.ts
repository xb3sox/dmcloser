import { digest } from "./security.ts";
import type { Config } from "./config.ts";

export type AnalyticsEventName =
  | "signup"
  | "workspace_created"
  | "channel_connected"
  | "draft_generated"
  | "reply_sent"
  | "outcome_recorded";

export interface AnalyticsEventPayload {
  api_key?: string;
  event: AnalyticsEventName;
  distinct_id: string;
  properties: Record<string, unknown>;
  timestamp?: string;
}

const FORBIDDEN_KEY_PATTERNS = [
  /email/i,
  /phone/i,
  /mobile/i,
  /message/i,
  /body/i,
  /text/i,
  /token/i,
  /secret/i,
  /password/i,
  /auth/i,
  /bearer/i,
  /key/i,
];

const FORBIDDEN_VALUE_PATTERNS = [
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // email
  /\+?[0-9]{7,15}/, // phone number candidate
  /bearer\s+[a-zA-Z0-9._~+/-]+=*/i, // bearer token
];

export function hashWorkspaceId(workspaceId: string): string {
  if (!workspaceId) return "anonymous";
  return digest(workspaceId);
}

export function assertNoPII(obj: unknown, path = ""): void {
  if (obj === null || obj === undefined) return;

  if (typeof obj === "string") {
    for (const pattern of FORBIDDEN_VALUE_PATTERNS) {
      if (pattern.test(obj)) {
        throw new Error(`PII Violation: String at '${path}' contains potential sensitive data matching pattern ${pattern.source}`);
      }
    }
    return;
  }

  if (typeof obj === "number" || typeof obj === "boolean") return;

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => assertNoPII(item, `${path}[${index}]`));
    return;
  }

  if (typeof obj === "object") {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      for (const pattern of FORBIDDEN_KEY_PATTERNS) {
        if (pattern.test(key)) {
          throw new Error(`PII Violation: Key '${currentPath}' is forbidden by PII guardrails.`);
        }
      }
      assertNoPII(value, currentPath);
    }
    return;
  }
}

export class AnalyticsService {
  constructor(private config: Config) {}

  /**
   * Builds an event payload, performs strict PII assertions, and sends it to PostHog if consent is granted and PostHog is enabled.
   */
  async capture(
    eventName: AnalyticsEventName,
    workspaceId: string,
    consentGiven: boolean,
    properties: Record<string, unknown> = {},
  ): Promise<AnalyticsEventPayload | null> {
    // AC: No event is sent before consent.
    if (!consentGiven) {
      return null;
    }

    // AC: Disabling the flag stops all capture.
    if (!this.config.posthogEnabled) {
      return null;
    }

    const hashedWorkspaceId = hashWorkspaceId(workspaceId);

    const payload: AnalyticsEventPayload = {
      api_key: this.config.posthogApiKey,
      event: eventName,
      distinct_id: hashedWorkspaceId,
      properties: {
        ...properties,
        $process_person_profile: false,
      },
    };

    // AC: Every event payload passes a PII test.
    assertNoPII(payload.properties);

    if (this.config.posthogApiKey) {
      const host = this.config.posthogHost.replace(/\/$/, "");
      try {
        await fetch(`${host}/capture/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (error) {
        console.error("PostHog capture failed:", error);
      }
    }

    return payload;
  }
}
