import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import type { ToolContext, ToolResult } from "../../types";
import type { SessionUser } from "@/server/auth/config";
import { getMeTool, getUsageTool } from "./account";

const fakeUser: SessionUser = {
  id: "u1",
  email: "a@smu.edu.sg",
  username: "u1",
  isVerified: true,
  universityId: 1,
  firstName: "Alice",
  lastName: "Tan",
  telegramId: null,
  photoUrl: null,
  facultyId: 1,
  createdAt: new Date("2026-01-02T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
};

// The account tools read the user row / quota store directly (there is no
// tRPC `users.me` or quota procedure), so mock the underlying store modules the
// same way `src/server/assistant/quota.test.ts` does - vi.hoisted fns so the
// vi.mock factories can reference them without a TDZ error.
const { facultyFindUnique, chatUsageFindUnique, getChatConfig } = vi.hoisted(() => ({
  facultyFindUnique: vi.fn() as Mock,
  chatUsageFindUnique: vi.fn() as Mock,
  getChatConfig: vi.fn() as Mock,
}));

vi.mock("@/server/db", () => ({
  db: {
    faculties: { findUnique: facultyFindUnique },
    chatUsage: { findUnique: chatUsageFindUnique },
  },
}));
vi.mock("@/server/ecfg/chat", () => ({
  getChatConfig,
}));

const MOCK_CHAT_CONFIG = {
  quotaPerMonth: 50,
  nudgeAt: 40,
  rateLimitPerMinute: 10,
  mcpRateLimitPerMinute: 60,
  spendCapPerMonthUsd: 20,
  maxInputTokens: 16000,
  maxOutputTokens: 1024,
  maxToolRounds: 6,
  maxMessages: 12,
  priceInputPerM: 0.14,
  priceOutputPerM: 0.28,
  provider: "deepseek-v4-flash",
};

// Keep the nested-subrouter mock shape used by the other tool tests; the
// account tools resolve the user + quota from context/store, so no proc mocks
// are needed - the caller is just the (unused) scoped caller.
function makeCaller() {
  return {} as unknown as ToolContext["caller"];
}

function textOf(result: ToolResult): string {
  const text = result.content[0]?.text;
  if (!text) throw new Error("tool returned no text content");
  return text;
}

describe("account read tools", () => {
  beforeEach(() => {
    facultyFindUnique.mockReset();
    chatUsageFindUnique.mockReset();
    getChatConfig.mockReset();
    getChatConfig.mockResolvedValue(MOCK_CHAT_CONFIG);
  });

  it("get-me returns the user's profile with faculty name", async () => {
    facultyFindUnique.mockResolvedValue({
      id: 1,
      name: "School of Computing and Information Systems",
    });
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller() };
    const result = await getMeTool.run(ctx, {});
    expect(result.isError).toBeFalsy();
    expect(JSON.parse(textOf(result))).toEqual({
      id: "u1",
      name: "Alice Tan",
      email: "a@smu.edu.sg",
      facultyId: 1,
      facultyName: "School of Computing and Information Systems",
      createdAt: "2026-01-02T00:00:00.000Z",
    });
    expect(facultyFindUnique).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it("get-me omits facultyName when the user has no faculty", async () => {
    const ctx: ToolContext = {
      user: { ...fakeUser, facultyId: null },
      caller: makeCaller(),
    };
    const result = await getMeTool.run(ctx, {});
    expect(result.isError).toBeFalsy();
    expect(JSON.parse(textOf(result))).toEqual({
      id: "u1",
      name: "Alice Tan",
      email: "a@smu.edu.sg",
      facultyId: null,
      createdAt: "2026-01-02T00:00:00.000Z",
    });
    expect(facultyFindUnique).not.toHaveBeenCalled();
  });

  it("get-me falls back to username when the user has no name parts", async () => {
    const ctx: ToolContext = {
      user: { ...fakeUser, firstName: null, lastName: null },
      caller: makeCaller(),
    };
    const result = await getMeTool.run(ctx, {});
    expect(JSON.parse(textOf(result))).toMatchObject({ name: "u1" });
  });

  it("get-me returns errText when the faculty lookup rejects", async () => {
    facultyFindUnique.mockRejectedValue(new Error("boom"));
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller() };
    const result = await getMeTool.run(ctx, {});
    expect(result.isError).toBe(true);
  });

  it("get-usage returns the quota state from the shared reader", async () => {
    chatUsageFindUnique.mockResolvedValue({ messageCount: 12 });
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller() };
    const result = await getUsageTool.run(ctx, {});
    expect(result.isError).toBeFalsy();
    const out = JSON.parse(textOf(result)) as {
      usedThisPeriod: number;
      periodLimit: number;
      criticalFloor: number;
      remaining: number;
      isCritical: boolean;
      period: string;
    };
    expect(out).toMatchObject({
      usedThisPeriod: 12,
      periodLimit: 50,
      criticalFloor: 10,
      remaining: 38,
      isCritical: false,
    });
    expect(out.period).toMatch(/^\d{4}-\d{2}$/);
  });

  it("get-usage reports critical at/below the 20% critical floor", async () => {
    chatUsageFindUnique.mockResolvedValue({ messageCount: 40 });
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller() };
    const result = await getUsageTool.run(ctx, {});
    expect(
      JSON.parse(textOf(result)) as Record<string, unknown>,
    ).toMatchObject({
      usedThisPeriod: 40,
      criticalFloor: 10,
      remaining: 10,
      isCritical: true,
    });
  });

  it("get-usage derives critical from the 20% floor, not the nudge threshold", async () => {
    // nudgeAt=20 is far from the critical floor floor(50*0.2)=10: the old
    // `used >= nudgeAt` rule would flag used=25 as critical, but the meter
    // rule only flags remaining <= 10.
    getChatConfig.mockResolvedValueOnce({ ...MOCK_CHAT_CONFIG, nudgeAt: 20 });
    chatUsageFindUnique.mockResolvedValue({ messageCount: 25 }); // remaining 25
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller() };
    const result = await getUsageTool.run(ctx, {});
    expect(result.isError).toBeFalsy();
    expect(
      JSON.parse(textOf(result)) as Record<string, unknown>,
    ).toMatchObject({
      usedThisPeriod: 25,
      periodLimit: 50,
      criticalFloor: 10,
      remaining: 25,
      isCritical: false,
    });
  });

  it("get-usage returns errText when the quota reader rejects", async () => {
    chatUsageFindUnique.mockRejectedValue(new Error("boom"));
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller() };
    const result = await getUsageTool.run(ctx, {});
    expect(result.isError).toBe(true);
  });
});
