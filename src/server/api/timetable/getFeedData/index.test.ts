import { describe, expect, it, vi } from "vitest";
import { getFeedData } from "./index";

// Not a createCaller test: getFeedData is a plain exported function that takes
// `db` as an argument, so it doesn't use the shared trpc-test-helpers caller.
// It imports "server-only" (throws outside Next) and @/server/db, both stubbed.
vi.mock("server-only", () => ({}));
vi.mock("@/server/db", () => ({ db: {} }));

describe("getFeedData", () => {
  it("returns null for a PRIVATE timetable even with a valid token", async () => {
    const db = {
      userTimetable: {
        findUnique: vi.fn().mockResolvedValue({
          id: "t1",
          visibility: "PRIVATE",
          icalToken: "tok",
          name: "My Plan",
          acadTerm: { startDt: new Date(), endDt: new Date() },
          slots: [],
        }),
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    const result = await getFeedData("tok", db as any);
    expect(result).toBeNull();
  });

  it("returns null when the token matches no timetable", async () => {
    const db = {
      userTimetable: { findUnique: vi.fn().mockResolvedValue(null) },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    const result = await getFeedData("bad-tok", db as any);
    expect(result).toBeNull();
  });

  it("maps slots to ArrangedClass and resolves the term window for an UNLISTED timetable", async () => {
    const termStart = new Date("2026-08-10T00:00:00Z");
    const termEnd = new Date("2026-12-01T00:00:00Z");
    const db = {
      userTimetable: {
        findUnique: vi.fn().mockResolvedValue({
          id: "t1",
          visibility: "UNLISTED",
          icalToken: "tok",
          name: "My Plan",
          acadTerm: { startDt: termStart, endDt: termEnd },
          slots: [
            {
              class: {
                id: "cls1",
                section: "G1",
                course: { code: "IS111", name: "Python", creditUnits: 1 },
                professor: { name: "Prof X" },
                classTimings: [
                  { dayOfWeek: "MON", startTime: "0800", endTime: "1200", venue: "SR1" },
                ],
                classExamTimings: [],
              },
            },
          ],
        }),
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    const result = await getFeedData("tok", db as any);

    expect(result).toEqual({
      timetableName: "My Plan",
      termStart,
      termEnd,
      classes: [
        {
          classId: "cls1",
          courseCode: "IS111",
          courseName: "Python",
          section: "G1",
          professorName: null, // omitProfessorName — no PII in the iCal feed
          creditUnits: 1,
          timings: [{ dayOfWeek: "MON", startTime: "0800", endTime: "1200", venue: "SR1" }],
          examTimings: [],
        },
      ],
    });
  });
});
