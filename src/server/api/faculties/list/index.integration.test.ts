import { randomUUID } from "node:crypto";
import { describe, expect, inject, it } from "vitest";

import { idb as db } from "@/server/api/integration-test-helpers";
import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { list } from "./index";

const router = createTRPCRouter({ list });

describe("faculties.list (integration)", () => {
  it("returns seeded faculties with exactly the selected columns", async () => {
    const suffix = randomUUID();
    const faculty = await db.faculties.create({
      data: {
        name: `List Test Faculty ${suffix}`,
        acronym: suffix.slice(0, 8),
        siteUrl: "https://faculty.example.edu",
        belongToUniversityId: inject("universityId"),
      },
    });
    const caller = makeCaller(router.createCaller, db);

    const result = await caller.list();

    const seeded = result.find((f) => f.id === faculty.id);
    expect(seeded).toEqual({
      id: faculty.id,
      name: `List Test Faculty ${suffix}`,
      acronym: suffix.slice(0, 8),
    });
  });
});
