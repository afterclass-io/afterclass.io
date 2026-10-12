import { createHmac, timingSafeEqual } from "crypto";

export type ExpiringHmacArgs = {
  /** Signed fields before the expiry. The helper appends `.${expiry}`. */
  signedPrefix: string;
  expiry: string | undefined;
  signature: string | undefined;
  secret: string;
};

/**
 * Verify a hex HMAC-SHA256 over `${signedPrefix}.${expiry}` and that the
 * expiry (digits, epoch ms) has not passed. False on any failure.
 */
export function verifyExpiringHmac({
  signedPrefix,
  expiry,
  signature,
  secret,
}: ExpiringHmacArgs): boolean {
  if (signature === undefined || expiry === undefined) return false;
  if (!/^\d+$/.test(expiry)) return false;
  if (Date.now() > Number(expiry)) return false;
  const expect = createHmac("sha256", secret)
    .update(`${signedPrefix}.${expiry}`)
    .digest("hex");
  const sigBuf = Buffer.from(signature);
  const expectBuf = Buffer.from(expect);
  if (sigBuf.length !== expectBuf.length) return false;
  return timingSafeEqual(sigBuf, expectBuf);
}
