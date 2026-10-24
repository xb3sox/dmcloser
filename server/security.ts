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
export async function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return equal(key.toString("hex"), hash);
}
export function encrypt(token: string, secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(secret, "hex"), iv);
  const body = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}.${cipher.getAuthTag().toString("hex")}.${body.toString("hex")}`;
}
export function decrypt(value: string, secret: string) {
  const [iv, tag, body] = value.split(".");
  if (!iv || !tag || !body) {
    throw new HttpError(400, "Invalid encrypted value format", "INVALID_CIPHER");
  }
  try {
    const cipher = createDecipheriv(
      "aes-256-gcm",
      Buffer.from(secret, "hex"),
      Buffer.from(iv, "hex"),
    );
    cipher.setAuthTag(Buffer.from(tag, "hex"));
    return Buffer.concat([
      cipher.update(Buffer.from(body, "hex")),
      cipher.final(),
    ]).toString("utf8");
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "Failed to decrypt payload", "INVALID_CIPHER");
  }
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
