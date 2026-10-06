import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  aggregate: vi.fn(),
  count: vi.fn(),
  logCreate: vi.fn(),
  findUnique: vi.fn(),
  deleteMany: vi.fn(),
  txLogCreate: vi.fn(),
  checkAndIncrement: vi.fn(),
  getModel: vi.fn(),
  getChatConfigAsync: vi.fn(),
}));

vi.mock("@/server/db", () => {
  const tx = {
    reviews: { deleteMany: m.deleteMany },
    moderationLog: { create: m.txLogCreate },
  };
  return {
    db: {
      moderationLog: { aggregate: m.aggregate, create: m.logCreate },
      moderationReport: { count: m.count },
      reviews: { findUnique: m.findUnique },
    },
    txDb: {
      $transaction: (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
    },
  };
});
vi.mock("@/server/assistant/ratelimit", () => ({
  checkAndIncrement: m.checkAndIncrement,
}));
vi.mock("@/server/assistant/providers", () => ({ getModel: m.getModel }));
vi.mock("@/server/config/chat-config", () => ({
  getChatConfigAsync: m.getChatConfigAsync,
}));

import {
  JUDGE_TRUNCATION_MARKER,
  MAX_JUDGE_TEXT_CHARS,
  createModerationJudge,
  runModeration,
  runModerationTask,
  type Judge,
} from "./run";

const cfg = {
  moderationReportThreshold: 3,
  moderationBackoffMultiplier: 2,
  moderationThresholdCap: 48,
  moderationClaimWindowMinutes: 5,
  moderationJudgementsPerHour: 20,
};
const target = { surface: "review" as const, itemId: "rv1" };
const cleared = {
  kind: "cleared",
  language: "en",
  rationale: "fair",
  model: "m",
} as const;

function givenClearances(n: number, last: Date | null = null) {
  m.aggregate.mockResolvedValue({
    _count: { _all: n },
    _max: { createdAt: last },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  givenClearances(0);
  m.count.mockResolvedValue(3);
  m.checkAndIncrement.mockResolvedValue({ ok: true, retryAfterSeconds: 0 });
  m.findUnique.mockResolvedValue({ body: "Body", tips: null });
});

describe("runModeration", () => {
  it("never judges below the threshold", async () => {
    m.count.mockResolvedValue(2);
    const judge = vi.fn<Judge>();
    await expect(runModeration(target, cfg, judge)).resolves.toBe(
      "below_threshold",
    );
    expect(m.checkAndIncrement).not.toHaveBeenCalled();
    expect(judge).not.toHaveBeenCalled();
  });

  it("counts only reports since the last clearance, against a raised threshold", async () => {
    const last = new Date("2026-10-01T00:00:00Z");
    givenClearances(1, last);
    m.count.mockResolvedValue(5);
    const judge = vi.fn<Judge>();
    await expect(runModeration(target, cfg, judge)).resolves.toBe(
      "below_threshold",
    );
    expect(m.count).toHaveBeenCalledWith({
      where: { reviewId: "rv1", createdAt: { gt: last } },
    });
  });

  it("claims per item and clearance count before the hourly ceiling", async () => {
    m.checkAndIncrement.mockResolvedValueOnce({
      ok: false,
      retryAfterSeconds: 60,
    });
    const judge = vi.fn<Judge>();
    await expect(runModeration(target, cfg, judge)).resolves.toBe("claim_lost");
    expect(m.checkAndIncrement).toHaveBeenCalledTimes(1);
    expect(m.checkAndIncrement).toHaveBeenCalledWith(
      "moderation:claim:REVIEW:rv1:0",
      1,
      5,
    );
    expect(judge).not.toHaveBeenCalled();
  });

  it("stops when the hourly ceiling is reached", async () => {
    m.checkAndIncrement
      .mockResolvedValueOnce({ ok: true, retryAfterSeconds: 0 })
      .mockResolvedValueOnce({ ok: false, retryAfterSeconds: 60 });
    const judge = vi.fn<Judge>();
    await expect(runModeration(target, cfg, judge)).resolves.toBe(
      "ceiling_reached",
    );
    expect(m.checkAndIncrement).toHaveBeenLastCalledWith(
      "moderation:judge-hourly",
      20,
      60,
    );
    expect(judge).not.toHaveBeenCalled();
  });

  it("does nothing when the item is gone", async () => {
    m.findUnique.mockResolvedValue(null);
    const judge = vi.fn<Judge>();
    await expect(runModeration(target, cfg, judge)).resolves.toBe("item_gone");
    expect(judge).not.toHaveBeenCalled();
    expect(m.logCreate).not.toHaveBeenCalled();
  });

  it("judges the live text with the surface label only", async () => {
    const judge = vi.fn<Judge>().mockResolvedValue(cleared);
    await runModeration(target, cfg, judge);
    expect(judge).toHaveBeenCalledWith({
      surfaceLabel: "anonymous course or professor review",
      text: "Review:\nBody",
    });
  });

  it("sends the head and tail of long text to the judge but logs the full removed text", async () => {
    const half = MAX_JUDGE_TEXT_CHARS / 2;
    const long = `${"a".repeat(half * 2)}${"m".repeat(5_000)}ABUSE`;
    m.findUnique.mockResolvedValue({ body: long, tips: null });
    const judge = vi.fn<Judge>().mockResolvedValue({
      kind: "violation",
      policyRule: "hate",
      language: "en",
      rationale: "r",
      model: "m",
    });
    await runModeration(target, cfg, judge);
    const full = `Review:\n${long}`;
    const sent = judge.mock.calls[0]![0].text;
    expect(sent).toBe(
      full.slice(0, half) + JUDGE_TRUNCATION_MARKER + full.slice(-half),
    );
    expect(sent).toHaveLength(MAX_JUDGE_TEXT_CHARS + JUDGE_TRUNCATION_MARKER.length);
    expect(sent.endsWith("ABUSE")).toBe(true);
    const logged = m.txLogCreate.mock.calls[0]?.[0] as {
      data: { removedText: string };
    };
    expect(logged.data.removedText).toBe(full);
  });

  it("sends text at the cap to the judge unchanged", async () => {
    const body = "y".repeat(MAX_JUDGE_TEXT_CHARS - "Review:\n".length);
    m.findUnique.mockResolvedValue({ body, tips: null });
    const judge = vi.fn<Judge>().mockResolvedValue(cleared);
    await runModeration(target, cfg, judge);
    expect(judge.mock.calls[0]![0].text).toBe(`Review:\n${body}`);
  });

  it("on violation deletes and logs the removed text in one transaction", async () => {
    const judge = vi.fn<Judge>().mockResolvedValue({
      kind: "violation",
      policyRule: "hate",
      language: "ms",
      rationale: "slur",
      model: "m",
    });
    await expect(runModeration(target, cfg, judge)).resolves.toBe("violation");
    expect(m.deleteMany).toHaveBeenCalledWith({ where: { id: "rv1" } });
    expect(m.txLogCreate).toHaveBeenCalledWith({
      data: {
        surface: "REVIEW",
        itemId: "rv1",
        verdict: "VIOLATION",
        policyRule: "hate",
        language: "ms",
        rationale: "slur",
        model: "m",
        removedText: "Review:\nBody",
      },
    });
    expect(m.logCreate).not.toHaveBeenCalled();
  });

  it("on clearance logs CLEARED without text and takes no action", async () => {
    const judge = vi.fn<Judge>().mockResolvedValue(cleared);
    await expect(runModeration(target, cfg, judge)).resolves.toBe("cleared");
    expect(m.logCreate).toHaveBeenCalledWith({
      data: {
        surface: "REVIEW",
        itemId: "rv1",
        verdict: "CLEARED",
        language: "en",
        rationale: "fair",
        model: "m",
      },
    });
    expect(m.deleteMany).not.toHaveBeenCalled();
  });

  it("on error logs ERROR with the reason and takes no action", async () => {
    const judge = vi
      .fn<Judge>()
      .mockResolvedValue({ kind: "error", reason: "timeout", model: "m" });
    await expect(runModeration(target, cfg, judge)).resolves.toBe("error");
    expect(m.logCreate).toHaveBeenCalledWith({
      data: {
        surface: "REVIEW",
        itemId: "rv1",
        verdict: "ERROR",
        rationale: "timeout",
        model: "m",
      },
    });
    expect(m.deleteMany).not.toHaveBeenCalled();
  });
});

describe("createModerationJudge", () => {
  it("returns model_unavailable when the model cannot be resolved", async () => {
    m.getModel.mockRejectedValue(new Error("missing LLM_API_KEY"));
    await expect(
      createModerationJudge(8000)({ surfaceLabel: "x", text: "y" }),
    ).resolves.toEqual({
      kind: "error",
      reason: "model_unavailable",
      model: "unresolved",
    });
    expect(m.getModel).toHaveBeenCalledWith("moderation");
  });
});

describe("runModerationTask", () => {
  it("logs and swallows failures at the after-response boundary", async () => {
    m.getChatConfigAsync.mockRejectedValue(new Error("bad config"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(runModerationTask(target)).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
