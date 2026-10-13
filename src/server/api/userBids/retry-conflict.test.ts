import { describe, expect, it, vi } from "vitest";

import { Prisma } from "@/generated/prisma/client";
import { withConflictRetry } from "./retry-conflict";

const knownError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError("conflict", {
    code,
    clientVersion: "test",
  });

const adapterConflict = () =>
  Object.assign(new Error("TransactionWriteConflict"), {
    cause: { kind: "TransactionWriteConflict" },
  });

describe("withConflictRetry", () => {
  it("returns the result of the first successful attempt", async () => {
    const run = vi.fn().mockResolvedValue("ok");
    await expect(withConflictRetry(run)).resolves.toBe("ok");
    expect(run).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["P2034", knownError("P2034")],
    ["P2002", knownError("P2002")],
    ["a driver adapter write conflict", adapterConflict()],
  ])("retries after %s", async (_name, err) => {
    const run = vi.fn().mockRejectedValueOnce(err).mockResolvedValue("ok");
    await expect(withConflictRetry(run)).resolves.toBe("ok");
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("throws CONFLICT after three conflicting attempts", async () => {
    const run = vi.fn().mockRejectedValue(knownError("P2034"));
    await expect(withConflictRetry(run)).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(run).toHaveBeenCalledTimes(3);
  });

  it("rethrows other errors at once", async () => {
    const err = new Error("boom");
    const run = vi.fn().mockRejectedValue(err);
    await expect(withConflictRetry(run)).rejects.toBe(err);
    expect(run).toHaveBeenCalledTimes(1);
  });
});
