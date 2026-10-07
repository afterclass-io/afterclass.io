import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  prune: vi.fn(),
  getChatConfigAsync: vi.fn(),
}));
vi.mock("@/server/moderation/prune", () => ({
  pruneModerationLogText: m.prune,
}));
vi.mock("@/server/config/chat-config", () => ({
  getChatConfigAsync: m.getChatConfigAsync,
}));

import { GET } from "@/app/api/cron/prune-moderation-log/route";

function req(auth?: string) {
  return new Request("http://localhost/api/cron/prune-moderation-log", {
    headers: auth ? { authorization: auth } : {},
  });
}

describe("GET /api/cron/prune-moderation-log", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.prune.mockResolvedValue({ cleared: 2 });
    m.getChatConfigAsync.mockResolvedValue({ moderationLogRetentionDays: 90 });
  });

  it("rejects a wrong bearer token (401) without pruning", async () => {
    process.env.CRON_SECRET = "s3cret";
    const res = await GET(req("Bearer wrong"));
    expect(res.status).toBe(401);
    expect(m.prune).not.toHaveBeenCalled();
    delete process.env.CRON_SECRET;
  });

  it("prunes with the remote-tunable retention on a valid secret", async () => {
    process.env.CRON_SECRET = "s3cret";
    const res = await GET(req("Bearer s3cret"));
    expect(res.status).toBe(200);
    expect(m.prune).toHaveBeenCalledWith(90);
    expect(await res.json()).toEqual({ ok: true, cleared: 2 });
    delete process.env.CRON_SECRET;
  });
});
