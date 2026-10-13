import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { authorizeCron } from "./authorize-cron";

function req(auth?: string) {
  return new Request("http://localhost/api/cron/x", {
    headers: auth ? { authorization: auth } : {},
  });
}

describe("authorizeCron", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "s3cret";
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.CRON_SECRET;
  });

  it("lets the exact bearer secret through", () => {
    expect(authorizeCron(req("Bearer s3cret"), "x")).toBeNull();
  });

  it("rejects a missing header, a wrong secret and a secret of another length with 401", () => {
    for (const auth of [
      undefined,
      "Bearer wrong!",
      "Bearer s3cret-but-longer",
      "Bearer s3",
      "s3cret",
    ]) {
      expect(authorizeCron(req(auth), "x")?.status).toBe(401);
    }
  });

  it("fails loud with 500 when CRON_SECRET is unset", () => {
    delete process.env.CRON_SECRET;
    expect(authorizeCron(req("Bearer s3cret"), "x")?.status).toBe(500);
  });
});
