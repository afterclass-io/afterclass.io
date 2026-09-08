import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

// `server-only` throws outside a Next.js server bundle — stub as no-op.
vi.mock("server-only", () => ({}));

// The per-IP throttle is DB-backed (`checkAndIncrement` via `txDb`); stub
// the budget pass-through so these tests pin the lookup predicate, not the
// bucket. Throttle behavior itself is covered by the budget suite.
vi.mock("@/server/assistant/budget", () => ({
  checkBudget: vi.fn().mockResolvedValue({ ok: true, retryAfterSeconds: 0 }),
}));

const { findUniqueTimetableMock, findUniqueRoadmapMock } = vi.hoisted(() => ({
  findUniqueTimetableMock: vi.fn() as Mock,
  findUniqueRoadmapMock: vi.fn() as Mock,
}));

vi.mock("@/server/db", () => ({
  db: {
    userTimetable: { findUnique: findUniqueTimetableMock },
    userRoadmap: { findUnique: findUniqueRoadmapMock },
  },
}));

import type { PrismaClient } from "@/generated/prisma/client";

import { createCaller } from "@/server/api/root";

const caller = createCaller(() => ({
  db: {
    userTimetable: { findUnique: findUniqueTimetableMock },
    userRoadmap: { findUnique: findUniqueRoadmapMock },
  } as unknown as PrismaClient,
  session: null,
  headers: new Headers(),
}));

describe("sharing PRIVATE refusal", () => {
  beforeEach(() => {
    findUniqueTimetableMock.mockReset();
    findUniqueRoadmapMock.mockReset();
  });

  it("refuses PRIVATE timetables even with a valid token", async () => {
    findUniqueTimetableMock.mockResolvedValue(null);
    await expect(
      caller.sharing.getSharedTimetable({ token: "tok-private" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    // The lookup itself must exclude PRIVATE rows (defense-in-depth: a
    // PRIVATE row with a lingering token is invisible, not just refused).
    const where = (
      findUniqueTimetableMock.mock.calls[0]?.[0] as
        | { where?: unknown }
        | undefined
    )?.where;
    expect(where).toMatchObject({
      shareToken: "tok-private",
      visibility: { not: "PRIVATE" },
    });
  });

  it("refuses PRIVATE roadmaps even with a valid token", async () => {
    findUniqueRoadmapMock.mockResolvedValue(null);
    await expect(
      caller.sharing.getSharedRoadmap({ token: "tok-private" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    const where = (
      findUniqueRoadmapMock.mock.calls[0]?.[0] as
        | { where?: unknown }
        | undefined
    )?.where;
    expect(where).toMatchObject({
      shareToken: "tok-private",
      visibility: { not: "PRIVATE" },
    });
  });
});
