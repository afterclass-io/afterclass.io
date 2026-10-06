import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as ChatConfig from "@/server/config/chat-config";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";

const m = vi.hoisted(() => ({
  getEdgeConfig: vi.fn(),
  checkAndIncrement: vi.fn(),
  runAfterResponse: vi.fn(),
  runModerationTask: vi.fn(),
}));

vi.mock("@/common/providers/EdgeConfig/EdgeConfigProvider", () => ({
  getEdgeConfig: m.getEdgeConfig,
}));
vi.mock("@/server/assistant/ratelimit", () => ({
  checkAndIncrement: m.checkAndIncrement,
}));
vi.mock("@/server/after-response", () => ({
  runAfterResponse: m.runAfterResponse,
}));
vi.mock("@/server/moderation/run", () => ({
  runModerationTask: m.runModerationTask,
}));
vi.mock("@/server/config/chat-config", async (importOriginal) => {
  const actual =
    await importOriginal<typeof ChatConfig>();
  return {
    ...actual,
    getChatConfigAsync: async () => actual.DEFAULT_CHAT_CONFIG_VALUES,
  };
});

import { REPORT_ACK, report } from "./index";

const router = createTRPCRouter({ report });
const verified = { user: { id: "u1", isVerified: true } };

function dbWith(review: { id: string; reviewerId: string } | null, created = 1) {
  return {
    reviews: { findUnique: vi.fn().mockResolvedValue(review) },
    moderationReport: {
      createMany: vi.fn().mockResolvedValue({ count: created }),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  m.getEdgeConfig.mockResolvedValue({ enableContentModeration: true });
  m.checkAndIncrement.mockResolvedValue({ ok: true, retryAfterSeconds: 0 });
});

describe("moderation.report", () => {
  it("refuses when the master flag is off, before touching the database", async () => {
    m.getEdgeConfig.mockResolvedValue({ enableContentModeration: false });
    const db = dbWith({ id: "rv1", reviewerId: "author" });
    const caller = makeCaller(router.createCaller, db, verified);
    await expect(
      caller.report({ surface: "review", ref: "rv1" }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(db.reviews.findUnique).not.toHaveBeenCalled();
  });

  it("refuses unverified users (the UI shows the same confirmation)", async () => {
    const caller = makeCaller(router.createCaller, dbWith(null), {
      user: { id: "u1" },
    });
    await expect(
      caller.report({ surface: "review", ref: "rv1" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rate-limits reporters per hour", async () => {
    m.checkAndIncrement.mockResolvedValue({ ok: false, retryAfterSeconds: 30 });
    const caller = makeCaller(router.createCaller, dbWith(null), verified);
    await expect(
      caller.report({ surface: "review", ref: "rv1" }),
    ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    expect(m.checkAndIncrement).toHaveBeenCalledWith("moderation:report:u1", 10, 60);
  });

  it("acknowledges an unknown item without storing anything", async () => {
    const db = dbWith(null);
    const caller = makeCaller(router.createCaller, db, verified);
    await expect(caller.report({ surface: "review", ref: "gone" })).resolves.toEqual(REPORT_ACK);
    expect(db.moderationReport.createMany).not.toHaveBeenCalled();
    expect(m.runAfterResponse).not.toHaveBeenCalled();
  });

  it("acknowledges a self-report without storing anything", async () => {
    const db = dbWith({ id: "rv1", reviewerId: "u1" });
    const caller = makeCaller(router.createCaller, db, verified);
    await expect(caller.report({ surface: "review", ref: "rv1" })).resolves.toEqual(REPORT_ACK);
    expect(db.moderationReport.createMany).not.toHaveBeenCalled();
  });

  it("acknowledges a duplicate without scheduling a run", async () => {
    const db = dbWith({ id: "rv1", reviewerId: "author" }, 0);
    const caller = makeCaller(router.createCaller, db, verified);
    await expect(caller.report({ surface: "review", ref: "rv1" })).resolves.toEqual(REPORT_ACK);
    expect(m.runAfterResponse).not.toHaveBeenCalled();
  });

  it("stores an accepted report idempotently and schedules one run after the response", async () => {
    const db = dbWith({ id: "rv1", reviewerId: "author" });
    const caller = makeCaller(router.createCaller, db, verified);
    await expect(caller.report({ surface: "review", ref: "rv1" })).resolves.toEqual(REPORT_ACK);
    expect(db.moderationReport.createMany).toHaveBeenCalledWith({
      data: [{ reporterId: "u1", reviewId: "rv1" }],
      skipDuplicates: true,
    });
    expect(m.runAfterResponse).toHaveBeenCalledTimes(1);
    const task = m.runAfterResponse.mock.calls[0]?.[0] as () => Promise<void>;
    await task();
    expect(m.runModerationTask).toHaveBeenCalledWith({ surface: "review", itemId: "rv1" });
  });

  it("rejects an unknown surface and an empty ref", async () => {
    const caller = makeCaller(router.createCaller, dbWith(null), verified);
    await expect(
      caller.report({ surface: "meeting" as never, ref: "x" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.report({ surface: "review", ref: "  " }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
