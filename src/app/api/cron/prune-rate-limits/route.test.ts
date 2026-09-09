import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

const { mockPrune, mockGetChatConfig } = vi.hoisted(() => ({
  mockPrune: vi.fn() as Mock,
  mockGetChatConfig: vi.fn() as Mock,
}));

vi.mock("@/server/assistant/ratelimit", () => ({
  pruneRateLimits: mockPrune,
}));
vi.mock("@/server/config/chat-config", () => ({
  getChatConfig: mockGetChatConfig,
}));

import { GET } from "@/app/api/cron/prune-rate-limits/route";

function req(auth?: string) {
  return new Request("http://localhost/api/cron/prune-rate-limits", {
    headers: auth ? { authorization: auth } : {},
  });
}

describe("GET /api/cron/prune-rate-limits", () => {
  beforeEach(() => {
    mockPrune.mockReset();
    mockGetChatConfig.mockReset();
    mockPrune.mockResolvedValue({ deleted: 7 });
    // Sync canonical config cannot reach EdgeConfig here; supply the cron's
    // two inputs directly.
    mockGetChatConfig.mockReturnValue({
      rateLimitRetentionWindows: 1440,
      rateLimitWindowMinutes: 1,
    });
  });

  it("rejects requests without the cron secret (401)", async () => {
    process.env.CRON_SECRET = "s3cret";
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect(mockPrune).not.toHaveBeenCalled();
    delete process.env.CRON_SECRET;
  });

  it("rejects a wrong bearer token (401)", async () => {
    process.env.CRON_SECRET = "s3cret";
    const res = await GET(req("Bearer wrong"));
    expect(res.status).toBe(401);
    expect(mockPrune).not.toHaveBeenCalled();
    delete process.env.CRON_SECRET;
  });

  it("500s loudly when CRON_SECRET is unset (never run unguarded)", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(req("Bearer dev"));
    expect(res.status).toBe(500);
    expect(mockPrune).not.toHaveBeenCalled();
  });

  it("prunes with the canonical retention config on a valid secret", async () => {
    process.env.CRON_SECRET = "s3cret";
    const res = await GET(req("Bearer s3cret"));
    expect(res.status).toBe(200);
    expect(mockPrune).toHaveBeenCalledWith(1440, 1);
    expect(await res.json()).toEqual({ ok: true, deleted: 7 });
    delete process.env.CRON_SECRET;
  });
});
