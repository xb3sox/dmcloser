import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(nodeScrypt);

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "REQUEST_FAILED",
  ) {
    super(message);
  }
}
export const randomToken = () => randomBytes(32).toString("base64url");
export const digest = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
// Constant-time by construction: both inputs become 32-byte digests before the only
// comparison, so the time taken cannot reveal the expected value's length. A direct
// timingSafeEqual on raw buffers needs a length guard, and that guard is the leak.
export function equal(first: string, second: string): boolean {
  const a = createHash("sha256").update(first).digest();
  const b = createHash("sha256").update(second).digest();
  return timingSafeEqual(a, b);
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}
// Dummy salt/hash used when stored password format is missing/malformed to ensure constant-time scrypt execution.
const dummySalt = "00".repeat(16);
const dummyHash = "00".repeat(64);

// Guarantees constant-time password verification even for non-string or malformed inputs to mitigate timing attacks / user enumeration.
export async function verifyPassword(password: string, stored: string) {
  const isString = typeof stored === "string";
  const parts = isString ? stored.split(":") : [];
  const valid = parts.length === 2 && Boolean(parts[0]) && Boolean(parts[1]);
  const salt = valid ? parts[0] : dummySalt;
  const hash = valid ? parts[1] : dummyHash;

  // Always run key derivation and constant-time comparison to prevent timing side-channels
  const key = (await scrypt(password, salt, 64)) as Buffer;
  const matches = equal(key.toString("hex"), hash);
  return valid && matches;
}
export function encrypt(token: string, secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(secret, "hex"), iv, {
    authTagLength: 16,
  });
  const body = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}.${cipher.getAuthTag().toString("hex")}.${body.toString("hex")}`;
}
const HEX_REGEX = /^[0-9a-fA-F]+$/;

// Validate payload structure defensively before hex conversion and deciphering
// to prevent unexpected runtime TypeErrors or crashes on malformed ciphertext input.
export function decrypt(value: string, secret: string) {
  if (typeof value !== "string" || !value) {
    throw new Error("Invalid encrypted payload.");
  }
  const parts = value.split(".");
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    throw new Error("Invalid encrypted payload format.");
  }
  const [iv, tag, body] = parts;
  if (
    iv.length !== 24 ||
    tag.length !== 32 ||
    body.length % 2 !== 0 ||
    !HEX_REGEX.test(iv) ||
    !HEX_REGEX.test(tag) ||
    !HEX_REGEX.test(body)
  ) {
    throw new Error("Invalid encrypted payload format.");
  }
  const cipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(secret, "hex"),
    Buffer.from(iv, "hex"),
    { authTagLength: 16 },
  );
  cipher.setAuthTag(Buffer.from(tag, "hex"));
  return Buffer.concat([
    cipher.update(Buffer.from(body, "hex")),
    cipher.final(),
  ]).toString("utf8");
}
export function validMetaSignature(
  body: Buffer,
  signature: string | undefined,
  secret: string | undefined,
) {
  return (
    !!secret &&
    !!signature &&
    equal(
      `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`,
      signature,
    )
  );
}
