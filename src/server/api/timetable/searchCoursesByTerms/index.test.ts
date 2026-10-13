import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

const { queryRawMock } = vi.hoisted(() => ({
  queryRawMock: vi.fn() as Mock,
}));

// `server-only` throws outside a Next.js server bundle; the router pulls it
// in transitively (same pattern as the searchCourses test).
vi.mock("server-only", () => ({}));

vi.mock("@/server/db", () => ({ db: { $queryRaw: queryRawMock } }));

import { createCaller } from "@/server/api/root";

const caller = createCaller(
  () =>
    ({
      db: { $queryRaw: queryRawMock },
      session: null,
      headers: new Headers(),
    }) as never,
);

const row = (code: string, acadTermId: string) => ({
  id: `id-${code}`,
  code,
  name: `Name ${code}`,
  creditUnits: 1,
  uniAbbrv: "SMU",
  acadTermId,
});

describe("timetable.searchCoursesByTerms", () => {
  beforeEach(() => {
    queryRawMock.mockReset();
  });

  it("returns the course core fields per term in the order asked", async () => {
    queryRawMock.mockResolvedValue([row("A100", "t2"), row("B100", "t1")]);

    const result = await caller.timetable.searchCoursesByTerms({
      acadTermIds: ["t1", "t2"],
      query: "name",
    });

    expect(result).toEqual([
      {
        acadTermId: "t1",
        courses: [
          { id: "id-B100", code: "B100", name: "Name B100", creditUnits: 1 },
        ],
      },
      {
        acadTermId: "t2",
        courses: [
          { id: "id-A100", code: "A100", name: "Name A100", creditUnits: 1 },
        ],
      },
    ]);
    expect(queryRawMock).toHaveBeenCalledTimes(1);
  });

  it("caps each term at 20 rows", async () => {
    queryRawMock.mockResolvedValue([]);

    await caller.timetable.searchCoursesByTerms({
      acadTermIds: ["t1"],
      query: "name",
    });

    const params = (queryRawMock.mock.calls[0] as unknown[]).slice(1);
    expect(params).toContain(20);
  });

  it("rejects an empty term list and more than five terms", async () => {
    await expect(
      caller.timetable.searchCoursesByTerms({ acadTermIds: [], query: "name" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.timetable.searchCoursesByTerms({
        acadTermIds: ["1", "2", "3", "4", "5", "6"],
        query: "name",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(queryRawMock).not.toHaveBeenCalled();
  });
});
