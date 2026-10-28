// Security: Match sensitive keys (credentials, session tokens, and API/crypto keys)
// to ensure sensitive credentials are scrubbed before telemetry/Sentry transmission.
export const SENSITIVE_KEY_PATTERN =
  /^(authorization|cookie|cookies|set-cookie|x-csrf-token|token|tokens|password|secret|access_token|accessToken|auth|api_key|apiKey|secret_key|secretKey|private_key|privateKey)$/i;
export const BODY_KEY_PATTERN =
  /^(message|body|text|content|payload|notes|description|productsSold|messageBody|customerText)$/i;

export const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Bilingual phone regex supporting ASCII digits and Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩)
export const PHONE_REGEX =
  /(?:\+[\d\u0660-\u0669]{1,3}[-.\s]?)?\(?[\d\u0660-\u0669]{3,4}\)?[-.\s]?[\d\u0660-\u0669]{3,4}[-.\s]?[\d\u0660-\u0669]{3,4}|\+[\d\u0660-\u0669]{10,15}/g;

export function scrubString(str: string): string {
  if (typeof str !== "string") return str;
  let result = str.replace(EMAIL_REGEX, "[SCRUBBED_EMAIL]");
  result = result.replace(PHONE_REGEX, "[SCRUBBED_PHONE]");
  return result;
}

export function scrubValue(val: unknown, keyName?: string, seen = new WeakSet()): unknown {
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

  if (typeof val === "number" || typeof val === "boolean") {
    return val;
  }

  if (typeof val === "object") {
    if (seen.has(val as object)) return "[Circular]";
    seen.add(val as object);

    if (Array.isArray(val)) {
      return val.map((item) => scrubValue(item, keyName, seen));
    }

    const scrubbedObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(k)) {
        scrubbedObj[k] = "[SCRUBBED]";
      } else if (BODY_KEY_PATTERN.test(k)) {
        scrubbedObj[k] = "[SCRUBBED_BODY]";
      } else {
        scrubbedObj[k] = scrubValue(v, k, seen);
      }
    }
    return scrubbedObj;
  }

  return val;
}

export function scrubEventRecord(
  event: Record<string, unknown>,
): Record<string, unknown> {
  const cloned = scrubValue(event) as Record<string, unknown>;

  if (cloned.user && typeof cloned.user === "object") {
    const user = cloned.user as Record<string, unknown>;
    if (user.ip_address) user.ip_address = "[SCRUBBED_IP]";
    if (user.email) user.email = "[SCRUBBED_EMAIL]";
  }

  if (cloned.request && typeof cloned.request === "object") {
    const req = cloned.request as Record<string, unknown>;
    if (typeof req.url === "string") {
      req.url = req.url.replace(/\?[^#]*/, "?[SCRUBBED_QUERY]");
    }
    if (req.query_string) {
      req.query_string = "[SCRUBBED_QUERY]";
    }
    if (req.cookies) {
      req.cookies = "[SCRUBBED]";
    }
  }

  return cloned;
}
