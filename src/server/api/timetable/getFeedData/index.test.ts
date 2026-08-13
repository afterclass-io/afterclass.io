import { describe, expect, it, vi } from "vitest";

// getFeedData imports "server-only" which throws outside Next.
vi.mock("server-only", () => ({}));
vi.mock("@/server/db", () => ({ db: {} }));

import { getFeedData } from "./index";

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

  it("returns feed data for an UNLISTED timetable", async () => {
    const db = {
      userTimetable: {
        findUnique: vi.fn().mockResolvedValue({
          id: "t1",
          visibility: "UNLISTED",
          icalToken: "tok",
          name: "My Plan",
          acadTerm: { startDt: new Date(), endDt: new Date() },
          slots: [],
        }),
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    const result = await getFeedData("tok", db as any);
    expect(result).not.toBeNull();
  });
});
