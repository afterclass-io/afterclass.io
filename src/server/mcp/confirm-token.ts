import { createHash, createHmac, timingSafeEqual } from "crypto";

export type ConfirmTokenParts = {
  userId: string;
  tool: string;
  argHash: string;
};

export type MintConfirmTokenArgs = ConfirmTokenParts & {
  secret: string;
  ttlMs?: number;
};

export type VerifyConfirmTokenArgs = ConfirmTokenParts & {
  secret: string;
};

const DEFAULT_TTL_MS = 5 * 60_000;

/** Hash tool args into the short `argHash` a confirm token binds to. */
export function hashConfirmArgs(args: unknown): string {
  return createHash("sha256").update(JSON.stringify(args) ?? "").digest("hex");
}

/**
 * Mint a single-use-shaped HMAC write-confirmation token (no DB).
 * Binds user + tool + argHash + expiry under the caller-provided secret.
 */
export async function mintConfirmToken(
  a: MintConfirmTokenArgs,
): Promise<string> {
  const exp = Date.now() + (a.ttlMs ?? DEFAULT_TTL_MS);
  const body = `${a.userId}.${a.tool}.${a.argHash}.${exp}`;
  const sig = createHmac("sha256", a.secret).update(body).digest("hex");
  return Buffer.from(`${body}.${sig}`).toString("base64url");
}

/**
 * Verify a token minted by {@link mintConfirmToken}. False on wrong
 * user/tool/args, expiry, tampering, or malformed input — never throws.
 */
export async function verifyConfirmToken(
  t: string,
  a: VerifyConfirmTokenArgs,
): Promise<boolean> {
  try {
    const raw = Buffer.from(t, "base64url").toString();
    const [userId, tool, argHash, expS, sig] = raw.split(".");
    if (userId !== a.userId || tool !== a.tool || argHash !== a.argHash)
      return false;
    if (sig === undefined || expS === undefined) return false;
    if (!/^\d+$/.test(expS)) return false;
    if (Date.now() > Number(expS)) return false;
    const expect = createHmac("sha256", a.secret)
      .update(`${userId}.${tool}.${argHash}.${expS}`)
      .digest("hex");
    const sigBuf = Buffer.from(sig);
    const expectBuf = Buffer.from(expect);
    if (sigBuf.length !== expectBuf.length) return false;
    return timingSafeEqual(sigBuf, expectBuf);
  } catch {
    return false;
  }
}
