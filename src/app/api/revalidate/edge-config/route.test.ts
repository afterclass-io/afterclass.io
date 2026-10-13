import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { revalidateTag } = vi.hoisted(() => ({ revalidateTag: vi.fn() }));

vi.mock("next/cache", () => ({ revalidateTag }));
vi.mock("@/server/ecfg/edge-config", () => ({
  EDGE_CONFIG_CACHE_TAG: "edge-config",
}));

import { POST } from "@/app/api/revalidate/edge-config/route";

function req(auth?: string) {
  return new Request("http://localhost/api/revalidate/edge-config", {
    method: "POST",
    headers: auth ? { authorization: auth } : {},
  });
}

describe("POST /api/revalidate/edge-config", () => {
  beforeEach(() => {
    revalidateTag.mockReset();
    process.env.CRON_SECRET = "s3cret";
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("rejects a request without the secret (401) and keeps the cache", async () => {
    const res = await POST(req());
    expect(res.status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("rejects a wrong bearer token (401)", async () => {
    const res = await POST(req("Bearer wrong"));
    expect(res.status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("expires the edge-config tag at once for a valid secret", async () => {
    const res = await POST(req("Bearer s3cret"));
    expect(res.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith("edge-config", { expire: 0 });
  });
});
