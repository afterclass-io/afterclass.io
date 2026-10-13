import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

const { queryRawMock } = vi.hoisted(() => ({
  queryRawMock: vi.fn() as Mock,
}));

vi.mock("server-only", () => ({}));

vi.mock("@/server/db", () => ({
  db: {
    $queryRaw: queryRawMock,
  },
}));

import { createCaller } from "@/server/api/root";

const caller = createCaller(
  () =>
    ({
      db: {
        $queryRaw: queryRawMock,
      },
      session: null,
      headers: new Headers(),
    }) as never,
);

describe("search router", () => {
  beforeEach(() => {
    queryRawMock.mockReset();
  });

  describe("search.courses", () => {
    it("rejects when query length exceeds 200 characters", async () => {
      await expect(
        caller.search.courses({ query: "x".repeat(201) }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
    });

    it("rejects when limit exceeds 50", async () => {
      await expect(
        caller.search.courses({ query: "stat", limit: 51 }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
    });

    it("binds default limit of 10 and default universityAbbrv SMU", async () => {
      queryRawMock.mockResolvedValue([]);

      await caller.search.courses({ query: "stat" });

      const rawCall = queryRawMock.mock.calls[0] as [string[], ...unknown[]];
      const params = rawCall.slice(1);
      expect(params).toContain(10);
      expect(params).toContain("SMU");
    });

    it("returns response rows containing only id, code and name", async () => {
      queryRawMock.mockResolvedValue([
        {
          id: "c1",
          code: "IS216",
          name: "Web Application Development II",
          creditUnits: 1,
          uniAbbrv: "SMU",
          count: 1n,
          profCount: 2,
          reviewCount: 5,
        },
      ]);

      const result = await caller.search.courses({ query: "IS216" });

      expect(result).toEqual({
        rows: [
          {
            id: "c1",
            code: "IS216",
            name: "Web Application Development II",
          },
        ],
        total: 1,
      });
      expect(result.rows[0]).not.toHaveProperty("creditUnits");
      expect(result.rows[0]).not.toHaveProperty("uniAbbrv");
      expect(result.rows[0]).not.toHaveProperty("profCount");
      expect(result.rows[0]).not.toHaveProperty("reviewCount");
    });

    it("binds professorSlug scope when provided", async () => {
      queryRawMock.mockResolvedValue([]);

      await caller.search.courses({
        query: "stat",
        scope: { professorSlug: "prof-slug" },
      });

      const rawCall = queryRawMock.mock.calls[0] as [string[], ...unknown[]];
      const params = rawCall.slice(1);
      expect(params).toContain("prof-slug");
    });

    it("rejects invalid scope professorSlug", async () => {
      await expect(
        caller.search.courses({
          query: "stat",
          scope: { professorSlug: "" },
        }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });

      await expect(
        caller.search.courses({
          query: "stat",
          scope: { professorSlug: "x".repeat(101) },
        }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
    });
  });

  describe("search.professors", () => {
    it("rejects when query length exceeds 200 characters", async () => {
      await expect(
        caller.search.professors({ query: "x".repeat(201) }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
    });

    it("rejects when limit exceeds 50", async () => {
      await expect(
        caller.search.professors({ query: "goh", limit: 51 }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
    });

    it("binds default limit of 10 and default universityAbbrv SMU", async () => {
      queryRawMock.mockResolvedValue([]);

      await caller.search.professors({ query: "goh" });

      const rawCall = queryRawMock.mock.calls[0] as [string[], ...unknown[]];
      const params = rawCall.slice(1);
      expect(params).toContain(10);
      expect(params).toContain("SMU");
    });

    it("returns response rows containing only id, slug and name", async () => {
      queryRawMock.mockResolvedValue([
        {
          id: "p1",
          slug: "goh-jing-rong",
          name: "Goh, Jing Rong",
          uniAbbrv: "SMU",
          count: 1n,
          courseCount: 3,
          reviewCount: 10,
        },
      ]);

      const result = await caller.search.professors({ query: "goh" });

      expect(result).toEqual({
        rows: [
          {
            id: "p1",
            slug: "goh-jing-rong",
            name: "Goh, Jing Rong",
          },
        ],
        total: 1,
      });
      expect(result.rows[0]).not.toHaveProperty("uniAbbrv");
      expect(result.rows[0]).not.toHaveProperty("courseCount");
      expect(result.rows[0]).not.toHaveProperty("reviewCount");
    });

    it("binds courseCode scope when searching professors", async () => {
      queryRawMock.mockResolvedValue([]);

      await caller.search.professors({
        query: "goh",
        scope: { courseCode: "IS216" },
      });

      const rawCall = queryRawMock.mock.calls[0] as [string[], ...unknown[]];
      const params = rawCall.slice(1);
      expect(params).toContain("IS216");
    });

    it("rejects invalid scope courseCode", async () => {
      await expect(
        caller.search.professors({
          query: "goh",
          scope: { courseCode: "" },
        }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });

      await expect(
        caller.search.professors({
          query: "goh",
          scope: { courseCode: "x".repeat(33) },
        }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
    });
  });
});
