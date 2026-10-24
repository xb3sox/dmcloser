import * as Sentry from "@sentry/react";

const SENSITIVE_KEY_PATTERN =
  /^(authorization|cookie|cookies|set-cookie|x-csrf-token|token|tokens|password|secret|access_token|accessToken|auth)$/i;
const BODY_KEY_PATTERN =
  /^(message|body|text|content|payload|notes|description|productsSold|messageBody|customerText)$/i;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX =
  /(?:\+\d{1,3}[-.\s]?)?\(?\d{3,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}|\+\d{10,15}/g;

export function scrubString(str: string): string {
  if (typeof str !== "string") return str;
  let result = str.replace(EMAIL_REGEX, "[SCRUBBED_EMAIL]");
  result = result.replace(PHONE_REGEX, "[SCRUBBED_PHONE]");
  return result;
}

export function scrubValue(val: any, keyName?: string): any {
  if (val === null || val === undefined) return val;

  if (typeof val === "string") {
    if (keyName && SENSITIVE_KEY_PATTERN.test(keyName)) {
      return "[SCRUBBED]";
    }
    if (keyName && BODY_KEY_PATTERN.test(keyName)) {
      return "[SCRUBBED_BODY]";
    }
    return scrubString(val);
  }

  if (Array.isArray(val)) {
    return val.map((item) => scrubValue(item, keyName));
  }

  if (typeof val === "object") {
    const scrubbedObj: Record<string, any> = {};
    for (const k of Object.keys(val)) {
      if (SENSITIVE_KEY_PATTERN.test(k)) {
        scrubbedObj[k] = "[SCRUBBED]";
      } else if (BODY_KEY_PATTERN.test(k)) {
        scrubbedObj[k] = "[SCRUBBED_BODY]";
      } else {
        scrubbedObj[k] = scrubValue(val[k], k);
      }
    }
    return scrubbedObj;
  }

  return val;
}

export function scrubClientEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  if (!event || typeof event !== "object") return event;

  const cloned = JSON.parse(JSON.stringify(event));

  if (typeof cloned.message === "string") {
    cloned.message = scrubString(cloned.message);
  }

  if (cloned.exception && Array.isArray(cloned.exception.values)) {
    for (const exc of cloned.exception.values) {
      if (typeof exc.value === "string") {
        exc.value = scrubString(exc.value);
      }
    }
  }

  if (cloned.extra && typeof cloned.extra === "object") {
    cloned.extra = scrubValue(cloned.extra);
  }
  if (cloned.contexts && typeof cloned.contexts === "object") {
    cloned.contexts = scrubValue(cloned.contexts);
  }
  if (cloned.breadcrumbs && Array.isArray(cloned.breadcrumbs)) {
    cloned.breadcrumbs = cloned.breadcrumbs.map((b: any) => scrubValue(b));
  }
  if (cloned.request && typeof cloned.request === "object") {
    if (cloned.request.headers && typeof cloned.request.headers === "object") {
      for (const h of Object.keys(cloned.request.headers)) {
        if (SENSITIVE_KEY_PATTERN.test(h)) {
          cloned.request.headers[h] = "[SCRUBBED]";
        } else if (typeof cloned.request.headers[h] === "string") {
          cloned.request.headers[h] = scrubString(cloned.request.headers[h]);
        }
      }
    }
    if (cloned.request.data) {
      cloned.request.data = scrubValue(cloned.request.data);
    }
  }

  return cloned as Sentry.ErrorEvent;
}

export function initClientObservability(): void {
  const dsn =
    import.meta.env?.VITE_SENTRY_DSN ||
    (typeof process !== "undefined" ? process.env?.SENTRY_DSN : undefined) ||
    undefined;

  if (!dsn) return;

  const release =
    import.meta.env?.VITE_SENTRY_RELEASE ||
    import.meta.env?.VITE_COMMIT_SHA ||
    undefined;

  try {
    Sentry.init({
      dsn,
      release,
      environment: import.meta.env?.MODE || "production",
      beforeSend(event) {
        return scrubClientEvent(event);
      },
    });
  } catch (err) {
    console.error("Failed to initialize client Sentry:", err);
  }
}
