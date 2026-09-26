import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

const { mockRevalidateTag } = vi.hoisted(() => ({
  mockRevalidateTag: vi.fn() as Mock,
}));

vi.mock("next/cache", () => ({ revalidateTag: mockRevalidateTag }));
// Stub the validated env so `env.CRON_SECRET` stays unset and the route's raw
// process.env fallback (what these tests drive) is the one under test.
vi.mock("@/env", () => ({ env: {} }));

import { GET } from "@/app/api/cron/revalidate-edge-config/route";

function req(auth?: string) {
  return new Request("http://localhost/api/cron/revalidate-edge-config", {
    headers: auth ? { authorization: auth } : {},
  });
}

describe("GET /api/cron/revalidate-edge-config", () => {
  beforeEach(() => {
    mockRevalidateTag.mockReset();
    delete process.env.CRON_SECRET;
  });

  it("500s loudly when CRON_SECRET is unset (never run unguarded)", async () => {
    const res = await GET(req("Bearer dev"));
    expect(res.status).toBe(500);
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it("rejects a wrong bearer token (401)", async () => {
    process.env.CRON_SECRET = "s3cret";
    const res = await GET(req("Bearer wrong"));
    expect(res.status).toBe(401);
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it("rejects a missing bearer token (401)", async () => {
    process.env.CRON_SECRET = "s3cret";
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it("revalidates the edge-config tag on a valid secret", async () => {
    process.env.CRON_SECRET = "s3cret";
    const res = await GET(req("Bearer s3cret"));
    expect(res.status).toBe(200);
    expect(mockRevalidateTag).toHaveBeenCalledWith("edge-config", "max");
    expect(await res.json()).toEqual({ ok: true });
  });

  it("accepts the non-production dev bypass", async () => {
    process.env.CRON_SECRET = "s3cret";
    const res = await GET(req("Bearer dev"));
    expect(res.status).toBe(200);
    expect(mockRevalidateTag).toHaveBeenCalledWith("edge-config", "max");
  });
});
