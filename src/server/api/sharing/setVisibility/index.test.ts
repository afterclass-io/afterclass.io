import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/auth", () => ({ auth: () => null }));
vi.mock("@sentry/nextjs", () => ({
  trpcMiddleware: () => (o: { next: () => unknown }) => o.next(),
}));

import { createTRPCRouter } from "@/server/api/trpc";
import { setVisibility } from "./index";

const router = createTRPCRouter({ setVisibility });

function makeCaller(dbMock: unknown) {
  return router.createCaller({
    db: dbMock,
    session: { user: { id: "u1" } },
    headers: new Headers(),
  } as never);
}

describe("sharing.setVisibility", () => {
  it("rejects PUBLIC visibility for timetables", async () => {
    const dbMock = {};
    const caller = makeCaller(dbMock);
    await expect(
      caller.setVisibility({ entity: "timetable", id: "t1", visibility: "PUBLIC" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
