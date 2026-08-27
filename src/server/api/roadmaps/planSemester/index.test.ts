import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import type { Session } from "next-auth";

// vi.mock factories are hoisted above top-level const declarations, so the
// mock fns must be created via vi.hoisted to avoid a TDZ error - same pattern
// as `src/server/api/timetable/searchCourses/index.test.ts`.
const {
  acadTermFindManyMock,
  bidWindowFindManyMock,
  userRoadmapFindFirstMock,
  usersFindUniqueMock,
  userRoadmapFindManyMock,
  userRoadmapEntryFindManyMock,
} = vi.hoisted(() => ({
  acadTermFindManyMock: vi.fn() as Mock,
  bidWindowFindManyMock: vi.fn() as Mock,
  userRoadmapFindFirstMock: vi.fn() as Mock,
  usersFindUniqueMock: vi.fn() as Mock,
  userRoadmapFindManyMock: vi.fn() as Mock,
  userRoadmapEntryFindManyMock: vi.fn() as Mock,
}));

// `server-only` is a Next.js build-time guard that throws when imported outside
// a Next.js server bundle; `@/server/api/root` pulls it in transitively.
vi.mock("server-only", () => ({}));

vi.mock("@/server/db", () => ({
  db: {
    acadTerm: { findMany: acadTermFindManyMock },
    bidWindow: { findMany: bidWindowFindManyMock },
    userRoadmap: {
      findFirst: userRoadmapFindFirstMock,
      findMany: userRoadmapFindManyMock,
    },
    users: { findUnique: usersFindUniqueMock },
    userRoadmapEntry: { findMany: userRoadmapEntryFindManyMock },
  },
}));

import type { PrismaClient } from "@prisma/client";

import { createCaller } from "@/server/api/root";
import type { SessionUser } from "@/server/auth/config";

const fakeUser: SessionUser = {
  id: "u1",
  email: "a@smu.edu.sg",
  username: "u1",
  isVerified: true,
  universityId: 1,
  firstName: null,
  lastName: null,
  telegramId: null,
  photoUrl: null,
  facultyId: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const caller = createCaller(() => ({
  db: {
    acadTerm: { findMany: acadTermFindManyMock },
    bidWindow: { findMany: bidWindowFindManyMock },
    userRoadmap: {
      findFirst: userRoadmapFindFirstMock,
      findMany: userRoadmapFindManyMock,
    },
    users: { findUnique: usersFindUniqueMock },
    userRoadmapEntry: { findMany: userRoadmapEntryFindManyMock },
  } as unknown as PrismaClient,
  session: { expires: new Date().toISOString(), user: fakeUser } as Session,
  headers: new Headers(),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function term(
  id: string,
  acadYearStart: number,
  code: string,
  startYear: number,
  startMonth: number,
) {
  return {
    id,
    acadYearStart,
    term: code,
    startDt: new Date(Date.UTC(startYear, startMonth, 1)),
  };
}

const TERMS = [
  term("2024-T1", 2024, "1", 2024, 7),
  term("2024-T2", 2024, "2", 2024, 10),
  term("2024-T3A", 2024, "3A", 2025, 0),
  term("2024-T3B", 2024, "3B", 2025, 2),
  term("2025-T1", 2025, "1", 2025, 7),
  term("2025-T2", 2025, "2", 2025, 10),
  term("2025-T3A", 2025, "3A", 2026, 0),
  term("2025-T3B", 2025, "3B", 2026, 2),
];

// One bid window on AY2025/26 T2 -> currentTermId = "2025-T2".
const currentWindow = {
  id: 1,
  acadTermId: "2025-T2",
  round: "1",
  window: 1,
  opensAt: new Date("2020-01-01T00:00:00.000Z"),
  closesAt: new Date("2030-01-01T00:00:00.000Z"),
  resultsAt: new Date("2030-01-02T00:00:00.000Z"),
  acadTerm: { id: "2025-T2", acadYearStart: 2025, term: "2" },
};

const seniorRoadmaps = [
  {
    id: "srA",
    name: "Alice's Plan",
    matricTermId: "2024-T1",
    facultyId: 1,
    user: { username: "alice" },
    _count: { votes: 5 },
  },
  {
    id: "srB",
    name: "Bob's Plan",
    matricTermId: "2024-T2",
    facultyId: 1,
    user: { username: "bob" },
    _count: { votes: 3 },
  },
];

// Entries at the seniors' target position (year 2, T3A) for target "2025-T3A".
const seniorEntries = [
  {
    roadmapId: "srA",
    yearNumber: 2,
    term: "T3A",
    course: { id: "c1", code: "ACCT101", name: "Financial Accounting", creditUnits: 1 },
    roadmap: { name: "Alice's Plan", user: { username: "alice" } },
  },
  {
    roadmapId: "srB",
    yearNumber: 2,
    term: "T3A",
    course: { id: "c1", code: "ACCT101", name: "Financial Accounting", creditUnits: 1 },
    roadmap: { name: "Bob's Plan", user: { username: "bob" } },
  },
  {
    roadmapId: "srA",
    yearNumber: 2,
    term: "T3A",
    course: { id: "c2", code: "STAT101", name: "Statistical Thinking", creditUnits: 1 },
    roadmap: { name: "Alice's Plan", user: { username: "alice" } },
  },
];

// `userRoadmapEntry.findMany` is issued twice with different where shapes:
// the batched senior lookup uses `where: { OR: [...] }`, the existing-course
// lookup uses `where: { roadmapId }`. Dispatch on that so each call returns
// the right rows (mimics the real DB). By default the user has taken nothing.
function entryFindManyDefault(args?: { where?: { roadmapId?: string } }) {
  if (args?.where?.roadmapId) {
    return Promise.resolve([]);
  }
  return Promise.resolve(seniorEntries);
}

describe("roadmaps.planSemester", () => {
  beforeEach(() => {
    acadTermFindManyMock.mockReset();
    bidWindowFindManyMock.mockReset();
    userRoadmapFindFirstMock.mockReset();
    usersFindUniqueMock.mockReset();
    userRoadmapFindManyMock.mockReset();
    userRoadmapEntryFindManyMock.mockReset();

    acadTermFindManyMock.mockResolvedValue(TERMS);
    bidWindowFindManyMock.mockResolvedValue([currentWindow]);
    userRoadmapFindFirstMock.mockResolvedValue({ id: "myr1", matricTermId: "2024-T1" });
    usersFindUniqueMock.mockResolvedValue({ facultyId: 1 });
    userRoadmapFindManyMock.mockResolvedValue(seniorRoadmaps);
    userRoadmapEntryFindManyMock.mockImplementation(entryFindManyDefault);
  });

  it("resolves an explicit targetTermId and returns the full response shape", async () => {
    const result = await caller.roadmaps.planSemester({ targetTermId: "2025-T3A" });

    expect(result).toEqual({
      targetTerm: { id: "2025-T3A", acadYearStart: 2025, term: "3A" },
      userPosition: { yearNumber: 2, term: "T3A" },
      candidates: [
        {
          courseId: "c1",
          code: "ACCT101",
          name: "Financial Accounting",
          creditUnits: 1,
          seniorCount: 2,
          topSeniorRoadmap: { name: "Alice's Plan", ownerUsername: "alice" },
        },
        {
          courseId: "c2",
          code: "STAT101",
          name: "Statistical Thinking",
          creditUnits: 1,
          seniorCount: 1,
          topSeniorRoadmap: { name: "Alice's Plan", ownerUsername: "alice" },
        },
      ],
      totalSeniors: 2,
    });
  });

  it("defaults targetTermId to the next acad term after the current one", async () => {
    // currentTermId = "2025-T2" (from the bid window); next chronological term is 2025-T3A.
    const result = await caller.roadmaps.planSemester({});
    expect(result.targetTerm).toEqual({ id: "2025-T3A", acadYearStart: 2025, term: "3A" });
  });

  it("returns userPosition null and still returns candidates when the user has no active roadmap", async () => {
    userRoadmapFindFirstMock.mockResolvedValue(null);

    const result = await caller.roadmaps.planSemester({ targetTermId: "2025-T3A" });
    expect(result.userPosition).toBeNull();
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.totalSeniors).toBe(2);
  });

  it("excludes courses the user has already taken", async () => {
    // The user already took c1 (their active roadmap contains it).
    userRoadmapEntryFindManyMock.mockImplementation(
      (args?: { where?: { roadmapId?: string } }) => {
        if (args?.where?.roadmapId) return Promise.resolve([{ courseId: "c1" }]);
        return Promise.resolve(seniorEntries);
      },
    );

    const result = await caller.roadmaps.planSemester({ targetTermId: "2025-T3A" });
    expect(result.candidates.map((c) => c.courseId)).toEqual(["c2"]);
  });

  it("filters seniors by the user's faculty and caps the query at 50", async () => {
    await caller.roadmaps.planSemester({ targetTermId: "2025-T3A" });

    expect(userRoadmapFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { visibility: "PUBLIC", publishedAt: { not: null }, facultyId: 1 },
        take: 50,
      }),
    );
  });

  it("returns an empty plan for an unknown targetTermId without hitting senior queries", async () => {
    const result = await caller.roadmaps.planSemester({ targetTermId: "nope" });

    expect(result).toEqual({
      targetTerm: null,
      userPosition: null,
      candidates: [],
      totalSeniors: 0,
    });
    expect(userRoadmapFindManyMock).not.toHaveBeenCalled();
    expect(userRoadmapEntryFindManyMock).not.toHaveBeenCalled();
  });
});
