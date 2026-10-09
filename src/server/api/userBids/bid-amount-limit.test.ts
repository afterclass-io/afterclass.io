import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";

// The schemas read the limit once, when their module loads. Each test sets the
// env first, resets the module cache, then imports the procedures fresh.
async function loadProcedures() {
  vi.resetModules();
  const { createTRPCRouter } = await import("@/server/api/trpc");
  const { update } = await import("./update");
  const { upsert } = await import("./upsert");
  const { upsertMany } = await import("./upsertMany");
  const { saveBidsTool } = await import("@/server/mcp/tools/write/save-bids");
  const router = createTRPCRouter({ update, upsert, upsertMany });
  return { router, saveBidsTool };
}

async function expectRejected(promise: Promise<unknown>) {
  await expect(promise).rejects.toMatchObject({ code: "BAD_REQUEST" });
}

describe("bid amount limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects an amount above BID_MAX_AMOUNT in all four schemas", async () => {
    vi.stubEnv("BID_MAX_AMOUNT", "500");
    const { router, saveBidsTool } = await loadProcedures();
    const caller = makeCaller(router.createCaller, {});

    await expectRejected(caller.update({ id: "b1", bidAmount: 501 }));
    await expectRejected(
      caller.upsert({ classId: "c1", bidWindowId: 1, bidAmount: 501 }),
    );
    await expectRejected(
      caller.upsertMany({
        entries: [{ classId: "c1", bidWindowId: 1, bidAmount: 501 }],
      }),
    );
    expect(
      saveBidsTool.inputSchema.safeParse({
        bids: [{ courseCode: "COR-IS1702", section: "G1", bidAmount: 501 }],
        confirm: true,
      }).success,
    ).toBe(false);
  });

  it("accepts the limit itself in the save-bids schema", async () => {
    vi.stubEnv("BID_MAX_AMOUNT", "500");
    const { saveBidsTool } = await loadProcedures();

    expect(
      saveBidsTool.inputSchema.safeParse({
        bids: [{ courseCode: "COR-IS1702", section: "G1", bidAmount: 500 }],
        confirm: true,
      }).success,
    ).toBe(true);
  });

  it("defaults the limit to 99999", async () => {
    vi.stubEnv("BID_MAX_AMOUNT", "");
    const { router, saveBidsTool } = await loadProcedures();
    const caller = makeCaller(router.createCaller, {});

    await expectRejected(
      caller.upsert({ classId: "c1", bidWindowId: 1, bidAmount: 100000 }),
    );
    await expectRejected(caller.update({ id: "b1", bidAmount: 100000 }));
    await expectRejected(
      caller.upsertMany({
        entries: [{ classId: "c1", bidWindowId: 1, bidAmount: 100000 }],
      }),
    );
    const entry = { courseCode: "COR-IS1702", section: "G1" };
    expect(
      saveBidsTool.inputSchema.safeParse({
        bids: [{ ...entry, bidAmount: 100000 }],
        confirm: true,
      }).success,
    ).toBe(false);
    expect(
      saveBidsTool.inputSchema.safeParse({
        bids: [{ ...entry, bidAmount: 99999 }],
        confirm: true,
      }).success,
    ).toBe(true);
  });
});
