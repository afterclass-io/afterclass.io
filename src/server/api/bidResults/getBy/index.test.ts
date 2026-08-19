import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/env", () => ({
  env: {
    DATABASE_URL: "postgres://localhost:5432/test",
    NODE_ENV: "test",
    GOOGLE_CLIENT_ID: "test-client-id",
    GOOGLE_CLIENT_SECRET: "test-client-secret",
    NEXTAUTH_SECRET: "test-secret",
    NEXTAUTH_URL: "http://localhost:3000",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
    NEXT_PUBLIC_SUPPORTED_SCH_DOMAINS: ["test.edu"],
    NEXT_PUBLIC_AC_CHANNEL_LINK: "https://example.com/channel",
    NEXT_PUBLIC_AC_HELPDESK_LINK: "https://example.com/helpdesk",
    NEXT_PUBLIC_AC_GITHUB_LINK: "https://github.com/example",
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    NEXT_PUBLIC_OLD_SITE_URL: "https://old.afterclass.io",
  },
}));

import { createTRPCRouter } from "@/server/api/trpc";
import { getBy } from "./index";

const router = createTRPCRouter({ getBy });

function makeCaller(dbMock: unknown) {
  return router.createCaller({
    db: dbMock,
    session: null,
    headers: new Headers(),
  } as never);
}

describe("bidResults.getBy", () => {
  beforeEach(() => vi.clearAllMocks());

  it("filters results to the last 5 academic years", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const dbMock = {
      acadTerm: {
        aggregate: vi.fn().mockResolvedValue({ _max: { acadYearStart: 2026 } }),
      },
      bidResult: { findMany },
    };
    const caller = makeCaller(dbMock);

    await caller.getBy({ courseCode: "CS101", section: "G1" });

    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          bidWindow: expect.objectContaining({
            acadTerm: { acadYearStart: { gte: 2022 } },
          }),
        }),
      }),
    );
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */
  });
});
