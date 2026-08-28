import { db } from "@/server/db";

export async function checkAndIncrement(
  key: string,
  limit: number,
  windowMinutes: number,
): Promise<{ ok: boolean; retryAfterSeconds: number }> {
  const windowMs = windowMinutes * 60_000;
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  const rowKey = `${key}:${windowStart}`;

  return db.$transaction(async (tx) => {
    // Ensure a row exists for this window (idempotent no-op if present).
    await tx.rateLimit.upsert({
      where: { key: rowKey },
      create: { key: rowKey, windowStart: BigInt(windowStart), count: 0 },
      update: {},
    });
    // Conditional increment - only when still under limit. The WHERE + increment
    // is atomic; concurrent callers cannot both read `count < limit` and both
    // increment (only one UPDATE matches, the other sees count 0 and is blocked).
    const result = await tx.rateLimit.updateMany({
      where: { key: rowKey, count: { lt: limit } },
      data: { count: { increment: 1 } },
    });
    if (result.count === 0) {
      const retryAfterSeconds = Math.max(1, Math.ceil((windowStart + windowMs - Date.now()) / 1000));
      return { ok: false, retryAfterSeconds };
    }
    return { ok: true, retryAfterSeconds: 0 };
  });
  return { ok: true, retryAfterSeconds: 0 };
}
